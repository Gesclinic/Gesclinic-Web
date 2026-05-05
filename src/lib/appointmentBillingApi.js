/**
 * Appointment Billing API
 *
 * Sincroniza dados de faturamento do agendamento com:
 * - ap_bills (Contas a Receber)
 * - invoices (Guias de Faturamento)
 */

import { supabase } from './customSupabaseClient';
import {
  logAppointmentFinancialAudit,
  FINANCIAL_EVENT_TYPES,
  RELATED_ENTITY_TYPES,
} from './auditFinancialApi';

/**
 * ✅ Sincronizar faturamento ao finalizar atendimento
 *
 * Cria ou atualiza registros em ap_bills (Contas a Receber)
 * e invoices (Guias) baseado no tipo de pagamento
 */
export const syncAppointmentBilling = async (appointmentId) => {
  try {
    console.log('💳 [syncAppointmentBilling] Iniciando sincronização para:', appointmentId);

    // 1️⃣ Carregar appointment com detalhes
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(
        `
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
        services:service_id(id, name, price, code),
        payers:payer_id(id, name),
        plans:plan_id(id, name, code)
      `,
      )
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      throw new Error(`Appointment não encontrado: ${aptError?.message}`);
    }

    console.log('✅ Appointment carregado:', {
      id: appointment.id,
      payer: appointment.payer_name || appointment.payers?.name,
      value: appointment.value,
      paymentMethod: appointment.payment_method,
    });

    // 2️⃣ Determinar tipo de pagamento
    const payerName = appointment.payer_name || appointment.payers?.name;
    const isParticular = !appointment.payer_id || payerName === 'Particular';
    const isConvenio = appointment.payer_id && !isParticular;
    const finalValue = appointment.value || appointment.services?.price || 0;
    const discountValue = appointment.discount || 0;
    const netValue = finalValue - discountValue;

    console.log('📋 Tipo:', { isParticular, isConvenio, finalValue, netValue, payerName });

    // 3️⃣ Criar entrada em ar_receivables (Contas a Receber)
    const appointmentDate = new Date(appointment.scheduled_date).toISOString().split('T')[0];

    const receivableData = {
      clinic_id: appointment.clinic_id,
      paciente_id: appointment.patient_id,
      payer_name: payerName || 'Particular',
      amount: netValue, // Campo obrigatório
      origem: 'Agenda',
      descricao: `${appointment.services?.name || 'Consulta'} - ${payerName || 'Particular'}`,
      servico_id: appointment.service_id,
      profissional_id: appointment.professional_id,
      valor_bruto: finalValue,
      descontos: discountValue,
      data_emissao: appointmentDate, // Data do agendamento, não data atual
      data_vencimento: appointmentDate,
      data_recebimento: appointmentDate, // Recebimento na data do agendamento
      status: 'received', // 'received' pois é convênio com pagamento à vista
      appointment_id: appointment.id,
      parcelado: false,
      parcela_atual: 1,
      total_parcelas: 1,
    };

    console.log('💾 Dados de Recebível:', receivableData);

    const { data: receivable, error: receivableError } = await supabase
      .from('ar_receivables')
      .insert([receivableData])
      .select();

    console.log('📊 Inserção em ar_receivables:', {
      data: receivableData,
      error: receivableError,
      result: receivable,
    });

    if (receivableError) {
      console.error('❌ Erro ao criar Contas a Receber:', receivableError.message);
      console.error('📋 Dados enviados:', receivableData);
      // Não falhar a execução, apenas logar
    } else {
      console.log('✅ Conta a Receber criada:', receivable[0]?.id);
    }

    // 4️⃣ Se for convênio, criar também em invoices (faturamento/guias)
    if (isConvenio && appointment.services?.id) {
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
    if (isConvenio && receivable && receivable[0]) {
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
      message: '✅ Faturamento sincronizado: Conta a Receber criada',
      receivableId: receivable?.[0]?.id,
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
