/**
 * useDynamicDRE
 * 
 * React hook for dynamic DRE calculations
 * Supports comparisons, drill-down, forecasts, and chart of accounts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClinicContext } from '@/contexts/ClinicContext';
import dynamicDREApi from '@/lib/dynamicDREApi';

/**
 * Hook to calculate DRE for period
 */
export function useDRECalculation(
  startDate?: string,
  endDate?: string,
  competenceType: 'accrual' | 'cash' = 'accrual'
) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: [
      'dre_calculation',
      clinic?.id,
      startDate,
      endDate,
      competenceType,
    ],
    queryFn: async () => {
      if (!clinic?.id || !startDate || !endDate) return null;
      return dynamicDREApi.calculateDREForPeriod(
        clinic.id,
        startDate,
        endDate,
        competenceType
      );
    },
    enabled: !!clinic?.id && !!startDate && !!endDate,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to compare two DRE periods
 */
export function useCompareDREPeriods(
  period1Start?: string,
  period1End?: string,
  period2Start?: string,
  period2End?: string
) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: [
      'dre_comparison',
      clinic?.id,
      period1Start,
      period1End,
      period2Start,
      period2End,
    ],
    queryFn: async () => {
      if (
        !clinic?.id ||
        !period1Start ||
        !period1End ||
        !period2Start ||
        !period2End
      )
        return null;
      return dynamicDREApi.compareDREPeriods(
        clinic.id,
        period1Start,
        period1End,
        period2Start,
        period2End
      );
    },
    enabled:
      !!clinic?.id &&
      !!period1Start &&
      !!period1End &&
      !!period2Start &&
      !!period2End,
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Hook to fetch chart of accounts
 */
export function useChartOfAccounts(accountType?: string) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['chart_of_accounts', clinic?.id, accountType],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return dynamicDREApi.getChartOfAccounts(clinic.id, {
        accountType,
        isActive: true,
      });
    },
    enabled: !!clinic?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch DRE drill-down for line item
 */
export function useDREDrillDown(
  startDate?: string,
  endDate?: string,
  dreLineItem?: string
) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: [
      'dre_drilldown',
      clinic?.id,
      startDate,
      endDate,
      dreLineItem,
    ],
    queryFn: async () => {
      if (!clinic?.id || !startDate || !endDate || !dreLineItem) return [];
      return dynamicDREApi.getDREDrillDown(
        clinic.id,
        startDate,
        endDate,
        dreLineItem
      );
    },
    enabled:
      !!clinic?.id && !!startDate && !!endDate && !!dreLineItem,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch DRE forecast
 */
export function useDREForecast(forecastMonths: number = 3) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['dre_forecast', clinic?.id, forecastMonths],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return dynamicDREApi.getDREForecast(clinic.id, forecastMonths);
    },
    enabled: !!clinic?.id,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch DRE snapshot
 */
export function useDRESnapshot(
  periodType: 'month' | 'quarter' | 'year',
  periodYear: number,
  periodMonth?: number,
  periodQuarter?: number
) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: [
      'dre_snapshot',
      clinic?.id,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
    ],
    queryFn: async () => {
      if (!clinic?.id) return null;
      return dynamicDREApi.getDRESnapshot(
        clinic.id,
        periodType,
        periodYear,
        periodMonth,
        periodQuarter
      );
    },
    enabled: !!clinic?.id,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch DRE snapshots for range
 */
export function useDRESnapshotsForRange(
  startDate?: string,
  endDate?: string,
  periodType: 'month' | 'quarter' | 'year' = 'month'
) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: [
      'dre_snapshots_range',
      clinic?.id,
      startDate,
      endDate,
      periodType,
    ],
    queryFn: async () => {
      if (!clinic?.id || !startDate || !endDate) return [];
      return dynamicDREApi.getDRESnapshotsForRange(
        clinic.id,
        startDate,
        endDate,
        periodType
      );
    },
    enabled: !!clinic?.id && !!startDate && !!endDate,
    staleTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook to save DRE snapshot
 */
export function useSaveDRESnapshot() {
  const queryClient = useQueryClient();
  const { clinic } = useClinicContext();

  return useMutation({
    mutationFn: ({
      dre,
      periodType,
      periodYear,
      periodMonth,
      periodQuarter,
    }: {
      dre: any;
      periodType: 'month' | 'quarter' | 'year';
      periodYear: number;
      periodMonth?: number;
      periodQuarter?: number;
    }) =>
      dynamicDREApi.saveDRESnapshot(
        clinic?.id || '',
        dre,
        periodType,
        periodYear,
        periodMonth,
        periodQuarter
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dre_snapshot'] });
      queryClient.invalidateQueries({
        queryKey: ['dre_snapshots_range'],
      });
    },
  });
}

// ============================================================================
// COMPOSITE HOOKS
// ============================================================================

/**
 * Hook for DRE dashboard with all key metrics
 */
export function useDREDashboard(
  startDate?: string,
  endDate?: string
) {
  const { data: dre, isLoading: dreLoading } = useDRECalculation(
    startDate,
    endDate,
    'accrual'
  );
  const { data: forecast, isLoading: forecastLoading } =
    useDREForecast(3);
  const { data: coa, isLoading: coaLoading } =
    useChartOfAccounts();

  return {
    dre,
    forecast,
    chartOfAccounts: coa,
    isLoading: dreLoading || forecastLoading || coaLoading,
    summary: dre
      ? {
          netRevenue: dre.revenue.net_revenue,
          netMargin: dre.result.net_margin,
          ebitda: dre.result.ebitda,
          ebitdaMargin: dre.result.ebitda_margin,
          netIncome: dre.result.net_income,
          grossProfitMargin: dre.costs_and_profit.gross_profit_margin,
        }
      : null,
  };
}

/**
 * Hook for DRE comparison and analysis
 */
export function useDREComparison(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
) {
  const { data: current, isLoading: currentLoading } = useDRECalculation(
    period1Start,
    period1End
  );
  const { data: previous, isLoading: previousLoading } = useDRECalculation(
    period2Start,
    period2End
  );

  return {
    current,
    previous,
    isLoading: currentLoading || previousLoading,
    analysis: current && previous
      ? {
          revenueGrowth:
            ((current.revenue.net_revenue - previous.revenue.net_revenue) /
              previous.revenue.net_revenue) *
            100,
          profitGrowth:
            ((current.result.net_income - previous.result.net_income) /
              previous.result.net_income) *
            100,
          marginImprovement:
            current.result.net_margin - previous.result.net_margin,
        }
      : null,
  };
}

export default {
  useDRECalculation,
  useCompareDREPeriods,
  useChartOfAccounts,
  useDREDrillDown,
  useDREForecast,
  useDRESnapshot,
  useDRESnapshotsForRange,
  useSaveDRESnapshot,
  useDREDashboard,
  useDREComparison,
};
