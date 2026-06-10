/**
 * Tests for Task 7 - Integration Hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCashFlowSummaryData,
  useCashFlowTrendData,
  useCashFlowForecastData,
  useCashFlowReportData,
} from '@/modules/financeiro/fluxo-caixa/hooks/useCashFlowIntegration';

// Mock useClinicContext
vi.mock('@/contexts/ClinicContext', () => ({
  useClinicContext: () => ({
    clinic: {
      id: 'test-clinic-id',
      clinic_name: 'Test Clinic',
      name: 'Test Clinic',
    },
  }),
}));

// Mock cashFlowApi
vi.mock('@/modules/financeiro/fluxo-caixa/services/cashFlowApi', () => ({
  getCashFlowSnapshots: vi.fn(async () => [
    {
      id: '1',
      clinic_id: 'test-clinic-id',
      snapshot_date: '2026-01-01',
      total_income: 10000,
      total_expense: -5000,
      closing_balance: 5000,
    },
    {
      id: '2',
      clinic_id: 'test-clinic-id',
      snapshot_date: '2026-01-02',
      total_income: 12000,
      total_expense: -6000,
      closing_balance: 6000,
    },
  ]),
  getDashboardMetrics: vi.fn(async () => ({})),
}));

describe('Task 7 - Integration Hooks', () => {
  describe('useCashFlowSummaryData', () => {
    it('should load summary data', async () => {
      const { result } = renderHook(() => useCashFlowSummaryData());

      expect(result.current.data.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.data.isLoading).toBe(false);
      });

      expect(result.current.data.totalIncome).toBeGreaterThan(0);
      expect(result.current.data.netBalance).toBeGreaterThan(0);
    });

    it('should have period formatted', async () => {
      const { result } = renderHook(() => useCashFlowSummaryData());

      await waitFor(() => {
        expect(result.current.data.isLoading).toBe(false);
      });

      expect(result.current.data.period).toMatch(/\d+\/\d+\/\d+/);
    });

    it('should provide reload function', async () => {
      const { result } = renderHook(() => useCashFlowSummaryData());

      expect(result.current.reload).toBeDefined();
      expect(typeof result.current.reload).toBe('function');
    });

    it('should handle custom dates', async () => {
      const { result } = renderHook(() =>
        useCashFlowSummaryData('2026-01-01', '2026-01-31')
      );

      await waitFor(() => {
        expect(result.current.data.isLoading).toBe(false);
      });

      expect(result.current.data.totalIncome).toBeGreaterThan(0);
    });
  });

  describe('useCashFlowTrendData', () => {
    it('should load trend data', async () => {
      const { result } = renderHook(() => useCashFlowTrendData());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.trendData)).toBe(true);
    });

    it('should have date and balance for each point', async () => {
      const { result } = renderHook(() => useCashFlowTrendData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.trendData.forEach(point => {
        expect(point.date).toBeDefined();
        expect(point.income).toBeDefined();
        expect(point.expense).toBeDefined();
        expect(point.balance).toBeDefined();
      });
    });

    it('should provide reload function', async () => {
      const { result } = renderHook(() => useCashFlowTrendData());

      expect(result.current.reload).toBeDefined();
      expect(typeof result.current.reload).toBe('function');
    });

    it('should sort dates chronologically', async () => {
      const { result } = renderHook(() => useCashFlowTrendData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      for (let i = 1; i < result.current.trendData.length; i++) {
        const prev = new Date(result.current.trendData[i - 1].date);
        const curr = new Date(result.current.trendData[i].date);
        expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
      }
    });
  });

  describe('useCashFlowForecastData', () => {
    it('should load historical data for forecast', async () => {
      const { result } = renderHook(() => useCashFlowForecastData());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.historicalData)).toBe(true);
    });

    it('should have at least 2 data points for forecast', async () => {
      const { result } = renderHook(() => useCashFlowForecastData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.historicalData.length).toBeGreaterThanOrEqual(2);
    });

    it('should have date and balance for each point', async () => {
      const { result } = renderHook(() => useCashFlowForecastData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.historicalData.forEach(point => {
        expect(point.date).toBeDefined();
        expect(typeof point.balance).toBe('number');
      });
    });

    it('should accept custom days parameter', async () => {
      const { result } = renderHook(() => useCashFlowForecastData(60));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should provide reload function', async () => {
      const { result } = renderHook(() => useCashFlowForecastData());

      expect(result.current.reload).toBeDefined();
      expect(typeof result.current.reload).toBe('function');
    });
  });

  describe('useCashFlowReportData', () => {
    it('should load report data', async () => {
      const { result } = renderHook(() => useCashFlowReportData());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.reportData).toBeDefined();
    });

    it('should have required report structure', async () => {
      const { result } = renderHook(() => useCashFlowReportData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.reportData) {
        expect(result.current.reportData.title).toBeDefined();
        expect(result.current.reportData.period).toBeDefined();
        expect(result.current.reportData.summary).toBeDefined();
      }
    });

    it('should have summary with totals', async () => {
      const { result } = renderHook(() => useCashFlowReportData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.reportData) {
        expect(result.current.reportData.summary.totalIncome).toBeDefined();
        expect(result.current.reportData.summary.totalExpense).toBeDefined();
        expect(result.current.reportData.summary.netBalance).toBeDefined();
      }
    });

    it('should have details array', async () => {
      const { result } = renderHook(() => useCashFlowReportData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (result.current.reportData) {
        expect(Array.isArray(result.current.reportData.details)).toBe(true);
      }
    });

    it('should provide reload function', async () => {
      const { result } = renderHook(() => useCashFlowReportData());

      expect(result.current.reload).toBeDefined();
      expect(typeof result.current.reload).toBe('function');
    });

    it('should handle custom date range', async () => {
      const { result } = renderHook(() =>
        useCashFlowReportData('2026-01-01', '2026-01-31')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.reportData).toBeDefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should load all hooks simultaneously', async () => {
      const { result: summary } = renderHook(() => useCashFlowSummaryData());
      const { result: trend } = renderHook(() => useCashFlowTrendData());
      const { result: forecast } = renderHook(() => useCashFlowForecastData());
      const { result: report } = renderHook(() => useCashFlowReportData());

      await waitFor(() => {
        expect(summary.current.data.isLoading).toBe(false);
        expect(trend.current.isLoading).toBe(false);
        expect(forecast.current.isLoading).toBe(false);
        expect(report.current.isLoading).toBe(false);
      });

      expect(summary.current.data.netBalance).toBeGreaterThan(0);
      expect(trend.current.trendData.length).toBeGreaterThan(0);
      expect(forecast.current.historicalData.length).toBeGreaterThanOrEqual(2);
      expect(report.current.reportData).toBeDefined();
    });

    it('should handle error states', async () => {
      const { result } = renderHook(() => useCashFlowSummaryData());

      // Initially loading
      expect(result.current.data.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.data.isLoading).toBe(false);
      });

      // Error should be undefined on success
      expect(result.current.error).toBeUndefined();
    });

    it('should allow reloading data', async () => {
      const { result } = renderHook(() => useCashFlowSummaryData());

      await waitFor(() => {
        expect(result.current.data.isLoading).toBe(false);
      });

      const firstTotalIncome = result.current.data.totalIncome;

      result.current.reload();

      await waitFor(() => {
        expect(result.current.data.isLoading).toBe(false);
      });

      // Data should be reloaded (at least some data should exist)
      expect(result.current.data.totalIncome).toBeDefined();
      expect(result.current.data.totalIncome).toBeGreaterThanOrEqual(0);
    });
  });
});
