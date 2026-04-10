// src/lib/conciliationApi.js
// API para Conciliação Bancária

import { supabase } from '@/lib/customSupabaseClient.js';
import { 
  CONCILIATION_STATUS, 
  TRANSACTION_TYPE,
  FINANCIAL_LINK_TYPE,
  CONCILIATION_ACTION,
  SUGGESTION_LIMITS
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
  offset = 0
}) {
  try {
    let query = supabase
      .from('conciliation_bank_statements')
      .select('*', { count: 'exact' });

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

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      total: count || 0
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting bank statement:', error);
    throw error;
  }
}

/**
 * Importar extrato (criar múltiplos registros)
 */
export async function importBankStatements({
  clinicId,
  statements,
  batchId = null,
  accountId = null
}) {
  try {
    const records = statements.map(stmt => ({
      clinic_id: clinicId,
      bank_account_id: accountId,
      statement_date: stmt.date || stmt.statement_date,
      description: stmt.description,
      amount: parseFloat(stmt.amount),
      transaction_type: stmt.type || stmt.transaction_type,
      status: CONCILIATION_STATUS.PENDING,
      import_batch_id: batchId,
      created_by: null // será preenchido pelo trigger se houver user_id
    }));

    const { data, error } = await supabase
      .from('conciliation_bank_statements')
      .insert(records)
      .select();

    if (error) throw error;

    return {
      imported: data.length,
      statements: data
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
      updated_at: new Date().toISOString()
    };

    if (divergenceReason && status === CONCILIATION_STATUS.DIVERGENT) {
      updateData.divergence_reason = divergenceReason;
    }

    const { data, error } = await supabase
      .from('conciliation_bank_statements')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
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
    // Atualizar status
    const { data: updated, error: updateError } = await supabase
      .from('conciliation_bank_statements')
      .update({
        status: CONCILIATION_STATUS.CONCILIATED,
        linked_financial_id: financialId,
        linked_type: financialType,
        updated_at: new Date().toISOString()
      })
      .eq('id', statementId)
      .select();

    if (updateError) throw updateError;

    // Registrar no histórico
    await addLinkHistory({
      bank_statement_id: statementId,
      financial_id: financialId,
      financial_type: financialType,
      action: CONCILIATION_ACTION.CONCILIATE
    });

    return updated?.[0];
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
  categoryId,
  costCenterId,
  paymentMethod = null,
  supplierId = null,
  clientId = null,
  notes = null
}) {
  try {
    let financialId;

    if (type === FINANCIAL_LINK_TYPE.PAYABLE) {
      // Criar em Contas a Pagar
      const { data, error } = await supabase
        .from('ap_bills')
        .insert([{
          clinic_id: clinicId,
          invoice_number: `AUTO-${Date.now()}`,
          supplier_id: supplierId,
          category_id: categoryId,
          cost_center_id: costCenterId,
          amount: parseFloat(amount),
          description: description || 'Lançamento automático - Conciliação Bancária',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate,
          payment_method: paymentMethod,
          status: 'open',
          notes: notes
        }])
        .select();

      if (error) throw error;
      financialId = data?.[0]?.id;
    } else if (type === FINANCIAL_LINK_TYPE.RECEIVABLE) {
      // Criar em Contas a Receber
      const { data, error } = await supabase
        .from('ar_invoices')
        .insert([{
          clinic_id: clinicId,
          invoice_number: `AUTO-${Date.now()}`,
          client_id: clientId,
          category_id: categoryId,
          cost_center_id: costCenterId,
          amount: parseFloat(amount),
          description: description || 'Lançamento automático - Conciliação Bancária',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate,
          status: 'open',
          notes: notes
        }])
        .select();

      if (error) throw error;
      financialId = data?.[0]?.id;
    }

    if (!financialId) throw new Error('Failed to create financial record');

    // Vincular com extrato
    const { data: updated, error: updateError } = await supabase
      .from('conciliation_bank_statements')
      .update({
        status: CONCILIATION_STATUS.ADJUSTED,
        linked_financial_id: financialId,
        linked_type: type,
        updated_at: new Date().toISOString()
      })
      .eq('id', statementId)
      .select();

    if (updateError) throw updateError;

    // Registrar no histórico
    await addLinkHistory({
      bank_statement_id: statementId,
      financial_id: financialId,
      financial_type: type,
      action: CONCILIATION_ACTION.ADJUST,
      action_notes: 'Lançamento criado automaticamente'
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
    return await updateBankStatementStatus(
      statementId,
      CONCILIATION_STATUS.DIVERGENT,
      reason
    );
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
        updated_at: new Date().toISOString()
      })
      .eq('id', statementId)
      .select();

    if (error) throw error;

    await addLinkHistory({
      bank_statement_id: statementId,
      action: CONCILIATION_ACTION.IGNORE,
      action_notes: reason
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
  maxDaysDifference = SUGGESTION_LIMITS.MAX_DAYS_DIFFERENCE
}) {
  try {
    const suggestions = [];

    // Buscar em Contas a Pagar (se débito ou ambos)
    if (!transactionType || transactionType === TRANSACTION_TYPE.DEBIT) {
      const { data: apSuggestions } = await supabase
        .from('ap_bills')
        .select('id, description, amount, due_date, status')
        .eq('clinic_id', clinicId)
        .gte('amount', amount * 0.95)
        .lte('amount', amount * 1.05)
        .neq('status', 'paid')
        .neq('status', 'canceled');

      if (apSuggestions) {
        suggestions.push(...apSuggestions.map(ap => ({
          id: ap.id,
          type: FINANCIAL_LINK_TYPE.PAYABLE,
          description: ap.description,
          amount: ap.amount,
          date: ap.due_date,
          status: ap.status,
          matchScore: calculateMatchScore(amount, ap.amount, statementDate, ap.due_date, maxDaysDifference),
          matchReason: 'Valor e data aproximados'
        })));
      }
    }

    // Buscar em Contas a Receber (se crédito ou ambos)
    if (!transactionType || transactionType === TRANSACTION_TYPE.CREDIT) {
      const { data: arSuggestions } = await supabase
        .from('ar_invoices')
        .select('id, description, amount, due_date, status')
        .eq('clinic_id', clinicId)
        .gte('amount', amount * 0.95)
        .lte('amount', amount * 1.05)
        .neq('status', 'paid')
        .neq('status', 'canceled');

      if (arSuggestions) {
        suggestions.push(...arSuggestions.map(ar => ({
          id: ar.id,
          type: FINANCIAL_LINK_TYPE.RECEIVABLE,
          description: ar.description,
          amount: ar.amount,
          date: ar.due_date,
          status: ar.status,
          matchScore: calculateMatchScore(amount, ar.amount, statementDate, ar.due_date, maxDaysDifference),
          matchReason: 'Valor e data aproximados'
        })));
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
  user_id = null
}) {
  try {
    const { data, error } = await supabase
      .from('conciliation_link_history')
      .insert([{
        bank_statement_id,
        financial_id,
        financial_type,
        action,
        action_notes,
        user_id
      }])
      .select();

    if (error) throw error;
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

    if (error) throw error;
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
    if (accountId) query = query.eq('bank_account_id', accountId);
    if (startDate) query = query.gte('statement_date', startDate);
    if (endDate) query = query.lte('statement_date', endDate);

    const { data, error } = await query;
    if (error) throw error;

    const indicators = {
      pending: 0,
      conciliated: 0,
      adjusted: 0,
      divergent: 0,
      ignored: 0,
      totalCredit: 0,
      totalDebit: 0,
      difference: 0
    };

    data?.forEach(stmt => {
      // Contar por status
      if (stmt.status === CONCILIATION_STATUS.PENDING) indicators.pending += stmt.amount;
      if (stmt.status === CONCILIATION_STATUS.CONCILIATED) indicators.conciliated += stmt.amount;
      if (stmt.status === CONCILIATION_STATUS.ADJUSTED) indicators.adjusted += stmt.amount;
      if (stmt.status === CONCILIATION_STATUS.DIVERGENT) indicators.divergent += stmt.amount;
      if (stmt.status === CONCILIATION_STATUS.IGNORED) indicators.ignored += stmt.amount;

      // Contar créditos e débitos
      if (stmt.transaction_type === TRANSACTION_TYPE.CREDIT) {
        indicators.totalCredit += stmt.amount;
      } else {
        indicators.totalDebit += stmt.amount;
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
      .from('clinic_bank_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('active', true)
      .order('account_name');

    if (error) throw error;
    return data || [];
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
  accountHolder
}) {
  try {
    const { data, error } = await supabase
      .from('clinic_bank_accounts')
      .insert([{
        clinic_id: clinicId,
        account_name: accountName,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        active: true
      }])
      .select();

    if (error) throw error;
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
        last_reconciliation_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', accountId)
      .select();

    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Error updating bank account balance:', error);
    throw error;
  }
}
