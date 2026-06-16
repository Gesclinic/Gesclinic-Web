import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const content = readFileSync(
  resolve('src/modules/financeiro/hooks/useReceivableAutomation.ts'),
  'utf8',
);

describe('useReceivableAutomation consolidado', () => {
  it('usa query keys canonicas para parcelas baseadas em ar_invoices', () => {
    expect(content).toContain("queryKey: ['ar_invoice_installments'");
    expect(content).not.toContain("queryKey: ['receivable_installments'");
  });

  it('aceita ids canonicos uuid no fluxo de recebiveis', () => {
    expect(content).toContain('receivableId?: string | number');
    expect(content).toContain('installmentId?: string | number');
    expect(content).toContain('installmentId: string | number');
    expect(content).not.toContain('receivableId?: number');
    expect(content).not.toContain('installmentId?: number');
    expect(content).not.toContain('installmentId: number;');
  });
});