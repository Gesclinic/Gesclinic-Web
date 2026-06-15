/**
 * useFinancialCockpit Hook
 * Integra todas as APIs financeiras para o Financial Cockpit
 * Usa React Query para caching e sincronização
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { dreMotorApi } from '@/lib/dreMotorApi';
import { getAgingAnalysis } from '@/lib/agingAnalysisApi';

export const useFinancialCockpitData = (clinicId, options = {}) => {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
  } = options;

  // Query for DRE Dashboard
  const dreQuery = useQuery(
    ['dre-dashboard', clinicId],
    () => dreMotorApi.getDREDashboard(clinicId),
    {
      enabled: !!clinicId,
      staleTime,
      cacheTime,
    }
  );

  // Query for Monthly DRE Summary (6 months)
  const trendQuery = useQuery(
    ['dre-trends', clinicId],
    () => dreMotorApi.getMonthlyDRESummary(clinicId, 6),
    {
      enabled: !!clinicId,
      staleTime,
      cacheTime,
    }
  );

  // Query for YTD Performance
  const ytdQuery = useQuery(
    ['ytd-performance', clinicId],
    () => dreMotorApi.getYTDPerformance(clinicId),
    {
      enabled: !!clinicId,
      staleTime,
      cacheTime,
    }
  );

  // Query for Profitability Metrics
  const profitabilityQuery = useQuery(
    ['profitability-metrics', clinicId],
    () => dreMotorApi.getProfitabilityMetrics(clinicId),
    {
      enabled: !!clinicId,
      staleTime,
      cacheTime,
    }
  );

  // Query for Receivables Aging
  const agingQuery = useQuery(
    ['receivables-aging', clinicId],
    () => getAgingAnalysis(clinicId),
    {
      enabled: !!clinicId,
      staleTime,
      cacheTime,
    }
  );

  // Query for Medical Repayment Summary
  const repasseQuery = useQuery(
    ['repasse-summary', clinicId],
    async () => {
      try {
        // TODO: Implement repasse summary query
        return null;
      } catch (error) {
        console.error('Error loading repasse summary:', error);
        return null;
      }
    },
    {
      enabled: !!clinicId,
      staleTime,
      cacheTime,
    }
  );

  // Query for DRE Projections (30 days)
  const forecastQuery = useQuery(
    ['dre-forecast', clinicId],
    async () => {
      try {
        // TODO: Implement DRE projections query
        return null;
      } catch (error) {
        console.error('Error loading forecast:', error);
        return null;
      }
    },
    {
      enabled: !!clinicId,
      staleTime: 15 * 60 * 1000, // 15 minutes - forecast changes more often
      cacheTime: 30 * 60 * 1000,
    }
  );

  return {
    // DRE Dashboard
    dre: dreQuery.data,
    dreLoading: dreQuery.isLoading,
    dreError: dreQuery.error,

    // Trends
    trends: trendQuery.data,
    trendsLoading: trendQuery.isLoading,
    trendsError: trendQuery.error,

    // YTD Performance
    ytd: ytdQuery.data,
    ytdLoading: ytdQuery.isLoading,
    ytdError: ytdQuery.error,

    // Profitability
    profitability: profitabilityQuery.data,
    profitabilityLoading: profitabilityQuery.isLoading,
    profitabilityError: profitabilityQuery.error,

    // Aging
    aging: agingQuery.data,
    agingLoading: agingQuery.isLoading,
    agingError: agingQuery.error,

    // Repasse
    repasse: repasseQuery.data,
    repasseLoading: repasseQuery.isLoading,
    repasseError: repasseQuery.error,

    // Forecast
    forecast: forecastQuery.data,
    forecastLoading: forecastQuery.isLoading,
    forecastError: forecastQuery.error,

    // Combined loading/error states
    isLoading:
      dreQuery.isLoading ||
      trendQuery.isLoading ||
      profitabilityQuery.isLoading ||
      agingQuery.isLoading,

    error:
      dreQuery.error ||
      trendQuery.error ||
      profitabilityQuery.error ||
      agingQuery.error ||
      repasseQuery.error,

    // Refetch all
    refetchAll: async () => {
      await Promise.all([
        dreQuery.refetch(),
        trendQuery.refetch(),
        ytdQuery.refetch(),
        profitabilityQuery.refetch(),
        agingQuery.refetch(),
        repasseQuery.refetch(),
        forecastQuery.refetch(),
      ]);
    },
  };
};

export default useFinancialCockpitData;
