import { describe, expect, it } from 'vitest';
import {
  buildBillableServices,
  buildFaturamento360Event,
  buildReceivablePayloadFromEvent,
  normalizePaymentMethod,
} from '../../src/lib/faturamento360Api.js';

const clinicId = '11111111-1111-4111-8111-111111111111';
const appointmentId = '22222222-2222-4222-8222-222222222222';

function buildAppointment(overrides = {}) {
  return {
    id: appointmentId,
    clinic_id: clinicId,
    patient_id: '33333333-3333-4333-8333-333333333333',
    patient_name: 'Paciente 360',
    professional_id: '44444444-4444-4444-8444-444444444444',
    payer_id: '55555555-5555-4555-8555-555555555555',
    payer_type: 'CONVENIO',
    payer_name: 'Convenio Integrado',
    plan_id: '66666666-6666-4666-8666-666666666666',
    plan_name: 'Plano Enterprise',
    scheduled_date: '2026-06-11T09:30:00.000Z',
    payment_method: 'Cartão de Crédito',
    guide_number: 'G-360-001',
    appointment_services: [
      {
        id: 'as-001',
        service_id: '77777777-7777-4777-8777-777777777777',
        quantity: 2,
        value: 150,
        discount: 20,
        professional_percentage: 40,
        status: 'completed',
        services: {
          name: 'Consulta Especializada',
          code: 'CONS-ESP',
          tuss_code: '10101012',
          price: 150,
        },
      },
      {
        id: 'as-002',
        service_id: '88888888-8888-4888-8888-888888888888',
        quantity: 1,
        value: 80,
        discount: 0,
        professional_discount: 30,
        status: 'completed',
        services: {
          name: 'Procedimento SADT',
          code: 'SADT-01',
          tuss_code: '20101020',
          price: 80,
        },
      },
    ],
    ...overrides,
  };
}

describe('Faturamento Enterprise 360 event', () => {
  it('normaliza meios de pagamento para o contrato financeiro', () => {
    expect(normalizePaymentMethod('PIX')).toBe('pix');
    expect(normalizePaymentMethod('Cartão de Débito')).toBe('cartao_debito');
    expect(normalizePaymentMethod('Transferência bancária')).toBe('ted');
  });

  it('monta servicos faturaveis a partir de appointment_services', () => {
    const services = buildBillableServices(buildAppointment().appointment_services);

    expect(services).toHaveLength(2);
    expect(services[0]).toMatchObject({
      source: 'appointment_services',
      procedure_name: 'Consulta Especializada',
      quantity: 2,
      unit_value: 150,
      discount: 20,
      gross_total: 300,
      net_total: 280,
      repasse_expected: 112,
    });
    expect(services[1].repasse_expected).toBe(30);
  });

  it('cria evento 360 completo para convenio', () => {
    const event = buildFaturamento360Event(buildAppointment());

    expect(event).toMatchObject({
      source: 'agenda',
      clinic_id: clinicId,
      appointment_id: appointmentId,
      payer_type: 'CONVENIO',
      payer_name: 'Convenio Integrado',
      procedure_name: 'Consulta Especializada',
      quantity: 3,
      gross_amount: 380,
      discount_amount: 20,
      net_amount: 360,
      competency_date: '2026-06-11',
      status: 'open',
      insurance_billing_status: 'PENDENTE',
      tiss_xml_status: 'NAO_GERADO',
      repasse_expected: 142,
    });
  });

  it('cria payload de ar_invoices com metadata do evento faturavel', () => {
    const event = buildFaturamento360Event(buildAppointment());
    const payload = buildReceivablePayloadFromEvent(event);

    expect(payload).toMatchObject({
      origem: 'Agenda',
      payer_type: 'CONVENIO',
      convenio_id: '55555555-5555-4555-8555-555555555555',
      amount: 360,
      gross_amount: 380,
      discount_value: 20,
      net_value: 360,
      procedure_name: 'Consulta Especializada',
      guide_number: 'G-360-001',
      repasse_expected: 142,
    });
    expect(payload.metadata.source).toBe('faturamento_360');
    expect(payload.metadata.billing_event.services).toHaveLength(2);
  });

  it('marca particular pago como recebivel recebido', () => {
    const event = buildFaturamento360Event(
      buildAppointment({
        payer_id: null,
        payer_type: 'PARTICULAR',
        payer_name: 'Particular',
        payment_status: 'paid',
        payment_method: 'PIX',
      }),
    );

    expect(event.payer_type).toBe('PARTICULAR');
    expect(event.status).toBe('received');
    expect(event.payment_method).toBe('pix');
    expect(event.insurance_billing_status).toBeNull();
  });
});
