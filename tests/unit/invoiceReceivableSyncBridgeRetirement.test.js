import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve('supabase/migrations/20260612_retire_invoice_receivable_sync_bridge.sql'),
  'utf8',
);

describe('migration de aposentadoria da ponte invoice receivable', () => {
  it('remove trigger e funcao que duplicavam ar_invoices em ar_receivables', () => {
    expect(migration).toContain('DROP TRIGGER IF EXISTS tr_sync_invoice_to_receivables ON public.ar_invoices');
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.trigger_sync_invoice_to_receivables()');
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.sync_invoices_to_receivables()');
  });

  it('mantem apenas stub sem escrita na tabela legada', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.sync_invoices_to_receivables()');
    expect(migration).toContain('Ponte desativada: ar_invoices e a fonte canonica de recebiveis.');

    expect(migration).not.toMatch(/INSERT\s+INTO\s+(public\.)?ar_receivables/i);
    expect(migration).not.toMatch(/UPDATE\s+(public\.)?ar_receivables/i);
    expect(migration).not.toMatch(/CREATE\s+TRIGGER\s+tr_sync_invoice_to_receivables/i);
    expect(migration).not.toMatch(/AFTER\s+INSERT\s+ON\s+(public\.)?ar_invoices/i);
  });
});