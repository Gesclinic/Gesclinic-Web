import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryForTable = vi.fn();
const supabaseMock = {
  rpc: vi.fn(),
  from: vi.fn((table) => queryForTable(table)),
};

vi.mock('../../src/lib/customSupabaseClient', () => ({
  supabase: supabaseMock,
}));

const dreMotorApi = await import('../../src/lib/dreMotorApi.js');

const clinicId = 'clinic-001';
const startDate = '2026-06-01';
const endDate = '2026-06-30';
const migrationPath = resolve('supabase/migrations/20260612_consolidate_dre_receivable_payments.sql');

beforeEach(() => {
  vi.clearAllMocks();
  queryForTable.mockReset();
});

describe('dreMotorApi consolidado em receivable_payments', () => {
  it('calculateDREPeriod delega para RPC sem consultar ar_payments no cliente', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [{ period_id: 'dre-001', gross_revenue: 120, success: true }],
      error: null,
    });

    const result = await dreMotorApi.calculateDREPeriod(clinicId, 'monthly', startDate, endDate);

    expect(supabaseMock.rpc).toHaveBeenCalledWith('fn_calculate_dre_period', {
      p_clinic_id: clinicId,
      p_period_type: 'monthly',
      p_start_date: startDate,
      p_end_date: endDate,
    });
    expect(supabaseMock.from).not.toHaveBeenCalledWith('ar_payments');
    expect(result).toEqual({
      success: true,
      data: { period_id: 'dre-001', gross_revenue: 120, success: true },
      error: null,
    });
  });

  it('migration corretiva calcula receitas e trigger por receivable_payments', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const calculationBody = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION fn_calculate_dre_period'),
      sql.indexOf('CREATE OR REPLACE FUNCTION fn_auto_update_dre_on_payment'),
    );

    expect(calculationBody).toContain('FROM receivable_payments rp');
    expect(calculationBody).toContain('SUM(rp.amount_paid)');
    expect(calculationBody).not.toContain('FROM ar_payments');
    expect(sql).toContain('AFTER INSERT OR UPDATE ON receivable_payments');
    expect(sql).toContain('DROP TRIGGER IF EXISTS trg_auto_update_dre_on_payment ON ar_payments');
  });
});
