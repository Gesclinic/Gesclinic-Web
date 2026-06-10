/**
 * 💰 Hook: useCashFlow
 * Gerencia estado de fluxo de caixa
 * 
 * MELHORIAS (v2026-05-19):
 * - Auto-refresh mantido (5 min) como fallback
 * - Listeners realtime para cash_flow_entries (novo)
 * - Listeners realtime para ap_bills (quando status muda)
 * - Listeners realtime para ar_receivables (quando status muda)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { customSupabaseClient } from '@/lib/customSupabaseClient';
import type { CashFlowState, CashFlowFilters, DashboardMetrics } from '../types';
import {
  getCashFlowSnapshots,
  getDashboardMetrics,
  getPredictions,
  getBankConsolidation,
} from '../services/cashFlowApi';

export function useCashFlow() {
  const { clinic } = useClinicContext();
  const [state, setState] = useState<CashFlowState>({
    loading: false,
    snapshots: [],
    predictions: [],
    alerts: [],
    filters: {},
    selectedPeriod: 'monthly',
    lastRefresh: new Date().toISOString(),
  });

  // Carregar dados de fluxo de caixa
  const loadCashFlowData = useCallback(
    async (filters: CashFlowFilters = {}) => {
      if (!clinic?.id) return;

      setState(prev => ({ ...prev, loading: true, error: undefined }));

      try {
        const now = new Date();
        const startDate =
          filters.start_date ||
          new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0];
        const endDate =
          filters.end_date ||
          new Date(now.getFullYear(), now.getMonth() + 1, 0)
            .toISOString()
            .split('T')[0];

        // Parallel loading
        const [snapshots, predictions, metrics] = await Promise.all([
          getCashFlowSnapshots(clinic.id, startDate, endDate, filters.financial_account_ids?.[0]),
          getPredictions(clinic.id, startDate, endDate, filters),
          getDashboardMetrics(clinic.id),
        ]);

        setState(prev => ({
          ...prev,
          snapshots,
          predictions,
          metrics,
          filters,
          loading: false,
          lastRefresh: new Date().toISOString(),
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao carregar dados';
        setState(prev => ({ ...prev, error: message, loading: false }));
      }
    },
    [clinic?.id]
  );

  // Atualizar filtros
  const updateFilters = useCallback(
    (newFilters: CashFlowFilters) => {
      loadCashFlowData(newFilters);
    },
    [loadCashFlowData]
  );

  // Mudar período
  const setPeriod = useCallback(
    (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
      setState(prev => ({ ...prev, selectedPeriod: period }));
    },
    []
  );

  // Selecionar conta
  const selectAccount = useCallback((accountId?: string) => {
    setState(prev => ({ ...prev, selectedAccount: accountId }));
  }, []);

  // 🔥 Listeners Realtime (NOVO!)
  useEffect(() => {
    if (!clinic?.id) return;

    // Carregar dados iniciais
    loadCashFlowData();

    // Auto-refresh fallback (5 minutos)
    const interval = setInterval(() => loadCashFlowData(), 5 * 60 * 1000);

    // 🚀 LISTENER REALTIME: cash_flow_entries
    const cashFlowSubscription = customSupabaseClient
      .channel(`cash_flow_${clinic.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_flow_entries',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload) => {
          console.log('[REALTIME] cash_flow_entries updated:', payload);
          // Reload na próxima mudança (batching via isActive)
          setTimeout(() => loadCashFlowData(), 500);
        }
      )
      .subscribe();

    // 🚀 LISTENER REALTIME: AP Bills (quando status muda para paid)
    const apBillsSubscription = customSupabaseClient
      .channel(`ap_bills_paid_${clinic.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ap_bills',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload) => {
          if (payload.new.status === 'paid') {
            console.log('[REALTIME] AP Bill marked as paid:', payload.new.id);
            // Reload fluxo de caixa
            setTimeout(() => loadCashFlowData(), 500);
          }
        }
      )
      .subscribe();

    // 🚀 LISTENER REALTIME: AR Receivables (quando status muda para received)
    const arReceivablesSubscription = customSupabaseClient
      .channel(`ar_receivables_paid_${clinic.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ar_receivables',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload) => {
          if (payload.new.status === 'received') {
            console.log('[REALTIME] AR Receivable marked as received:', payload.new.id);
            // Reload fluxo de caixa
            setTimeout(() => loadCashFlowData(), 500);
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      clearInterval(interval);
      cashFlowSubscription.unsubscribe();
      apBillsSubscription.unsubscribe();
      arReceivablesSubscription.unsubscribe();
    };
  }, [clinic?.id, loadCashFlowData]);

  return {
    ...state,
    loadCashFlowData,
    updateFilters,
    setPeriod,
    selectAccount,
  };
}

/**
 * 💰 Hook: useCashFlowMetrics
 * Calcula métricas memoizadas
 */
export function useCashFlowMetrics(
  metrics: DashboardMetrics | undefined,
  snapshots: any[]
) {
  return useMemo(() => {
    if (!metrics) return null;

    return {
      // Saúde do caixa
      cashHealth: metrics.cash_health,
      isHealthy: metrics.cash_health === 'healthy',
      isWarning: metrics.cash_health === 'warning',
      isCritical: metrics.cash_health === 'critical',

      // Saldos
      currentBalance: metrics.current_balance,
      previousBalance: metrics.previous_balance,
      balanceChange: metrics.current_balance - metrics.previous_balance,

      // Hoje
      todayIncome: metrics.today_income,
      todayExpense: metrics.today_expense,
      todayNet: metrics.today_net,

      // Projetado
      projectedBalance7d: metrics.projected_7days_balance,
      projectedBalance30d: metrics.projected_30days_balance,

      // Taxa de mudança diária
      dailyRate: snapshots.length > 0
        ? (metrics.current_balance - metrics.previous_balance) / snapshots.length
        : 0,

      // Runway (dias até saldo negativo)
      runwayDays:
        metrics.daily_change !== 0
          ? Math.ceil(metrics.current_balance / Math.abs(metrics.daily_change))
          : undefined,
    };
  }, [metrics, snapshots]);
}

/**
 * 💰 Hook: useCashFlowProjection
 * Gera projeção de saldo futuro
 */
export function useCashFlowProjection(
  metrics: DashboardMetrics | undefined,
  days: number = 30
) {
  return useMemo(() => {
    if (!metrics) return [];

    const points = [];
    let balance = metrics.current_balance;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      // Variação média diária
      const dailyChange =
        (metrics.projected_30days_income - metrics.projected_30days_expense) / 30;
      balance += dailyChange;

      points.push({
        date: date.toISOString().split('T')[0],
        balance,
        isNegative: balance < 0,
      });
    }

    return points;
  }, [metrics, days]);
}

/**
 * 💰 Hook: useCashFlowAlerts
 * Gera alertas automáticos
 */
export function useCashFlowAlerts(metrics: DashboardMetrics | undefined) {
  return useMemo(() => {
    if (!metrics) return [];

    const alerts = [];

    // Alerta: Saldo negativo futuro
    if (metrics.projected_30days_balance < 0) {
      alerts.push({
        id: 'negative_balance',
        type: 'negative_balance',
        severity: 'critical' as const,
        message: `Saldo negativo projetado em 30 dias: R$ ${Math.abs(
          metrics.projected_30days_balance
        ).toFixed(2)}`,
      });
    }

    // Alerta: Baixa liquidez
    if (
      metrics.current_balance > 0 &&
      metrics.current_balance < metrics.consolidated_income
    ) {
      alerts.push({
        id: 'low_liquidity',
        type: 'low_liquidity',
        severity: 'warning' as const,
        message: `Liquidez baixa: ${((
          (metrics.current_balance / metrics.consolidated_income) *
          100
        ).toFixed(1))}% da receita mensal`,
      });
    }

    // Alerta: Excesso de despesas
    if (metrics.consolidated_expense > metrics.consolidated_income * 0.8) {
      alerts.push({
        id: 'excess_expenses',
        type: 'excess_expenses',
        severity: 'warning' as const,
        message: `Despesas altas: ${((
          (metrics.consolidated_expense / metrics.consolidated_income) *
          100
        ).toFixed(1))}% da receita`,
      });
    }

    return alerts;
  }, [metrics]);
}
