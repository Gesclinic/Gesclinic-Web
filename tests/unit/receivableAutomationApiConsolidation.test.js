import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const content = readFileSync(resolve('src/lib/receivableAutomationApi.ts'), 'utf8');

describe('receivableAutomationApi consolidado', () => {
  it('nao chama RPCs ou tabelas legadas de parcelamento/baixa', () => {
    expect(content).not.toContain(".rpc('split_receivable_into_installments'");
    expect(content).not.toContain(".rpc('register_receivable_payment'");
    expect(content).not.toContain(".rpc('get_receivables_aging'");
    expect(content).not.toMatch(/\.from\(['"]receivable_installments['"]\)/);
    expect(content).not.toMatch(/\.from\(['"]ar_receivable_installments['"]\)/);
    expect(content).not.toMatch(/\.from\(['"]ar_payments['"]\)/);
  });

  it('usa ar_invoices e receivable_payments como fontes canonicas', () => {
    expect(content).toContain(".from('ar_invoices')");
    expect(content).toContain(".from('receivable_payments')");
    expect(content).toContain('registerArInvoicePayment');
    expect(content).toContain(".eq('ar_invoice_id', receivableId)");
  });
});