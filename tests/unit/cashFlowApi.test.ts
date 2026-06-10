import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as cashFlowApi from '../../src/modules/financeiro/fluxo-caixa/services/cashFlowApi';
import { supabase } from '../../src/lib/customSupabaseClient';

vi.mock('../../src/lib/customSupabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

const createQuery = (response: unknown) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: unknown) => void, reject?: (reason?: unknown) => void) =>
      Promise.resolve(response).then(resolve, reject),
  };
  return query;
};

describe('cashFlowApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateCashFlowSnapshot()', () => {
    it('calls RPC with current parameters', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ opening_balance: 1000, closing_balance: 1500 }],
        error: null,
      } as never);

      const result = await cashFlowApi.calculateCashFlowSnapshot('clinic-123', '2026-05-13');

      expect(supabase.rpc).toHaveBeenCalledWith('calculate_cash_flow_snapshot', {
        p_clinic_id: 'clinic-123',
        p_snapshot_date: '2026-05-13',
        p_account_id: null,
      });
      expect(result?.closing_balance).toBe(1500);
    });

    it('includes accountId when provided', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [{}], error: null } as never);

      await cashFlowApi.calculateCashFlowSnapshot('clinic-123', '2026-05-13', 'account-456');

      expect(supabase.rpc).toHaveBeenCalledWith('calculate_cash_flow_snapshot', {
        p_clinic_id: 'clinic-123',
        p_snapshot_date: '2026-05-13',
        p_account_id: 'account-456',
      });
    });

    it('returns null on RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('RPC error') } as never);

      await expect(cashFlowApi.calculateCashFlowSnapshot('clinic-123', '2026-05-13')).resolves.toBeNull();
    });
  });

  describe('refreshCashFlowPeriod()', () => {
    it('calls refresh RPC with date range', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ refreshed_count: 31 }], error: null } as never);

      const result = await cashFlowApi.refreshCashFlowPeriod('clinic-123', '2026-05-01', '2026-05-31');

      expect(supabase.rpc).toHaveBeenCalledWith('refresh_cash_flow_period', {
        p_clinic_id: 'clinic-123',
        p_start_date: '2026-05-01',
        p_end_date: '2026-05-31',
      });
      expect(result?.refreshed_count).toBe(31);
    });
  });

  describe('getCashFlowSnapshots()', () => {
    it('queries snapshots with filters and descending order', async () => {
      const query = createQuery({
        data: [
          { id: '1', snapshot_date: '2026-05-14' },
          { id: '2', snapshot_date: '2026-05-13' },
        ],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(query as never);

      const result = await cashFlowApi.getCashFlowSnapshots('clinic-123', '2026-05-01', '2026-05-31', 'account-456');

      expect(supabase.from).toHaveBeenCalledWith('cash_flow_snapshots');
      expect(query.eq).toHaveBeenCalledWith('clinic_id', 'clinic-123');
      expect(query.eq).toHaveBeenCalledWith('financial_account_id', 'account-456');
      expect(query.gte).toHaveBeenCalledWith('snapshot_date', '2026-05-01');
      expect(query.lte).toHaveBeenCalledWith('snapshot_date', '2026-05-31');
      expect(query.order).toHaveBeenCalledWith('snapshot_date', { ascending: false });
      expect(result).toHaveLength(2);
    });

    it('returns empty array on query error', async () => {
      vi.mocked(supabase.from).mockReturnValue(createQuery({ data: null, error: new Error('Query error') }) as never);

      await expect(cashFlowApi.getCashFlowSnapshots('clinic-123', '2026-05-01', '2026-05-31')).resolves.toEqual([]);
    });
  });

  describe('getDailyAnalysis()', () => {
    it('fetches and maps daily analysis rows', async () => {
      vi.mocked(supabase.from).mockReturnValue(createQuery({
        data: [{
          analysis_date: '2026-05-13',
          financial_account_id: 'account-1',
          account_name: 'Conta Principal',
          realized_opening: 1000,
          realized_income: 500,
          realized_expense: 200,
          realized_closing: 1300,
          projected_income: 600,
          projected_expense: 250,
          projected_balance: 1350,
          income_variance: 100,
          expense_variance: 50,
          balance_variance: 50,
          clinic_id: 'clinic-123',
        }],
        error: null,
      }) as never);

      const result = await cashFlowApi.getDailyAnalysis('clinic-123', '2026-05-13');

      expect(supabase.from).toHaveBeenCalledWith('v_cash_flow_daily_analysis');
      expect(result[0].realized_net).toBe(300);
      expect(result[0].projected_net).toBe(350);
    });
  });
});
