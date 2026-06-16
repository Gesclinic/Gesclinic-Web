import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = [
  'src/lib/auditFinancialApi.js',
  'src/lib/auditFinancialIntegration.js',
  'src/lib/financialCheckInApi.js',
  'src/lib/lancamentoHelpers.js',
  'src/pages/clinica/agenda/components/AtendimentoModal.jsx',
];

const contents = files.map((file) => ({
  file,
  content: readFileSync(resolve(file), 'utf8'),
}));

describe('auditoria financeira consolidada em ar_invoices', () => {
  it('nao usa accounts_receivable como related_entity ativo', () => {
    contents.forEach(({ content }) => {
      expect(content).not.toContain('RELATED_ENTITY_TYPES.ACCOUNTS_RECEIVABLE');
      expect(content).not.toContain("ACCOUNTS_RECEIVABLE: 'accounts_receivable'");
      expect(content).not.toContain("relatedEntity: 'accounts_receivable'");
    });
  });

  it('usa ar_invoices para eventos de recebiveis canonicos', () => {
    const combined = contents.map(({ content }) => content).join('\n');
    expect(combined).toContain("AR_INVOICE: 'ar_invoices'");
    expect(combined).toContain('RELATED_ENTITY_TYPES.AR_INVOICE');
    expect(combined).toContain("relatedEntity: 'ar_invoices'");
  });
});