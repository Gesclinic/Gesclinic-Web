// src/lib/conciliationApi.js
// API para Conciliação Bancária

import { supabase } from '@/lib/customSupabaseClient.js';
import {
  CONCILIATION_STATUS,
  TRANSACTION_TYPE,
  FINANCIAL_LINK_TYPE,
  CONCILIATION_ACTION,
  SUGGESTION_LIMITS,
} from '@/lib/conciliationStatus.js';

/* ============================================
   BANCO DE DADOS
   ============================================ */

/**
 * Lista extratos bancários para conciliação
 */
export async function listBankStatements({
  clinicId,
  status = null,
  startDate = null,
  endDate = null,
  accountId = null,
  search = null,
  limit = 100,
  offset = 0,
}) {
  try {
    let query = supabase.from('conciliation_bank_statements').select('*', { count: 'exact' });

    // Filtros obrigatórios
    query = query.eq('clinic_id', clinicId);

    // Filtros opcionais
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('statement_date', startDate);
    }
    if (endDate) {
      query = query.lte('statement_date', endDate);
    }
    if (accountId) {
      query = query.eq('bank_account_id', accountId);
    }
    if (search) {
      query = query.or(`description.ilike.%${search}%`);
    }

    // Ordenação e paginação
    const { data, error, count } = await query
      .order('statement_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error listing bank statements:', error);
    throw error;
  }
}

/**
 * Obter um extrato específico
 */
export async function getBankStatement(id) {
  try {
    const { data, error } = await supabase
      .from('conciliation_bank_statements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting bank statement:', error);
    throw error;
  }
}

/**
 * Calcular hash de referência para deduplicação (simples, baseado em conversão)
 */
function generateReferenceHash(clinicId, accountId, date, amount, referenceNumber) {
  const key = `${clinicId}|${accountId}|${date}|${parseFloat(amount).toFixed(2)}|${referenceNumber || ''}`;
  
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Converter para hex string
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Importar extrato (criar múltiplos registros com deduplicação)
 */
export async function importBankStatements({
  clinicId,
  statements,
  batchId = null,
  accountId = null,
}) {
  try {
    const records = statements.map((stmt, index) => {
      const referenceNumber = stmt.bankId || stmt.referenceNumber || null;
      const referenceHash = generateReferenceHash(
        clinicId,
        accountId,
        stmt.date || stmt.statement_date,
        stmt.amount,
        referenceNumber,
      );

      return {
        clinic_id: clinicId,
        bank_account_id: accountId,
        statement_date: stmt.date || stmt.statement_date,
        description: stmt.description,
        amount: parseFloat(stmt.amount),
        transaction_type: stmt.type || stmt.transaction_type,
        bank_id: referenceNumber,
        reference_hash: referenceHash,
        metadata: {
          ...(stmt.metadata || {}),
          operation_type: stmt.operationType || 'OUTRO',
          raw_type: stmt.rawType || null,
          raw_memo: stmt.rawMemo || null,
          source_layout: stmt.sourceLayout || stmt.metadata?.source_layout || null,
          source_document: stmt.sourceDocument || stmt.metadata?.source_document || null,
          source_complement: stmt.sourceComplement || stmt.metadata?.source_complement || null,
          source_history: stmt.sourceHistory || stmt.metadata?.source_history || null,
          import_row_index: stmt.metadata?.import_row_index ?? index,
        },
        status: CONCILIATION_STATUS.PENDING,
        import_batch_id: batchId,
        created_by: null,
      };
    });

    // Verificar duplicatas por reference_hash
    const hashes = records.map((r) => r.reference_hash);
    const { data: existingStatements, error: checkError } = await supabase
      .from('conciliation_bank_statements')
      .select('id, reference_hash, metadata')
      .eq('clinic_id', clinicId)
      .in('reference_hash', hashes);

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    const existingHashes = new Set(existingStatements?.map((s) => s.reference_hash) || []);
    const existingByHash = new Map((existingStatements || []).map((s) => [s.reference_hash, s]));
    const newRecords = records.filter((r) => !existingHashes.has(r.reference_hash));
    const duplicateRecordsWithBalance = records.filter((r) => {
      if (!existingHashes.has(r.reference_hash)) return false;
      return r.metadata?.end_balance !== null && typeof r.metadata?.end_balance !== 'undefined';
    });

    await Promise.all(duplicateRecordsWithBalance.map(async (record) => {
      const existing = existingByHash.get(record.reference_hash);
      if (!existing?.id) return;

      const { error: updateError } = await supabase
        .from('conciliation_bank_statements')
        .update({
          metadata: {
            ...(existing.metadata || {}),
            ...record.metadata,
          },
        })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }
    }));

    if (newRecords.length === 0) {
      return {
        imported: 0,
        duplicates: records.length,
        updated: duplicateRecordsWithBalance.length,
        statements: [],
      };
    }

    const { data, error } = await supabase
      .from('conciliation_bank_statements')
      .insert(newRecords)
      .select();

    if (error) {
      throw error;
    }

    return {
      imported: data.length,
      duplicates: records.length - newRecords.length,
      updated: duplicateRecordsWithBalance.length,
      statements: data,
    };
  } catch (error) {
    console.error('Error importing bank statements:', error);
    throw error;
  }
}

/**
 * Atualizar status de um extrato
 */
export async function updateBankStatementStatus(id, status, divergenceReason = null) {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (divergenceReason && status === CONCILIATION_STATUS.DIVERGENT) {
      updateData.divergence_reason = divergenceReason;
    }

    const { data, error } = await supabase
      .from('conciliation_bank_statements')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }
    return data?.[0];
  } catch (error) {
    console.error('Error updating bank statement status:', error);
    throw error;
  }
}

/**
 * Conciliar extrato com lançamento financeiro
 */
export async function conciliateStatement(statementId, financialId, financialType) {
  try {
    const reconciledAt = new Date().toISOString();
    // Atualizar status
    const { data: updated, error: updateError } = await supabase
      .from('conciliation_bank_statements')
      .update({
        status: CONCILIATION_STATUS.CONCILIATED,
        linked_financial_id: financialId,
        linked_type: financialType,
        updated_at: reconciledAt,
      })
      .eq('id', statementId)
      .select('id, statement_date, amount, bank_account_id');

    if (updateError) {
      throw updateError;
    }

    const statement = updated?.[0];
    const movementDate = String(statement?.statement_date || reconciledAt).split('T')[0];
    const amount = Math.abs(Number(statement?.amount || 0));

    if (financialType === FINANCIAL_LINK_TYPE.RECEIVABLE) {
      const receivablePayload = {
        status: 'received',
        received_date: movementDate,
        received_value: amount,
        updated_at: reconciledAt,
      };
      if (statement?.bank_account_id) {
        receivablePayload.financial_account_id = statement.bank_account_id;
      }
      const first = await supabase.from('ar_invoices').update(receivablePayload).eq('id', financialId);
      if (first.error) {
        const { financial_account_id, updated_at, ...fallbackPayload } = receivablePayload;
        const fallback = await supabase.from('ar_invoices').update(fallbackPayload).eq('id', financialId);
        if (fallback.error) throw fallback.error;
      }
    }

    if (financialType === FINANCIAL_LINK_TYPE.PAYABLE) {
      const payablePayload = {
        status: 'paid',
        paid_at: movementDate,
        paid_value: amount,
        balance_amount: 0,
        updated_at: reconciledAt,
      };
      if (statement?.bank_account_id) {
        payablePayload.financial_account_id = statement.bank_account_id;
      }
      const first = await supabase.from('ap_bills').update(payablePayload).eq('id', financialId);
      if (first.error) {
        const { financial_account_id, paid_at, updated_at, ...fallbackPayload } = payablePayload;
        const fallback = await supabase.from('ap_bills').update(fallbackPayload).eq('id', financialId);
        if (fallback.error) throw fallback.error;
      }
    }

    // Registrar no histórico
    await addLinkHistory({
      bank_statement_id: statementId,
      financial_id: financialId,
      financial_type: financialType,
      action: CONCILIATION_ACTION.CONCILIATE,
    });

    return statement;
  } catch (error) {
    console.error('Error conciliating statement:', error);
    throw error;
  }
}

/**
 * Criar lançamento e vincular com extrato
 */
export async function createAndLinkFinancial({
  statementId,
  type, // 'payable' ou 'receivable'
  clinicId,
  amount,
  description,
  dueDate,
  statementDate,
  categoryId,
  costCenterId,
  paymentMethod = null,
  supplierId = null,
  clientId = null,
  notes = null,
}) {
  try {
    let financialId;
    const movementDate = statementDate || dueDate || new Date().toISOString().split('T')[0];

    if (type === FINANCIAL_LINK_TYPE.PAYABLE) {
      // Criar em Contas a Pagar
      const { data, error } = await supabase
        .from('ap_bills')
        .insert([
          {
            clinic_id: clinicId,
            invoice_number: `AUTO-${Date.now()}`,
            supplier_id: supplierId,
            category_id: categoryId,
            cost_center_id: costCenterId,
            amount: parseFloat(amount),
            description: description || 'Lançamento automático - Conciliação Bancária',
            due_date: dueDate || movementDate,
            paid_at: movementDate,
            payment_method: paymentMethod,
            status: 'paid',
            notes: notes,
          },
        ])
        .select();

      if (error) {
        throw error;
      }
      financialId = data?.[0]?.id;
    } else if (type === FINANCIAL_LINK_TYPE.RECEIVABLE) {
      // Criar em Contas a Receber
      const { data, error } = await supabase
        .from('ar_invoices')
        .insert([
          {
            clinic_id: clinicId,
            invoice_number: `AUTO-${Date.now()}`,
            client_id: clientId,
            category_id: categoryId,
            cost_center_id: costCenterId,
            amount: parseFloat(amount),
            description: description || 'Lançamento automático - Conciliação Bancária',
            issue_date: movementDate,
            due_date: dueDate || movementDate,
            received_date: movementDate,
            received_value: parseFloat(amount),
            status: 'received',
            notes: notes,
          },
        ])
        .select();

      if (error) {
        throw error;
      }
      financialId = data?.[0]?.id;
    }

    if (!financialId) {
      throw new Error('Failed to create financial record');
    }

    // Vincular com extrato
    const { data: updated, error: updateError } = await supabase
      .from('conciliation_bank_statements')
      .update({
        status: CONCILIATION_STATUS.ADJUSTED,
        linked_financial_id: financialId,
        linked_type: type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', statementId)
      .select();

    if (updateError) {
      throw updateError;
    }

    // Registrar no histórico
    await addLinkHistory({
      bank_statement_id: statementId,
      financial_id: financialId,
      financial_type: type,
      action: CONCILIATION_ACTION.ADJUST,
      action_notes: 'Lançamento criado automaticamente',
    });

    return updated?.[0];
  } catch (error) {
    console.error('Error creating and linking financial:', error);
    throw error;
  }
}

/**
 * Marcar como divergente
 */
export async function markAsDivergent(statementId, reason) {
  try {
    return await updateBankStatementStatus(statementId, CONCILIATION_STATUS.DIVERGENT, reason);
  } catch (error) {
    console.error('Error marking as divergent:', error);
    throw error;
  }
}

/**
 * Ignorar lançamento
 */
export async function ignoreStatement(statementId, reason) {
  try {
    const { data, error } = await supabase
      .from('conciliation_bank_statements')
      .update({
        status: CONCILIATION_STATUS.IGNORED,
        divergence_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', statementId)
      .select();

    if (error) {
      throw error;
    }

    await addLinkHistory({
      bank_statement_id: statementId,
      action: CONCILIATION_ACTION.IGNORE,
      action_notes: reason,
    });

    return data?.[0];
  } catch (error) {
    console.error('Error ignoring statement:', error);
    throw error;
  }
}

/* ============================================
   SUGESTÕES E BUSCA AUTOMÁTICA
   ============================================ */

/**
 * Buscar sugestões automáticas para um extrato
 */
export async function findSuggestions({
  clinicId,
  amount,
  description,
  transactionType,
  statementDate,
  referenceNumber = null,
  operationType = null,
  maxDaysDifference = SUGGESTION_LIMITS.MAX_DAYS_DIFFERENCE,
}) {
  try {
    const suggestions = [];
    const normalizedReference = referenceNumber
      ? String(referenceNumber).toLowerCase().replace(/[^a-z0-9]/g, '')
      : null;
    const normalizeSearchText = (value) => String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const normalizedDescription = normalizeSearchText(description);

    const computeTextBoost = (...candidateParts) => {
      let boost = 0;
      const candidate = normalizeSearchText(candidateParts.filter(Boolean).join(' '));

      if (!candidate) {
        return boost;
      }

      if (normalizedReference) {
        const candidateRef = candidate.replace(/[^a-z0-9]/g, '');
        if (candidateRef.includes(normalizedReference)) {
          boost += 0.15;
        }
      }

      const tokens = normalizedDescription
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4);

      const matchingTokens = tokens.filter((token) => candidate.includes(token)).length;
      if (matchingTokens > 0) {
        boost += Math.min(matchingTokens * 0.03, 0.12);
      }

      return boost;
    };

    const computeOperationTypeBoost = (candidateDescription, candidateOperationType) => {
      if (!operationType) {
        return 0;
      }

      const rules = {
        PIX: ['pix', 'transferência pix'],
        TED: ['ted', 'transferência eletrônica'],
        BOLETO: ['boleto', 'registrado'],
        CHEQUE: ['cheque', 'check'],
        DEPOSITO: ['depósito', 'deposito'],
        TARIFA: ['tarifa', 'taxa'],
        JUROS: ['juros', 'cob'],
        DEVOLUCAO: ['devolução', 'devolucao'],
      };

      const operationRules = rules[operationType] || [];
      const candidate = (candidateDescription || '').toLowerCase();

      let matches = 0;
      for (const rule of operationRules) {
        if (candidate.includes(rule)) {
          matches += 1;
        }
      }

      return Math.min(matches * 0.1, 0.2);
    };

    const getDateTolerance = (opType) => {
      const tolerances = {
        PIX: 0,
        TED: 1,
        BOLETO: 3,
        CHEQUE: 5,
        DEPOSITO: 1,
        TARIFA: 0,
        JUROS: 0,
        DEVOLUCAO: 2,
      };
      return tolerances[opType] || maxDaysDifference;
    };

    const tolerance = getDateTolerance(operationType);

    // Buscar em Contas a Pagar (se débito ou ambos)
    if (!transactionType || transactionType === TRANSACTION_TYPE.DEBIT) {
      const { data: apSuggestions } = await supabase
        .from('ap_bills')
        .select('id, description, vendor_name, document_number, notes, amount, due_date, status')
        .eq('clinic_id', clinicId)
        .gte('amount', amount * 0.95)
        .lte('amount', amount * 1.05)
        .not('status', 'in', '(PAID,CANCELED,REVERSED)');

      if (apSuggestions) {
        suggestions.push(
          ...apSuggestions.map((ap) => ({
            ...(function () {
              const baseScore = calculateMatchScore(
                amount,
                ap.amount,
                statementDate,
                ap.due_date,
                tolerance,
              );
              const textBoost = computeTextBoost(
                ap.description,
                ap.vendor_name,
                ap.document_number,
                ap.notes,
              );
              const operationBoost = computeOperationTypeBoost(ap.description, operationType);
              return {
                id: ap.id,
                type: FINANCIAL_LINK_TYPE.PAYABLE,
                description: ap.description || ap.vendor_name || 'Conta a pagar',
                amount: ap.amount,
                date: ap.due_date,
                status: ap.status,
                matchScore: Math.min(baseScore + textBoost + operationBoost, 1),
                matchReason: [
                  textBoost > 0 && 'semelhança textual',
                  operationBoost > 0 && `tipo ${operationType}`,
                  'valor/data aproximados',
                ]
                  .filter(Boolean)
                  .join(' + '),
              };
            })(),
          })),
        );
      }
    }

    // Buscar em Contas a Receber (se crédito ou ambos)
    if (!transactionType || transactionType === TRANSACTION_TYPE.CREDIT) {
      const { data: modernArSuggestions, error: modernArError } = await supabase
        .from('ar_invoices')
        .select('id, description, patient_name, payer_type, insurance_invoice_number, guide_number, notes, nf_document_name, net_value, due_date, status, metadata')
        .eq('clinic_id', clinicId)
        .gte('net_value', amount * 0.95)
        .lte('net_value', amount * 1.05)
        .not('status', 'in', '(received,canceled,reversed)');

      if (!modernArError && modernArSuggestions) {
        suggestions.push(
          ...modernArSuggestions.map((ar) => ({
            ...(function () {
              const baseScore = calculateMatchScore(
                amount,
                ar.net_value,
                statementDate,
                ar.due_date,
                tolerance,
              );
              const textBoost = computeTextBoost(
                ar.description,
                ar.patient_name,
                ar.insurance_invoice_number,
                ar.guide_number,
                ar.notes,
                ar.nf_document_name,
                ar.metadata?.source_file_name,
                ar.metadata?.payer?.document,
                ar.metadata?.issuer?.document,
              );
              const operationBoost = computeOperationTypeBoost(ar.description, operationType);
              return {
                id: ar.id,
                type: FINANCIAL_LINK_TYPE.RECEIVABLE,
                description: ar.description || ar.patient_name || 'Conta a receber',
                amount: ar.net_value,
                date: ar.due_date,
                status: ar.status,
                matchScore: Math.min(baseScore + textBoost + operationBoost, 1),
                matchReason: [
                  textBoost > 0 && 'documento fiscal/texto',
                  operationBoost > 0 && `tipo ${operationType}`,
                  'valor/data aproximados',
                ]
                  .filter(Boolean)
                  .join(' + '),
              };
            })(),
          })),
        );
      }

      const { data: arSuggestions } = await supabase
        .from('invoices')
        .select('id, description, net_amount, due_date, status')
        .eq('clinic_id', clinicId)
        .gte('net_amount', amount * 0.95)
        .lte('net_amount', amount * 1.05)
        .neq('status', 'paid')
        .neq('status', 'canceled');

      if (arSuggestions) {
        suggestions.push(
          ...arSuggestions.map((ar) => ({
            ...(function () {
              const baseScore = calculateMatchScore(
                amount,
                ar.net_amount,
                statementDate,
                ar.due_date,
                tolerance,
              );
              const textBoost = computeTextBoost(ar.description);
              const operationBoost = computeOperationTypeBoost(ar.description, operationType);
              return {
                id: ar.id,
                type: FINANCIAL_LINK_TYPE.RECEIVABLE,
                description: ar.description,
                amount: ar.net_amount,
                date: ar.due_date,
                status: ar.status,
                matchScore: Math.min(baseScore + textBoost + operationBoost, 1),
                matchReason: [
                  textBoost > 0 && 'semelhança textual',
                  operationBoost > 0 && `tipo ${operationType}`,
                  'valor/data aproximados',
                ]
                  .filter(Boolean)
                  .join(' + '),
              };
            })(),
          })),
        );
      }
    }

    // Ordenar por score
    return suggestions.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error('Error finding suggestions:', error);
    return [];
  }
}

/**
 * Executa o matching inteligente de AP contra transações bancárias reais.
 */
export async function runPayableReconciliationMatching(clinicId) {
  return listPayableReconciliationReviews(clinicId, 'review');
}

function isOpenPayableStatus(status) {
  return !['paid', 'pago', 'paga', 'received', 'recebido', 'canceled', 'cancelado', 'cancelada', 'reversed', 'estornado'].includes(
    String(status || '').toLowerCase(),
  );
}

function getPayableMatchAmount(payable = {}) {
  return Number(payable.balance_amount ?? payable.net_amount ?? payable.amount ?? 0);
}

function normalizeStatementAmount(statement = {}) {
  return Math.abs(Number(statement.amount || 0));
}

function normalizeMatchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getStatementMatchText(statement = {}) {
  return normalizeMatchText([
    statement.description,
    statement.metadata?.source_complement,
    statement.metadata?.source_history,
    statement.metadata?.source_document,
    statement.bank_id,
  ].filter(Boolean).join(' '));
}

function getPayableMatchText(payable = {}) {
  return normalizeMatchText([
    payable.description,
    payable.supplier_name,
    payable.vendor_name,
    payable.document_number,
    payable.invoice_number,
    payable.metadata?.source_document,
    payable.metadata?.nf_number,
    payable.metadata?.notes,
  ].filter(Boolean).join(' '));
}

function calculateTextMatchBoost(statement = {}, payable = {}) {
  const statementText = getStatementMatchText(statement);
  const payableText = getPayableMatchText(payable);
  if (!statementText || !payableText) return 0;

  const statementTokens = statementText.split(/\s+/).filter((token) => token.length >= 4);
  const payableTokens = new Set(payableText.split(/\s+/).filter((token) => token.length >= 4));
  const matches = statementTokens.filter((token) => payableTokens.has(token) || payableText.includes(token)).length;
  const referenceMatches = [payable.document_number, payable.invoice_number]
    .filter(Boolean)
    .some((value) => statementText.includes(normalizeMatchText(value)));

  return Math.min((matches * 0.04) + (referenceMatches ? 0.12 : 0), 0.2);
}

function buildPayableReviewItem(statement, payable, status = 'review', matchScore = 0) {
  return {
    transaction: {
      id: statement.id,
      statement_id: statement.id,
      transaction_date: statement.statement_date,
      amount: Number(statement.amount || 0),
      description: statement.description,
      reference_number: statement.bank_id,
      matched_to_id: payable?.id || statement.linked_financial_id || null,
      match_type: status === 'matched' ? 'manual_approved' : 'valor_data_extrato_importado',
      match_confidence: Math.round(matchScore * 100),
      status,
      notes: statement.divergence_reason || '',
    },
    statement,
    payable: payable || null,
  };
}

async function listPayablesByIds(ids = []) {
  const payableIds = [...new Set(ids.filter(Boolean))];
  if (payableIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('ap_bills')
    .select('id, supplier_name, vendor_name, description, document_number, invoice_number, amount, net_amount, balance_amount, due_date, paid_at, status, metadata')
    .in('id', payableIds);

  if (error) throw error;
  return new Map((data || []).map((payable) => [payable.id, payable]));
}

async function listOpenPayablesForMatching(clinicId) {
  const { data, error } = await supabase
    .from('ap_bills')
    .select('id, supplier_name, vendor_name, description, document_number, invoice_number, amount, net_amount, balance_amount, due_date, paid_at, status, metadata')
    .eq('clinic_id', clinicId)
    .limit(10000);

  if (error) throw error;
  return (data || []).filter((payable) => isOpenPayableStatus(payable.status) && getPayableMatchAmount(payable) > 0);
}

function findBestPayableMatch(statement, payables = []) {
  const statementAmount = normalizeStatementAmount(statement);
  if (statementAmount <= 0) return null;

  return payables.reduce((best, payable) => {
    const payableAmount = getPayableMatchAmount(payable);
    if (payableAmount <= 0) return best;

    const amountDiffPct = Math.abs(statementAmount - payableAmount) / Math.max(statementAmount, payableAmount);
    if (amountDiffPct > 0.05) return best;

    const score = Math.min(
      calculateMatchScore(statementAmount, payableAmount, statement.statement_date, payable.due_date, 7)
        + calculateTextMatchBoost(statement, payable),
      1,
    );
    if (!best || score > best.score) {
      return { payable, score };
    }

    return best;
  }, null);
}

/**
 * Lista matches de Contas a Pagar aguardando revisão/aprovados/rejeitados.
 */
export async function listPayableReconciliationReviews(clinicId, status = 'review') {
  const { data: statements, error: statementError } = await supabase
    .from('conciliation_bank_statements')
    .select('id, bank_account_id, statement_date, description, amount, transaction_type, bank_id, status, linked_financial_id, linked_type, divergence_reason, metadata')
    .eq('clinic_id', clinicId)
    .order('statement_date', { ascending: false })
    .limit(5000);

  if (statementError) throw statementError;

  const rows = statements || [];

  if (status === 'matched') {
    const matchedStatements = rows.filter((statement) => statement.status === CONCILIATION_STATUS.CONCILIATED && statement.linked_type === FINANCIAL_LINK_TYPE.PAYABLE);
    const payablesById = await listPayablesByIds(matchedStatements.map((statement) => statement.linked_financial_id));
    return matchedStatements.map((statement) => buildPayableReviewItem(statement, payablesById.get(statement.linked_financial_id), 'matched', 1));
  }

  if (status === 'rejected') {
    const rejectedStatements = rows.filter((statement) => statement.status === CONCILIATION_STATUS.DIVERGENT && statement.linked_type === FINANCIAL_LINK_TYPE.PAYABLE);
    const payablesById = await listPayablesByIds(rejectedStatements.map((statement) => statement.linked_financial_id));
    return rejectedStatements.map((statement) => buildPayableReviewItem(statement, payablesById.get(statement.linked_financial_id), 'rejected', 0));
  }

  const reviewStatements = rows.filter((statement) => statement.status === CONCILIATION_STATUS.PENDING && statement.transaction_type === TRANSACTION_TYPE.DEBIT);
  const payables = await listOpenPayablesForMatching(clinicId);
  const reviewItems = reviewStatements
    .map((statement) => {
      const match = findBestPayableMatch(statement, payables);
      return match ? buildPayableReviewItem(statement, match.payable, 'review', match.score) : null;
    })
    .filter(Boolean);

  if (status === 'all') {
    const matchedItems = await listPayableReconciliationReviews(clinicId, 'matched');
    const rejectedItems = await listPayableReconciliationReviews(clinicId, 'rejected');
    return [...reviewItems, ...matchedItems, ...rejectedItems];
  }

  return reviewItems;
}

/**
 * Conta matches AP por status sem depender do filtro atualmente selecionado na UI.
 */
export async function listPayableReconciliationReviewCounts(clinicId) {
  const [review, matched, rejected] = await Promise.all([
    listPayableReconciliationReviews(clinicId, 'review'),
    listPayableReconciliationReviews(clinicId, 'matched'),
    listPayableReconciliationReviews(clinicId, 'rejected'),
  ]);

  return {
    review: review.length,
    matched: matched.length,
    rejected: rejected.length,
    all: review.length + matched.length + rejected.length,
  };
}

async function updatePayableReconciliationMetadata(payableId, patch) {
  const { data: payable, error: fetchError } = await supabase
    .from('ap_bills')
    .select('metadata')
    .eq('id', payableId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const metadata = payable?.metadata || {};
  const enterprise = metadata.enterprise || {};
  const reconciliation = enterprise.reconciliation || {};

  const { error: updateError } = await supabase
    .from('ap_bills')
    .update({
      metadata: {
        ...metadata,
        enterprise: {
          ...enterprise,
          reconciliation: {
            ...reconciliation,
            ...patch,
          },
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', payableId);

  if (updateError) {
    throw updateError;
  }
}

async function updatePayableAsPaidFromReconciliation(payableId, transaction, actorId, approvedAt) {
  const { data: payable, error: fetchError } = await supabase
    .from('ap_bills')
    .select('metadata,amount,net_amount,paid_value,balance_amount')
    .eq('id', payableId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const metadata = payable?.metadata || {};
  const enterprise = metadata.enterprise || {};
  const reconciliation = enterprise.reconciliation || {};
  const paidValue = Math.abs(Number(transaction?.amount || payable?.net_amount || payable?.amount || 0));
  const paymentDate = String(transaction?.statement_date || approvedAt).split('T')[0];
  const payload = {
    status: 'PAID',
    paid_value: paidValue,
    balance_amount: 0,
    payment_date: paymentDate,
    paid_at: approvedAt,
    updated_at: approvedAt,
    metadata: {
      ...metadata,
      enterprise: {
        ...enterprise,
        reconciliation: {
          ...reconciliation,
          status: 'MATCHED',
          bank_statement_id: transaction?.id || reconciliation.bank_statement_id,
          bank_transaction_id: transaction?.id || reconciliation.bank_transaction_id,
          confidence: 100,
          match_type: 'manual_approved',
          approved_at: approvedAt,
          approved_by: actorId,
          payment_amount: paidValue,
          payment_date: paymentDate,
        },
      },
    },
  };

  const tryUpdate = async (candidate) => supabase
    .from('ap_bills')
    .update(candidate)
    .eq('id', payableId);

  const first = await tryUpdate(payload);
  if (!first.error) return;

  const { payment_date, paid_at, ...withoutOptionalDates } = payload;
  const second = await tryUpdate(withoutOptionalDates);
  if (!second.error) return;

  throw second.error;
}

/**
 * Aprova um match AP sugerido pela rotina inteligente.
 */
export async function approvePayableReconciliationMatch(transactionId, payableId) {
  if (!payableId) {
    throw new Error('Conta a pagar não informada para aprovação. Troque a vinculação ou rode a conciliação novamente.');
  }

  const { data: userResult } = await supabase.auth.getUser().catch(() => ({ data: null }));
  const actorId = userResult?.user?.id || null;
  const approvedAt = new Date().toISOString();

  const { data: transaction, error: transactionError } = await supabase
    .from('conciliation_bank_statements')
    .update({
      linked_financial_id: payableId,
      linked_type: FINANCIAL_LINK_TYPE.PAYABLE,
      status: CONCILIATION_STATUS.CONCILIATED,
      divergence_reason: null,
      updated_at: approvedAt,
    })
    .eq('id', transactionId)
    .select('id,statement_date,amount,description')
    .single();

  if (transactionError) {
    throw transactionError;
  }

  await updatePayableAsPaidFromReconciliation(payableId, transaction, actorId, approvedAt);

  try {
    await addLinkHistory({
      bank_statement_id: transactionId,
      financial_id: payableId,
      financial_type: FINANCIAL_LINK_TYPE.PAYABLE,
      action: CONCILIATION_ACTION.CONCILIATE,
      action_notes: 'Correspondência AP aprovada na revisão manual',
      user_id: actorId,
    });
  } catch (historyError) {
    console.warn('Payable reconciliation history insert skipped:', historyError?.message || historyError);
  }

  return transaction;
}

/**
 * Rejeita um match AP sem remover a trilha de auditoria no metadata.
 */
export async function rejectPayableReconciliationMatch(transactionId, payableId, reason) {
  const { data: userResult } = await supabase.auth.getUser().catch(() => ({ data: null }));
  const actorId = userResult?.user?.id || null;
  const rejectedAt = new Date().toISOString();

  const { data: transaction, error: transactionError } = await supabase
    .from('conciliation_bank_statements')
    .update({
      linked_financial_id: payableId || null,
      linked_type: FINANCIAL_LINK_TYPE.PAYABLE,
      status: CONCILIATION_STATUS.DIVERGENT,
      divergence_reason: reason || `Correspondência AP rejeitada manualmente em ${rejectedAt}`,
      updated_at: rejectedAt,
    })
    .eq('id', transactionId)
    .select('id')
    .single();

  if (transactionError) {
    throw transactionError;
  }

  if (payableId) {
    try {
      await updatePayableReconciliationMetadata(payableId, {
        status: 'REJECTED',
        rejected_at: rejectedAt,
        rejected_by: actorId,
        rejection_reason: reason || 'Rejeitado na revisão manual',
      });
    } catch (metadataError) {
      console.warn('Payable rejection metadata update skipped:', metadataError?.message || metadataError);
    }
  }

  try {
    await addLinkHistory({
      bank_statement_id: transactionId,
      financial_id: payableId || null,
      financial_type: FINANCIAL_LINK_TYPE.PAYABLE,
      action: CONCILIATION_ACTION.IGNORE,
      action_notes: reason || 'Correspondência AP rejeitada na revisão manual',
      user_id: actorId,
    });
  } catch (historyError) {
    console.warn('Payable rejection history insert skipped:', historyError?.message || historyError);
  }

  return transaction;
}

/**
 * Calcular score de correspondência
 */
function calculateMatchScore(amount1, amount2, date1, date2, maxDays) {
  let score = 1.0;

  // Penalidade por diferença de valor
  const amountDiff = Math.abs(amount1 - amount2);
  const amountPercent = (amountDiff / Math.max(Math.abs(amount1), Math.abs(amount2))) * 100;
  if (amountPercent > 0) {
    score -= Math.min(amountPercent / 100, 0.3); // até 30% de penalidade
  }

  // Penalidade por diferença de data
  if (date1 && date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const daysDiff = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays) {
      score -= 0.3;
    } else if (daysDiff > 0) {
      score -= (daysDiff / maxDays) * 0.15;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/* ============================================
   HISTÓRICO E AUDITORIA
   ============================================ */

/**
 * Adicionar registro ao histórico de vinculação
 */
export async function addLinkHistory({
  bank_statement_id,
  financial_id = null,
  financial_type = null,
  action,
  action_notes = null,
  user_id = null,
}) {
  try {
    const { data, error } = await supabase
      .from('conciliation_link_history')
      .insert([
        {
          bank_statement_id,
          financial_id,
          financial_type,
          action,
          action_notes,
          user_id,
        },
      ])
      .select();

    if (error) {
      throw error;
    }
    return data?.[0];
  } catch (error) {
    console.error('Error adding link history:', error);
    throw error;
  }
}

/**
 * Obter histórico de um extrato
 */
export async function getStatementHistory(statementId) {
  try {
    const { data, error } = await supabase
      .from('conciliation_link_history')
      .select('*')
      .eq('bank_statement_id', statementId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error getting statement history:', error);
    return [];
  }
}

/* ============================================
   INDICADORES E SALDOS
   ============================================ */

/**
 * Obter resumo de indicadores para o painel
 */
export async function getIndicators(clinicId, accountId = null, startDate = null, endDate = null) {
  try {
    let query = supabase
      .from('conciliation_bank_statements')
      .select('status, amount, transaction_type');

    query = query.eq('clinic_id', clinicId);
    if (accountId) {
      query = query.eq('bank_account_id', accountId);
    }
    if (startDate) {
      query = query.gte('statement_date', startDate);
    }
    if (endDate) {
      query = query.lte('statement_date', endDate);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const indicators = {
      pending: 0,
      conciliated: 0,
      adjusted: 0,
      divergent: 0,
      ignored: 0,
      totalCredit: 0,
      totalDebit: 0,
      difference: 0,
    };

    data?.forEach((stmt) => {
      const amount = Math.abs(Number(stmt.amount || 0));

      // Contar por status
      if (stmt.status === CONCILIATION_STATUS.PENDING) {
        indicators.pending += amount;
      }
      if (stmt.status === CONCILIATION_STATUS.CONCILIATED) {
        indicators.conciliated += amount;
      }
      if (stmt.status === CONCILIATION_STATUS.ADJUSTED) {
        indicators.adjusted += amount;
      }
      if (stmt.status === CONCILIATION_STATUS.DIVERGENT) {
        indicators.divergent += amount;
      }
      if (stmt.status === CONCILIATION_STATUS.IGNORED) {
        indicators.ignored += amount;
      }

      // Contar créditos e débitos
      if (stmt.transaction_type === TRANSACTION_TYPE.CREDIT) {
        indicators.totalCredit += amount;
      } else {
        indicators.totalDebit += amount;
      }
    });

    indicators.difference = indicators.totalCredit - indicators.totalDebit;

    return indicators;
  } catch (error) {
    console.error('Error getting indicators:', error);
    throw error;
  }
}

/* ============================================
   CONTAS BANCÁRIAS
   ============================================ */

/**
 * Listar contas bancárias da clínica
 */
export async function listBankAccounts(clinicId) {
  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('account_name');

    if (!error) {
      return data || [];
    }

    // Fallback legado para ambientes antigos que ainda usem clinic_bank_accounts
    const { data: legacyData, error: legacyError } = await supabase
      .from('clinic_bank_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('active', true)
      .order('account_name');

    if (legacyError) {
      throw legacyError;
    }

    return legacyData || [];
  } catch (error) {
    console.error('Error listing bank accounts:', error);
    return [];
  }
}

/**
 * Criar conta bancária
 */
export async function createBankAccount({
  clinicId,
  accountName,
  bankName,
  accountNumber,
  accountHolder,
}) {
  try {
    const { data, error } = await supabase
      .from('clinic_bank_accounts')
      .insert([
        {
          clinic_id: clinicId,
          account_name: accountName,
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
          active: true,
        },
      ])
      .select();

    if (error) {
      throw error;
    }
    return data?.[0];
  } catch (error) {
    console.error('Error creating bank account:', error);
    throw error;
  }
}

/**
 * Atualizar saldos de conta bancária
 */
export async function updateBankAccountBalance(accountId, bankBalance, systemBalance) {
  try {
    const { data, error } = await supabase
      .from('clinic_bank_accounts')
      .update({
        bank_balance: bankBalance,
        system_balance: systemBalance,
        last_reconciliation_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', accountId)
      .select();

    if (error) {
      throw error;
    }
    return data?.[0];
  } catch (error) {
    console.error('Error updating bank account balance:', error);
    throw error;
  }
}

/**
 * Deleta um lançamento bancário
 */
export async function deleteStatement(statementId) {
  try {
    const { error } = await supabase
      .from('conciliation_bank_statements')
      .delete()
      .eq('id', statementId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting statement:', error);
    throw error;
  }
}

/**
 * Deleta lançamentos bancários em lote
 */
export async function deleteStatements(statementIds = []) {
  const ids = Array.from(new Set((statementIds || []).filter(Boolean)));
  if (ids.length === 0) {
    return { success: true, deleted: 0 };
  }

  try {
    const { error } = await supabase
      .from('conciliation_bank_statements')
      .delete()
      .in('id', ids);

    if (error) {
      throw error;
    }

    return { success: true, deleted: ids.length };
  } catch (error) {
    console.error('Error deleting statements:', error);
    throw error;
  }
}
