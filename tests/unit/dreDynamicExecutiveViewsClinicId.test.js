import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboard = readFileSync(resolve('src/pages/financeiro/DashboardDRE.jsx'), 'utf8');
const migration = readFileSync(
  resolve('supabase/migrations/20260612_fix_dre_dynamic_executive_views_clinic_id.sql'),
  'utf8',
);

const dashboardViews = [
  'v_executive_kpis',
  'v_daily_financial_summary',
  'v_monthly_financial_summary',
  'v_delinquency_analysis',
  'v_professional_contribution',
  'v_professional_repayment_summary',
  'v_alerts_summary_by_clinic',
];

const executiveKpiIdempotentColumnOrder = [
  ['Contas a Receber', 'Contas a Receber', 'ar'],
  ['Contas Pagas', 'Contas Pagas', 'ar'],
  ['Taxa de Recebimento %', 'Taxa de Recebimento', 'ar'],
  ['Repasses Pendentes', 'Repasses Pendentes', 'prep'],
  ['Repasses Pagos', 'Repasses Pagos', 'prep'],
];

describe('DRE dinamica com views executivas por clinica', () => {
  it('filtra todas as views executivas por clinic_id no dashboard', () => {
    dashboardViews.forEach((view) => {
      const viewQuery = new RegExp(`\\.from\\('${view}'\\)[\\s\\S]*?\\.eq\\('clinic_id', clinicId\\)`, 'm');
      expect(dashboard).toMatch(viewQuery);
    });
  });

  it('recria views da DRE com clinic_id e status canonicos de ar_invoices', () => {
    [
      'v_daily_financial_summary',
      'v_monthly_financial_summary',
      'v_delinquency_analysis',
      'v_professional_contribution',
      'v_professional_repayment_summary',
      'v_executive_kpis',
    ].forEach((view) => {
      expect(migration).toContain(`CREATE OR REPLACE VIEW ${view} AS`);
    });

    expect(migration).toContain("ar.status::text = ANY (ARRAY['received'::text, 'paid'::text])");
    expect(migration).toContain("ar.status::text = ANY (ARRAY['open'::text, 'planned'::text, 'pending'::text, 'billed'::text, 'overdue'::text, 'partial'::text])");
    expect(migration).toContain('COALESCE(ar.net_value, ar.amount, 0::numeric)');
    expect(migration).toContain('COALESCE(ar.paid_total, ar.received_value, 0::numeric)');

    executiveKpiIdempotentColumnOrder.forEach(([metricName, label, alias]) => {
      expect(migration).toMatch(
        new RegExp(`${alias}\\.clinic_id,\\s*'${metricName}'::text AS metric_name,\\s*'${label}'::text AS label`),
      );
    });

    expect(migration).not.toContain("ar.status::text = 'paid'::text");
    expect(migration).not.toContain("ar.status::text = 'pending'::text");
    expect(migration).not.toContain("ar.status::text = 'cancelled'::text");
  });
});