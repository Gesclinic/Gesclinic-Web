// src/lib/checkinIntegrationApi.js
// ============================================================
// CHECK-IN INTEGRATION - Validações para processo de check-in
// ============================================================
// Verifica dados, autorizações e disponibilidade de recursos

import { supabase } from '@/lib/customSupabaseClient';
import * as appointmentsApi from '@/lib/appointmentsApi';
import * as healthInsurancesApi from '@/lib/healthInsurancesApi';
import * as servicepricesApi from '@/lib/servicePricesApi';
import * as professionalServicesApi from '@/lib/professionalServicesApi';

/**
 * Valida dados de check-in antes de confirmação
 * @param {Object} params
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array, data: Object}>}
 */
export async function validateCheckinData(params) {
  const { appointmentId, clinicId, patientData, insuranceAuthorizationRequired } = params;

  const errors = [];
  const warnings = [];
  const validationData = {};

  try {
    // 1. Validar appointment existe e está agendado
    const appointment = await appointmentsApi.getAppointment(appointmentId);

    if (!appointment) {
      errors.push('Agendamento não encontrado');
      return { valid: false, errors, warnings, data: null };
    }

    if (!['scheduled', 'confirmed'].includes(appointment.appointment_status)) {
      errors.push(`Agendamento não está em estado válido (${appointment.appointment_status})`);
    }

    validationData.appointment = appointment;

    // 2. Validar dados do paciente
    if (!patientData?.id) {
      errors.push('Dados do paciente incompletos');
    }

    validationData.patient = patientData;

    // 3. Validar profissional-serviço
    const psData = await professionalServicesApi.getProfessionalServiceData(
      appointment.professional_id,
      appointment.service_id,
      clinicId,
    );

    if (!psData) {
      errors.push('Profissional não está vinculado a este serviço');
    } else {
      validationData.professionalService = psData;

      // Buscar dados completos do profissional
      const { data: professional } = await supabase
        .from('professionals')
        .select('id, name, competence_level, credentials, specialties')
        .eq('id', appointment.professional_id)
        .single();

      validationData.professional = professional;
    }

    // 4. Validar serviço
    const { data: service } = await supabase
      .from('services')
      .select('id, name, duration, description, requires_preparation')
      .eq('id', appointment.service_id)
      .single();

    validationData.service = service;

    if (service?.requires_preparation) {
      warnings.push('Este serviço requer preparação prévia do paciente');
    }

    // 5. Validar convênio e autorização
    if (appointment.health_insurance_id) {
      const insurance = await healthInsurancesApi.getHealthInsurance(
        appointment.health_insurance_id,
        clinicId,
      );

      validationData.insurance = insurance;

      if (insurance?.requires_authorization) {
        if (!insuranceAuthorizationRequired) {
          warnings.push(`Este convênio (${insurance.name}) requer autorização prévia`);
        }

        // Verificar se há autorização registrada
        const authStatus = await checkInsuranceAuthorization(appointmentId, insurance.id, clinicId);

        validationData.authorization = authStatus;

        if (!authStatus.authorized) {
          warnings.push('Autorização do convênio não confirmada');
        }
      }
    }

    // 6. Verificar se sala está disponível
    if (appointment.room_id) {
      const roomAvailable = await isRoomAvailable(
        appointment.room_id,
        appointment.date,
        appointment.start_time,
        appointment.end_time,
      );

      if (!roomAvailable) {
        warnings.push('Sala não está mais disponível para este horário');
      }

      validationData.roomAvailable = roomAvailable;
    }

    // 7. Verificar se profissional está disponível
    const professionalAvailable = await isProfessionalAvailable(
      appointment.professional_id,
      appointment.date,
      appointment.start_time,
      appointment.end_time,
      appointmentId,
    );

    if (!professionalAvailable) {
      errors.push('Profissional não está disponível neste horário');
    }

    validationData.professionalAvailable = professionalAvailable;

    // 8. Buscar preço (se não houver, usar serviço padrão)
    const price = await servicepricesApi.getServicePrice(
      appointment.service_id,
      clinicId,
      appointment.health_insurance_id,
    );

    validationData.price = price?.price || appointment.price || 0;

    // 9. Verificar se há materiais/recursos necessários
    const resourcesCheck = await checkRequiredResources(appointment.service_id, clinicId);

    if (!resourcesCheck.allAvailable && resourcesCheck.missing.length > 0) {
      warnings.push(`Alguns recursos não estão disponíveis: ${resourcesCheck.missing.join(', ')}`);
    }

    validationData.resources = resourcesCheck;

    // Retornar resultado
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: validationData,
    };
  } catch (error) {
    console.error('Erro ao validar check-in:', error);
    return {
      valid: false,
      errors: [...errors, 'Erro ao validar dados do check-in'],
      warnings,
      data: null,
      error: error.message,
    };
  }
}

/**
 * Verifica autorização de convênio
 * @param {string} appointmentId
 * @param {string} insuranceId
 * @param {string} clinicId
 * @returns {Promise<{authorized: boolean, authNumber: string, expiryDate: string}>}
 */
export async function checkInsuranceAuthorization(appointmentId, insuranceId, clinicId) {
  try {
    // Buscar autorização registrada
    const { data: authorization } = await supabase
      .from('insurance_authorizations')
      .select('id, authorization_number, expiry_date, status')
      .eq('appointment_id', appointmentId)
      .eq('health_insurance_id', insuranceId)
      .eq('clinic_id', clinicId)
      .single();

    if (!authorization) {
      return {
        authorized: false,
        authNumber: null,
        expiryDate: null,
        message: 'Nenhuma autorização registrada',
      };
    }

    const authorized =
      authorization.status === 'approved' && new Date(authorization.expiry_date) > new Date();

    return {
      authorized,
      authNumber: authorization.authorization_number,
      expiryDate: authorization.expiry_date,
      status: authorization.status,
    };
  } catch (error) {
    console.error('Erro ao verificar autorização:', error);
    return {
      authorized: false,
      error: error.message,
    };
  }
}

/**
 * Verifica disponibilidade de sala
 * @param {string} roomId
 * @param {string} date
 * @param {string} startTime
 * @param {string} endTime
 * @returns {Promise<boolean>}
 */
export async function isRoomAvailable(roomId, date, startTime, endTime) {
  try {
    // Buscar conflitos de agendamento
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('room_id', roomId)
      .eq('date', date)
      .eq('active', true)
      .neq('appointment_status', 'canceled')
      .or(
        `and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`,
      );

    return !conflicts || conflicts.length === 0;
  } catch (error) {
    console.error('Erro ao verificar disponibilidade de sala:', error);
    return true; // Falha aberta
  }
}

/**
 * Verifica disponibilidade de profissional
 * @param {string} professionalId
 * @param {string} date
 * @param {string} startTime
 * @param {string} endTime
 * @param {string} excludeAppointmentId
 * @returns {Promise<boolean>}
 */
export async function isProfessionalAvailable(
  professionalId,
  date,
  startTime,
  endTime,
  excludeAppointmentId,
) {
  try {
    let query = supabase
      .from('appointments')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('date', date)
      .eq('active', true)
      .neq('appointment_status', 'canceled');

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data: conflicts } = await query;

    // Verificar se há sobreposição de horário
    const hasConflict = conflicts?.some((apt) => {
      return (
        (startTime <= apt.start_time && apt.start_time < endTime) ||
        (startTime < apt.end_time && apt.end_time <= endTime)
      );
    });

    return !hasConflict;
  } catch (error) {
    console.error('Erro ao verificar disponibilidade de profissional:', error);
    return true; // Falha aberta
  }
}

/**
 * Verifica recursos necessários para serviço
 * @param {string} serviceId
 * @param {string} clinicId
 * @returns {Promise<{allAvailable: boolean, available: Array, missing: Array}>}
 */
export async function checkRequiredResources(serviceId, clinicId) {
  try {
    // Buscar recursos necessários
    const { data: serviceResources } = await supabase
      .from('service_resources')
      .select('resource_id, quantity_required, resources(id, name)')
      .eq('service_id', serviceId);

    if (!serviceResources || serviceResources.length === 0) {
      return {
        allAvailable: true,
        available: [],
        missing: [],
      };
    }

    // Verificar disponibilidade de cada recurso
    const available = [];
    const missing = [];

    for (const sr of serviceResources) {
      const { data: stock } = await supabase
        .from('stock_balance')
        .select('available_quantity')
        .eq('resource_id', sr.resource_id)
        .eq('clinic_id', clinicId)
        .single();

      if (stock?.available_quantity >= sr.quantity_required) {
        available.push(sr.resources.name);
      } else {
        missing.push(sr.resources.name);
      }
    }

    return {
      allAvailable: missing.length === 0,
      available,
      missing,
    };
  } catch (error) {
    console.error('Erro ao verificar recursos:', error);
    return {
      allAvailable: true,
      available: [],
      missing: [],
      error: error.message,
    };
  }
}

/**
 * Obtém resumo completo para check-in
 * @param {string} appointmentId
 * @param {string} clinicId
 * @returns {Promise<Object>}
 */
export async function getCheckinSummary(appointmentId, clinicId) {
  try {
    const validation = await validateCheckinData({
      appointmentId,
      clinicId,
    });

    if (!validation.data) {
      return {
        valid: false,
        summary: null,
        errors: validation.errors,
      };
    }

    const { data } = validation;

    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      summary: {
        patient: {
          id: data.patient?.id,
          name: data.patient?.name,
        },
        appointment: {
          id: data.appointment.id,
          date: data.appointment.date,
          time: `${data.appointment.start_time} - ${data.appointment.end_time}`,
          duration: data.appointment.duration,
        },
        professional: {
          name: data.professional?.name,
          competenceLevel: data.professional?.competence_level,
          specialties: data.professional?.specialties,
        },
        service: {
          name: data.service?.name,
          description: data.service?.description,
          requiresPreparation: data.service?.requires_preparation,
        },
        insurance: data.insurance
          ? {
              name: data.insurance.name,
              authorizationRequired: data.insurance.requires_authorization,
              authorized: data.authorization?.authorized,
            }
          : null,
        room: data.roomAvailable ? 'Disponível' : 'Indisponível',
        price: data.price,
        resources: {
          allAvailable: data.resources?.allAvailable,
          missing: data.resources?.missing || [],
        },
      },
    };
  } catch (error) {
    console.error('Erro ao gerar resumo de check-in:', error);
    return {
      valid: false,
      summary: null,
      errors: ['Erro ao gerar resumo'],
      error: error.message,
    };
  }
}

/**
 * Confirma check-in e retorna dados para próximo passo
 * @param {string} appointmentId
 * @param {string} clinicId
 * @param {Object} checkinData
 * @returns {Promise<{confirmed: boolean, appointmentData: Object, nextSteps: Array}>}
 */
export async function confirmCheckin(appointmentId, clinicId, checkinData = {}) {
  try {
    // Validar uma última vez
    const validation = await validateCheckinData({
      appointmentId,
      clinicId,
      patientData: checkinData.patient,
      insuranceAuthorizationRequired: checkinData.insuranceAuthorized,
    });

    if (!validation.valid && validation.errors.length > 0) {
      return {
        confirmed: false,
        appointmentData: null,
        errors: validation.errors,
      };
    }

    // Atualizar status do agendamento
    const { data: updated } = await supabase
      .from('appointments')
      .update({
        appointment_status: 'confirmed',
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select();


    // Próximos passos
    const nextSteps = [];
    const appointmentData = validation.data;

    if (appointmentData.service?.requires_preparation) {
      nextSteps.push('Preparar paciente conforme procedimento');
    }

    if (appointmentData.professional?.competence_level === 'specialist') {
      nextSteps.push('Revisar especialidades do profissional');
    }

    if (appointmentData.resources && !appointmentData.resources.allAvailable) {
      nextSteps.push(
        `Providenciar recursos faltantes: ${appointmentData.resources.missing.join(', ')}`,
      );
    }

    return {
      confirmed: true,
      appointmentData: updated,
      nextSteps,
      warnings: validation.warnings,
    };
  } catch (error) {
    console.error('Erro ao confirmar check-in:', error);
    return {
      confirmed: false,
      appointmentData: null,
      errors: ['Erro ao confirmar check-in'],
      error: error.message,
    };
  }
}
