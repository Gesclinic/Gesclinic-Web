/**
 * WhatsApp Confirmation API - Integração com Evolution API para confirmação de agendamentos
 */

import { supabase } from './customSupabaseClient';

// Gerar token único (sem dependência de uuid)
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Configuração da Evolution API
const EVOLUTION_API_URL = process.env.VITE_EVOLUTION_API_URL || 'http://localhost:8080/message/sendText';
const EVOLUTION_API_KEY = process.env.VITE_EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.VITE_EVOLUTION_INSTANCE || '';
const APP_URL = process.env.VITE_APP_URL || 'http://localhost:3000';

/**
 * Enviar mensagem de confirmação via WhatsApp
 * @param {string} clinicId - ID da clínica
 * @param {string} appointmentId - ID do agendamento
 * @param {string} patientPhone - Telefone do paciente (com DDD, ex: 5545999999999)
 * @param {string} patientName - Nome do paciente
 * @param {string} appointmentDate - Data do agendamento (YYYY-MM-DD)
 * @param {string} appointmentTime - Hora do agendamento (HH:mm)
 * @param {string} professionalName - Nome do profissional
 * @returns {Promise<object>} Resultado do envio
 */
export async function sendAppointmentConfirmation(
  clinicId,
  appointmentId,
  patientPhone,
  patientName,
  appointmentDate,
  appointmentTime,
  professionalName
) {
  try {
    // Validar dados
    if (!clinicId || !appointmentId || !patientPhone || !patientName) {
      throw new Error('Dados incompletos para envio de confirmação');
    }

    // Gerar token único para confirmação
    const confirmationToken = generateToken();
    
    // Criar registro de confirmação no banco
    const { data: confirmation, error: insertError } = await supabase
      .from('appointment_confirmations')
      .insert({
        appointment_id: appointmentId,
        clinic_id: clinicId,
        confirmation_token: confirmationToken,
        message_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao criar registro de confirmação:', insertError);
      throw insertError;
    }

    // Formatar telefone para WhatsApp (remover caracteres especiais)
    const normalizedPhone = patientPhone.replace(/\D/g, '');
    
    // Criar links de confirmação
    const confirmLink = `${APP_URL}/clinica/agendamento/confirmar/${confirmationToken}?status=confirmed`;
    const rejectLink = `${APP_URL}/clinica/agendamento/confirmar/${confirmationToken}?status=rejected`;

    // Montar mensagem
    const message = `Olá ${patientName}! 👋\n\nPara confirmar sua consulta *amanhã (${formatDate(appointmentDate)}) às ${appointmentTime}* com ${professionalName}:\n\n✅ *Confirmar:* ${confirmLink}\n❌ *Cancelar:* ${rejectLink}\n\nQualquer dúvida, me chama! 😊`;

    console.log(`📱 [WhatsApp] Enviando confirmação para ${patientPhone}:`, {
      patientName,
      appointmentDate,
      appointmentTime,
      professionalName,
      confirmationToken,
    });

    // Enviar via Evolution API
    const response = await fetch(EVOLUTION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EVOLUTION_API_KEY}`,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        text: message,
        instance: EVOLUTION_INSTANCE,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro ao enviar WhatsApp:', errorData);
      throw new Error(`Erro ao enviar: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Atualizar registro com success
    await supabase
      .from('appointment_confirmations')
      .update({ message_sent_at: new Date().toISOString() }).eq('id', confirmation.id);

    console.log('✅ Confirmação enviada com sucesso:', result);
    return {
      success: true,
      message: 'Mensagem enviada',
      confirmationId: confirmation.id,
      token: confirmationToken,
    };
  } catch (error) {
    console.error('❌ Erro ao enviar confirmação:', error);
    throw error;
  }
}

/**
 * Confirmar agendamento via token (chamado quando paciente clica no link)
 * @param {string} token - Token de confirmação
 * @param {string} status - 'confirmed' ou 'rejected'
 * @returns {Promise<object>} Resultado da confirmação
 */
export async function confirmAppointmentByToken(token, status) {
  try {
    if (!token || !['confirmed', 'rejected'].includes(status)) {
      throw new Error('Token ou status inválido');
    }

    // Buscar confirmação no banco
    const { data: confirmation, error: selectError } = await supabase
      .from('appointment_confirmations').select('*')
      .eq('confirmation_token', token);

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

    if (selectError) {
      console.error('❌ Confirmação não encontrada:', selectError);
      throw new Error('Link de confirmação expirado ou inválido');
    }

    // Atualizar status da confirmação
    const updateData = {
      confirmed: status === 'confirmed',
      confirmed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('appointment_confirmations')
      .update(updateData)
      .eq('id', confirmation.id);

    if (updateError) {
      throw updateError;
    }

    // Se rejeitou, atualizar status do agendamento para "cancelado"
    if (status === 'rejected') {
      await supabase
        .from('appointments')
        .update({ status: 'canceled' })
        .eq('id', confirmation.appointment_id);
    }

    // Se confirmou, atualizar status para "confirmado"
    if (status === 'confirmed') {
      await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', confirmation.appointment_id);
    }

    console.log(`✅ Agendamento ${status === 'confirmed' ? 'confirmado' : 'cancelado'}`);

    return {
      success: true,
      status: status,
      appointmentId: confirmation.appointment_id,
    };
  } catch (error) {
    console.error('❌ Erro ao confirmar:', error);
    throw error;
  }
}

/**
 * Buscar agendamentos que precisam de confirmação (amanhã)
 * @param {string} clinicId - ID da clínica
 * @returns {Promise<array>} Lista de agendamentos
 */
export async function getAppointmentsNeedingConfirmation(clinicId) {
  try {
    // Data de amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Buscar agendamentos sem confirmação
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        clinic_id,
        patient_id,
        professional_id,
        scheduled_date,
        scheduled_time,
        patient:patients(name, phone),
        professional:professionals(name),
        appointment_confirmations(confirmed)
      `)
      .eq('clinic_id', clinicId)
      .eq('scheduled_date', tomorrowStr)
      .eq('status', 'scheduled');

    if (error) {
      throw error;
    }

    // Filtrar apenas os sem confirmação
    const needsConfirmation = appointments.filter(apt => {
      const hasConfirmation = apt.appointment_confirmations && apt.appointment_confirmations.length > 0;
      return !hasConfirmation;
    });

    return needsConfirmation;
  } catch (error) {
    console.error('❌ Erro ao buscar agendamentos:', error);
    throw error;
  }
}

/**
 * Disparar confirmações em massa para uma clínica
 * @param {string} clinicId - ID da clínica
 * @returns {Promise<object>} Resumo do disparo
 */
export async function sendBatchConfirmations(clinicId) {
  try {
    const appointments = await getAppointmentsNeedingConfirmation(clinicId);

    console.log(`📱 Enviando confirmações para ${appointments.length} agendamentos`);

    const results = {
      total: appointments.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const apt of appointments) {
      try {
        await sendAppointmentConfirmation(
          clinicId,
          apt.id,
          apt.patient.phone,
          apt.patient.name,
          apt.scheduled_date,
          apt.scheduled_time,
          apt.professional?.name || 'Profissional'
        );
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          appointmentId: apt.id,
          error: error.message,
        });
      }

      // Aguardar 1 segundo entre envios para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('✅ Batch concluído:', results);
    return results;
  } catch (error) {
    console.error('❌ Erro ao enviar batch:', error);
    throw error;
  }
}

/**
 * Helper para formatar data
 */
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default {
  sendAppointmentConfirmation,
  confirmAppointmentByToken,
  getAppointmentsNeedingConfirmation,
  sendBatchConfirmations,
};
