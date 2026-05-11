/**
 * STATUS OFICIAIS - Agenda Enterprise Operational Flow
 * ===================================================
 * 
 * 8 status que definem o fluxo operacional completo
 * desde agendamento até conclusão ou cancelamento.
 */

// ============================================================================
// 1. STATUS TYPES
// ============================================================================

export type OfficialAppointmentStatus =
  | 'scheduled'      // 📅 Agendado
  | 'confirmed'      // ✅ Confirmado
  | 'checked_in'     // 📍 Check-in realizado
  | 'waiting'        // ⏳ Aguardando atendimento
  | 'in_progress'    // 🔄 Em atendimento
  | 'completed'      // ✔️ Completo
  | 'cancelled'      // 🚫 Cancelado
  | 'no_show';       // ❌ Não compareceu

// ============================================================================
// 2. STATUS CONFIGURATION
// ============================================================================

export const OFFICIAL_STATUS_CONFIG = {
  scheduled: {
    label: 'Agendado',
    icon: '📅',
    color: 'blue',
    backgroundColor: '#dbeafe',
    textColor: '#1e40af',
    borderColor: '#60a5fa',
    badgeClass: 'bg-blue-100 text-blue-700 border border-blue-300',
    description: 'Agendamento criado, aguardando confirmação',
    isOperational: true,
    isFinalized: false,
    canEdit: true,
    allowsStatusChange: true,
    allowsCancelation: true,
    generatesFinancial: false,
    nextPossibleStatuses: ['confirmed', 'cancelled'],
  },

  confirmed: {
    label: 'Confirmado',
    icon: '✅',
    color: 'green',
    backgroundColor: '#dcfce7',
    textColor: '#15803d',
    borderColor: '#86efac',
    badgeClass: 'bg-green-100 text-green-700 border border-green-300',
    description: 'Paciente confirmou presença',
    isOperational: true,
    isFinalized: false,
    canEdit: true,
    allowsStatusChange: true,
    allowsCancelation: true,
    generatesFinancial: false,
    nextPossibleStatuses: ['checked_in', 'cancelled', 'no_show'],
  },

  checked_in: {
    label: 'Check-in',
    icon: '📍',
    color: 'purple',
    backgroundColor: '#e9d5ff',
    textColor: '#581c87',
    borderColor: '#d8b4fe',
    badgeClass: 'bg-purple-100 text-purple-700 border border-purple-300',
    description: 'Paciente na recepção, prontuário validado',
    isOperational: true,
    isFinalized: false,
    canEdit: false,
    allowsStatusChange: true,
    allowsCancelation: false,
    generatesFinancial: false,
    nextPossibleStatuses: ['waiting', 'cancelled'],
    receptionUnlocked: true, // ← Libera recepção
  },

  waiting: {
    label: 'Aguardando',
    icon: '⏳',
    color: 'yellow',
    backgroundColor: '#fef08a',
    textColor: '#854d0e',
    borderColor: '#facc15',
    badgeClass: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
    description: 'Aguardando seu atendimento, na fila',
    isOperational: true,
    isFinalized: false,
    canEdit: false,
    allowsStatusChange: true,
    allowsCancelation: false,
    generatesFinancial: false,
    nextPossibleStatuses: ['in_progress', 'no_show'],
  },

  in_progress: {
    label: 'Em Atendimento',
    icon: '🔄',
    color: 'cyan',
    backgroundColor: '#cffafe',
    textColor: '#0369a1',
    borderColor: '#67e8f9',
    badgeClass: 'bg-cyan-100 text-cyan-700 border border-cyan-300',
    description: 'Profissional atendendo o paciente',
    isOperational: true,
    isFinalized: false,
    canEdit: false,
    allowsStatusChange: true,
    allowsCancelation: false,
    generatesFinancial: false,
    nextPossibleStatuses: ['completed', 'no_show'],
  },

  completed: {
    label: 'Completo',
    icon: '✔️',
    color: 'emerald',
    backgroundColor: '#d1fae5',
    textColor: '#047857',
    borderColor: '#6ee7b7',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    description: 'Atendimento finalizado com sucesso',
    isOperational: true,
    isFinalized: true,
    canEdit: false, // ← Bloqueia edição
    allowsStatusChange: false,
    allowsCancelation: false,
    generatesFinancial: true, // ← Gera financeiro
    nextPossibleStatuses: [],
    blocksCriticalEdit: true, // ← Proteção máxima
  },

  cancelled: {
    label: 'Cancelado',
    icon: '🚫',
    color: 'red',
    backgroundColor: '#fee2e2',
    textColor: '#dc2626',
    borderColor: '#fca5a5',
    badgeClass: 'bg-red-100 text-red-700 border border-red-300',
    description: 'Agendamento cancelado',
    isOperational: false,
    isFinalized: true,
    canEdit: false,
    allowsStatusChange: false,
    allowsCancelation: false,
    generatesFinancial: false, // ← NÃO gera financeiro
    nextPossibleStatuses: [],
  },

  no_show: {
    label: 'Não Compareceu',
    icon: '❌',
    color: 'gray',
    backgroundColor: '#f3f4f6',
    textColor: '#374151',
    borderColor: '#d1d5db',
    badgeClass: 'bg-gray-100 text-gray-700 border border-gray-300',
    description: 'Paciente não compareceu na data/hora marcada',
    isOperational: false,
    isFinalized: true,
    canEdit: false,
    allowsStatusChange: false,
    allowsCancelation: false,
    generatesFinancial: false, // ← NÃO gera financeiro
    nextPossibleStatuses: [],
  },
} as const;

export type OfficialStatusConfig = typeof OFFICIAL_STATUS_CONFIG;

// ============================================================================
// 3. STATUS ARRAYS & GROUPS
// ============================================================================

/** Fluxo operacional normal (sequencial) */
export const OPERATIONAL_FLOW_SEQUENCE: OfficialAppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'checked_in',
  'waiting',
  'in_progress',
  'completed',
];

/** Status operacionais (ainda em processamento) */
export const OPERATIONAL_STATUSES: OfficialAppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'checked_in',
  'waiting',
  'in_progress',
];

/** Status finalizados (não podem mudar) */
export const FINALIZED_STATUSES: OfficialAppointmentStatus[] = [
  'completed',
  'cancelled',
  'no_show',
];

/** Status que permitem edição */
export const EDITABLE_STATUSES: OfficialAppointmentStatus[] = [
  'scheduled',
  'confirmed',
];

/** Status que NÃO geram financeiro */
export const NON_BILLABLE_STATUSES: OfficialAppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'checked_in',
  'waiting',
  'in_progress',
  'cancelled',
  'no_show',
];

/** Status que geram financeiro automaticamente */
export const AUTO_BILLABLE_STATUSES: OfficialAppointmentStatus[] = [
  'completed',
];

/** Status visíveis em relatórios */
export const REPORTABLE_STATUSES: OfficialAppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'checked_in',
  'waiting',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

// ============================================================================
// 4. TRANSITION RULES
// ============================================================================

export const STATUS_TRANSITIONS: Record<
  OfficialAppointmentStatus,
  OfficialAppointmentStatus[]
> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['waiting', 'cancelled'],
  waiting: ['in_progress', 'no_show'],
  in_progress: ['completed', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/**
 * Valida se uma transição é permitida
 */
export function isValidTransition(
  from: OfficialAppointmentStatus,
  to: OfficialAppointmentStatus
): boolean {
  const possibleNext = STATUS_TRANSITIONS[from];
  return possibleNext && possibleNext.includes(to);
}

/**
 * Obtém próximos status possíveis
 */
export function getNextPossibleStatuses(
  currentStatus: OfficialAppointmentStatus
): OfficialAppointmentStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

// ============================================================================
// 5. HELPER FUNCTIONS
// ============================================================================

export function getStatusConfig(status: OfficialAppointmentStatus) {
  return OFFICIAL_STATUS_CONFIG[status];
}

export function getStatusLabel(status: OfficialAppointmentStatus): string {
  return OFFICIAL_STATUS_CONFIG[status].label;
}

export function getStatusIcon(status: OfficialAppointmentStatus): string {
  return OFFICIAL_STATUS_CONFIG[status].icon;
}

export function getStatusColor(status: OfficialAppointmentStatus): string {
  return OFFICIAL_STATUS_CONFIG[status].backgroundColor;
}

export function isStatusOperational(status: OfficialAppointmentStatus): boolean {
  return OFFICIAL_STATUS_CONFIG[status].isOperational;
}

export function isStatusFinalized(status: OfficialAppointmentStatus): boolean {
  return OFFICIAL_STATUS_CONFIG[status].isFinalized;
}

export function canEditAppointmentInStatus(
  status: OfficialAppointmentStatus
): boolean {
  return OFFICIAL_STATUS_CONFIG[status].canEdit;
}

export function blocksEditingInStatus(
  status: OfficialAppointmentStatus
): boolean {
  return OFFICIAL_STATUS_CONFIG[status].blocksCriticalEdit || false;
}

export function generatesFinancialInStatus(
  status: OfficialAppointmentStatus
): boolean {
  return OFFICIAL_STATUS_CONFIG[status].generatesFinancial;
}

export function receptionUnlockedInStatus(
  status: OfficialAppointmentStatus
): boolean {
  return OFFICIAL_STATUS_CONFIG[status].receptionUnlocked || false;
}

// ============================================================================
// 6. BACKWARD COMPATIBILITY MAPPING
// ============================================================================

/**
 * Mapeia status antigos para novos status oficiais
 * Garante compatibilidade com dados legados
 */
export const LEGACY_TO_OFFICIAL_STATUS_MAP: Record<string, OfficialAppointmentStatus> = {
  // Mapeamento de status antigos
  'scheduled': 'scheduled',
  'agendado': 'scheduled',
  
  'confirmed': 'confirmed',
  'confirmado': 'confirmed',
  'confirmed_phone': 'confirmed',
  'confirmed_whatsapp': 'confirmed',
  'at_reception': 'checked_in',
  'na_recepcao': 'checked_in',
  
  'awaiting_professional': 'waiting',
  'aguardando_profissional': 'waiting',
  
  'in_service': 'in_progress',
  'em_atendimento': 'in_progress',
  
  'attended': 'completed',
  'atendido': 'completed',
  'completed': 'completed',
  'completo': 'completed',
  
  'cancelled': 'cancelled',
  'cancelado': 'cancelled',
  
  'no_show': 'no_show',
  'faltou': 'no_show',
};

/**
 * Converte status legado para oficial
 */
export function convertLegacyToOfficialStatus(
  legacyStatus: string
): OfficialAppointmentStatus {
  const normalized = legacyStatus?.toLowerCase().trim() || '';
  return LEGACY_TO_OFFICIAL_STATUS_MAP[normalized] || 'scheduled';
}

// ============================================================================
// 7. EXPORT DEFAULT
// ============================================================================

export default {
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
};
