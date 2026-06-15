/**
 * Financial Check-in API
 * Processa dados financeiros capturados no check-in e gera:
 * - Contas a Receber (PARTICULAR)
 * - Guias de Faturamento (CONVÊNIO)
 */

import { supabase } from './customSupabaseClient';
import {
  logAppointmentFinancialAudit,
  FINANCIAL_EVENT_TYPES,
  RELATED_ENTITY_TYPES,
} from './auditFinancialApi';
import { createReceivable, listReceivables } from './receivablesApi.js';

function dateOnly(value = new Date()) {
  return new Date(value).toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Salva dados financeiros do check-in e gera documento apropriado
 * @param {string} appointmentId - ID do agendamento
 * @param {object} financialData - Dados financeiros capturados
 * @returns {object} Resultado da operação
 */
export const saveCheckInFinancialData = async (appointmentId, financialData) => {
  try {
    if (!appointmentId) {
      return { error: true, message: '❌ ID do agendamento não fornecido' };
    }

    console.log('📊 [saveCheckInFinancialData] Iniciando...', { appointmentId, financialData });

    // Obter dados do agendamento
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('id, patient_id, professional_id, clinic_id, appointment_date, service_id, status')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      return {
        error: true,
        message: `❌ Agendamento não encontrado: ${aptError?.message || 'desconhecido'}`,
      };
    }

    console.log('✅ Agendamento carregado:', appointment);

    // 🆕 1️⃣ Atualizar dados do paciente se fornecidos
    if (
      financialData.patient_name ||
      financialData.patient_email ||
      financialData.patient_cpf ||
      financialData.patient_phone
    ) {
      console.log('👤 Atualizando dados do paciente...');
      const patientUpdate = {};
      if (financialData.patient_name) {
        patientUpdate.name = financialData.patient_name;
      }
      if (financialData.patient_email) {
        patientUpdate.email = financialData.patient_email;
      }
      if (financialData.patient_cpf) {
        patientUpdate.cpf = financialData.patient_cpf;
      }
      if (financialData.patient_phone) {
        patientUpdate.phone = financialData.patient_phone;
      }

      await supabase.from('patients').update(patientUpdate).eq('id', appointment.patient_id);

      console.log('✅ Dados do paciente atualizados:', patientUpdate);
    }

    // 2️⃣ Atualizar campos financeiros no appointment
    console.log('💾 Atualizando campos financeiros no appointment...');
    const updateData = {
      payer_type: financialData.payer_type || 'PARTICULAR',
      health_plan: financialData.health_plan || null,
      authorization_number: financialData.authorization_number || null,
      authorization_expiry: financialData.authorization_expiry || null,
      card_number: financialData.card_number || null,
      card_verified: financialData.card_verified || false,
      guide_number: financialData.guide_number || null,
      payment_method: financialData.payment_method || null,
      value: financialData.value || 0,
      copayment: financialData.copayment || 0,
      discount: financialData.discount || 0,
    };

    const { error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId);

    if (updateError) {
      return { error: true, message: `❌ Erro ao atualizar agendamento: ${updateError.message}` };
    }

    console.log('✅ Agendamento atualizado com dados financeiros');

    // 3️⃣ Gerar documento conforme tipo de pagador
    let result = { type: 'none', data: null };

    if (!financialData.payer_type || financialData.payer_type === 'PARTICULAR') {
      console.log('💳 [PARTICULAR] Gerando Conta a Receber...');
      result = await createAccountsReceivable(appointmentId, appointment, financialData);
    } else if (financialData.payer_type === 'CONVENIO' || financialData.payer_type === 'CONVÊNIO') {
      console.log('🏥 [CONVÊNIO] Gerando Guia de Faturamento...');
      result = await createBillingGuide(appointmentId, appointment, financialData);
    } else if (financialData.payer_type === 'CORTESIA') {
      console.log('🎁 [CORTESIA] Marcando como cortesia...');
      result = { type: 'courtesy', data: { appointment_id: appointmentId } };
    }

    console.log('✅ Documento gerado:', result);

    // 4️⃣ Registrar auditoria
    console.log('📋 Registrando auditoria de check-in financeiro...');
    // Auditoria será registrada por cada documento gerado (receivable/billing)

    return {
      error: false,
      message: '✅ Dados financeiros salvo com sucesso',
      type: result.type,
      data: result.data,
    };
  } catch (err) {
    console.error('❌ Erro em saveCheckInFinancialData:', err);
    return {
      error: true,
      message: `❌ Erro: ${err.message}`,
    };
  }
};

/**
 * Cria Conta a Receber para atendimento particular
 */
const createAccountsReceivable = async (appointmentId, appointment, financialData) => {
  try {
    console.log('💳 Criando Conta a Receber...');

    // 1️⃣ Prioridade de obtenção do valor:
    // 1. Valor passado nos dados financeiros
    // 2. Valor no appointment
    // 3. Preço do serviço relacionado
    let finalValue = parseFloat(financialData.value) || 0;

    if (!finalValue || isNaN(finalValue)) {
      console.log('   ⚠️ Valor de financialData está vazio, buscando no serviço...');

      const { data: service } = await supabase
        .from('services')
        .select('price, name')
        .eq('id', appointment.service_id)
        .single();

      if (service?.price) {
        finalValue = parseFloat(service.price);
        console.log(`   ✅ Valor obtido do serviço: R$ ${finalValue}`);
      } else {
        console.warn('   ⚠️ Nenhum preço encontrado para serviço');
      }
    }

    // Calcular valores
    const copayment = parseFloat(financialData.copayment || 0) || 0;
    const discount = parseFloat(financialData.discount || 0) || 0;
    const netValue = Math.max(finalValue - discount, 0);

    console.log(
      `   Valores: Bruto=${finalValue}, Desconto=${discount}, Copagamento=${copayment}, Líquido=${netValue}`,
    );

    const receivable = await createReceivable(appointment.clinic_id, {
      appointment_id: appointmentId,
      patient_id: appointment.patient_id,
      patient_name: financialData.patient_name || 'Paciente Particular',
      payer_name: financialData.patient_name || 'Paciente Particular',
      description: financialData.patient_name
        ? `Atendimento de ${financialData.patient_name} - ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}`
        : `Atendimento - ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}`,
      amount: finalValue,
      discount_value: discount,
      net_value: netValue,
      invoice_date: dateOnly(),
      due_date: dateOnly(addDays(new Date(), 5)),
      status: 'open',
      payment_method: financialData.payment_method || null,
      origem: 'Agenda',
      professional_id: appointment.professional_id,
      procedure_id: appointment.service_id,
      payer_type: 'PARTICULAR',
      metadata: {
        source: 'financial_check_in',
        copayment,
        discount,
      },
    });

    console.log('✅ Conta a Receber criada:', receivable?.id);

    // Registrar auditoria
    await logAppointmentFinancialAudit({
      appointmentId: appointmentId,
      financialEventType: FINANCIAL_EVENT_TYPES.RECEIVABLE_CREATED,
      relatedEntity: RELATED_ENTITY_TYPES.AR_INVOICE,
      relatedEntityId: receivable?.id,
      amount: netValue,
      status: 'open',
      context: {
        payer_type: 'PARTICULAR',
        copayment: copayment,
        discount: discount,
      },
    });

    return {
      type: 'receivable',
      data: {
        receivable_id: receivable?.id,
        amount: netValue,
      },
    };
  } catch (err) {
    console.error('❌ Erro em createAccountsReceivable:', err);
    return {
      type: 'none',
      data: null,
      error: err.message,
    };
  }
};

/**
 * Cria Guia de Faturamento para convênio
 */
const createBillingGuide = async (appointmentId, appointment, financialData) => {
  try {
    console.log('🏥 Criando Guia de Faturamento...');

    // Obter valor do serviço se não fornecido
    let finalValue = financialData.value || 0;

    if (!finalValue) {
      const { data: service } = await supabase
        .from('services')
        .select('price')
        .eq('id', appointment.service_id)
        .single();

      finalValue = service?.price || 0;
    }

    // Calcular valores
    const copayment = parseFloat(financialData.copayment || 0);
    const discount = parseFloat(financialData.discount || 0);
    const netValue = finalValue - discount;

    // Inserir Guia
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([
        {
          clinic_id: appointment.clinic_id,
          appointment_id: appointmentId,
          patient_id: appointment.patient_id,
          health_plan: financialData.health_plan || null,
          authorization_number: financialData.authorization_number || null,
          authorization_expiry: financialData.authorization_expiry || null,
          guide_number: financialData.guide_number || null,
          total_amount: netValue,
          copayment: copayment,
          status: 'pending_submission',
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (invoiceError) {
      console.error('❌ Erro ao criar Guia:', invoiceError.message);
      return {
        type: 'none',
        data: null,
        error: invoiceError.message,
      };
    }

    console.log('✅ Guia criada:', invoice[0]?.id);

    // ✅ Inserir itens da guia se existirem
    if (appointment.service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('id', appointment.service_id)
        .single();

      if (service) {
        await supabase.from('invoice_items').insert([
          {
            invoice_id: invoice[0]?.id,
            appointment_id: appointmentId,
            description: service.name,
            quantity: 1,
            unit_value: finalValue,
            total_value: finalValue,
          },
        ]);
      }
    }

    // Registrar auditoria
    await logAppointmentFinancialAudit({
      appointmentId: appointmentId,
      financialEventType: FINANCIAL_EVENT_TYPES.BILLING_GUIDE_CREATED,
      relatedEntity: RELATED_ENTITY_TYPES.BILLING_GUIDE,
      relatedEntityId: invoice[0]?.id,
      amount: netValue,
      status: 'pending_submission',
      context: {
        payer_type: 'CONVENIO',
        health_plan: financialData.health_plan,
        authorization_number: financialData.authorization_number,
        copayment: copayment,
        discount: discount,
      },
    });

    return {
      type: 'billing_guide',
      data: {
        invoice_id: invoice[0]?.id,
        amount: netValue,
        authorization_number: financialData.authorization_number,
      },
    };
  } catch (err) {
    console.error('❌ Erro em createBillingGuide:', err);
    return {
      type: 'none',
      data: null,
      error: err.message,
    };
  }
};

/**
 * Lista Contas a Receber pendentes do check-in
 */
export const listPendingReceivables = async (clinicId) => {
  try {
    const rows = await listReceivables({
      clinicId,
      statusList: ['open', 'pending'],
      origin: 'Agenda',
      limit: 5000,
    });

    return (rows || []).sort((left, right) => String(left.due_date || '').localeCompare(String(right.due_date || '')));
  } catch (err) {
    console.error('❌ Erro ao listar Contas a Receber:', err);
    return [];
  }
};

/**
 * Lista Guias de Faturamento pendentes do check-in
 */
export const listPendingBillingGuides = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending_submission')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('❌ Erro ao listar Guias de Faturamento:', err);
    return [];
  }
};
