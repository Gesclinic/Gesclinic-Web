// src/lib/agendaIntegrationApi.js
// ============================================================
// AGENDA INTEGRATION - Helpers para integrar regras na agenda
// ============================================================
// Funções auxiliares para validação e cálculo na agenda

import * as agendaRulesApi from '@/lib/agendaRulesApi';
import * as professionalServicesApi from '@/lib/professionalServicesApi';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Valida se um agendamento é permitido pelas regras
 * @param {Object} params
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array, rule: Object}>}
 */
export async function validateAppointmentScheduling(params) {
  const { clinicId, serviceId, professionalId, roomId, startTime, date, patientId } = params;

  const errors = [];
  const warnings = [];
  let rule = null;

  try {
    // 1. Validar que profissional pode fazer o serviço
    const canServe = await professionalServicesApi.canProfessionalServe(
      professionalId,
      serviceId,
      clinicId,
    );

    if (!canServe) {
      errors.push(
        'Este profissional não está vinculado a este serviço ou a vinculação foi desativada',
      );
    }

    // Validação de regras de agenda
    const ruleValidation = await agendaRulesApi.validateSchedulingByRules(
      serviceId,
      clinicId,
      date,
    );
    if (!ruleValidation.valid) {
      errors.push(...ruleValidation.errors);
    }
    rule = ruleValidation.rule;

    // 3. Validar duração disponível
    if (rule && startTime) {
      const endTime = await agendaRulesApi.calculateEndTime(startTime, serviceId, clinicId);

      // Verificar se há conflito de horário
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('professional_id', professionalId)
        .eq('date', date)
        .gte('start_time', startTime)
        .lt('start_time', endTime)
        .eq('active', true);

      if (conflicts && conflicts.length > 0) {
        errors.push('Há um conflito de horário com outro agendamento');
      }
    }

    // 4. Verificar slots disponíveis
    if (rule) {
      const remainingSlots = await agendaRulesApi.getRemainingSlots(serviceId, clinicId, date);

      if (remainingSlots <= 0) {
        errors.push('Não há mais slots disponíveis para este dia');
      } else if (remainingSlots <= rule.alert_threshold || remainingSlots <= 2) {
        warnings.push(`Apenas ${remainingSlots} slots disponíveis para este dia`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      rule,
      endTime: rule
        ? new Date(
            new Date(`${date}T${startTime}`).getTime() + rule.default_duration_minutes * 60000,
          )
        : null,
    };
  } catch (error) {
    console.error('Erro ao validar agendamento:', error);
    return {
      valid: false,
      errors: ['Erro ao validar agendamento. Tente novamente.'],
      warnings: [],
      rule: null,
    };
  }
}

/**
 * Calcula dados de um agendamento com base nas regras
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function calculateAppointmentData(params) {
  const { clinicId, serviceId, professionalId, startTime, date } = params;

  try {
    const [endTime, rule, psData] = await Promise.all([
      agendaRulesApi.calculateEndTime(startTime, serviceId, clinicId),
      agendaRulesApi.getAgendaRule(serviceId, clinicId),
      professionalServicesApi.getProfessionalServiceData
        ? professionalServicesApi.getProfessionalServiceData(professionalId, serviceId, clinicId)
        : Promise.resolve(null),
    ]);

    return {
      startTime,
      endTime,
      duration: rule?.default_duration_minutes || 60,
      rule,
      professionalServiceData: psData,
      competenceLevel: psData?.competence_level,
    };
  } catch (error) {
    console.error('Erro ao calcular dados do agendamento:', error);
    return {
      startTime,
      endTime: null,
      duration: 60,
      rule: null,
      error: error.message,
    };
  }
}

/**
 * Lista profissionais disponíveis para um serviço
 * @param {string} clinicId
 * @param {string} serviceId
 * @returns {Promise<Array>}
 */
export async function listProfessionalsForService(clinicId, serviceId) {
  try {
    const professionals = await professionalServicesApi.listProfessionalsByService(
      serviceId,
      clinicId,
    );

    return professionals.map((p) => ({
      id: p.professional_id || p.id,
      name: p.professional_name || p.name,
      competenceLevel: p.competence_level,
      active: p.active,
    }));
  } catch (error) {
    console.error('Erro ao buscar profissionais:', error);
    return [];
  }
}

/**
 * Busca duração recomendada de um serviço para um profissional
 * @param {string} clinicId
 * @param {string} serviceId
 * @param {string} professionalId
 * @returns {Promise<number>} Duração em minutos
 */
export async function getServiceDurationForProfessional(clinicId, serviceId, professionalId) {
  try {
    const duration = await agendaRulesApi.getServiceDuration(professionalId, serviceId, clinicId);

    return duration || 60; // Default 60 minutos
  } catch (error) {
    console.error('Erro ao buscar duração:', error);
    return 60;
  }
}

/**
 * Formata horário para exibição (HH:MM)
 * @param {string} time
 * @returns {string}
 */
export function formatTime(time) {
  if (!time) {
    return '';
  }
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
}

/**
 * Calcula horário fim baseado em duração
 * @param {string} startTime (HH:MM)
 * @param {number} durationMinutes
 * @returns {string} Horário fim (HH:MM)
 */
export function calculateEndTimeFromDuration(startTime, durationMinutes) {
  if (!startTime || !durationMinutes) {
    return '';
  }

  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;

  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Valida que um horário está dentro do horário de funcionamento
 * @param {string} time (HH:MM)
 * @param {string} startHour (HH:MM)
 * @param {string} endHour (HH:MM)
 * @returns {boolean}
 */
export function isTimeInWorkingHours(time, startHour, endHour) {
  if (!time || !startHour || !endHour) {
    return true;
  }

  const [h, m] = time.split(':').map(Number);
  const [sh, sm] = startHour.split(':').map(Number);
  const [eh, em] = endHour.split(':').map(Number);

  const timeMinutes = h * 60 + m;
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

/**
 * Log de agendamento para auditoria
 * @param {Object} appointmentData
 * @param {string} action
 * @returns {Promise<void>}
 */
export async function logSchedulingAction(appointmentData, action) {
  try {
    const { error } = await supabase.from('scheduling_logs').insert({
      clinic_id: appointmentData.clinicId,
      action,
      appointment_data: appointmentData,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Erro ao registrar log:', error);
    }
  } catch (error) {
    console.warn('Erro ao logar ação:', error);
  }
}
