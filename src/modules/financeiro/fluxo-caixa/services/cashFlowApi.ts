/**
 * 💰 Serviço de API - Fluxo de Caixa
 */

import { supabase } from '@/lib/customSupabaseClient';
import type {
  CashFlowSnapshot,
  CashFlowPrediction,
  DailyAnalysis,
  PeriodSummary,
  DashboardMetrics,
  CashFlowAlert,
  ProjectionPoint,
  BankConsolidation,
  CashFlowFilters,
  CalculateCashFlowResponse,
  RefreshCashFlowPeriodResponse,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// SNAPSHOTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula snapshot de fluxo de caixa para um dia específico
 */
export async function calculateCashFlowSnapshot(
  clinicId: string,
  snapshotDate: string,
  accountId?: string
): Promise<CalculateCashFlowResponse | null> {
  try {
    const { data, error } = await supabase.rpc(
      'calculate_cash_flow_snapshot',
      {
        p_clinic_id: clinicId,
        p_snapshot_date: snapshotDate,
        p_account_id: accountId || null,
      }
    );

    if (error) {
      console.error('Erro ao calcular snapshot:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Erro ao calcular snapshot:', err);
    return null;
  }
}

/**
 * Atualiza fluxo de caixa para período
 */
export async function refreshCashFlowPeriod(
  clinicId: string,
  startDate: string,
  endDate: string
): Promise<RefreshCashFlowPeriodResponse | null> {
  try {
    const { data, error } = await supabase.rpc(
      'refresh_cash_flow_period',
      {
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate,
      }
    );

    if (error) {
      console.error('Erro ao atualizar período:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('Erro ao atualizar período:', err);
    return null;
  }
}

/**
 * Obtém snapshots de um período
 */
export async function getCashFlowSnapshots(
  clinicId: string,
  startDate: string,
  endDate: string,
  accountId?: string
): Promise<CashFlowSnapshot[]> {
  try {
    let query = supabase
      .from('cash_flow_snapshots')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: false });

    if (accountId) {
      query = query.eq('financial_account_id', accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao obter snapshots:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro ao obter snapshots:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtém análise diária de fluxo de caixa
 */
export async function getDailyAnalysis(
  clinicId: string,
  date: string
): Promise<DailyAnalysis[]> {
  try {
    const { data, error } = await supabase
      .from('v_cash_flow_daily_analysis')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('analysis_date', date);

    if (error) {
      console.error('Erro ao obter análise diária:', error);
      return [];
    }

    return (data || []).map(row => ({
      analysis_date: row.analysis_date,
      financial_account_id: row.financial_account_id,
      account_name: row.account_name,
      realized_opening: row.realized_opening,
      realized_income: row.realized_income,
      realized_expense: row.realized_expense,
      realized_closing: row.realized_closing,
      realized_net: (row.realized_income - row.realized_expense),
      projected_income: row.projected_income,
      projected_expense: row.projected_expense,
      projected_balance: row.projected_balance,
      projected_net: (row.projected_income - row.projected_expense),
      income_variance: row.income_variance,
      expense_variance: row.expense_variance,
      balance_variance: row.balance_variance,
      clinic_id: row.clinic_id,
    }));
  } catch (err) {
    console.error('Erro ao obter análise diária:', err);
    return [];
  }
}

/**
 * Obtém resumo de período
 */
export async function getPeriodSummary(
  clinicId: string,
  startDate: string,
  endDate: string
): Promise<PeriodSummary[]> {
  try {
    const { data, error } = await supabase
      .from('v_cash_flow_period_summary')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('period_start', startDate)
      .lte('period_end', endDate);

    if (error) {
      console.error('Erro ao obter resumo de período:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro ao obter resumo de período:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula métricas do dashboard financeiro
 */
export async function getDashboardMetrics(
  clinicId: string
): Promise<DashboardMetrics | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
      .toISOString()
      .split('T')[0];
    const next7days = new Date(new Date().setDate(new Date().getDate() + 7))
      .toISOString()
      .split('T')[0];
    const next30days = new Date(new Date().setDate(new Date().getDate() + 30))
      .toISOString()
      .split('T')[0];

    // Hoje
    const todayAnalysis = await getDailyAnalysis(clinicId, today);
    const today_income = todayAnalysis.reduce((sum, a) => sum + a.realized_income, 0);
    const today_expense = todayAnalysis.reduce((sum, a) => sum + a.realized_expense, 0);
    const today_net = today_income - today_expense;
    const current_balance = todayAnalysis.reduce((sum, a) => sum + a.realized_closing, 0);

    // Previsto 7 dias
    const next7daysSnapshots = await getCashFlowSnapshots(clinicId, today, next7days);
    const projected_7days_income = next7daysSnapshots.reduce(
      (sum, s) => sum + s.projected_income,
      0
    );
    const projected_7days_expense = next7daysSnapshots.reduce(
      (sum, s) => sum + s.projected_expense,
      0
    );
    const projected_7days_balance =
      current_balance + projected_7days_income - projected_7days_expense;

    // Previsto 30 dias
    const next30daysSnapshots = await getCashFlowSnapshots(clinicId, today, next30days);
    const projected_30days_income = next30daysSnapshots.reduce(
      (sum, s) => sum + s.projected_income,
      0
    );
    const projected_30days_expense = next30daysSnapshots.reduce(
      (sum, s) => sum + s.projected_expense,
      0
    );
    const projected_30days_balance =
      current_balance + projected_30days_income - projected_30days_expense;

    // Consolidado
    const allSnapshots = await getCashFlowSnapshots(clinicId, today, next30days);
    const consolidated_income = allSnapshots.reduce((sum, s) => sum + s.total_income, 0);
    const consolidated_expense = allSnapshots.reduce((sum, s) => sum + s.total_expense, 0);
    const consolidated_balance = current_balance;

    // Saúde do caixa
    let cash_health: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (projected_30days_balance < 0) {
      cash_health = 'critical';
    } else if (projected_30days_balance < current_balance * 0.5) {
      cash_health = 'warning';
    }

    // Contas
    const { count: accountsCount } = await supabase
      .from('financial_accounts')
      .select('id', { count: 'exact' })
      .eq('clinic_id', clinicId);

    return {
      current_date: today,
      current_balance,
      previous_balance: current_balance - today_net,
      today_income,
      today_expense,
      today_net,
      projected_7days_income,
      projected_7days_expense,
      projected_7days_balance,
      projected_30days_income,
      projected_30days_expense,
      projected_30days_balance,
      consolidated_income,
      consolidated_expense,
      consolidated_balance,
      cash_health,
      accounts_count: accountsCount || 0,
    };
  } catch (err) {
    console.error('Erro ao calcular métricas:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVISÕES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cria previsão de fluxo de caixa
 */
export async function createPrediction(
  clinicId: string,
  accountId: string,
  prediction: Omit<CashFlowPrediction, 'id' | 'clinic_id' | 'created_at' | 'updated_at' | 'created_by'>
): Promise<CashFlowPrediction | null> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('cash_flow_predictions')
      .insert([
        {
          clinic_id: clinicId,
          financial_account_id: accountId,
          prediction_date: prediction.prediction_date,
          prediction_type: prediction.prediction_type,
          amount: prediction.amount,
          description: prediction.description,
          category_id: prediction.category_id,
          status: prediction.status,
          created_by: user.data.user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar previsão:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Erro ao criar previsão:', err);
    return null;
  }
}

/**
 * Obtém previsões de um período
 */
export async function getPredictions(
  clinicId: string,
  startDate: string,
  endDate: string,
  filters?: CashFlowFilters
): Promise<CashFlowPrediction[]> {
  try {
    let query = supabase
      .from('cash_flow_predictions')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('prediction_date', startDate)
      .lte('prediction_date', endDate);

    if (filters?.financial_account_ids?.length) {
      query = query.in('financial_account_id', filters.financial_account_ids);
    }

    if (filters?.type) {
      query = query.eq('prediction_type', filters.type);
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query = query.in('status', statuses);
    }

    const { data, error } = await query.order('prediction_date', { ascending: false });

    if (error) {
      console.error('Erro ao obter previsões:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro ao obter previsões:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSOLIDAÇÃO BANCÁRIA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtém consolidação bancária para uma data
 */
export async function getBankConsolidation(
  clinicId: string,
  date: string
): Promise<BankConsolidation | null> {
  try {
    // Obter todas as contas
    const { data: accounts, error: accountsError } = await supabase
      .from('financial_accounts')
      .select('id, account_name, account_type, balance')
      .eq('clinic_id', clinicId);

    if (accountsError) throw accountsError;

    // Obter snapshots para a data
    const snapshots = await getCashFlowSnapshots(clinicId, date, date);

    const consolidation: BankConsolidation = {
      clinic_id: clinicId,
      consolidation_date: date,
      accounts: (accounts || []).map(account => {
        const snapshot = snapshots.find(s => s.financial_account_id === account.id);

        return {
          account_id: account.id,
          account_name: account.account_name,
          account_type: account.account_type,
          realized_balance: snapshot?.closing_balance || account.balance,
          projected_balance: snapshot?.projected_balance || account.balance,
          total_transactions:
            (snapshot?.total_income > 0 ? 1 : 0) +
            (snapshot?.total_expense > 0 ? 1 : 0),
          pending_transactions: 0, // Será calculado
        };
      }),
      total_realized_balance: (accounts || []).reduce(
        (sum, a) => sum + (a.balance || 0),
        0
      ),
      total_projected_balance: snapshots.reduce(
        (sum, s) => sum + s.projected_balance,
        0
      ),
      total_transactions: snapshots.reduce(
        (sum, s) =>
          sum +
          (s.total_income > 0 ? 1 : 0) +
          (s.total_expense > 0 ? 1 : 0),
        0
      ),
      total_pending: 0,
    };

    return consolidation;
  } catch (err) {
    console.error('Erro ao obter consolidação bancária:', err);
    return null;
  }
}

export { supabase };
