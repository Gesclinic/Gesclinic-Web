import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../../src/lib/customSupabaseClient.js', () => ({
  customSupabaseClient: { rpc },
}));

const { calculateDREForPeriod } = await import('../../src/lib/dynamicDREApi.ts');
const migration = readFileSync(
  resolve('supabase/migrations/20260612_fix_dre_dynamic_executive_views_clinic_id.sql'), 'utf8',
);

describe('DRE por clínica', () => {
  it('envia a clínica e o período à RPC ativa, sem aceitar um resultado de outra consulta', async () => {
    const result = { revenue: { gross_revenue: 100 } };
    rpc.mockResolvedValueOnce({ data: result, error: null });
    await expect(calculateDREForPeriod('clinic-a', '2026-06-01', '2026-06-30'))
      .resolves.toEqual(result);
    expect(rpc).toHaveBeenCalledWith('calculate_dre_for_period', {
      p_clinic_id: 'clinic-a', p_start_date: '2026-06-01',
      p_end_date: '2026-06-30', p_competence_type: 'accrual',
    });
  });

  it('mantém clinic_id nas views executivas legadas que ainda existem no banco', () => {
    for (const view of ['v_daily_financial_summary', 'v_monthly_financial_summary',
      'v_delinquency_analysis', 'v_professional_contribution',
      'v_professional_repayment_summary', 'v_executive_kpis']) {
      const definition = migration.split(`CREATE OR REPLACE VIEW ${view} AS`)[1]
        ?.split('CREATE OR REPLACE VIEW ')[0];
      expect(definition, view).toContain('clinic_id');
    }
  });
});
