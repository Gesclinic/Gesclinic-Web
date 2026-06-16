import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260612_consolidate_financial_integration_ar_invoices.sql'),
  'utf8',
);

describe('migration de integracao financeira consolidada', () => {
  it('desativa o trigger legado de criacao automatica de recebiveis por appointment', () => {
    expect(migration).toContain(
      'DROP TRIGGER IF EXISTS create_receivable_on_appointment_attended ON public.appointments',
    );
    expect(migration).not.toMatch(/CREATE\s+TRIGGER\s+create_receivable_on_appointment_attended/i);
    expect(migration).toContain('Recebiveis de agenda sao criados pelo motor Faturamento 360 em ar_invoices');
  });

  it('reaponta resumo e views para ar_invoices sem DML legado', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.cashflow_summary');
    expect(migration).toContain('FROM public.ar_invoices');
    expect(migration).toContain('LEFT JOIN public.ar_invoices ai ON a.id = ai.appointment_id');
    expect(migration).toContain('CREATE OR REPLACE VIEW public.vw_receivables_report');

    expect(migration).not.toMatch(/INSERT\s+INTO\s+(public\.)?ar_receivables/i);
    expect(migration).not.toMatch(/UPDATE\s+(public\.)?ar_receivables/i);
    expect(migration).not.toMatch(/FROM\s+(public\.)?ar_receivables\b/i);
    expect(migration).not.toMatch(/JOIN\s+(public\.)?ar_receivables\b/i);
    expect(migration).not.toMatch(/AFTER\s+UPDATE\s+ON\s+(public\.)?ar_receivables/i);
  });
});