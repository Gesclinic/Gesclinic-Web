import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCashFlow } from '../../src/modules/financeiro/fluxo-caixa/hooks/useCashFlow';
import * as cashFlowApi from '../../src/modules/financeiro/fluxo-caixa/services/cashFlowApi';

const realtimeMock = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const subscribe = vi.fn(() => ({ unsubscribe }));
  const on = vi.fn(() => ({ on, subscribe }));
  const channel = vi.fn(() => ({ on, subscribe }));

  return { channel, on, subscribe, unsubscribe };
});

vi.mock('../../src/contexts/ClinicContext', () => ({
  useClinicContext: () => ({
    clinic: { id: 'clinic-123' },
    loadingClinic: false,
  }),
}));

vi.mock('../../src/lib/customSupabaseClient', () => ({
  customSupabaseClient: {
    channel: realtimeMock.channel,
  },
}));

vi.mock('../../src/modules/financeiro/fluxo-caixa/services/cashFlowApi', () => ({
  getCashFlowSnapshots: vi.fn(),
  getDashboardMetrics: vi.fn(),
  getPredictions: vi.fn(),
  getBankConsolidation: vi.fn(),
}));

describe('useCashFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cashFlowApi.getCashFlowSnapshots).mockResolvedValue([]);
    vi.mocked(cashFlowApi.getPredictions).mockResolvedValue([]);
    vi.mocked(cashFlowApi.getDashboardMetrics).mockResolvedValue({
      current_balance: 1000,
      previous_balance: 800,
      today_income: 100,
      today_expense: 50,
      today_net: 50,
      projected_7days_balance: 1200,
      projected_30days_balance: 1500,
      projected_30days_income: 1000,
      projected_30days_expense: 500,
      consolidated_income: 2000,
      consolidated_expense: 1000,
      daily_change: 10,
      cash_health: 'healthy',
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads cash flow data on mount', async () => {
    vi.mocked(cashFlowApi.getCashFlowSnapshots).mockResolvedValue([
      { id: 'snapshot-1', snapshot_date: '2026-05-13' },
    ] as any);

    const { result } = renderHook(() => useCashFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(cashFlowApi.getCashFlowSnapshots).toHaveBeenCalledWith(
      'clinic-123',
      expect.any(String),
      expect.any(String),
      undefined
    );
    expect(cashFlowApi.getPredictions).toHaveBeenCalled();
    expect(cashFlowApi.getDashboardMetrics).toHaveBeenCalledWith('clinic-123');
    expect(result.current.snapshots).toHaveLength(1);
    expect(result.current.selectedPeriod).toBe('monthly');
  });

  it('updates filters and reloads data', async () => {
    const { result } = renderHook(() => useCashFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.updateFilters({ financial_account_ids: ['account-123'], searchTerm: 'clinic' } as any);
    });

    await waitFor(() => expect(result.current.filters).toEqual({
      financial_account_ids: ['account-123'],
      searchTerm: 'clinic',
    }));

    expect(cashFlowApi.getCashFlowSnapshots).toHaveBeenLastCalledWith(
      'clinic-123',
      expect.any(String),
      expect.any(String),
      'account-123'
    );
  });

  it('changes period and selected account in state', async () => {
    const { result } = renderHook(() => useCashFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPeriod('weekly');
      result.current.selectAccount('account-456');
    });

    expect(result.current.selectedPeriod).toBe('weekly');
    expect(result.current.selectedAccount).toBe('account-456');
  });

  it('sets up realtime subscriptions and cleans them up', async () => {
    const { result, unmount } = renderHook(() => useCashFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(realtimeMock.channel).toHaveBeenCalledWith('cash_flow_clinic-123');
    expect(realtimeMock.channel).toHaveBeenCalledWith('ap_bills_paid_clinic-123');
    expect(realtimeMock.channel).toHaveBeenCalledWith('ar_receivables_paid_clinic-123');

    unmount();

    expect(realtimeMock.unsubscribe).toHaveBeenCalledTimes(3);
  });

  it('registers auto-refresh every five minutes', async () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { result } = renderHook(() => useCashFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 300000);
  });

  it('handles API errors without crashing', async () => {
    vi.mocked(cashFlowApi.getCashFlowSnapshots).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCashFlow());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.snapshots).toEqual([]);
  });
});
