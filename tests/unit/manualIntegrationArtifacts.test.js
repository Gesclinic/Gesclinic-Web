import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const manualArtifacts = [
  'src/lib/integrationTests.js',
  'src/lib/__tests__/testCompleteFlow.js',
  'src/lib/INVOICE_AUTOMATION_TESTS.js',
  'src/lib/appointmentsApi_refactored.js',
  'src/lib/appointmentsApi.backup.js',
];

describe('manual integration artifacts consolidados', () => {
  it('nao consultam tabelas financeiras legadas', () => {
    for (const artifact of manualArtifacts) {
      const content = readFileSync(resolve(artifact), 'utf8');

      expect(content).not.toMatch(/\.from\(['"]ar_receivables['"]\)/);
      expect(content).not.toMatch(/\.from\(['"]ar_payments['"]\)/);
      expect(content).not.toMatch(/\.from\(['"]ar_receivable_installments['"]\)/);
    }
  });

  it('mantem as fontes canonicas para recebiveis e pagamentos', () => {
    const integrationTests = readFileSync(resolve('src/lib/integrationTests.js'), 'utf8');
    const completeFlow = readFileSync(resolve('src/lib/__tests__/testCompleteFlow.js'), 'utf8');
    const invoiceAutomationChecklist = readFileSync(resolve('src/lib/INVOICE_AUTOMATION_TESTS.js'), 'utf8');
    const appointmentsApiRefactored = readFileSync(resolve('src/lib/appointmentsApi_refactored.js'), 'utf8');
    const appointmentsApiBackup = readFileSync(resolve('src/lib/appointmentsApi.backup.js'), 'utf8');

    expect(integrationTests).toContain(".from('ar_invoices')");
    expect(integrationTests).toContain(".from('receivable_payments')");
    expect(completeFlow).toContain(".from('ar_invoices')");
    expect(invoiceAutomationChecklist).toContain('ar_invoices');
    expect(appointmentsApiRefactored).toContain(".from('ar_invoices')");
    expect(appointmentsApiBackup).toContain(".from('ar_invoices')");
  });
});