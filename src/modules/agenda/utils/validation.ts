/**
 * 🛠️ UTILS - VALIDAÇÃO E TRANSFORMAÇÃO
 * ===================================
 *
 * Funções utilitárias para agenda
 */

import {
  Appointment,
  AppointmentUI,
  AppointmentStatus,
  AgendaFilters,
} from '../types';

// ============================================================================
// 1. VALIDAÇÃO DE DATAS E HORÁRIOS
// ============================================================================

/**
 * Valida formato de data (YYYY-MM-DD)
 */
export function isValidDateFormat(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr + 'T00:00:00');
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Valida formato de hora (HH:mm)
 */
export function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
}

/**
 * Valida se data está dentro de range permitido
 */
export function isDateInRange(
  dateStr: string,
  minDaysBack: number = 0,
  maxDaysForward: number = 365,
): boolean {
  if (!isValidDateFormat(dateStr)) return false;

  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - minDaysBack);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDaysForward);

  return date >= minDate && date <= maxDate;
}

/**
 * Valida se duas horas não se sobrepõem
 */
export function hasTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  return s1 < e2 && s2 < e1;
}

// ============================================================================
// 2. DETECÇÃO DE CONFLITOS
// ============================================================================

/**
 * Verifica se novo agendamento conflita com existentes
 */
export function checkAppointmentConflict(
  newAppointment: Partial<AppointmentUI>,
  existingAppointments: (Appointment | AppointmentUI)[],
  ignoreAppointmentId?: string,
): boolean {
  if (
    !newAppointment.scheduledDate ||
    !newAppointment.scheduledTime ||
    !newAppointment.duration
  ) {
    return false;
  }

  const newEndTime = calculateEndTimeFromTime(
    newAppointment.scheduledTime,
    newAppointment.duration,
  );

  return existingAppointments.some(apt => {
    // Ignorar agendamento específico (útil em EDIT)
    if (ignoreAppointmentId && apt.id === ignoreAppointmentId) {
      return false;
    }

    // Ignorar agendamentos no mesmo dia/profissional
    const aptDate = 'scheduledDate' in apt ? apt.scheduledDate : apt.scheduled_date;
    const aptProf = 'professionalId' in apt ? apt.professionalId : apt.professional_id;

    const newProf = 'professionalId' in newAppointment ? newAppointment.professionalId : newAppointment.professional_id;

    if (aptDate !== newAppointment.scheduledDate || aptProf !== newProf) {
      return false;
    }

    // Verificar sobreposição de horário
    const aptTime = 'scheduledTime' in apt ? apt.scheduledTime : apt.scheduled_time;
    const aptEndTime = 'endTime' in apt ? apt.endTime : apt.end_time;

    if (!aptTime || !aptEndTime) return false;

    return hasTimeOverlap(
      newAppointment.scheduledTime,
      newEndTime,
      aptTime,
      aptEndTime,
    );
  });
}

/**
 * Retorna lista de conflitos encontrados
 */
export function findAppointmentConflicts(
  newAppointment: Partial<AppointmentUI>,
  existingAppointments: (Appointment | AppointmentUI)[],
  ignoreAppointmentId?: string,
): (Appointment | AppointmentUI)[] {
  if (
    !newAppointment.scheduledDate ||
    !newAppointment.scheduledTime ||
    !newAppointment.duration
  ) {
    return [];
  }

  const newEndTime = calculateEndTimeFromTime(
    newAppointment.scheduledTime,
    newAppointment.duration,
  );

  return existingAppointments.filter(apt => {
    if (ignoreAppointmentId && apt.id === ignoreAppointmentId) {
      return false;
    }

    const aptDate = 'scheduledDate' in apt ? apt.scheduledDate : apt.scheduled_date;
    const aptProf = 'professionalId' in apt ? apt.professionalId : apt.professional_id;

    const newProf = 'professionalId' in newAppointment ? newAppointment.professionalId : newAppointment.professional_id;

    if (aptDate !== newAppointment.scheduledDate || aptProf !== newProf) {
      return false;
    }

    const aptTime = 'scheduledTime' in apt ? apt.scheduledTime : apt.scheduled_time;
    const aptEndTime = 'endTime' in apt ? apt.endTime : apt.end_time;

    if (!aptTime || !aptEndTime) return false;

    return hasTimeOverlap(
      newAppointment.scheduledTime,
      newEndTime,
      aptTime,
      aptEndTime,
    );
  });
}

// ============================================================================
// 3. CÁLCULOS DE TEMPO
// ============================================================================

/**
 * Calcula hora final a partir de hora inicial e duração
 */
function calculateEndTimeFromTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;

  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Calcula duração em minutos entre dois horários
 */
export function getTimeDiffMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  return endTotal - startTotal;
}

/**
 * Calcula diferença de dias entre duas datas
 */
export function getDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');

  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Adiciona dias a uma data
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);

  return date.toISOString().split('T')[0];
}

/**
 * Subtrai dias de uma data
 */
export function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

// ============================================================================
// 4. FILTRAGEM AVANÇADA
// ============================================================================

/**
 * Filtra agendamentos por vários critérios
 */
export function filterAppointmentsByMultipleCriteria(
  appointments: (Appointment | AppointmentUI)[],
  filters: {
    dateFrom?: string;
    dateTo?: string;
    professionalIds?: string[];
    roomIds?: string[];
    payerIds?: string[];
    statuses?: AppointmentStatus[];
    patientNameContains?: string;
  },
): (Appointment | AppointmentUI)[] {
  return appointments.filter(apt => {
    const aptDate = 'scheduledDate' in apt ? apt.scheduledDate : apt.scheduled_date;

    if (filters.dateFrom && aptDate < filters.dateFrom) return false;
    if (filters.dateTo && aptDate > filters.dateTo) return false;

    if (filters.professionalIds && filters.professionalIds.length > 0) {
      const aptProf = 'professionalId' in apt ? apt.professionalId : apt.professional_id;
      if (!filters.professionalIds.includes(aptProf)) return false;
    }

    if (filters.roomIds && filters.roomIds.length > 0) {
      const aptRoom = 'roomId' in apt ? apt.roomId : apt.room_id;
      if (!filters.roomIds.includes(aptRoom)) return false;
    }

    if (filters.payerIds && filters.payerIds.length > 0) {
      const aptPayer = 'payerId' in apt ? apt.payerId : apt.payer_id;
      if (!filters.payerIds.includes(aptPayer)) return false;
    }

    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(apt.status)) return false;
    }

    if (filters.patientNameContains) {
      const patientName = apt.patient?.name || '';
      if (
        !patientName
          .toLowerCase()
          .includes(filters.patientNameContains.toLowerCase())
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Agrupa agendamentos por data
 */
export function groupAppointmentsByDate(
  appointments: (Appointment | AppointmentUI)[],
): Record<string, (Appointment | AppointmentUI)[]> {
  const grouped: Record<string, (Appointment | AppointmentUI)[]> = {};

  appointments.forEach(apt => {
    const date = 'scheduledDate' in apt ? apt.scheduledDate : apt.scheduled_date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(apt);
  });

  return grouped;
}

/**
 * Agrupa agendamentos por profissional
 */
export function groupAppointmentsByProfessional(
  appointments: (Appointment | AppointmentUI)[],
): Record<string, (Appointment | AppointmentUI)[]> {
  const grouped: Record<string, (Appointment | AppointmentUI)[]> = {};

  appointments.forEach(apt => {
    const prof = 'professionalId' in apt ? apt.professionalId : apt.professional_id;
    if (!grouped[prof]) {
      grouped[prof] = [];
    }
    grouped[prof].push(apt);
  });

  return grouped;
}

/**
 * Ordena agendamentos por data e hora
 */
export function sortAppointmentsByDateTime(
  appointments: (Appointment | AppointmentUI)[],
  descending: boolean = false,
): (Appointment | AppointmentUI)[] {
  const sorted = [...appointments].sort((a, b) => {
    const aDate = 'scheduledDate' in a ? a.scheduledDate : a.scheduled_date;
    const bDate = 'scheduledDate' in b ? b.scheduledDate : b.scheduled_date;

    if (aDate !== bDate) {
      return descending ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
    }

    const aTime = 'scheduledTime' in a ? a.scheduledTime : a.scheduled_time;
    const bTime = 'scheduledTime' in b ? b.scheduledTime : b.scheduled_time;

    return descending ? bTime.localeCompare(aTime) : aTime.localeCompare(bTime);
  });

  return sorted;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  isValidDateFormat,
  isValidTimeFormat,
  isDateInRange,
  hasTimeOverlap,
  checkAppointmentConflict,
  findAppointmentConflicts,
  getTimeDiffMinutes,
  getDaysDiff,
  addDays,
  subtractDays,
  filterAppointmentsByMultipleCriteria,
  groupAppointmentsByDate,
  groupAppointmentsByProfessional,
  sortAppointmentsByDateTime,
};
