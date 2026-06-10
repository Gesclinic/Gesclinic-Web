/**
 * 📊 Integration Hooks - Task 7
 * Funções para conectar componentes ao Supabase com dados reais
 */

import { useEffect, useState, useCallback } from 'react';
import { useClinicContext } from '@/contexts/useClinicContext';
import { getCashFlowSnapshots, getDashboardMetrics } from '../services/cashFlowApi';
import { generateDateSeries, calculateVariation, calculateAverage } from '../utils/calculations';
import type { CashFlowSnapshot } from '../types';
import type { CashFlowSummaryMetrics } from '../components/CashFlowSummary';
import type { TrendPoint } from '../components/CashFlowTrend';

/**
 * Hook: useCashFlowSummaryData
 * Fornece dados formatados para o componente CashFlowSummary
 */
export function useCashFlowSummaryData(startDate?: string, endDate?: string) {
  const { clinic } = useClinicContext();
  const [data, setData] = useState<CashFlowSummaryMetrics>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    period: 'Carregando...',
    isLoading: true,
  });

  const [error, setError] = useState<string>();

  const loadData = useCallback(async () => {
    if (!clinic?.id) return;

    setData(prev => ({ ...prev, isLoading: true }));
    setError(undefined);

    try {
      const now = new Date();
      const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const snapshots = await getCashFlowSnapshots(clinic.id, start, end);

      if (!snapshots || snapshots.length === 0) {
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Nenhum dado disponível para o período',
        }));
        return;
      }

      // Aggregate data across all snapshots
      const totalIncome = snapshots.reduce((sum, s) => sum + (s.total_income || 0), 0);
      const totalExpense = snapshots.reduce((sum, s) => sum + (s.total_expense || 0), 0);
      const netBalance = totalIncome - Math.abs(totalExpense);

      // Get previous period for variation
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split('T')[0];
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      let previousNetBalance: number | undefined;
      try {
        const prevSnapshots = await getCashFlowSnapshots(clinic.id, prevMonthStart, prevMonthEnd);
        if (prevSnapshots && prevSnapshots.length > 0) {
          const prevIncome = prevSnapshots.reduce((sum, s) => sum + (s.total_income || 0), 0);
          const prevExpense = prevSnapshots.reduce((sum, s) => sum + (s.total_expense || 0), 0);
          previousNetBalance = prevIncome - Math.abs(prevExpense);
        }
      } catch {
        // Ignore previous period errors
      }

      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      const period = `${startDateObj.toLocaleDateString('pt-BR')} - ${endDateObj.toLocaleDateString('pt-BR')}`;

      setData({
        totalIncome,
        totalExpense: -Math.abs(totalExpense),
        netBalance,
        previousNetBalance,
        period,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(message);
      setData(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [clinic?.id, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, error, reload: loadData };
}

/**
 * Hook: useCashFlowTrendData
 * Fornece dados formatados para o componente CashFlowTrend (30 dias)
 */
export function useCashFlowTrendData(endDate?: string) {
  const { clinic } = useClinicContext();
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadData = useCallback(async () => {
    if (!clinic?.id) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const end = endDate || new Date().toISOString().split('T')[0];
      const endDate_obj = new Date(end);
      const startDate_obj = new Date(endDate_obj);
      startDate_obj.setDate(startDate_obj.getDate() - 29); // 30 days
      const start = startDate_obj.toISOString().split('T')[0];

      const snapshots = await getCashFlowSnapshots(clinic.id, start, end);

      if (!snapshots || snapshots.length === 0) {
        setTrendData([]);
        setIsLoading(false);
        return;
      }

      // Group by date and calculate daily totals
      const grouped = new Map<string, CashFlowSnapshot>();
      snapshots.forEach(snapshot => {
        const date = snapshot.snapshot_date;
        if (!grouped.has(date)) {
          grouped.set(date, snapshot);
        } else {
          const existing = grouped.get(date)!;
          grouped.set(date, {
            ...existing,
            total_income: (existing.total_income || 0) + (snapshot.total_income || 0),
            total_expense: (existing.total_expense || 0) + (snapshot.total_expense || 0),
            closing_balance: (existing.closing_balance || 0) + (snapshot.closing_balance || 0),
          });
        }
      });

      // Convert to TrendPoint format
      const trend: TrendPoint[] = Array.from(grouped.entries())
        .map(([date, snapshot]) => ({
          date,
          income: snapshot.total_income || 0,
          expense: Math.abs(snapshot.total_expense || 0),
          balance: snapshot.closing_balance || 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Ensure 30-day series even with gaps
      const fillGaps = generateDateSeries(start, end, 'daily')
        .map(date => {
          const existing = trend.find(t => t.date === date);
          return (
            existing || {
              date,
              income: 0,
              expense: 0,
              balance: trend.length > 0 ? trend[trend.length - 1].balance : 0,
            }
          );
        });

      setTrendData(fillGaps);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar tendência';
      setError(message);
      setIsLoading(false);
    }
  }, [clinic?.id, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { trendData, isLoading, error, reload: loadData };
}

/**
 * Hook: useCashFlowForecastData
 * Fornece dados históricos para o componente CashFlowForecast
 */
export function useCashFlowForecastData(days: number = 30) {
  const { clinic } = useClinicContext();
  const [historicalData, setHistoricalData] = useState<Array<{ date: string; balance: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadData = useCallback(async () => {
    if (!clinic?.id) return;

    setIsLoading(true);
    setError(undefined);

    try {
      // Get last 60 days of historical data for better forecast
      const endDate_obj = new Date();
      const startDate_obj = new Date(endDate_obj);
      startDate_obj.setDate(startDate_obj.getDate() - 60);

      const start = startDate_obj.toISOString().split('T')[0];
      const end = endDate_obj.toISOString().split('T')[0];

      const snapshots = await getCashFlowSnapshots(clinic.id, start, end);

      if (!snapshots || snapshots.length < 2) {
        setHistoricalData([]);
        setIsLoading(false);
        return;
      }

      // Group by date and get daily closing balance
      const grouped = new Map<string, number>();
      snapshots.forEach(snapshot => {
        const date = snapshot.snapshot_date;
        if (!grouped.has(date)) {
          grouped.set(date, snapshot.closing_balance || 0);
        }
      });

      // Convert to historical data format
      const historical = Array.from(grouped.entries())
        .map(([date, balance]) => ({
          date,
          balance,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setHistoricalData(historical);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados de forecast';
      setError(message);
      setIsLoading(false);
    }
  }, [clinic?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { historicalData, isLoading, error, reload: loadData };
}

/**
 * Hook: useCashFlowReportData
 * Fornece dados formatados para o componente CashFlowReport
 */
export function useCashFlowReportData(startDate?: string, endDate?: string) {
  const { clinic } = useClinicContext();
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadData = useCallback(async () => {
    if (!clinic?.id) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const now = new Date();
      const start =
        startDate ||
        new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0];
      const end =
        endDate ||
        new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];

      const snapshots = await getCashFlowSnapshots(clinic.id, start, end);

      if (!snapshots || snapshots.length === 0) {
        setReportData(null);
        setIsLoading(false);
        return;
      }

      // Calculate summary
      const totalIncome = snapshots.reduce((sum, s) => sum + (s.total_income || 0), 0);
      const totalExpense = snapshots.reduce((sum, s) => sum + (s.total_expense || 0), 0);
      const netBalance = totalIncome - Math.abs(totalExpense);

      // Calculate variation
      const prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 1);
      const prevEnd = new Date(prevStart);
      prevEnd.setMonth(prevEnd.getMonth() + 1);
      prevEnd.setDate(prevEnd.getDate() - 1);

      let variation = 0;
      try {
        const prevSnapshots = await getCashFlowSnapshots(
          clinic.id,
          prevStart.toISOString().split('T')[0],
          prevEnd.toISOString().split('T')[0]
        );
        if (prevSnapshots && prevSnapshots.length > 0) {
          const prevIncome = prevSnapshots.reduce((sum, s) => sum + (s.total_income || 0), 0);
          const prevExpense = prevSnapshots.reduce((sum, s) => sum + (s.total_expense || 0), 0);
          const prevBalance = prevIncome - Math.abs(prevExpense);
          variation = calculateVariation(netBalance, prevBalance);
        }
      } catch {
        // Ignore variation calculation errors
      }

      // Format details (sample - limit to 20 items)
      const details = snapshots
        .slice(0, 20)
        .map(snapshot => ({
          date: new Date(snapshot.snapshot_date).toLocaleDateString('pt-BR'),
          description: `Fluxo - ${snapshot.snapshot_date}`,
          amount: snapshot.closing_balance || 0,
          type: (snapshot.total_income || 0) > 0 ? 'income' : 'expense',
        }));

      const startDateObj = new Date(start);
      const endDateObj = new Date(end);

      const report = {
        title: `Relatório de Fluxo de Caixa - ${clinic.clinic_name || 'Clínica'}`,
        period: {
          start,
          end,
        },
        summary: {
          totalIncome,
          totalExpense: -Math.abs(totalExpense),
          netBalance,
          variation: isFinite(variation) ? variation : undefined,
        },
        details,
      };

      setReportData(report);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar relatório';
      setError(message);
      setIsLoading(false);
    }
  }, [clinic?.id, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { reportData, isLoading, error, reload: loadData };
}
