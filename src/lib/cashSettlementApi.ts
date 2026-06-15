/**
 * Cash Settlement Service - ETAPA 3
 * 
 * Handles automatic settlement of receivables and payables
 * with cash flow integration, balance updates, and rollback capabilities
 */

import { customSupabaseClient } from '@/lib/customSupabaseClient';

export interface CashSettlement {
  success: boolean;
  settlement_log_id?: number;
  cf_entrada_id?: number;
  cf_saida_id?: number;
  account_id?: string;
  account_balance_before?: number;
  account_balance_after?: number;
  amount_settled?: number;
  error?: string;
}

export interface SettlementLog {
  id: number;
  clinic_id: string;
  origin_type: string;
  origin_id: string;
  account_from?: string;
  account_to?: string;
  amount: number;
  description?: string;
  cf_entrada_amount?: number;
  cf_saida_amount?: number;
  cf_entries_created?: string[];
  status: string;
  error_message?: string;
  is_reversal: boolean;
  reversal_of_id?: number;
  reversal_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Settle receivable payment - integra pagamento com cash flow
 */
export async function settleReceivablePayment(
  paymentId: number,
  clinicId: string
): Promise<CashSettlement> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('settle_receivable_payment', {
        p_payment_id: paymentId,
        p_clinic_id: clinicId,
      });

    if (error) {
      console.error('[settleReceivablePayment] Error:', error);
      throw error;
    }

    return data as CashSettlement;
  } catch (err) {
    console.error('[settleReceivablePayment] Exception:', err);
    throw err;
  }
}

/**
 * Settle payable payment - integra pagamento de despesa com cash flow
 */
export async function settlePayablePayment(
  payableId: number,
  clinicId: string,
  accountId: string
): Promise<CashSettlement> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('settle_payable_payment', {
        p_payable_id: payableId,
        p_clinic_id: clinicId,
        p_account_id: accountId,
      });

    if (error) throw error;
    return data as CashSettlement;
  } catch (err) {
    console.error('[settlePayablePayment] Error:', err);
    throw err;
  }
}

/**
 * Reverse settlement - desfaz uma baixa (rollback)
 */
export async function reverseSettlement(
  settlementLogId: number,
  clinicId: string,
  reason?: string
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('reverse_settlement', {
        p_settlement_log_id: settlementLogId,
        p_clinic_id: clinicId,
        p_reason: reason || 'Manual reversal',
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[reverseSettlement] Error:', err);
    throw err;
  }
}

/**
 * Get settlement impact - calcula impacto da baixa no cash flow
 */
export async function getSettlementImpact(
  settlementLogId: number
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('get_settlement_impact', {
        p_settlement_log_id: settlementLogId,
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[getSettlementImpact] Error:', err);
    throw err;
  }
}

/**
 * Get settlement logs for clinic
 */
export async function getSettlementLogs(
  clinicId: string,
  filters?: {
    originType?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<SettlementLog[]> {
  try {
    let query = customSupabaseClient
      .from('cash_settlement_logs')
      .select('*')
      .eq('clinic_id', clinicId);

    if (filters?.originType) {
      query = query.eq('origin_type', filters.originType);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('created_at', filters.toDate);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as SettlementLog[];
  } catch (err) {
    console.error('[getSettlementLogs] Error:', err);
    throw err;
  }
}

/**
 * Get settlement by ID
 */
export async function getSettlementById(
  settlementId: number
): Promise<SettlementLog | null> {
  try {
    const { data, error } = await customSupabaseClient
      .from('cash_settlement_logs')
      .select('*')
      .eq('id', settlementId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as SettlementLog) || null;
  } catch (err) {
    console.error('[getSettlementById] Error:', err);
    throw err;
  }
}

/**
 * Get settlement statistics
 */
export async function getSettlementStats(
  clinicId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  total_settlements: number;
  total_amount: number;
  total_entradas: number;
  total_saidas: number;
  total_reversals: number;
  average_amount: number;
  by_origin: Record<string, number>;
}> {
  try {
    let query = customSupabaseClient
      .from('cash_settlement_logs')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('is_reversal', false);

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      query = query.lte('created_at', toDate);
    }

    const { data: settlements, count, error } = await query;

    if (error) throw error;

    const totalAmount = (settlements || []).reduce(
      (acc, s) => acc + (s.amount || 0),
      0
    );

    const totalEntradas = (settlements || []).reduce(
      (acc, s) => acc + (s.cf_entrada_amount || 0),
      0
    );

    const totalSaidas = (settlements || []).reduce(
      (acc, s) => acc + (s.cf_saida_amount || 0),
      0
    );

    const byOrigin = (settlements || []).reduce(
      (acc, s) => ({
        ...acc,
        [s.origin_type]: (acc[s.origin_type] || 0) + (s.amount || 0),
      }),
      {} as Record<string, number>
    );

    // Contar reversals
    const { data: reversals, error: reversalError } = await customSupabaseClient
      .from('cash_settlement_logs')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('is_reversal', true);

    if (reversalError) throw reversalError;

    return {
      total_settlements: count || 0,
      total_amount: totalAmount,
      total_entradas: totalEntradas,
      total_saidas: totalSaidas,
      total_reversals: reversals?.length || 0,
      average_amount: (count || 0) > 0 ? totalAmount / (count || 1) : 0,
      by_origin: byOrigin,
    };
  } catch (err) {
    console.error('[getSettlementStats] Error:', err);
    throw err;
  }
}

/**
 * Get unsettled receivables
 */
export async function getUnsettledReceivables(
  clinicId: string
): Promise<Array<{ receivable_id: number; amount: number; status: string }>> {
  try {
    const { data, error } = await customSupabaseClient
      .from('ar_invoices')
      .select('id, valor_liquido, status')
      .eq('clinic_id', clinicId)
      .in('status', ['pending', 'partial', 'overdue'])
      .not('id', 'in', `(SELECT DISTINCT receivable_id FROM receivable_payments)`);

    if (error) throw error;

    return (data || []).map((r) => ({
      receivable_id: r.id,
      amount: r.valor_liquido,
      status: r.status,
    }));
  } catch (err) {
    console.error('[getUnsettledReceivables] Error:', err);
    throw err;
  }
}

/**
 * Bulk settle receivable payments
 */
export async function bulkSettleReceivablePayments(
  clinicId: string,
  paymentIds: number[]
): Promise<{
  successful: number;
  failed: number;
  results: Array<{
    paymentId: number;
    success: boolean;
    error?: string;
  }>;
}> {
  try {
    const results = await Promise.all(
      paymentIds.map(async (paymentId) => {
        try {
          const result = await settleReceivablePayment(paymentId, clinicId);
          return {
            paymentId,
            success: result.success,
            error: result.error,
          };
        } catch (err) {
          return {
            paymentId,
            success: false,
            error: (err as Error).message,
          };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return { successful, failed, results };
  } catch (err) {
    console.error('[bulkSettleReceivablePayments] Error:', err);
    throw err;
  }
}

/**
 * Verify settlement integrity
 * Valida se todas as lowas foram registradas corretamente
 */
export async function verifySettlementIntegrity(
  clinicId: string
): Promise<{
  integrity_ok: boolean;
  discrepancies: string[];
}> {
  try {
    const discrepancies: string[] = [];

    // Verificar se todos os pagamentos têm settlement log
    const { data: unLoggedPayments } = await customSupabaseClient
      .rpc(
        `
      SELECT rp.id FROM receivable_payments rp
      WHERE rp.clinic_id = $1
      AND rp.id NOT IN (
        SELECT origin_id::BIGINT FROM cash_settlement_logs 
        WHERE origin_type = 'receivable_payment'
      )
      `,
        [clinicId]
      );

    if ((unLoggedPayments || []).length > 0) {
      discrepancies.push(
        `${unLoggedPayments.length} receivable payments without settlement logs`
      );
    }

    // Verificar balanços
    const { data: accountBalances } = await customSupabaseClient
      .from('financial_accounts')
      .select('id, saldo_inicial')
      .eq('clinic_id', clinicId);

    for (const account of accountBalances || []) {
      if (account.saldo_inicial < 0) {
        discrepancies.push(
          `Account ${account.id} has negative balance: ${account.saldo_inicial}`
        );
      }
    }

    return {
      integrity_ok: discrepancies.length === 0,
      discrepancies,
    };
  } catch (err) {
    console.error('[verifySettlementIntegrity] Error:', err);
    throw err;
  }
}

export default {
  settleReceivablePayment,
  settlePayablePayment,
  reverseSettlement,
  getSettlementImpact,
  getSettlementLogs,
  getSettlementById,
  getSettlementStats,
  getUnsettledReceivables,
  bulkSettleReceivablePayments,
  verifySettlementIntegrity,
};
