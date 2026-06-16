import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const operationalScripts = [
  'diagnostico_appointment_id.js',
  'insert_test_data_smart.js',
  'setup_test_data_march_2026.js',
  'verify_march.js',
];

describe('scripts operacionais consolidados', () => {
  it('nao executam consultas nas tabelas financeiras legadas', () => {
    for (const script of operationalScripts) {
      const content = readFileSync(resolve(script), 'utf8');

      expect(content).not.toMatch(/\.from\(['"]ar_receivables['"]\)/);
      expect(content).not.toMatch(/\.from\(['"]ar_payments['"]\)/);
      expect(content).not.toMatch(/\.from\(['"]ar_receivable_installments['"]\)/);
    }
  });

  it('usa ar_invoices como fonte operacional de recebiveis', () => {
    for (const script of operationalScripts) {
      const content = readFileSync(resolve(script), 'utf8');

      expect(content).toContain(".from('ar_invoices')");
    }
  });
});