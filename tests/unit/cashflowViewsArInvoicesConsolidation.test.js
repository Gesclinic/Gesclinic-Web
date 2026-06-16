import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260612_consolidate_cashflow_views_ar_invoices.sql'),
  'utf8',
);

describe('migration de views de caixa consolidadas em ar_invoices', () => {
  it('recria cash_flow com entradas em ar_invoices e saidas em ap_bills', () => {
    expect(migration).toContain('CREATE OR REPLACE VIEW public.cash_flow AS');
    expect(migration).toContain('FROM public.ar_invoices ai');
    expect(migration).toContain("'ar_invoices' AS source_table");
    expect(migration).toContain('FROM public.ap_bills ab');
    expect(migration).toContain("'ap_bills' AS source_table");
  });

  it('mantem view legada view_ar_receivables_v1 sem ler a tabela legada', () => {
    expect(migration).toContain('CREATE OR REPLACE VIEW public.view_ar_receivables_v1 AS');
    expect(migration).toContain('Compatibilidade: view legada exposta a partir da fonte canonica ar_invoices.');

    expect(migration).not.toMatch(/FROM\s+(public\.)?ar_receivables\b/i);
    expect(migration).not.toMatch(/JOIN\s+(public\.)?ar_receivables\b/i);
    expect(migration).not.toContain("'ar_receivables' AS source_table");
  });
});