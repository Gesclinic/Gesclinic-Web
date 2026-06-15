import { supabase } from './customSupabaseClient';
import { createReceivable } from './receivablesApi';
import { orchestrateAppointmentFinancialAutomations } from './appointmentFinancialAutomations';
import { calculateProcessingFee } from './processingFeeCalculator';

export function parseDateOnly(value) {
  if (!value) return new Date().toISOString().split('T')[0];
  return String(value).split('T')[0];
}

export function normalizePaymentMethod(method) {
  const normalized = String(method || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('pix')) return 'pix';
  if (normalized.includes('ted') || normalized.includes('transfer')) return 'ted';
  if (normalized.includes('doc')) return 'doc';
  if (normalized.includes('boleto')) return 'boleto';
  if (normalized.includes('debito')) return 'cartao_debito';
  if (normalized.includes('credito') || normalized.includes('cart')) return 'cartao_credito';
  if (normalized.includes('dinheiro') || normalized.includes('cash')) return 'cash';
  if (normalized.includes('convenio')) return 'convenio';
  return method || 'outro';
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getServiceUnitValue(item) {
  return numberValue(item.value ?? item.unit_price ?? item.services?.price ?? item.services?.base_value, 0);
}

export function getServiceGrossTotal(item) {
  const quantity = numberValue(item.quantity, 1) || 1;
  return getServiceUnitValue(item) * quantity;
}

export function getServiceTotal(item) {
  return Math.max(0, getServiceGrossTotal(item) - numberValue(item.discount, 0));
}

export function getServiceRepasse(item) {
  const total = getServiceTotal(item);
  const fixed = numberValue(item.professional_discount ?? item.professional_value, 0);
  const percentage = numberValue(item.professional_percentage, 0);
  return fixed > 0 ? fixed : total * (percentage / 100);
}

export function normalizePayerType(appointment = {}) {
  const payerType = String(appointment.payer_type || '').toUpperCase();
  const payerName = String(appointment.payer_name || appointment.payers?.name || '').toLowerCase();

  if (!appointment.payer_id || payerName === 'particular' || payerType === 'PARTICULAR') {
    return 'PARTICULAR';
  }
  if (payerType === 'EMPRESA') {
    return 'EMPRESA';
  }
  return 'CONVENIO';
}

export function buildBillableServices(appointmentServices = []) {
  return appointmentServices.map((item) => {
    const quantity = numberValue(item.quantity, 1) || 1;
    const unitValue = getServiceUnitValue(item);
    const discount = numberValue(item.discount, 0);
    const grossTotal = unitValue * quantity;
    const netTotal = Math.max(0, grossTotal - discount);
    const service = item.services || {};

    return {
      appointment_service_id: item.id || null,
      service_id: item.service_id || null,
      procedure_id: item.service_id || null,
      procedure_name: service.name || item.description || 'Servico',
      procedure_code: service.tuss_code || service.code || null,
      quantity,
      unit_value: unitValue,
      discount,
      gross_total: grossTotal,
      net_total: netTotal,
      repasse_expected: getServiceRepasse(item),
      billing_type: item.billing_type || service.type_billing || null,
      status: item.status || null,
      source: 'appointment_services',
    };
  });
}

export function buildFaturamento360Event(appointment) {
  const services = buildBillableServices(appointment?.appointment_services || []);
  if (services.length === 0) {
    throw new Error('Agendamento sem appointment_services para faturar');
  }

  const appointmentDate = parseDateOnly(
    appointment.scheduled_date || appointment.finished_at || appointment.finalizado_em,
  );
  const grossFromServices = services.reduce((sum, item) => sum + item.gross_total, 0);
  const serviceDiscount = services.reduce((sum, item) => sum + item.discount, 0);
  const appointmentGross = numberValue(
    appointment.value ?? appointment.total_value ?? appointment.financial_value,
    0,
  );
  const grossAmount = appointmentGross > 0 ? appointmentGross : grossFromServices;
  const discountAmount = numberValue(appointment.discount, serviceDiscount);
  const netAmount = Math.max(0, grossAmount - discountAmount);
  const payerType = normalizePayerType(appointment);
  const payerName = appointment.payer_name || appointment.payers?.name || 'Particular';
  const primaryService = services[0];

  return {
    source: 'agenda',
    origin: 'Agenda',
    clinic_id: appointment.clinic_id,
    appointment_id: appointment.id,
    patient_id: appointment.patient_id || null,
    patient_name: appointment.patient_name || appointment.patients?.name || null,
    professional_id: appointment.professional_id || null,
    specialty_id: appointment.specialty_id || null,
    specialty_name: appointment.specialty_name || null,
    unit_id: appointment.unit_id || appointment.room_id || null,
    unit_name: appointment.unit_name || null,
    payer_id: appointment.payer_id || appointment.convenio_id || null,
    payer_name: payerName,
    payer_type: payerType,
    plan_id: appointment.plan_id || null,
    plan_name: appointment.plan_name || appointment.plans?.name || null,
    company_id: payerType === 'EMPRESA' ? appointment.payer_id : null,
    procedure_id: primaryService?.procedure_id || appointment.service_id || null,
    procedure_name: primaryService?.procedure_name || appointment.service_description || null,
    procedure_code: primaryService?.procedure_code || null,
    quantity: services.reduce((sum, item) => sum + item.quantity, 0),
    services,
    gross_amount: grossAmount,
    discount_amount: discountAmount,
    net_amount: netAmount,
    competency_date: appointmentDate,
    due_date: appointmentDate,
    payment_method: normalizePaymentMethod(appointment.payment_method),
    payment_status: appointment.payment_status || null,
    guide_number: appointment.guide_number || appointment.authorization_number || null,
    authorization_number: appointment.authorization_number || null,
    ans_registration: appointment.payers?.registration_ans || appointment.health_insurances?.registration_ans || null,
    status: payerType === 'PARTICULAR' && appointment.payment_status === 'paid' ? 'received' : 'open',
    insurance_billing_status: payerType === 'CONVENIO' ? 'PENDENTE' : null,
    tiss_xml_status: payerType === 'CONVENIO' ? 'NAO_GERADO' : null,
    repasse_expected: services.reduce((sum, item) => sum + item.repasse_expected, 0),
    repasse_model: services.some((item) => item.repasse_expected > 0) ? 'appointment_services' : null,
    card: {
      processor_id: appointment.processor_id || appointment.card_processor_id || null,
      brand: appointment.card_brand || null,
      settlement_type: appointment.settlement_type || null,
    },
  };
}

export async function applyCardProcessingFee(event) {
  const isCardPayment = ['cartao_credito', 'cartao_debito'].includes(event.payment_method);
  const processorId = event.card?.processor_id;

  if (!isCardPayment || !processorId) {
    return { ...event, fee: null };
  }

  const fee = await calculateProcessingFee({
    clinicId: event.clinic_id,
    processorId,
    cardBrand: event.card?.brand || 'Visa',
    settlementType: event.card?.settlement_type || 'D+1',
    grossAmount: event.net_amount,
  });

  return {
    ...event,
    net_amount: fee.netAmount,
    fee,
  };
}

export function buildReceivablePayloadFromEvent(event) {
  const serviceDescription = event.services.map((item) => item.procedure_name).join(', ');
  const isConvenio = event.payer_type === 'CONVENIO';
  const isEmpresa = event.payer_type === 'EMPRESA';

  return {
    patient_id: event.patient_id,
    patient_name: event.patient_name || event.payer_name,
    payer_name: event.payer_name,
    amount: event.net_amount,
    origem: event.origin,
    description: `${serviceDescription || 'Atendimento'} - ${event.payer_name}`,
    service_description: serviceDescription,
    professional_id: event.professional_id,
    gross_amount: event.gross_amount,
    discount_value: event.discount_amount,
    net_value: event.net_amount,
    invoice_date: event.competency_date,
    due_date: event.due_date,
    received_date: event.status === 'received' ? event.due_date : null,
    status: event.status,
    appointment_id: event.appointment_id,
    total_parcelas: 1,
    payment_method: event.payment_method,
    payer_type: event.payer_type,
    payer_id: event.payer_id,
    convenio_id: isConvenio ? event.payer_id : null,
    company_id: isEmpresa ? event.company_id : null,
    guide_number: event.guide_number,
    procedure_id: event.procedure_id,
    procedure_name: event.procedure_name,
    specialty_id: event.specialty_id,
    specialty_name: event.specialty_name,
    unit_id: event.unit_id,
    unit_name: event.unit_name,
    competency_date: event.competency_date,
    ans_registration: event.ans_registration,
    insurance_billing_status: event.insurance_billing_status,
    tiss_xml_status: event.tiss_xml_status,
    repasse_expected: event.repasse_expected,
    repasse_model: event.repasse_model,
    processor_id: event.card?.processor_id,
    card_brand: event.card?.brand,
    settlement_type: event.card?.settlement_type,
    fee_percent: event.fee?.feePercent ?? null,
    fee_amount: event.fee?.feeAmount ?? null,
    metadata: {
      source: 'faturamento_360',
      billing_event: event,
      services: event.services,
    },
  };
}

export async function loadAppointmentForFaturamento360(appointmentId) {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(
      `
        id,
        clinic_id,
        patient_id,
        professional_id,
        service_id,
        payer_id,
        payer_type,
        plan_id,
        scheduled_date,
        finished_at,
        finalizado_em,
        value,
        total_value,
        financial_value,
        discount,
        payment_method,
        payment_status,
        authorization_number,
        authorization_date,
        guide_number,
        payer_name,
        plan_name,
        patient_name,
        service_description,
        card_brand,
        processor_id,
        settlement_type,
        room_id,
        billing_notes,
        payers:payer_id(id, name, registration_ans),
        plans:plan_id(id, name, code),
        appointment_services(
          id,
          service_id,
          quantity,
          value,
          discount,
          status,
          billing_type,
          professional_percentage,
          professional_discount,
          professional_repay_type,
          services(id, name, price, base_value, code, tuss_code, type_billing, guide_type, unit_measure)
        )
      `,
    )
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) {
    throw new Error(`Appointment nao encontrado: ${error?.message || appointmentId}`);
  }

  return appointment;
}

export async function createFaturamento360FromAppointment(appointmentId) {
  const appointment = await loadAppointmentForFaturamento360(appointmentId);
  const baseEvent = buildFaturamento360Event(appointment);
  let event = baseEvent;

  try {
    event = await applyCardProcessingFee(baseEvent);
  } catch (error) {
    console.warn('[faturamento360] Taxa de cartao ignorada:', error.message);
  }

  const receivablePayload = buildReceivablePayloadFromEvent(event);
  const receivable = await createReceivable(event.clinic_id, receivablePayload);
  const receivableId = Array.isArray(receivable) ? receivable[0]?.id : receivable?.id;

  const automation = await orchestrateAppointmentFinancialAutomations(
    event.appointment_id,
    event.clinic_id,
    {
      ...appointment,
      value: event.net_amount,
      faturamento360_event: event,
      receivable_id: receivableId,
    },
  );

  if (event.payer_type === 'CONVENIO' && receivable) {
    try {
      const referenceDate = new Date(event.competency_date);
      await supabase.rpc('gerar_repasse_medico', {
        p_clinic_id: event.clinic_id,
        p_mes: referenceDate.getMonth() + 1,
        p_ano: referenceDate.getFullYear(),
        p_tipo_geracao: 'agenda',
      });
    } catch (error) {
      console.warn('[faturamento360] Repasse automatico ignorado:', error.message);
    }
  }

  return {
    success: true,
    message: 'Faturamento 360 sincronizado a partir de appointment_services',
    event,
    receivable,
    receivableId,
    automation,
    servicesCount: event.services.length,
    grossValue: event.gross_amount,
    netValue: event.net_amount,
  };
}

export default {
  buildBillableServices,
  buildFaturamento360Event,
  buildReceivablePayloadFromEvent,
  createFaturamento360FromAppointment,
  loadAppointmentForFaturamento360,
  normalizePaymentMethod,
  normalizePayerType,
};
