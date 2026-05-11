/**
 * ⚙️ CONSTANTES CENTRALIZADAS - MÓDULO AGENDA
 * =========================================
 *
 * Configuração único centralizadas para toda a agenda
 */

import { AppointmentStatus } from '../types';
import * as statusColorsModule from './statusColors';
import * as agendaConfigModule from './agendaConfig';
import * as officialStatusModule from './officialStatusModel';

// Re-export status colors for convenience
export const {
  STATUS_COLOR_MAP,
  STATUS_BACKGROUND_COLOR_MAP,
  STATUS_TEXT_COLOR_MAP,
  STATUS_ICON_MAP,
} = statusColorsModule;

// Re-export additional configs
export const {
  STATUS_LABEL_MAP,
  VISIBLE_STATUSES,
  VIEW_MODES,
  TIME_SLOTS,
  APPOINTMENT_RULES,
  CALENDAR_EVENTS,
} = agendaConfigModule;

// Re-export official status model (NEW - Enterprise Standard)
export {
  OFFICIAL_STATUS_CONFIG,
  OPERATIONAL_FLOW_SEQUENCE,
  OPERATIONAL_STATUSES,
  FINALIZED_STATUSES,
  EDITABLE_STATUSES,
  NON_BILLABLE_STATUSES,
  AUTO_BILLABLE_STATUSES,
  REPORTABLE_STATUSES,
  STATUS_TRANSITIONS,
  LEGACY_TO_OFFICIAL_STATUS_MAP,
  isValidTransition,
  getNextPossibleStatuses,
  getStatusConfig,
  getStatusLabel,
  getStatusIcon,
  getStatusColor,
  isStatusOperational,
  isStatusFinalized,
  canEditAppointmentInStatus,
  blocksEditingInStatus,
  generatesFinancialInStatus,
  receptionUnlockedInStatus,
  convertLegacyToOfficialStatus,
} from './officialStatusModel';

export type { OfficialAppointmentStatus, OfficialStatusConfig } from './officialStatusModel';

// ============================================================================
// 1. STATUS CONFIGURATION
// ============================================================================

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  {
    label: string;
    icon: string;
    color: string;
    badgeClass: string;
    description: string;
    isFinalized: boolean;
    canEdit: boolean;
  }
> = {
  scheduled: {
    label: 'Agendado',
    icon: '🗓️',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-800',
    description: 'Agendado na agenda',
    isFinalized: false,
    canEdit: true,
  },
  confirmed: {
    label: 'Confirmado',
    icon: '✅',
    color: 'cyan',
    badgeClass: 'bg-cyan-100 text-cyan-800',
    description: 'Paciente confirmou presença',
    isFinalized: false,
    canEdit: true,
  },
  checked_in: {
    label: 'Check-in',
    icon: '📍',
    color: 'green',
    badgeClass: 'bg-green-100 text-green-800',
    description: 'Chegou na recepção',
    isFinalized: false,
    canEdit: true,
  },
  waiting: {
    label: 'Aguardando',
    icon: '⏳',
    color: 'yellow',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    description: 'Aguardando atendimento',
    isFinalized: false,
    canEdit: true,
  },
  in_progress: {
    label: 'Em Atendimento',
    icon: '🔄',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800',
    description: 'Atendimento em andamento',
    isFinalized: false,
    canEdit: false,
  },
  completed: {
    label: 'Completo',
    icon: '✔️',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    description: 'Atendimento finalizado',
    isFinalized: true,
    canEdit: false,
  },
  cancelled: {
    label: 'Cancelado',
    icon: '🚫',
    color: 'gray',
    badgeClass: 'bg-gray-100 text-gray-800',
    description: 'Cancelado',
    isFinalized: true,
    canEdit: false,
  },
  no_show: {
    label: 'Falta',
    icon: '❌',
    color: 'red',
    badgeClass: 'bg-red-100 text-red-800',
    description: 'Paciente não compareceu',
    isFinalized: true,
    canEdit: false,
  },
};

// ============================================================================
// 2. STATUS ARRAYS
// ============================================================================

export const OPERATIONAL_FLOW_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'checked_in',
  'waiting',
  'in_progress',
  'completed',
];

export const FINAL_STATUSES: AppointmentStatus[] = [
  'completed',
  'cancelled',
  'no_show',
];

export const ACTIVE_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'checked_in',
  'waiting',
  'in_progress',
];

export const CANCELLED_STATUSES: AppointmentStatus[] = [
  'cancelled',
  'no_show',
];

// ============================================================================
// 3. AGENDA CONFIGURATION
// ============================================================================

export const AGENDA_CONFIG = {
  // Duração padrão de atendimento em minutos
  DEFAULT_DURATION: 30,

  // Horários de funcionamento
  BUSINESS_HOURS: {
    start: '08:00',
    end: '18:00',
  },

  // Intervalo de slots na agenda
  SLOT_INTERVAL: 30, // em minutos

  // Cores para profissionais
  PROFESSIONAL_COLORS: [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
  ],

  // Configuração de realtime
  REALTIME: {
    ENABLED: true,
    DEBOUNCE_MS: 300,
    CHANNEL_NAME: 'agenda-events',
  },

  // Paginação
  PAGINATION: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 200,
  },

  // Cache
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutos

  // Validação
  MIN_DATE_RANGE: 1, // dias para trás
  MAX_DATE_RANGE: 365, // dias para frente
};

// ============================================================================
// 4. MESSAGES
// ============================================================================

export const AGENDA_MESSAGES = {
  // Sucesso
  APPOINTMENT_CREATED: 'Agendamento criado com sucesso',
  APPOINTMENT_UPDATED: 'Agendamento atualizado com sucesso',
  APPOINTMENT_DELETED: 'Agendamento deletado com sucesso',
  APPOINTMENT_CANCELLED: 'Agendamento cancelado com sucesso',
  STATUS_UPDATED: 'Status atualizado com sucesso',

  // Erros
  ERROR_CREATING_APPOINTMENT: 'Erro ao criar agendamento',
  ERROR_UPDATING_APPOINTMENT: 'Erro ao atualizar agendamento',
  ERROR_DELETING_APPOINTMENT: 'Erro ao deletar agendamento',
  ERROR_LOADING_APPOINTMENTS: 'Erro ao carregar agendamentos',
  ERROR_LOADING_AVAILABILITY: 'Erro ao carregar disponibilidade',

  // Validação
  VALIDATION_ERROR_REQUIRED_FIELD: 'Campo obrigatório',
  VALIDATION_ERROR_INVALID_DATE: 'Data inválida',
  VALIDATION_ERROR_INVALID_TIME: 'Horário inválido',
  VALIDATION_ERROR_APPOINTMENT_OVERLAP: 'Há um conflito de horário com outro agendamento',
  VALIDATION_ERROR_NO_AVAILABILITY: 'Sem disponibilidade neste horário',
  VALIDATION_ERROR_INVALID_STATUS_TRANSITION: 'Transição de status não permitida',

  // Confirmação
  CONFIRM_DELETE_APPOINTMENT: 'Tem certeza que deseja deletar este agendamento?',
  CONFIRM_CANCEL_APPOINTMENT: 'Tem certeza que deseja cancelar este agendamento?',
};

// ============================================================================
// 5. VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  patient_id: {
    required: true,
  },
  professional_id: {
    required: true,
  },
  scheduled_date: {
    required: true,
    pattern: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  },
  scheduled_time: {
    required: true,
    pattern: /^\d{2}:\d{2}$/, // HH:mm
  },
  duration: {
    min: 5,
    max: 480, // 8 horas
  },
  value: {
    min: 0,
  },
  discount: {
    min: 0,
    max: 100,
  },
  notes: {
    maxLength: 500,
  },
};

// ============================================================================
// 6. VIEW TYPES
// ============================================================================

export const AGENDA_VIEW_TYPES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  TABLE: 'table',
} as const;

// ============================================================================
// 7. MODAL MODES
// ============================================================================

export const APPOINTMENT_MODAL_MODES = {
  CREATE: 'create',
  EDIT: 'edit',
  VIEW: 'view',
  RECEPTION: 'reception',
} as const;

// ============================================================================
// 8. API ENDPOINTS
// ============================================================================

export const AGENDA_ENDPOINTS = {
  LIST_APPOINTMENTS: '/appointments',
  CREATE_APPOINTMENT: '/appointments',
  GET_APPOINTMENT: '/appointments/:id',
  UPDATE_APPOINTMENT: '/appointments/:id',
  DELETE_APPOINTMENT: '/appointments/:id',
  GET_AVAILABILITY: '/availability',
  GET_PROFESSIONAL_SCHEDULE: '/professionals/:id/schedule',
  GET_ROOM_AVAILABILITY: '/rooms/:id/availability',
};

// ============================================================================
// 9. HELPERS
// ============================================================================

export function getStatusConfig(status: AppointmentStatus) {
  return APPOINTMENT_STATUS_CONFIG[status] || APPOINTMENT_STATUS_CONFIG.scheduled;
}

export function getStatusLabel(status: AppointmentStatus): string {
  return getStatusConfig(status).label;
}

export function getStatusIcon(status: AppointmentStatus): string {
  return getStatusConfig(status).icon;
}

// ============================================================================
// 10. QUICK FILTERS (NEW - Status System)
// ============================================================================

export {
  QUICK_FILTERS,
  QUICK_FILTER_LABELS,
  filterByQuickFilter,
  countByStatus,
  getQuickFilterSummary,
  generateChartData,
} from './quickFilters';

export function getStatusBadgeClass(status: AppointmentStatus): string {
  return getStatusConfig(status).badgeClass;
}

export function isStatusFinalized(status: AppointmentStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export function isStatusCancelled(status: AppointmentStatus): boolean {
  return CANCELLED_STATUSES.includes(status);
}

export function canEditAppointmentInStatus(status: AppointmentStatus): boolean {
  return getStatusConfig(status).canEdit;
}

export function getNextPossibleStatuses(
  currentStatus: AppointmentStatus
): AppointmentStatus[] {
  const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    scheduled: ['confirmed', 'checked_in', 'cancelled', 'no_show'],
    confirmed: ['scheduled', 'checked_in', 'cancelled'],
    checked_in: ['waiting', 'cancelled', 'no_show'],
    waiting: ['in_progress', 'no_show', 'cancelled'],
    in_progress: ['completed', 'no_show'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  return transitions[currentStatus] || [];
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  APPOINTMENT_STATUS_CONFIG,
  OPERATIONAL_FLOW_STATUSES,
  FINAL_STATUSES,
  ACTIVE_STATUSES,
  CANCELLED_STATUSES,
  AGENDA_CONFIG,
  AGENDA_MESSAGES,
  VALIDATION_RULES,
  AGENDA_VIEW_TYPES,
  APPOINTMENT_MODAL_MODES,
  AGENDA_ENDPOINTS,
  getStatusConfig,
  getStatusLabel,
  getStatusIcon,
  getStatusBadgeClass,
  isStatusFinalized,
  isStatusCancelled,
  canEditAppointmentInStatus,
  getNextPossibleStatuses,
};

// ============================================================================
// RE-EXPORT FINANCIAL CONSTANTS
// ============================================================================

// Financial integration constants (Phase 3)
export * from './financial';
