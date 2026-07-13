/**
 * Appointment Billing API
 *
 * Sincroniza dados de faturamento do agendamento com:
 * - ap_bills (Contas a Receber)
 * - invoices (Guias de Faturamento)
 */

import { supabase } from './customSupabaseClient';
import { createReceivable } from './receivablesApi';
import { orchestrateAppointmentFinancialAutomations } from './appointmentFinancialAutomations';
import { calculateAutomaticRepasse } from './financeIntegrationApi';
import {
  logAppointmentFinancialAudit,
  FINANCIAL_EVENT_TYPES,
  RELATED_ENTITY_TYPES,
} from './auditFinancialApi';
import { calculateProcessingFee } from './processingFeeCalculator';
import {
  commitPackageConsumption,
  createPackagesFromAppointmentServices,
  preparePackageConsumption,
} from './appointmentPackagesApi';

const APPOINTMENT_BILLING_SELECT_BASE = `
  id,
  clinic_id,
  patient_id,
  professional_id,
  service_id,
  payer_id,
  plan_id,
  scheduled_date,
  value,
  discount,
  payment_method,
  payment_status,
  authorization_number,
  authorization_date,
  guide_number,
  payer_name,
  plan_name,
  patients:patient_id(id, name),
  payers:payer_id(id, name),
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
    services(id, name, price, code, tuss_code)
  )
`;

const APPOINTMENT_BILLING_SELECT_WITH_CARD = APPOINTMENT_BILLING_SELECT_BASE.replace(
  'patients:patient_id',
  'card_processor_id,\n  card_brand,\n  settlement_type,\n  patients:patient_id',
);

async function loadAppointmentForBilling(appointmentId) {
  const withCard = await supabase
    .from('appointments')
    .select(APPOINTMENT_BILLING_SELECT_WITH_CARD)
    .eq('id', appointmentId)
    .single();

  if (!withCard.error) {
    return withCard;
  }

  const message = String(withCard.error.message || '');
  if (!message.includes('card_processor_id') && !message.includes('card_brand') && !message.includes('settlement_type')) {
    return withCard;
  }

  console.warn('Campos de cartao nao existem em appointments; carregando faturamento sem dados de processadora.');
  return supabase
    .from('appointments')
    .select(APPOINTMENT_BILLING_SELECT_BASE)
    .eq('id', appointmentId)
    .single();
}

function parseDateOnly(value) {
  if (!value) return new Date().toISOString().split('T')[0];
  return String(value).split('T')[0];
}

function normalizePaymentMethod(method) {
  const normalized = String(method || '').toLowerCase();
  if (normalized.includes('pix')) return 'pix';
  if (normalized.includes('ted') || normalized.includes('transfer')) return 'ted';
  if (normalized.includes('boleto')) return 'boleto';
  if (normalized.includes('debito') || normalized.includes('débito')) return 'cartao_debito';
  if (normalized.includes('credito') || normalized.includes('crédito') || normalized.includes('cart')) {
    return 'cartao_credito';
  }
  if (normalized.includes('dinheiro')) return 'cash';
  return method || 'outro';
}

function getServiceUnitValue(item) {
  return Number(item.value ?? item.unit_price ?? item.services?.price ?? 0) || 0;
}

function getServiceBillableQuantity(item) {
  const quantity = Number(item.package_billable_quantity ?? item.quantity ?? 1);
  return Number.isFinite(quantity) ? quantity : 1;
}

function getServiceTotal(item) {
  const quantity = getServiceBillableQuantity(item);
  const discount = Number(item.discount || 0) || 0;
  return Math.max(0, getServiceUnitValue(item) * quantity - discount);
}

function getServiceGrossTotal(item) {
  const quantity = getServiceBillableQuantity(item);
  return getServiceUnitValue(item) * quantity;
}

function getServiceRepasse(item) {
  const total = getServiceTotal(item);
  const fixed = Number(item.professional_discount || item.professional_value || 0) || 0;
  const percentage = Number(item.professional_percentage || item.professional_percent || 0) || 0;
  return fixed > 0 ? fixed : total * (percentage / 100);
}

async function calculateRepasseExpectedFromRules(appointment, appointmentServices) {
  if (!appointment?.clinic_id || !appointment?.professional_id) {
    return { amount: 0, ruleIds: [], warnings: ['Profissional não identificado para regra de repasse'] };
  }

  const results = await Promise.all(
    appointmentServices.map(async (item) => {
      if (!item.service_id) {
        return { amount: 0, ruleId: null, warnings: ['Serviço não identificado para regra de repasse'] };
      }

      const result = await calculateAutomaticRepasse({
        clinicId: appointment.clinic_id,
        professionalId: appointment.professional_id,
        serviceId: item.service_id,
        baseAmount: getServiceTotal(item),
        appointmentStatus: appointment.status || 'completed',
        healthInsuranceId: appointment.payer_id || null,
      });

      return {
        amount: Number(result.repasse || 0),
        ruleId: result.rule?.ruleId || result.rule?.id || null,
        warnings: result.warnings || [],
      };
    }),
  );

  return {
    amount: results.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    ruleIds: results.map((item) => item.ruleId).filter(Boolean),
    warnings: results.flatMap((item) => item.warnings || []),
  };
}

/**
 * ✅ Sincronizar faturamento ao finalizar atendimento
 *
 * Cria recebíveis em ar_invoices a partir de appointment_services
 * e aciona automações de fluxo de caixa/DRE já existentes.
 */
export const syncAppointmentBilling = async (appointmentId) => {
  try {
    console.log('💳 [syncAppointmentBilling] Iniciando sincronização para:', appointmentId);

    // 1️⃣ Carregar appointment com detalhes
    const { data: appointment, error: aptError } = await loadAppointmentForBilling(appointmentId);

    if (aptError || !appointment) {
      throw new Error(`Appointment não encontrado: ${aptError?.message}`);
    }

    console.log('✅ Appointment carregado:', {
      id: appointment.id,
      payer: appointment.payer_name || appointment.payers?.name,
      value: appointment.value,
      paymentMethod: appointment.payment_method,
    });

    const originalAppointmentServices = appointment.appointment_services || [];
    if (originalAppointmentServices.length === 0) {
      throw new Error('Agendamento sem appointment_services para faturar');
    }

    const { data: existingReceivable, error: existingReceivableError } = await supabase
      .from('ar_invoices')
      .select('id, amount, net_value, status')
      .eq('clinic_id', appointment.clinic_id)
      .eq('appointment_id', appointment.id)
      .limit(1);

    if (existingReceivableError) {
      throw new Error(`Erro ao verificar recebivel existente: ${existingReceivableError.message}`);
    }

    if (existingReceivable?.length > 0) {
      return {
        success: true,
        message: 'Faturamento da agenda ja sincronizado em Contas a Receber',
        receivableId: existingReceivable[0].id,
        servicesCount: appointmentServices.length,
        grossValue: Number(existingReceivable[0].amount || 0),
        netValue: Number(existingReceivable[0].net_value || existingReceivable[0].amount || 0),
        alreadySynced: true,
      };
    }

    // 2️⃣ Determinar tipo de pagamento
    const payerName = appointment.payer_name || appointment.payers?.name;
    const isParticular = !appointment.payer_id || payerName === 'Particular';
    const isConvenio = appointment.payer_id && !isParticular;
    const packageConsumption = await preparePackageConsumption(appointment, originalAppointmentServices);
    const appointmentServices = packageConsumption.services;

    const grossServicesValue = appointmentServices.reduce(
      (sum, item) => sum + getServiceGrossTotal(item),
      0,
    );
    const servicesDiscount = appointmentServices.reduce(
      (sum, item) => sum + (Number(item.discount || 0) || 0),
      0,
    );
    const hasPackageConsumption = packageConsumption.consumptionPlans.length > 0;
    const finalValue = hasPackageConsumption
      ? grossServicesValue
      : Number(appointment.value || 0) > 0
        ? Number(appointment.value)
        : grossServicesValue;
    const discountValue = Number(appointment.discount || 0) || servicesDiscount;
    const netValue = Math.max(0, finalValue - discountValue);

    console.log('📋 Tipo:', { isParticular, isConvenio, finalValue, netValue, payerName });

    // 2️⃣ B) Se for pagamento em cartão, calcular taxa de processamento
    let cardFeeData = null;
    const isCardPayment = appointment.payment_method &&
      appointment.payment_method.toLowerCase().includes('cartão');

    if (isCardPayment && appointment.card_processor_id) {
      try {
        cardFeeData = await calculateProcessingFee({
          clinicId: appointment.clinic_id,
          processorId: appointment.card_processor_id,
          cardBrand: appointment.card_brand || 'Visa',
          settlementType: appointment.settlement_type || 'D+1',
          grossAmount: netValue,
        });
        console.log('💳 Taxa de cartão calculada:', cardFeeData);
      } catch (error) {
        console.warn('⚠️ Erro ao calcular taxa de cartão:', error.message);
        // Continuar sem taxa de cartão
      }
    }

    // 3️⃣ Criar entrada em ar_invoices (Contas a Receber enterprise)
    const appointmentDate = parseDateOnly(appointment.scheduled_date);
    const serviceDescription = appointmentServices
      .map((item) => item.services?.name || 'Servico')
      .join(', ');
    const repasseExpected = await calculateRepasseExpectedFromRules(appointment, appointmentServices);

    const receivableData = {
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name || appointment.patients?.name || null,
      payer_name: payerName || 'Particular',
      amount: cardFeeData ? cardFeeData.netAmount : netValue, // Usar net amount se houver taxa
      origem: 'Agenda',
      description: `${serviceDescription || 'Atendimento'} - ${payerName || 'Particular'}`,
      service_description: serviceDescription,
      professional_id: appointment.professional_id,
      gross_amount: finalValue,
      discount_value: discountValue,
      net_value: cardFeeData ? cardFeeData.netAmount : netValue,
      invoice_date: appointmentDate,
      due_date: appointmentDate,
      received_date: isParticular && appointment.payment_status === 'paid' ? appointmentDate : null,
      status: isParticular && appointment.payment_status === 'paid' ? 'received' : 'open',
      appointment_id: appointment.id,
      total_parcelas: 1,
      payment_method: normalizePaymentMethod(appointment.payment_method),
      payer_type: isConvenio ? 'convenio' : 'paciente',
      payer_id: appointment.payer_id || null,
      convenio_id: isConvenio ? appointment.payer_id : null,
      guide_number: appointment.guide_number || appointment.authorization_number || null,
      procedure_id: appointmentServices[0]?.service_id || appointment.service_id || null,
      procedure_name: appointmentServices[0]?.services?.name || null,
      competency_date: appointmentDate,
      insurance_billing_status: isConvenio ? 'pendente' : null,
      tiss_xml_status: isConvenio ? 'nao_gerado' : null,
      repasse_expected: repasseExpected.amount,
      repasse_percent: null,
      repasse_model: 'module_rules',
      metadata: {
        source: 'appointment_services',
        repasse: {
          source: 'module_rules',
          rule_ids: repasseExpected.ruleIds,
          warnings: repasseExpected.warnings,
        },
        services: appointmentServices.map((item) => ({
          appointment_service_id: item.id,
          service_id: item.service_id,
          name: item.services?.name,
          code: item.services?.tuss_code || item.services?.code,
          quantity: item.quantity || 1,
          unit_value: getServiceUnitValue(item),
          total: getServiceTotal(item),
          billing_type: item.billing_type || 'per_consultation',
          sessions_completed: item.sessions_completed || 0,
          package_consumed_sessions: item.package_consumed_sessions || 0,
          package_billable_quantity: item.package_billable_quantity ?? item.quantity ?? 1,
          package_covered_value: item.package_covered_value || 0,
          package_ids: (item.package_consumption_plans || []).map((plan) => plan.packageId),
          status: item.status,
        })),
        packages: {
          consumptions: packageConsumption.consumptionPlans,
          warnings: packageConsumption.warnings,
        },
      },
      // Card processor data
      processor_id: appointment.card_processor_id || null,
      card_brand: appointment.card_brand || null,
      settlement_type: appointment.settlement_type || null,
      fee_percent: cardFeeData ? cardFeeData.feePercent : null,
      fee_amount: cardFeeData ? cardFeeData.feeAmount : null,
      net_amount: cardFeeData ? cardFeeData.netAmount : null,
    };

    console.log('💾 Dados de Recebível:', receivableData);

    const receivable = await createReceivable(appointment.clinic_id, receivableData);
    console.log('✅ Conta a Receber criada:', receivable?.id);

    const packageMovements = await commitPackageConsumption({
      appointment,
      consumptionPlans: packageConsumption.consumptionPlans,
      receivableId: receivable?.id,
    });
    const createdPackages = await createPackagesFromAppointmentServices({
      appointment,
      appointmentServices: originalAppointmentServices,
      receivableId: receivable?.id,
    });

    await orchestrateAppointmentFinancialAutomations(appointment.id, appointment.clinic_id, {
      ...appointment,
      value: receivableData.net_value,
    });

    // 4️⃣ Se for convênio, criar também em invoices (faturamento/guias)
    if (isConvenio) {
      console.log('📄 Criando Guia de Faturamento para convênio...');

      // TODO: Validar status correto para invoices - constraint recusando todos os valores
      // Por enquanto comentado
      /*
      const invoiceData = {
        clinic_id: appointment.clinic_id,
        appointment_id: appointment.id,
        amount: netValue,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select();

      if (invoiceError) {
        console.error('⚠️ Erro ao criar Guia de Faturamento:', invoiceError.message);
      } else {
        console.log('✅ Guia criada:', invoice[0]?.id);
      }
      */
    }

    // 5️⃣ Gerar repasse automático se é convênio e receivable foi criado
    if (isConvenio && receivable) {
      console.log('💰 Gerando repasse automático...');

      try {
        // Chamar RPC para gerar repasse automaticamente
        const { data: repasse, error: repasseError } = await supabase.rpc('gerar_repasse_medico', {
          p_clinic_id: appointment.clinic_id,
          p_mes: new Date().getMonth() + 1,
          p_ano: new Date().getFullYear(),
          p_tipo_geracao: 'agenda',
        });

        if (repasseError) {
          console.error('⚠️ Erro ao gerar repasse:', repasseError.message);
        } else {
          console.log('✅ Repasse gerado:', repasse);
        }
      } catch (err) {
        console.error('⚠️ Erro ao chamar RPC de repasse:', err.message);
      }
    }

    return {
      success: true,
      message: '✅ Faturamento sincronizado: Conta a Receber criada a partir de appointment_services',
      receivableId: receivable?.id,
      servicesCount: appointmentServices.length,
      packageMovementsCount: packageMovements.length,
      createdPackagesCount: createdPackages.length,
      grossValue: finalValue,
      netValue: receivableData.net_value,
    };
  } catch (err) {
    console.error('❌ Erro em syncAppointmentBilling:', err);
    return {
      success: false,
      message: `❌ Erro ao sincronizar faturamento: ${err.message}`,
      error: err,
    };
  }
};
