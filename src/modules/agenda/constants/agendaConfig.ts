/**
 * STATUS LABELS - Textos para cada status
 */
export const STATUS_LABEL_MAP = {
  // Booking
  scheduled: 'Agendado',
  confirmed_phone: 'Confirmado (Telefone)',
  confirmed_whatsapp: 'Confirmado (WhatsApp)',
  confirmed: 'Confirmado',
  at_reception: 'Na Recepção',
  at_checkout: 'No Guichê',
  squeezein: 'Encaixe',
  awaiting_insurance: 'Aguardando Convênio',
  blocked: 'Bloqueado',

  // Service
  awaiting_professional: 'Aguardando Profissional',
  in_service: 'Em Atendimento',
  attended: 'Atendido',
  no_show: 'Faltou',
  canceled: 'Cancelado',

  // Management
  rescheduled: 'Remarcado',

  // Financial
  awaiting_billing: 'Aguardando Faturamento',
  billed: 'Faturado',
  denied: 'Glosado',
  paid: 'Pago',
  resubmitted: 'Reapresentado',
  not_billable: 'Não Faturável',
};

/**
 * VISIBILITY RULES - Quais statuses são visíveis onde
 */
export const VISIBLE_STATUSES = {
  // Visíveis no modal de recepção (operacionais)
  reception: [
    'scheduled',
    'confirmed_phone',
    'confirmed_whatsapp',
    'confirmed',
    'at_reception',
    'at_checkout',
    'awaiting_professional',
    'in_service',
    'attended',
    'no_show',
    'canceled',
    'rescheduled',
  ],

  // Visíveis apenas no módulo financeiro
  financial: [
    'awaiting_billing',
    'billed',
    'denied',
    'paid',
    'resubmitted',
    'not_billable',
  ],

  // Visíveis em todos os módulos
  universal: ['scheduled', 'canceled', 'attended'],
};

/**
 * AGENDA CONFIGURATION - Valores padrão e limites
 */
export const AGENDA_CONFIG = {
  // Horário padrão
  DEFAULT_START_TIME: '08:00',
  DEFAULT_END_TIME: '18:00',
  DEFAULT_DURATION_MINUTES: 30,
  MIN_DURATION_MINUTES: 5,
  MAX_DURATION_MINUTES: 480, // 8 horas

  // Visualização
  DEFAULT_VIEW_MODE: 'geral',
  DAYS_IN_ADVANCE: 90, // Quantidade de dias que podem ser agendados antecipadamente
  DAYS_IN_PAST: 7, // Quantidade de dias no passado que podem ser visualizados

  // Performance
  APPOINTMENTS_PER_PAGE: 50,
  MAX_APPOINTMENTS_IN_MEMORY: 500,

  // Cache
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutos

  // Validação
  REQUIRE_PROFESSIONAL: true,
  REQUIRE_SERVICE: false,
  ALLOW_OVERLAPPING: false,
  ALLOW_SQUEEZEIN: true,
};

/**
 * VIEW MODES - Modos de visualização disponíveis
 */
export const VIEW_MODES = {
  GENERAL: 'geral',
  PROFESSIONAL: 'profissional',
  ROOM: 'sala',
  TIMELINE: 'timeline',
  CALENDAR: 'calendar',
  TABLE: 'table',
} as const;

/**
 * TIME SLOTS - Configuração de slots de tempo
 */
export const TIME_SLOTS = {
  SLOTS_PER_HOUR: 2, // 2 slots de 30 min cada
  BUSINESS_HOURS_START: 8, // 08:00
  BUSINESS_HOURS_END: 18, // 18:00
  BREAK_PERIODS: [
    { start: '12:00', end: '13:00' }, // Almoço
  ],
} as const;

/**
 * APPOINTMENT RULES - Regras de negócio
 */
export const APPOINTMENT_RULES = {
  // Confirmação
  AUTO_CONFIRM_MINUTES: 24 * 60, // Autoconfirm após 24 horas
  CONFIRMATION_REMINDER_MINUTES: 24 * 60, // Lembrete 24h antes

  // Cancelamento
  CANCELLATION_GRACE_PERIOD_MINUTES: 2 * 60, // 2 horas antes

  // Falta
  NO_SHOW_THRESHOLD_MINUTES: 30, // 30 minutos sem comparecer = faltou

  // Reagendamento
  RESCHEDULE_ALLOWED_MINUTES: 48 * 60, // Permite reagendamento até 48h antes
} as const;

/**
 * CALENDAR EVENTS - Tipos de eventos do calendário
 */
export const CALENDAR_EVENTS = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_DELETED: 'appointment.deleted',
  APPOINTMENT_STATUS_CHANGED: 'appointment.status_changed',
  PROFESSIONAL_UNAVAILABLE: 'professional.unavailable',
  ROOM_UNAVAILABLE: 'room.unavailable',
} as const;

export default {
  STATUS_LABEL_MAP,
  VISIBLE_STATUSES,
  AGENDA_CONFIG,
  VIEW_MODES,
  TIME_SLOTS,
  APPOINTMENT_RULES,
  CALENDAR_EVENTS,
};
