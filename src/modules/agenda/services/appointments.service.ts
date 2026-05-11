/**
 * 🔧 APPOINTMENTS SERVICE
 * =======================
 *
 * Serviço centralizado para todas as operações com agendamentos
 * Encapsula lógica de negócio e chamadas de API
 * Independente de React
 */

import {
  Appointment,
  AppointmentUI,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
  UpdateAppointmentStatusPayload,
  AppointmentStatus,
  AgendaFilters,
  PaginatedAppointments,
  ValidationResult,
  FieldValidation,
} from '../types';
import { VALIDATION_RULES } from '../constants';

// ============================================================================
// 1. CONVERSÃO DE DADOS
// ============================================================================

/**
 * Converte Appointment (snake_case) para AppointmentUI (camelCase)
 */
export function appointmentToUI(appointment: Appointment): AppointmentUI {
  return {
    id: appointment.id,
    clinicId: appointment.clinic_id,
    patientId: appointment.patient_id,
    professionalId: appointment.professional_id,
    serviceId: appointment.service_id,
    roomId: appointment.room_id,
    payerId: appointment.payer_id,
    planId: appointment.plan_id,
    scheduledDate: appointment.scheduled_date,
    scheduledTime: appointment.scheduled_time,
    duration: appointment.duration,
    endTime: appointment.end_time,
    value: appointment.value,
    discount: appointment.discount,
    totalValue: appointment.total_value,
    status: appointment.status,
    notes: appointment.notes,
    createdAt: appointment.created_at,
    updatedAt: appointment.updated_at,
    patient: appointment.patient,
    professional: appointment.professional,
    service: appointment.service,
    room: appointment.room,
    payer: appointment.payer,
    plan: appointment.plan,
  };
}

/**
 * Converte AppointmentUI (camelCase) para Appointment (snake_case)
 */
export function uiToAppointment(ui: AppointmentUI): Appointment {
  return {
    id: ui.id,
    clinic_id: ui.clinicId,
    patient_id: ui.patientId,
    professional_id: ui.professionalId,
    service_id: ui.serviceId,
    room_id: ui.roomId,
    payer_id: ui.payerId,
    plan_id: ui.planId,
    scheduled_date: ui.scheduledDate,
    scheduled_time: ui.scheduledTime,
    duration: ui.duration,
    end_time: ui.endTime,
    value: ui.value,
    discount: ui.discount,
    total_value: ui.totalValue,
    status: ui.status,
    notes: ui.notes,
    created_at: ui.createdAt,
    updated_at: ui.updatedAt,
    patient: ui.patient,
    professional: ui.professional,
    service: ui.service,
    room: ui.room,
    payer: ui.payer,
    plan: ui.plan,
  };
}

/**
 * Cria payload para API a partir de dados do formulário
 */
export function createPayloadFromForm(
  clinicId: string,
  formData: Partial<AppointmentUI>,
): CreateAppointmentPayload {
  if (!formData.patientId) throw new Error('Patient ID is required');
  if (!formData.professionalId) throw new Error('Professional ID is required');
  if (!formData.scheduledDate) throw new Error('Scheduled date is required');
  if (!formData.scheduledTime) throw new Error('Scheduled time is required');

  return {
    clinic_id: clinicId,
    patient_id: formData.patientId,
    professional_id: formData.professionalId,
    service_id: formData.serviceId,
    room_id: formData.roomId,
    payer_id: formData.payerId,
    plan_id: formData.planId,
    scheduled_date: formData.scheduledDate,
    scheduled_time: formData.scheduledTime,
    duration: formData.duration || 30,
    value: formData.value,
    discount: formData.discount,
    notes: formData.notes,
  };
}

/**
 * Cria payload de atualização a partir de dados alterados
 */
export function createUpdatePayloadFromForm(
  formData: Partial<AppointmentUI>,
): UpdateAppointmentPayload {
  const payload: UpdateAppointmentPayload = {};

  if (formData.patientId !== undefined) payload.patient_id = formData.patientId;
  if (formData.professionalId !== undefined)
    payload.professional_id = formData.professionalId;
  if (formData.serviceId !== undefined) payload.service_id = formData.serviceId;
  if (formData.roomId !== undefined) payload.room_id = formData.roomId;
  if (formData.payerId !== undefined) payload.payer_id = formData.payerId;
  if (formData.planId !== undefined) payload.plan_id = formData.planId;
  if (formData.scheduledDate !== undefined)
    payload.scheduled_date = formData.scheduledDate;
  if (formData.scheduledTime !== undefined)
    payload.scheduled_time = formData.scheduledTime;
  if (formData.duration !== undefined) payload.duration = formData.duration;
  if (formData.value !== undefined) payload.value = formData.value;
  if (formData.discount !== undefined) payload.discount = formData.discount;
  if (formData.status !== undefined) payload.status = formData.status;
  if (formData.notes !== undefined) payload.notes = formData.notes;

  return payload;
}

// ============================================================================
// 2. VALIDAÇÃO
// ============================================================================

/**
 * Valida um campo individual
 */
export function validateField(
  fieldName: string,
  value: any,
  rules?: FieldValidation,
): string | null {
  // Se não tem regras, passa
  if (!rules) return null;

  // Validação required
  if (rules.required && !value) {
    return `${fieldName} é obrigatório`;
  }

  // Validação minLength
  if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
    return `${fieldName} deve ter pelo menos ${rules.minLength} caracteres`;
  }

  // Validação maxLength
  if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
    return `${fieldName} não pode exceder ${rules.maxLength} caracteres`;
  }

  // Validação pattern
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return `${fieldName} tem formato inválido`;
  }

  // Validação custom
  if (rules.custom) {
    const result = rules.custom(value);
    if (typeof result === 'string') return result;
    if (result === false) return `${fieldName} é inválido`;
  }

  return null;
}

/**
 * Valida toda a estrutura de um agendamento
 */
export function validateAppointmentPayload(
  payload: Partial<CreateAppointmentPayload | UpdateAppointmentPayload>,
): ValidationResult {
  const errors: Record<string, string> = {};

  // Validar cada campo
  Object.entries(payload).forEach(([key, value]) => {
    const rules = VALIDATION_RULES[key as keyof typeof VALIDATION_RULES];
    if (rules) {
      const error = validateField(key, value, rules as FieldValidation);
      if (error) errors[key] = error;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida transição de status
 */
export function validateStatusTransition(
  currentStatus: AppointmentStatus,
  newStatus: AppointmentStatus,
): boolean {
  const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    scheduled: ['confirmed', 'checked_in', 'cancelled', 'no_show'],
    confirmed: ['scheduled', 'checked_in', 'cancelled'],
    checked_in: ['waiting', 'cancelled', 'no_show'],
    waiting: ['in_progress', 'no_show', 'cancelled'],
    in_progress: ['completed', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  return (
    validTransitions[currentStatus]?.includes(newStatus) || false
  );
}

// ============================================================================
// 3. TRANSFORMAÇÃO E ENRIQUECIMENTO DE DADOS
// ============================================================================

/**
 * Enriquece agendamento com dados calculados
 */
export function enrichAppointment(appointment: Appointment): Appointment {
  // Se não tem end_time, calcula baseado em duration
  if (!appointment.end_time && appointment.duration && appointment.scheduled_time) {
    appointment.end_time = calculateEndTime(
      appointment.scheduled_time,
      appointment.duration,
    );
  }

  // Se não tem total_value, calcula baseado em value e discount
  if (!appointment.total_value && appointment.value) {
    const discount = appointment.discount || 0;
    appointment.total_value = appointment.value - discount;
  }

  return appointment;
}

/**
 * Calcula horário final baseado em hora inicial e duração
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;

  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Calcula duração em minutos baseado em 2 horários
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  return endTotalMinutes - startTotalMinutes;
}

// ============================================================================
// 4. FORMATAÇÃO PARA EXIBIÇÃO
// ============================================================================

/**
 * Formata data para exibição (pt-BR)
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';

  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}

/**
 * Formata horário para exibição
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  // Já está em HH:mm, apenas retorna
  return timeStr;
}

/**
 * Formata período (data + horário início - fim)
 */
export function formatAppointmentPeriod(
  appointment: Appointment | AppointmentUI,
): string {
  const date = 'scheduledDate' in appointment ? appointment.scheduledDate : appointment.scheduled_date;
  const time = 'scheduledTime' in appointment ? appointment.scheduledTime : appointment.scheduled_time;
  const endTime = 'endTime' in appointment ? appointment.endTime : appointment.end_time;

  const dateStr = formatDateDisplay(date);
  const timeStr = formatTimeDisplay(time);
  const endTimeStr = endTime ? formatTimeDisplay(endTime) : '';

  return `${dateStr} ${timeStr}${endTimeStr ? ` - ${endTimeStr}` : ''}`;
}

/**
 * Formata valor monetário
 */
export function formatCurrency(value?: number): string {
  if (!value) return 'R$ 0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// ============================================================================
// 5. FILTROS E QUERIES
// ============================================================================

/**
 * Constrói query string a partir de filtros
 */
export function buildFilterQuery(filters: AgendaFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters.dateTo) params.append('date_to', filters.dateTo);
  if (filters.professionalId) params.append('professional_id', filters.professionalId);
  if (filters.roomId) params.append('room_id', filters.roomId);
  if (filters.payerId) params.append('payer_id', filters.payerId);
  if (filters.patientName) params.append('patient_name', filters.patientName);
  if (filters.status && filters.status.length > 0) {
    filters.status.forEach(s => params.append('status[]', s));
  }

  return params;
}

/**
 * Filtra appointments no lado do cliente
 */
export function filterAppointments(
  appointments: Appointment[],
  filters: AgendaFilters,
): Appointment[] {
  return appointments.filter(apt => {
    if (filters.dateFrom && apt.scheduled_date < filters.dateFrom) return false;
    if (filters.dateTo && apt.scheduled_date > filters.dateTo) return false;
    if (filters.professionalId && apt.professional_id !== filters.professionalId)
      return false;
    if (filters.roomId && apt.room_id !== filters.roomId) return false;
    if (filters.payerId && apt.payer_id !== filters.payerId) return false;
    if (
      filters.status &&
      filters.status.length > 0 &&
      !filters.status.includes(apt.status)
    )
      return false;
    if (
      filters.patientName &&
      !apt.patient?.name.toLowerCase().includes(filters.patientName.toLowerCase())
    )
      return false;

    return true;
  });
}

// ============================================================================
// 6. UTILIDADES
// ============================================================================

/**
 * Verifica se agendamento está no passado
 */
export function isAppointmentPast(appointment: Appointment | AppointmentUI): boolean {
  const date = 'scheduledDate' in appointment ? appointment.scheduledDate : appointment.scheduled_date;
  const today = new Date().toISOString().split('T')[0];
  return date < today;
}

/**
 * Verifica se agendamento é hoje
 */
export function isAppointmentToday(appointment: Appointment | AppointmentUI): boolean {
  const date = 'scheduledDate' in appointment ? appointment.scheduledDate : appointment.scheduled_date;
  const today = new Date().toISOString().split('T')[0];
  return date === today;
}

/**
 * Verifica se agendamento é no futuro
 */
export function isAppointmentFuture(appointment: Appointment | AppointmentUI): boolean {
  const date = 'scheduledDate' in appointment ? appointment.scheduledDate : appointment.scheduled_date;
  const today = new Date().toISOString().split('T')[0];
  return date > today;
}

/**
 * Compara 2 agendamentos para detectar mudanças
 */
export function hasAppointmentChanged(
  original: Appointment,
  updated: Partial<Appointment>,
): boolean {
  return JSON.stringify(original) !== JSON.stringify(updated);
}

/**
 * Retorna lista de campos que foram alterados
 */
export function getChangedFields(
  original: Appointment,
  updated: Partial<Appointment>,
): string[] {
  const changed: string[] = [];

  Object.keys(updated).forEach(key => {
    if (original[key as keyof Appointment] !== updated[key as keyof Appointment]) {
      changed.push(key);
    }
  });

  return changed;
}

// ============================================================================
// PHASE 1: DEBUG & VALIDATION FUNCTIONS
// ============================================================================

/**
 * Debug: Log data transformation from UI (camelCase) to DB (snake_case)
 * Helps identify mapping issues without breaking functionality
 */
export function debugMappingToDatabase(data: Partial<AppointmentUI>): Partial<Appointment> {
  const mapped = createPayloadFromForm('', data) as Partial<Appointment>;
  
  console.debug('[Appointment Debug] 📤 TO DATABASE:', {
    source: data,
    mapped,
    mappingNotes: {
      patientId: `${data.patientId} → ${mapped.patient_id}`,
      professionalId: `${data.professionalId} → ${mapped.professional_id}`,
      serviceId: `${data.serviceId} → ${mapped.service_id}`,
      roomId: `${data.roomId} → ${mapped.room_id}`,
      payerId: `${data.payerId} → ${mapped.payer_id}`,
      planId: `${data.planId} → ${mapped.plan_id}`,
      scheduledTime: `${data.scheduledTime} → ${mapped.scheduled_time}`,
      scheduledDate: `${data.scheduledDate} → ${mapped.scheduled_date}`,
    }
  });

  return mapped;
}

/**
 * Debug: Log data transformation from DB (snake_case) to UI (camelCase)
 * Helps identify reverse mapping issues
 */
export function debugMappingFromDatabase(data: Appointment): AppointmentUI {
  const mapped = appointmentToUI(data);
  
  console.debug('[Appointment Debug] 📥 FROM DATABASE:', {
    source: {
      patient_id: data.patient_id,
      professional_id: data.professional_id,
      service_id: data.service_id,
      room_id: data.room_id,
      payer_id: data.payer_id,
      plan_id: data.plan_id,
    },
    mapped: {
      patientId: mapped.patientId,
      professionalId: mapped.professionalId,
      serviceId: mapped.serviceId,
      roomId: mapped.roomId,
      payerId: mapped.payerId,
      planId: mapped.planId,
    },
    issues: {
      nullPatient: !mapped.patientId ? '⚠️ NULL' : '✅ OK',
      nullProfessional: !mapped.professionalId ? '⚠️ NULL' : '✅ OK',
      nullService: !mapped.serviceId ? '⚠️ NULL' : '✅ OK',
      nullRoom: !mapped.roomId ? '⚠️ NULL' : '✅ OK',
      nullPayer: !mapped.payerId ? '⚠️ NULL' : '✅ OK',
    }
  });

  return mapped;
}

/**
 * Validate UUID format
 * Prevents invalid IDs from being sent to database
 */
export function validateUUID(value: string | null | undefined, fieldName: string): boolean {
  if (!value) {
    console.warn(`[Appointment Validation] ⚠️ ${fieldName} is missing (${value})`);
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValid = uuidRegex.test(value);

  if (!isValid) {
    console.error(`[Appointment Validation] ❌ ${fieldName} is not valid UUID: ${value}`);
  }

  return isValid;
}

/**
 * Validate critical fields that should NEVER be NULL
 * Called before CREATE/UPDATE operations
 */
export function validateCriticalFields(appointment: Partial<AppointmentUI>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Critical: Must have patient
  if (!appointment.patientId) {
    errors.push('❌ CRITICAL: patientId is required');
  } else if (!validateUUID(appointment.patientId, 'patientId')) {
    errors.push('❌ CRITICAL: patientId is not valid UUID');
  }

  // Critical: Must have professional
  if (!appointment.professionalId) {
    errors.push('❌ CRITICAL: professionalId is required');
  } else if (!validateUUID(appointment.professionalId, 'professionalId')) {
    errors.push('❌ CRITICAL: professionalId is not valid UUID');
  }

  // Critical: Must have service
  if (!appointment.serviceId) {
    errors.push('❌ CRITICAL: serviceId is required');
  } else if (!validateUUID(appointment.serviceId, 'serviceId')) {
    errors.push('❌ CRITICAL: serviceId is not valid UUID');
  }

  // Warning: Should have room for most appointments
  if (!appointment.roomId && appointment.status !== 'remote') {
    errors.push('⚠️ WARNING: roomId is missing (expected for in-person appointments)');
  } else if (appointment.roomId && !validateUUID(appointment.roomId, 'roomId')) {
    errors.push('⚠️ WARNING: roomId is not valid UUID');
  }

  // Warning: Should have payer
  if (!appointment.payerId && appointment.status !== 'cancelled') {
    errors.push('⚠️ WARNING: payerId is missing');
  }

  const valid = errors.every(e => !e.includes('❌'));

  if (errors.length > 0) {
    console.debug('[Appointment Validation]', {
      valid,
      errors,
      appointment: {
        patientId: appointment.patientId ? '✅' : '❌',
        professionalId: appointment.professionalId ? '✅' : '❌',
        serviceId: appointment.serviceId ? '✅' : '❌',
        roomId: appointment.roomId ? '✅' : '⚠️',
        payerId: appointment.payerId ? '✅' : '⚠️',
      }
    });
  }

  return { valid, errors };
}

/**
 * Debug: Verify that fields persisted in database after UPDATE
 * Call this after receiving response from updateAppointment()
 * Helps catch cases where fields return as NULL due to RLS issues
 */
export function debugPersistence(
  appointmentId: string,
  fieldNames: (keyof AppointmentUI)[],
  response: Partial<AppointmentUI>
): {
  persisted: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  fieldNames.forEach(field => {
    const value = response[field];
    if (!value) {
      issues.push(`❌ ${String(field)} did not persist (returned ${value})`);
    } else {
      console.debug(`[Persistence Check] ✅ ${String(field)} = ${value}`);
    }
  });

  console.debug('[Appointment Persistence]', {
    appointmentId,
    checkedFields: fieldNames,
    persisted: issues.length === 0,
    issues,
    response: {
      patientId: response.patientId ? '✅' : '❌',
      professionalId: response.professionalId ? '✅' : '❌',
      serviceId: response.serviceId ? '✅' : '❌',
      roomId: response.roomId ? '✅' : '❌',
      payerId: response.payerId ? '✅' : '❌',
      planId: response.planId ? '✅' : '❌',
    }
  });

  return {
    persisted: issues.length === 0,
    issues
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  appointmentToUI,
  uiToAppointment,
  createPayloadFromForm,
  createUpdatePayloadFromForm,
  validateField,
  validateAppointmentPayload,
  validateStatusTransition,
  enrichAppointment,
  calculateEndTime,
  calculateDuration,
  formatDateDisplay,
  formatTimeDisplay,
  formatAppointmentPeriod,
  formatCurrency,
  buildFilterQuery,
  filterAppointments,
  isAppointmentPast,
  isAppointmentToday,
  isAppointmentFuture,
  hasAppointmentChanged,
  getChangedFields,
  debugMappingToDatabase,
  debugMappingFromDatabase,
  validateUUID,
  validateCriticalFields,
  debugPersistence,
};
