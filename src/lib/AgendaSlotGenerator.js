// src/lib/AgendaSlotGenerator.js

import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';

/**
 * Normaliza o objeto recebido da API list_appointments_v4
 * Garante que o calendário receba dados consistentes.
 */
export function normalizeAppointment(raw) {
  if (!raw) {
    return null;
  }

  return {
    id: raw.id || raw.appointment_id,
    appointment_id: raw.id || raw.appointment_id,
    clinic_id: raw.clinic_id,

    professional_id: raw.professional_id,
    professional_name: raw.professional_name,
    professional_color: raw.professional_color,

    patient_id: raw.patient_id,
    patient_name: raw.patient_name,
    patient_phone: raw.patient_phone || raw.phone,

    service_id: raw.service_id,
    service_name: raw.service_name,
    service_duration_min: raw.service_duration_min || 30,

    payer_id: raw.payer_id,
    payer_name: raw.payer_name,
    plan_id: raw.plan_id,
    plan_name: raw.plan_name,

    start_time: new Date(raw.start_time),
    end_time: new Date(raw.end_time),

    status: raw.status,
    color_code: raw.color_code,
    appointment_type: raw.appointment_type,
    is_blocked: raw.is_blocked,

    room_id: raw.room_id,
    room_name: raw.room_name,

    notes: raw.notes,
  };
}

/**
 * Agrupa por dia → usado pelo calendário semanal e mensal.
 */
export function groupByDay(appointments) {
  const map = {};

  appointments.forEach((a) => {
    const d = format(a.start_time, 'yyyy-MM-dd');
    if (!map[d]) {
      map[d] = [];
    }
    map[d].push(a);
  });

  return map;
}

/**
 * Agrupa agenda por profissional → modo "profissional"
 */
export function groupByProfessional(appointments) {
  const map = {};

  appointments.forEach((a) => {
    if (!map[a.professional_id]) {
      map[a.professional_id] = {
        professional_id: a.professional_id,
        professional_name: a.professional_name,
        professional_color: a.professional_color,
        slots: [],
      };
    }
    map[a.professional_id].slots.push(a);
  });

  return Object.values(map);
}

/**
 * Agrupa agenda por sala
 */
export function groupByRoom(appointments) {
  const map = {};

  appointments.forEach((a) => {
    const roomKey = a.room_id || 'SEM_SALA';

    if (!map[roomKey]) {
      map[roomKey] = {
        room_id: a.room_id,
        room_name: a.room_name || 'Sala não definida',
        slots: [],
      };
    }

    map[roomKey].slots.push(a);
  });

  return Object.values(map);
}

/**
 * Gera estrutura final baseada no modo atual da agenda
 */
export function generateAgendaStructure(appointments, mode = 'unificada') {
  const normalized = appointments.map(normalizeAppointment);

  if (mode === 'profissional') {
    return groupByProfessional(normalized);
  }
  if (mode === 'sala') {
    return groupByRoom(normalized);
  }

  // Unificada (geral)
  return groupByDay(normalized);
}

/**
 * Retorna apenas os agendamentos de um dia específico
 */
export function filterByDay(appointments, date) {
  return appointments.filter((a) => {
    return isSameDay(a.start_time, date);
  });
}
