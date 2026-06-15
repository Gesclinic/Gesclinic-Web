/**
 * ETAPA 6: Intelligent Bank Reconciliation Engine
 * 
 * Auto-concilia transações PIX, TED, Cartão com sistema financeiro
 * Suporta fuzzy matching + exact matching
 * Score de confiança (0.0-1.0)
 * Importa OFX, CSV, XLSX
 */

import { customSupabaseClient } from './customSupabaseClient';
import { listReceivables } from './receivablesApi.js';

function valueOfPayment(payment) {
  return Number(payment?.payment_amount ?? payment?.amount_paid ?? payment?.amount ?? 0);
}

function methodOfPayment(payment) {
  return payment?.payment_method_text || payment?.payment_method || payment?.method || 'other';
}

function payerNameOfPayment(payment) {
  return payment?.receivable?.patient_name
    || payment?.receivable?.payer_name
    || payment?.receivable?.description
    || payment?.payer_name
    || '';
}

function normalizePaymentRows(paymentRows = [], receivableRows = []) {
  const receivableById = new Map((receivableRows || []).map((row) => [row.id, row]));

  return (paymentRows || []).map((payment) => {
    const receivableId = payment.ar_invoice_id || payment.receivable_id;
    const receivable = receivableById.get(receivableId) || null;

    return {
      ...payment,
      receivable_id: receivableId,
      payment_amount: valueOfPayment(payment),
      payment_method: methodOfPayment(payment),
      payment_date: payment.payment_date || payment.created_at,
      receivable,
    };
  }).filter((payment) => payment.receivable_id && payment.payment_amount > 0);
}

const RECONCILIATION_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
  PARTIAL_MATCH: 'partial_match',
  NO_MATCH: 'no_match',
  MANUAL_REVIEW: 'manual_review',
  RECONCILED: 'reconciled',
  REJECTED: 'rejected',
};

const CONFIDENCE_LEVELS = {
  EXACT: 1.0,           // Exato (PIX key, valor, data)
  VERY_HIGH: 0.95,      // 95% confiança
  HIGH: 0.85,           // 85% confiança
  MEDIUM: 0.70,         // 70% confiança
  LOW: 0.50,            // 50% confiança
  VERY_LOW: 0.30,       // 30% confiança
};

/**
 * Importar transações bancárias de arquivo
 * Suporta: OFX, CSV, XLSX
 * @param {Object} params
 * @returns {Promise<{success: boolean, importedCount: number, errors: Array}>}
 */
export async function importBankTransactions({
  clinicId,
  bankAccountId,
  fileContent,
  fileFormat = 'csv',  // 'csv', 'ofx', 'xlsx'
  fromDate = null,
  toDate = null,
} = {}) {
  try {
    console.log(`Importing ${fileFormat} bank transactions...`);

    const transactions = [];
    let errors = [];

    // Parse based on format
    if (fileFormat === 'csv') {
      const parsed = parseCSV(fileContent);
      transactions.push(...parsed);
    } else if (fileFormat === 'ofx') {
      const parsed = parseOFX(fileContent);
      transactions.push(...parsed);
    } else if (fileFormat === 'xlsx') {
      const parsed = parseXLSX(fileContent);
      transactions.push(...parsed);
    }

    // Insert transactions
    const { data: inserted, error: insertError } = await customSupabaseClient
      .from('bank_import_transactions')
      .insert(
        transactions.map(t => ({
          clinic_id: clinicId,
          bank_account_id: bankAccountId,
          transaction_date: t.date,
          description: t.description || t.memo,
          amount: Math.abs(t.amount),
          transaction_type: t.amount > 0 ? 'credit' : 'debit',
          balance_after: t.balance,
          external_id: t.id || `${t.date}-${t.amount}`,
          payment_method: detectPaymentMethod(t),
          raw_data: t,
          status: 'pending',
          created_at: new Date(),
        }))
      );

    if (insertError) throw insertError;

    console.log(`✅ Imported ${transactions.length} transactions`);

    return {
      success: true,
      importedCount: transactions.length,
      errors,
    };
  } catch (err) {
    console.error('Error importing bank transactions:', err);
    return {
      success: false,
      importedCount: 0,
      errors: [err.message],
    };
  }
}

/**
 * Parse CSV format
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const transactions = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const [date, description, amount, balance] = lines[i].split(',').map(s => s.trim());

    transactions.push({
      date: new Date(date),
      description,
      amount: parseFloat(amount),
      balance: parseFloat(balance),
      id: `${date}-${amount}`,
    });
  }

  return transactions;
}

/**
 * Parse OFX format
 */
function parseOFX(content) {
  const transactions = [];
  const txPattern = /<STMTTRN>[\s\S]*?<\/STMTTRN>/g;
  const matches = content.match(txPattern) || [];

  matches.forEach(tx => {
    const dateMatch = tx.match(/<DTPOSTED>(\d{8})/);
    const amountMatch = tx.match(/<TRNAMT>([^<]+)/);
    const memoMatch = tx.match(/<MEMO>([^<]+)/);
    const idMatch = tx.match(/<FITID>([^<]+)/);

    if (dateMatch && amountMatch) {
      const dateStr = dateMatch[1];
      transactions.push({
        date: new Date(dateStr.substring(0, 4), parseInt(dateStr.substring(4, 6)) - 1, dateStr.substring(6, 8)),
        description: memoMatch ? memoMatch[1] : '',
        amount: parseFloat(amountMatch[1]),
        id: idMatch ? idMatch[1] : `${dateStr}-${amountMatch[1]}`,
      });
    }
  });

  return transactions;
}

/**
 * Parse XLSX format (simplified)
 */
function parseXLSX(content) {
  // In production, use xlsx library
  // For now, treat as CSV
  return parseCSV(content);
}

/**
 * Detectar método de pagamento
 */
function detectPaymentMethod(transaction) {
  const desc = (transaction.description || '').toLowerCase();

  if (desc.includes('pix')) return 'pix';
  if (desc.includes('ted') || desc.includes('transferência')) return 'ted';
  if (desc.includes('débito')) return 'debit_card';
  if (desc.includes('crédito')) return 'credit_card';
  if (desc.includes('boleto')) return 'boleto';
  if (desc.includes('cheque')) return 'check';

  return 'other';
}

/**
 * Auto-reconciliar transações com receivables/payments
 * Usar fuzzy matching com score de confiança
 * @param {Object} params
 * @returns {Promise<{success: boolean, matched: number, partial: number, unmatched: number}>}
 */
export async function autoReconcileTransactions({
  clinicId,
  bankAccountId,
  minConfidenceScore = 0.70,
} = {}) {
  try {
    console.log(`Auto-reconciling transactions (min score: ${minConfidenceScore})...`);

    // 1. Get pending import transactions
    const { data: importTxs, error: importError } = await customSupabaseClient
      .from('bank_import_transactions')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('bank_account_id', bankAccountId)
      .eq('status', 'pending')
      .order('transaction_date', { ascending: false });

    if (importError) throw importError;

    // 2. Get potential matches from canonical receivable_payments + ar_invoices.
    const { data: paymentRows, error: paymentError } = await customSupabaseClient
      .from('receivable_payments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('payment_date', { ascending: false });

    if (paymentError) throw paymentError;

    const receivables = await listReceivables({
      clinicId,
      statusList: ['received', 'partial', 'open', 'pending'],
      limit: 5000,
    });
    const payments = normalizePaymentRows(paymentRows, receivables);

    let matchedCount = 0;
    let partialCount = 0;
    let unmatchedCount = 0;

    // 3. Match transactions
    for (const importTx of importTxs) {
      let bestMatch = null;
      let bestScore = 0;

      for (const payment of payments) {
        const score = calculateMatchScore(
          importTx,
          payment,
          minConfidenceScore
        );

        if (score > bestScore) {
          bestScore = score;
          bestMatch = payment;
        }
      }

      // 4. Create reconciliation record
      if (bestMatch && bestScore >= minConfidenceScore) {
        const status = bestScore >= 0.95 ? 'matched' : 'partial_match';

        const { error: reconError } = await customSupabaseClient
          .from('bank_reconciliations')
          .insert({
            clinic_id: clinicId,
            bank_import_id: importTx.id,
            payment_id: bestMatch.id,
            receivable_id: bestMatch.receivable_id,
            confidence_score: bestScore,
            match_type: determinMatchType(importTx, bestMatch),
            status,
            reconciled_at: status === 'matched' ? new Date() : null,
          });

        if (!reconError) {
          if (status === 'matched') matchedCount++;
          else partialCount++;

          // Update import transaction status
          await customSupabaseClient
            .from('bank_import_transactions')
            .update({ status: status === 'matched' ? 'reconciled' : 'partial_match' })
            .eq('id', importTx.id);
        }
      } else {
        unmatchedCount++;

        // Mark as no match
        await customSupabaseClient
          .from('bank_import_transactions')
          .update({ status: 'no_match' })
          .eq('id', importTx.id);
      }
    }

    console.log(`✅ Reconciliation complete: ${matchedCount} matched, ${partialCount} partial, ${unmatchedCount} unmatched`);

    return {
      success: true,
      matched: matchedCount,
      partial: partialCount,
      unmatched: unmatchedCount,
    };
  } catch (err) {
    console.error('Error reconciling transactions:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Calcular score de correspondência (0-1)
 */
function calculateMatchScore(importTx, payment, minScore = 0.70) {
  let score = 0;

  // 1. Amount match (40 points)
  const paymentAmount = valueOfPayment(payment);

  if (Math.abs(importTx.amount - paymentAmount) < 0.01) {
    score += 40; // Exact amount
  } else if (paymentAmount > 0 && Math.abs(importTx.amount - paymentAmount) / paymentAmount < 0.05) {
    score += 20; // Within 5%
  }

  // 2. Date match (30 points)
  const importDate = new Date(importTx.transaction_date).toDateString();
  const paymentDate = new Date(payment.payment_date).toDateString();

  if (importDate === paymentDate) {
    score += 30; // Same day
  } else {
    const daysDiff = Math.abs(
      (new Date(importTx.transaction_date) - new Date(payment.payment_date)) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 1) {
      score += 25; // Next day
    } else if (daysDiff <= 3) {
      score += 15; // Within 3 days
    }
  }

  // 3. Payment method match (20 points)
  if (importTx.payment_method === methodOfPayment(payment)) {
    score += 20;
  }

  // 4. Description match (10 points)
  const importDesc = (importTx.description || '').toLowerCase();
  const payerName = payerNameOfPayment(payment).toLowerCase();

  if (payerName && (importDesc.includes(payerName) || payerName.includes(importDesc.substring(0, 5)))) {
    score += 10; // Contains payer name
  }

  // Normalize to 0-1
  return score / 100;
}

/**
 * Determinar tipo de correspondência
 */
function determinMatchType(importTx, payment) {
  const amountMatch = Math.abs(importTx.amount - valueOfPayment(payment)) < 0.01;
  const dateMatch = new Date(importTx.transaction_date).toDateString() === 
                    new Date(payment.payment_date).toDateString();
  const methodMatch = importTx.payment_method === methodOfPayment(payment);

  if (amountMatch && dateMatch && methodMatch) {
    return 'exact';
  } else if (amountMatch && (dateMatch || methodMatch)) {
    return 'amount_and_date_or_method';
  } else if (amountMatch && dateMatch) {
    return 'amount_and_date';
  } else if (amountMatch) {
    return 'amount_only';
  }

  return 'fuzzy';
}

/**
 * Confirmar reconciliação (marcar como reconciled)
 * @param {Object} params
 * @returns {Promise<{success: boolean}>}
 */
export async function confirmReconciliation({
  clinicId,
  reconciliationId,
  notes = null,
} = {}) {
  try {
    console.log(`Confirming reconciliation ${reconciliationId}...`);

    const { error } = await customSupabaseClient
      .from('bank_reconciliations')
      .update({
        status: 'reconciled',
        reconciled_at: new Date(),
        reconciliation_notes: notes,
      })
      .eq('id', reconciliationId)
      .eq('clinic_id', clinicId);

    if (error) throw error;

    // Create settlement for the payment
    const { data: recon } = await customSupabaseClient
      .from('bank_reconciliations')
      .select('payment_id, receivable_id')
      .eq('id', reconciliationId)
      .single();

    // Auto-create payment settlement
    if (recon?.payment_id && recon?.receivable_id) {
      const { data: payment } = await customSupabaseClient
        .from('receivable_payments')
        .select('amount_paid, ar_invoice_id')
        .eq('id', recon.payment_id)
        .single();

      if (payment) {
        // Call settlement motor to register the settlement
        const settlementResult = await customSupabaseClient.rpc('fn_process_settlement_atomically', {
          p_clinic_id: clinicId,
          p_receivable_id: recon.receivable_id || payment.ar_invoice_id,
          p_payment_id: recon.payment_id,
          p_amount: Number(payment.amount_paid || 0),
        });

        if (!settlementResult.error) {
          console.log(`✅ Payment settlement created automatically`);
        }
      }
    }

    console.log(`✅ Reconciliation confirmed`);
    return { success: true };
  } catch (err) {
    console.error('Error confirming reconciliation:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Rejeitar reconciliação
 * @param {Object} params
 * @returns {Promise<{success: boolean}>}
 */
export async function rejectReconciliation({
  clinicId,
  reconciliationId,
  rejectReason,
} = {}) {
  try {
    console.log(`Rejecting reconciliation ${reconciliationId}...`);

    const { error } = await customSupabaseClient
      .from('bank_reconciliations')
      .update({
        status: 'rejected',
        reject_reason: rejectReason,
      })
      .eq('id', reconciliationId)
      .eq('clinic_id', clinicId);

    if (error) throw error;

    // Mark import transaction as no match
    const { data: recon } = await customSupabaseClient
      .from('bank_reconciliations')
      .select('bank_import_id')
      .eq('id', reconciliationId)
      .single();

    if (recon?.bank_import_id) {
      await customSupabaseClient
        .from('bank_import_transactions')
        .update({ status: 'no_match' })
        .eq('id', recon.bank_import_id);
    }

    console.log(`✅ Reconciliation rejected`);
    return { success: true };
  } catch (err) {
    console.error('Error rejecting reconciliation:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Listar reconciliações pendentes
 * @param {Object} params
 * @returns {Promise<Array>}
 */
export async function listPendingReconciliations({
  clinicId,
  bankAccountId = null,
  limit = 50,
  offset = 0,
} = {}) {
  try {
    let query = customSupabaseClient
      .from('bank_reconciliations')
      .select(`
        *,
        bank_import_transactions(*)
      `)
      .eq('clinic_id', clinicId)
      .in('status', ['pending', 'partial_match', 'manual_review']);

    if (bankAccountId) {
      query = query.eq('bank_import_transactions.bank_account_id', bankAccountId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const rows = data || [];
    if (!rows.length) {
      return rows;
    }

    const paymentIds = rows.map((row) => row.payment_id).filter(Boolean);
    const { data: payments } = paymentIds.length
      ? await customSupabaseClient
        .from('receivable_payments')
        .select('*')
        .in('id', paymentIds)
      : { data: [] };

    const receivables = await listReceivables({
      clinicId,
      statusList: ['received', 'partial', 'open', 'pending'],
      limit: 5000,
    });
    const paymentById = new Map(normalizePaymentRows(payments || [], receivables).map((payment) => [payment.id, payment]));

    return rows.map((row) => ({
      ...row,
      payment: paymentById.get(row.payment_id) || null,
      receivable: paymentById.get(row.payment_id)?.receivable || null,
    }));
  } catch (err) {
    console.error('Error listing pending reconciliations:', err);
    return [];
  }
}

/**
 * Obter resumo de conciliação
 * @param {Object} params
 * @returns {Promise<{success: boolean, summary: Object}>}
 */
export async function getReconciliationSummary({
  clinicId,
  bankAccountId = null,
  fromDate = null,
  toDate = null,
} = {}) {
  try {
    let query = customSupabaseClient
      .from('bank_reconciliations')
      .select('status, confidence_score, reconciled_at');

    query = query.eq('clinic_id', clinicId);

    if (bankAccountId) {
      query = query.eq('bank_import_transactions.bank_account_id', bankAccountId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary = {
      total: data?.length || 0,
      matched: data?.filter(r => r.status === 'matched')?.length || 0,
      partial_match: data?.filter(r => r.status === 'partial_match')?.length || 0,
      no_match: data?.filter(r => r.status === 'no_match')?.length || 0,
      reconciled: data?.filter(r => r.status === 'reconciled')?.length || 0,
      rejected: data?.filter(r => r.status === 'rejected')?.length || 0,
      avg_confidence: data?.length > 0 
        ? (data.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / data.length).toFixed(2)
        : 0,
    };

    return {
      success: true,
      summary,
    };
  } catch (err) {
    console.error('Error getting reconciliation summary:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Batch reconcile matched transactions
 * @param {Object} params
 * @returns {Promise<{success: boolean, processedCount: number}>}
 */
export async function batchReconcileMatched({
  clinicId,
  bankAccountId,
} = {}) {
  try {
    console.log(`Batch reconciling matched transactions...`);

    const { data: matched, error } = await customSupabaseClient
      .from('bank_reconciliations')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('status', 'matched');

    if (error) throw error;

    let processedCount = 0;

    for (const recon of matched || []) {
      const result = await confirmReconciliation({
        clinicId,
        reconciliationId: recon.id,
      });

      if (result.success) {
        processedCount++;
      }
    }

    console.log(`✅ Batch reconciliation complete: ${processedCount} processed`);

    return {
      success: true,
      processedCount,
    };
  } catch (err) {
    console.error('Error batch reconciling:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

export default {
  RECONCILIATION_STATUS,
  CONFIDENCE_LEVELS,
  importBankTransactions,
  autoReconcileTransactions,
  confirmReconciliation,
  rejectReconciliation,
  listPendingReconciliations,
  getReconciliationSummary,
  batchReconcileMatched,
};
