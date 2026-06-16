import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const paymentRegistrationApi = readFileSync(resolve('src/lib/paymentRegistrationApi.js'), 'utf8');
const appointmentUnitedModal = readFileSync(
  resolve('src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx'),
  'utf8',
);
const appointmentUnitedModalBackup = readFileSync(
  resolve('src/pages/clinica/agenda/components/AppointmentUnitedModal.backup.jsx'),
  'utf8',
);

describe('paymentRegistrationApi consolidado', () => {
  it('usa recebiveis canonicos em vez de accounts_receivable', () => {
    expect(paymentRegistrationApi).toContain("from '@/lib/receivablesApi'");
    expect(paymentRegistrationApi).toContain('createReceivable');
    expect(paymentRegistrationApi).toContain('registerReceivablePayment');
    expect(paymentRegistrationApi).toContain(".from('ar_invoices')");

    expect(paymentRegistrationApi).not.toContain('accounts_receivable');
    expect(paymentRegistrationApi).not.toContain('ar_receivables');
    expect(paymentRegistrationApi).not.toContain('ar_payments');
  });

  it('nao passa id canonico para fk legada de desconto', () => {
    [appointmentUnitedModal, appointmentUnitedModalBackup].forEach((content) => {
      expect(content).toContain('accounts_receivable_id: null');
      expect(content).not.toContain('registerDiscountIfNeeded(appointmentId, paymentResult.receivableId)');
    });
  });
});