/**
 * Mappers centralizados para conversão de dados
 * Frontend (camelCase) ↔ Database (snake_case)
 */

import { validateAppointmentPayload } from './validators';

// ============================================================
// MAPPERS DE AGENDAMENTO
// ============================================================

/**
 * Converte payload do frontend para formato do banco
 * camelCase → snake_case
 */
export function mapAppointmentToDatabase(payload) {
  validateAppointmentPayload(payload);

  // 🔴 CRÍTICO: Garantir clinic_id ANTES de fazer qualquer coisa
  const clinicId = payload.clinicId || payload.clinic_id;
  if (!clinicId) {
    console.error('🔴 [MAPPER] clinic_id AUSENTE NO PAYLOAD!', {
      payload,
      hasClinicId: Boolean(payload.clinicId),
      hasClinic_id: Boolean(payload.clinic_id),
    });
    throw new Error('clinic_id é OBRIGATÓRIO no payload - recebido undefined');
  }

  console.log('📝 [MAPPER] INPUT PAYLOAD:', {
    keys: Object.keys(payload),
    hasDate: Boolean(payload.date),
    hasStartTime: Boolean(payload.startTime),
    hasEndTime: Boolean(payload.endTime),
    hasNotes: Boolean(payload.notes),
    hasValue: Boolean(payload.value),
  });

  const mapped = {
    // IDs (nunca muda)
    id: payload.id || undefined,
    clinic_id: clinicId,
    patient_id: payload.patientId || payload.patient_id,
    professional_id: payload.professionalId || payload.professional_id,
    service_id: payload.serviceId || payload.service_id,
    room_id: payload.roomId || payload.room_id,
    payer_id: payload.payerId || payload.payer_id,
    plan_id: payload.planId || payload.plan_id,

    // Datas/Horários (CRITICAL)
    scheduled_date: payload.date || payload.scheduled_date,
    scheduled_time: payload.startTime || payload.scheduled_time,
    end_time: payload.endTime || payload.end_time || null,

    // Status e notas
    status: payload.status || 'scheduled',
    notes: payload.notes || payload.observacoes || null,

    // Valores financeiros
    value: payload.value || payload.valor || 0,
    discount: payload.discount || payload.desconto || 0,
    payer_type: payload.payerType || payload.payer_type || null,

    // Timestamp
    updated_at: new Date().toISOString(),
  };

  console.log('📝 [MAPPER] OUTPUT MAPPED:', {
    keys: Object.keys(mapped),
    clinic_id: mapped.clinic_id,
    scheduled_date: mapped.scheduled_date,
    scheduled_time: mapped.scheduled_time,
  });

  // ⚠️ SANITY CHECK: Verificar novamente após mapeamento
  if (!mapped.clinic_id) {
    console.error('🔴 [MAPPER] clinic_id perdido durante mapeamento!', { mapped });
    throw new Error('ERRO INTERNO: clinic_id foi perdido após mapear');
  }

  return mapped;
}

/**
 * Converte dados do banco para formato do frontend
 * snake_case → camelCase
 */
export function mapAppointmentFromDatabase(data) {
  if (!data) {
    return null;
  }

  return {
    // IDs
    id: data.id,
    clinicId: data.clinic_id,
    patientId: data.patient_id,
    professionalId: data.professional_id,
    serviceId: data.service_id,
    roomId: data.room_id,
    payerId: data.payer_id,
    planId: data.plan_id,

    // Datas/Horários
    date: data.scheduled_date,
    startTime: data.scheduled_time,
    endTime: data.end_time,

    // Status e notas
    status: data.status,
    notes: data.notes,

    // Valores financeiros
    value: data.value || 0,
    discount: data.discount || 0,
    payerType: data.payer_type,

    // Timestamps
    createdAt: data.created_at,
    updatedAt: data.updated_at,

    // Relacionamentos (se carregados)
    patient: data.patient,
    professional: data.professional,
    service: data.service,
    payer: data.payer,
  };
}

/**
 * Mapeia lista de agendamentos
 */
export function mapAppointmentsFromDatabase(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(mapAppointmentFromDatabase);
}

// ============================================================
// MAPPERS FINANCEIROS
// ============================================================

/**
 * Converte guia para formato do banco
 */
export function mapGuiaToDatabase(payload) {
  return {
    id: payload.id || undefined,
    clinic_id: payload.clinic_id,
    tipo_guia: payload.tipo_guia,
    descricao: payload.descricao,
    ativa: payload.ativa !== false,
    data_criacao: payload.data_criacao || new Date().toISOString(),
    data_atualizacao: new Date().toISOString(),
  };
}

/**
 * Converte guia do banco para frontend
 */
export function mapGuiaFromDatabase(data) {
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    clinicId: data.clinic_id,
    tipoGuia: data.tipo_guia,
    descricao: data.descricao,
    ativa: data.ativa,
    dataCriacao: data.data_criacao,
    dataAtualizacao: data.data_atualizacao,
  };
}

/**
 * Mapeia lista de guias
 */
export function mapGuiasFromDatabase(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(mapGuiaFromDatabase);
}

// ============================================================
// MAPPERS DE AUDITORIA (Leitura apenas)
// ============================================================

/**
 * Converte log de auditoria do banco para frontend
 */
export function mapAuditLogFromDatabase(data) {
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    appointmentId: data.appointment_id,
    actionType: data.action_type,
    performedBy: data.performed_by,
    performedByRole: data.performed_by_role,
    context: data.context,
    createdAt: data.created_at,
  };
}

/**
 * Mapeia lista de logs de auditoria
 */
export function mapAuditLogsFromDatabase(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(mapAuditLogFromDatabase);
}

// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Remove campos internos que não devem ser enviados
 * (user_id, role, etc)
 */
export function sanitizePayload(payload) {
  const { user_id, role, userId, userRole, performed_by, performed_by_role, ...clean } = payload;
  return clean;
}

/**
 * Extrai apenas valores que mudaram (para auditoria)
 */
export function extractChanges(oldData, newData) {
  const changes = {};

  Object.keys(newData).forEach((key) => {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key],
      };
    }
  });

  return changes;
}
