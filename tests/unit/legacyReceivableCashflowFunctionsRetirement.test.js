import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260612_retire_legacy_receivable_cashflow_functions.sql'),
  'utf8',
);

describe('migration de aposentadoria das funcoes legadas de caixa AR', () => {
  it('remove triggers legados ligados a ar_receivables', () => {
    expect(migration).toContain('DROP TRIGGER IF EXISTS sync_cashflow_on_receivable_update ON public.ar_receivables');
    expect(migration).toContain('DROP TRIGGER IF EXISTS on_ar_receivable_paid_trg ON public.ar_receivables');
  });

  it('mantem funcoes de compatibilidade sem escrita em caixa legado', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.sync_cashflow_from_receivable()');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.on_ar_receivable_paid()');
    expect(migration.match(/RETURN NEW;/g)).toHaveLength(2);

    expect(migration).not.toMatch(/INSERT\s+INTO\s+(public\.)?cash_flow_entries/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+(public\.)?ap_cashflow/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+(public\.)?ap_cashflow/i);
    expect(migration).not.toContain("'ar_receivables',");
    expect(migration).not.toMatch(/CREATE\s+TRIGGER\s+(sync_cashflow_on_receivable_update|on_ar_receivable_paid_trg)/i);
  });
});