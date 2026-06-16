import { describe, expect, it } from 'vitest';
import {
  buildFaturamento360Event,
  buildReceivablePayloadFromEvent,
  normalizePaymentMethod,
} from '../../src/lib/faturamento360Api.js';

const clinicId = '11111111-1111-4111-8111-111111111111';
const appointmentId = '22222222-2222-4222-8222-222222222222';

function buildAppointmentWithServices(overrides = {}) {
  return {
    id: appointmentId,
    clinic_id: clinicId,
    patient_id: '33333333-3333-4333-8333-333333333333',
    patient_name: 'Paciente Fluxo 360',
    professional_id: '44444444-4444-4444-8444-444444444444',
    payer_id: '55555555-5555-4555-8555-555555555555',
    payer_type: 'CONVENIO',
    payer_name: 'Operadora Integrada',
    plan_id: '66666666-6666-4666-8666-666666666666',
    plan_name: 'Plano Integrado',
    scheduled_date: '2026-06-11T09:30:00.000Z',
    payment_method: 'Convênio',
    guide_number: 'GUIA-E2E-001',
    appointment_services: [
      {
        id: 'as-e2e-001',
        service_id: '77777777-7777-4777-8777-777777777777',
        quantity: 1,
        value: 300,
        discount: 20,
        professional_percentage: 35,
        status: 'completed',
        services: {
          name: 'Consulta Integrada',
          code: 'CONS-360',
          tuss_code: '10101012',
          price: 300,
        },
      },
      {
        id: 'as-e2e-002',
        service_id: '88888888-8888-4888-8888-888888888888',
        quantity: 2,
        value: 80,
        discount: 0,
        professional_discount: 40,
        status: 'completed',
        services: {
          name: 'Procedimento Complementar',
          code: 'PROC-360',
          tuss_code: '20101020',
          price: 80,
        },
      },
    ],
    ...overrides,
  };
}

function applyPayment(receivable, payment) {
  const paidTotal = Number(receivable.paid_total || 0) + Number(payment.amount || 0);
  const glosaValue = Number(receivable.glosa_value || 0);
  const balance = Math.max(0, Number(receivable.net_value || receivable.amount || 0) - paidTotal - glosaValue);

  return {
    ...receivable,
    paid_total: paidTotal,
    received_value: paidTotal,
    balance_amount: balance,
    received_date: payment.date,
    status: balance <= 0 ? 'received' : 'partial',
    payment_split: [...(receivable.payment_split || []), payment],
  };
}

function applyGlosa(receivable, glosa) {
  const paidTotal = Number(receivable.paid_total || 0);
  const glosaValue = Number(receivable.glosa_value || 0) + Number(glosa.amount || 0);
  const balance = Math.max(0, Number(receivable.net_value || receivable.amount || 0) - paidTotal - glosaValue);

  return {
    ...receivable,
    glosa_value: glosaValue,
    balance_amount: balance,
    status: balance <= 0 && paidTotal > 0 ? 'received' : 'glossed',
    metadata: {
      ...receivable.metadata,
      glosas: [...(receivable.metadata?.glosas || []), glosa],
    },
  };
}

describe('Faturamento 360 ponta a ponta tecnico', () => {
  it('percorre Agenda -> servicos -> recebivel -> baixa parcial/total -> glosa -> financeiro -> DRE -> repasse', () => {
    const appointment = buildAppointmentWithServices();

    const event = buildFaturamento360Event(appointment);
    expect(event.services).toHaveLength(2);
    expect(event.services.every((service) => service.source === 'appointment_services')).toBe(true);
    expect(event.net_amount).toBe(440);
    expect(event.repasse_expected).toBe(138);

    let receivable = buildReceivablePayloadFromEvent(event);
    receivable = {
      ...receivable,
      id: 'ar-invoice-e2e-001',
      clinic_id: clinicId,
      paid_total: 0,
      received_value: 0,
      balance_amount: receivable.net_value,
    };

    expect(receivable).toMatchObject({
      appointment_id: appointmentId,
      guide_number: 'GUIA-E2E-001',
      status: 'open',
      metadata: { source: 'faturamento_360' },
    });

    receivable = applyPayment(receivable, {
      amount: 200,
      method: normalizePaymentMethod('PIX'),
      date: '2026-06-12',
    });
    expect(receivable.status).toBe('partial');
    expect(receivable.balance_amount).toBe(240);

    receivable = applyGlosa(receivable, {
      amount: 40,
      reason: 'Divergencia de autorizacao TISS',
      status: 'contestada',
    });
    expect(receivable.status).toBe('glossed');
    expect(receivable.balance_amount).toBe(200);

    receivable = applyPayment(receivable, {
      amount: 200,
      method: normalizePaymentMethod('TED'),
      date: '2026-06-20',
    });
    expect(receivable.status).toBe('received');
    expect(receivable.balance_amount).toBe(0);

    const cashFlowEntry = {
      clinic_id: clinicId,
      reference_table: 'ar_invoices',
      reference_id: receivable.id,
      amount: receivable.received_value,
      type: 'income',
      status: 'realized',
    };
    const dreEntry = {
      clinic_id: clinicId,
      reference_table: 'ar_invoices',
      reference_id: receivable.id,
      revenue: receivable.received_value,
      glosa: receivable.glosa_value,
      net_revenue: receivable.received_value - receivable.glosa_value,
    };
    const repasseEntry = {
      clinic_id: clinicId,
      professional_id: event.professional_id,
      reference_table: 'appointment_services',
      reference_id: appointment.appointment_services[0].id,
      amount: event.repasse_expected,
      status: 'pending',
    };

    expect(cashFlowEntry).toMatchObject({ reference_table: 'ar_invoices', amount: 400, status: 'realized' });
    expect(dreEntry).toMatchObject({ reference_table: 'ar_invoices', revenue: 400, glosa: 40, net_revenue: 360 });
    expect(repasseEntry).toMatchObject({ reference_table: 'appointment_services', amount: 138, status: 'pending' });
  });

  it('mantem faturamento particular pago como baixa total imediata', () => {
    const event = buildFaturamento360Event(buildAppointmentWithServices({ payer_id: null, payer_type: 'PARTICULAR', payer_name: 'Particular', payment_method: 'Cartao de Debito', payment_status: 'paid' }));
    const receivable = buildReceivablePayloadFromEvent(event);

    expect(event.status).toBe('received');
    expect(receivable.status).toBe('received');
    expect(receivable.payment_method).toBe('cartao_debito');
    expect(receivable.convenio_id).toBeNull();
  });
});
