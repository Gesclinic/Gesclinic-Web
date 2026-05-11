/**
 * 🎯 SISTEMA OFICIAL DE STATUS - AGENDA GESCLINIC 2026
 * ====================================================
 *
 * Fluxo operacional profissional com 8 status principais
 * Compatibilidade total com sistema legado
 * Integração segura com módulo financeiro
 *
 * FLUXO OPERACIONAL:
 *   scheduled (Agendado)
 *   ↓
 *   confirmed (Confirmado)
 *   ↓
 *   checked_in (Check-in realizado na recepção)
 *   ↓
 *   waiting (Aguardando atendimento)
 *   ↓
 *   in_progress (Em atendimento)
 *   ↓
 *   completed (Finalizado - GATILHO FINANCEIRO)
 *
 *   LATERAIS:
 *   - cancelled (Cancelado - NÃO entra financeiro)
 *   - no_show (Faltou - Não conta como produção)
 */

// ============================================================================
// 1. ENUM DE STATUS OFICIAIS (8)
// ============================================================================

export const APPOINTMENT_STATUS_OFFICIAL = {
  // Fluxo normal
  SCHEDULED: 'scheduled', // 🗓️ Agendado (criado na agenda)
  CONFIRMED: 'confirmed', // ✅ Confirmado (paciente confirmou)
  CHECKED_IN: 'checked_in', // 📍 Check-in (chegou na recepção)
  WAITING: 'waiting', // ⏳ Aguardando (na fila de atendimento)
  IN_PROGRESS: 'in_progress', // 🔄 Em atendimento (começou a ser atendido)
  COMPLETED: 'completed', // ✔️ Completo (finalizado - ENTRA FINANCEIRO)

  // Finais alternativos
  CANCELLED: 'cancelled', // 🚫 Cancelado (não entra financeiro)
  NO_SHOW: 'no_show', // ❌ Falta (não conta como produção)
};

// ============================================================================
// 2. MAPEAMENTO DE COMPATIBILIDADE RETROATIVA
// ============================================================================

/**
 * Mapeia status antigos para os 8 novos status
 * Garante que dados legados continuam funcionando
 */
export const STATUS_LEGACY_MAP = {
  // De appointmentStatusEnums.js
  agendado: APPOINTMENT_STATUS_OFFICIAL.SCHEDULED,
  confirmado: APPOINTMENT_STATUS_OFFICIAL.CONFIRMED,
  aguardando: APPOINTMENT_STATUS_OFFICIAL.WAITING,
  pendente: APPOINTMENT_STATUS_OFFICIAL.WAITING,
  'financeiro_pendente': APPOINTMENT_STATUS_OFFICIAL.WAITING,
  'liberado_para_atendimento': APPOINTMENT_STATUS_OFFICIAL.WAITING,
  'em_atendimento': APPOINTMENT_STATUS_OFFICIAL.IN_PROGRESS,
  finalizado: APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
  falta: APPOINTMENT_STATUS_OFFICIAL.NO_SHOW,
  cancelado: APPOINTMENT_STATUS_OFFICIAL.CANCELLED,
  remarcado: APPOINTMENT_STATUS_OFFICIAL.SCHEDULED,

  // De appointmentStatusConstants.js - BOOKING_STATUSES
  confirmed_phone: APPOINTMENT_STATUS_OFFICIAL.CONFIRMED,
  confirmed_whatsapp: APPOINTMENT_STATUS_OFFICIAL.CONFIRMED,
  at_reception: APPOINTMENT_STATUS_OFFICIAL.CHECKED_IN,
  at_checkout: APPOINTMENT_STATUS_OFFICIAL.CHECKED_IN,
  squeezein: APPOINTMENT_STATUS_OFFICIAL.SCHEDULED,
  awaiting_insurance: APPOINTMENT_STATUS_OFFICIAL.WAITING,
  blocked: APPOINTMENT_STATUS_OFFICIAL.SCHEDULED,

  // De appointmentStatusConstants.js - SERVICE_STATUSES
  awaiting_professional: APPOINTMENT_STATUS_OFFICIAL.WAITING,
  in_service: APPOINTMENT_STATUS_OFFICIAL.IN_PROGRESS,
  attended: APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
  canceled: APPOINTMENT_STATUS_OFFICIAL.CANCELLED,

  // De appointmentStatusConstants.js - MANAGEMENT_STATUSES
  rescheduled: APPOINTMENT_STATUS_OFFICIAL.SCHEDULED,

  // De appointmentStatusConstants.js - FINANCIAL_STATUSES
  awaiting_billing: APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
  billed: APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
  denied: APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
  paid: APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
  resubmitted: APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
  not_billable: APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
};

/**
 * Normaliza qualquer status para um dos 8 oficiais
 * @param {string} legacyStatus - Status anterior (qualquer um)
 * @returns {string} Um dos 8 status oficiais ou 'scheduled' por padrão
 */
export function normalizeToOfficialStatus(legacyStatus) {
  if (!legacyStatus) return APPOINTMENT_STATUS_OFFICIAL.SCHEDULED;

  const normalized = String(legacyStatus).toLowerCase().trim();
  const mapped = STATUS_LEGACY_MAP[normalized];

  if (mapped) return mapped;

  // Se já é um dos 8 oficiais, retorna como está
  if (Object.values(APPOINTMENT_STATUS_OFFICIAL).includes(normalized)) {
    return normalized;
  }

  // Fallback
  console.warn(`[STATUS] Status desconhecido: "${legacyStatus}", usando SCHEDULED`);
  return APPOINTMENT_STATUS_OFFICIAL.SCHEDULED;
}

// ============================================================================
// 3. CONFIGURAÇÃO DE APRESENTAÇÃO (Cores, Ícones, Labels)
// ============================================================================

export const STATUS_DISPLAY_CONFIG = {
  [APPOINTMENT_STATUS_OFFICIAL.SCHEDULED]: {
    label: 'Agendado',
    icon: '🗓️',
    badge: 'bg-blue-100 text-blue-800',
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Criado na agenda, aguardando confirmação do paciente',
    nextActions: ['confirmar', 'cancelar', 'esperar'],
  },

  [APPOINTMENT_STATUS_OFFICIAL.CONFIRMED]: {
    label: 'Confirmado',
    icon: '✅',
    badge: 'bg-cyan-100 text-cyan-800',
    color: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    description: 'Paciente confirmou presença',
    nextActions: ['check_in', 'cancelar'],
  },

  [APPOINTMENT_STATUS_OFFICIAL.CHECKED_IN]: {
    label: 'Check-in',
    icon: '📍',
    badge: 'bg-green-100 text-green-800',
    color: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Paciente chegou e fez check-in na recepção',
    nextActions: ['waiting', 'cancelar'],
  },

  [APPOINTMENT_STATUS_OFFICIAL.WAITING]: {
    label: 'Aguardando',
    icon: '⏳',
    badge: 'bg-yellow-100 text-yellow-800',
    color: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    description: 'Na fila de atendimento, aguardando o profissional',
    nextActions: ['in_progress', 'no_show', 'cancelar'],
  },

  [APPOINTMENT_STATUS_OFFICIAL.IN_PROGRESS]: {
    label: 'Em Atendimento',
    icon: '🔄',
    badge: 'bg-purple-100 text-purple-800',
    color: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Atendimento em andamento',
    nextActions: ['completed', 'no_show'],
  },

  [APPOINTMENT_STATUS_OFFICIAL.COMPLETED]: {
    label: 'Completo',
    icon: '✔️',
    badge: 'bg-emerald-100 text-emerald-800',
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Atendimento finalizado (ENTRA FINANCEIRO)',
    nextActions: [],
    isFinalized: true,
    triggersFinancial: true,
  },

  [APPOINTMENT_STATUS_OFFICIAL.CANCELLED]: {
    label: 'Cancelado',
    icon: '🚫',
    badge: 'bg-gray-100 text-gray-800',
    color: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Cancelado antes do atendimento (NÃO entra financeiro)',
    nextActions: [],
    isFinalized: true,
    triggersFinancial: false,
  },

  [APPOINTMENT_STATUS_OFFICIAL.NO_SHOW]: {
    label: 'Falta',
    icon: '❌',
    badge: 'bg-red-100 text-red-800',
    color: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Paciente não compareceu',
    nextActions: [],
    isFinalized: true,
    triggersFinancial: false,
  },
};

// ============================================================================
// 4. TRANSIÇÕES VÁLIDAS
// ============================================================================

export const STATUS_TRANSITIONS = {
  [APPOINTMENT_STATUS_OFFICIAL.SCHEDULED]: {
    canTransitionTo: [
      APPOINTMENT_STATUS_OFFICIAL.CONFIRMED,
      APPOINTMENT_STATUS_OFFICIAL.CHECKED_IN,
      APPOINTMENT_STATUS_OFFICIAL.CANCELLED,
      APPOINTMENT_STATUS_OFFICIAL.NO_SHOW,
    ],
    blockEditFields: [],
    description: 'Pode ser confirmado, fazer check-in direto, ou cancelado',
  },

  [APPOINTMENT_STATUS_OFFICIAL.CONFIRMED]: {
    canTransitionTo: [
      APPOINTMENT_STATUS_OFFICIAL.SCHEDULED,
      APPOINTMENT_STATUS_OFFICIAL.CHECKED_IN,
      APPOINTMENT_STATUS_OFFICIAL.CANCELLED,
    ],
    blockEditFields: [],
    description: 'Pode voltar para agendado, fazer check-in, ou cancelar',
  },

  [APPOINTMENT_STATUS_OFFICIAL.CHECKED_IN]: {
    canTransitionTo: [
      APPOINTMENT_STATUS_OFFICIAL.WAITING,
      APPOINTMENT_STATUS_OFFICIAL.CANCELLED,
      APPOINTMENT_STATUS_OFFICIAL.NO_SHOW,
    ],
    blockEditFields: [], // Check-in pode editar dados ainda
    description: 'Pode ir para fila, cancelar, ou marcar falta',
  },

  [APPOINTMENT_STATUS_OFFICIAL.WAITING]: {
    canTransitionTo: [
      APPOINTMENT_STATUS_OFFICIAL.IN_PROGRESS,
      APPOINTMENT_STATUS_OFFICIAL.NO_SHOW,
      APPOINTMENT_STATUS_OFFICIAL.CANCELLED,
    ],
    blockEditFields: ['patientId', 'professionalId'], // Não pode trocar paciente/prof
    description: 'Pode começar atendimento, marcar falta, ou cancelar',
  },

  [APPOINTMENT_STATUS_OFFICIAL.IN_PROGRESS]: {
    canTransitionTo: [
      APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
      APPOINTMENT_STATUS_OFFICIAL.NO_SHOW,
    ],
    blockEditFields: ['patientId', 'professionalId', 'scheduledDate', 'scheduledTime'],
    description: 'Pode finalizar ou marcar falta (não pode editar dados críticos)',
  },

  // Estados finais - não podem transicionar
  [APPOINTMENT_STATUS_OFFICIAL.COMPLETED]: {
    canTransitionTo: [],
    blockEditFields: ['patientId', 'professionalId', 'scheduledDate', 'scheduledTime'],
    description: 'FINAL: Não pode mudar. Edição bloqueada para dados críticos.',
    isFinalized: true,
  },

  [APPOINTMENT_STATUS_OFFICIAL.CANCELLED]: {
    canTransitionTo: [],
    blockEditFields: ['patientId', 'professionalId', 'scheduledDate', 'scheduledTime'],
    description: 'FINAL: Cancelado, sem transições possíveis',
    isFinalized: true,
  },

  [APPOINTMENT_STATUS_OFFICIAL.NO_SHOW]: {
    canTransitionTo: [],
    blockEditFields: ['patientId', 'professionalId', 'scheduledDate', 'scheduledTime'],
    description: 'FINAL: Não compareceu, sem transições possíveis',
    isFinalized: true,
  },
};

// ============================================================================
// 5. REGRAS DE NEGÓCIO
// ============================================================================

/**
 * Determina se uma transição de status é válida
 */
export function isValidTransition(fromStatus, toStatus) {
  // Se toStatus não existe, é inválido
  if (!Object.values(APPOINTMENT_STATUS_OFFICIAL).includes(toStatus)) {
    console.warn(`[STATUS] Status destino inválido: ${toStatus}`);
    return false;
  }

  const transition = STATUS_TRANSITIONS[fromStatus];
  if (!transition) {
    console.warn(`[STATUS] Nenhuma regra de transição para: ${fromStatus}`);
    return false;
  }

  if (transition.isFinalized) {
    console.warn(`[STATUS] ${fromStatus} é final, não pode transicionar`);
    return false;
  }

  return transition.canTransitionTo.includes(toStatus);
}

/**
 * Retorna quais campos estão bloqueados para edição em um status
 */
export function getBlockedEditFields(status) {
  return STATUS_TRANSITIONS[status]?.blockEditFields || [];
}

/**
 * Verifica se um campo pode ser editado em um status
 */
export function canEditField(status, fieldName) {
  const blocked = getBlockedEditFields(status);
  return !blocked.includes(fieldName);
}

/**
 * Verifica se o status é final (não permite transição)
 */
export function isStatusFinalized(status) {
  return STATUS_TRANSITIONS[status]?.isFinalized || false;
}

/**
 * Verifica se o status deve disparar integração financeira
 * IMPORTANTE: Apenas 'completed' dispara financeiro
 */
export function shouldTriggerFinancial(status) {
  const config = STATUS_DISPLAY_CONFIG[status];
  return config?.triggersFinancial === true;
}

/**
 * Obtém o status que deve ser usado para criar receivable
 * Compatibilidade com código legado que espera 'attended' ou 'finalizado'
 */
export function getLegacyStatusForFinancial(officialStatus) {
  if (officialStatus === APPOINTMENT_STATUS_OFFICIAL.COMPLETED) {
    return 'attended'; // Para código legado
  }
  return null;
}

// ============================================================================
// 6. FUNÇÕES AUXILIARES DE APRESENTAÇÃO
// ============================================================================

/**
 * Obter configuração completa de display do status
 */
export function getStatusConfig(status) {
  const normalized = normalizeToOfficialStatus(status);
  return STATUS_DISPLAY_CONFIG[normalized] || STATUS_DISPLAY_CONFIG[APPOINTMENT_STATUS_OFFICIAL.SCHEDULED];
}

/**
 * Obter label com ícone
 */
export function getStatusLabel(status) {
  const config = getStatusConfig(status);
  return `${config.icon} ${config.label}`;
}

/**
 * Obter apenas o label
 */
export function getStatusLabelOnly(status) {
  return getStatusConfig(status).label;
}

/**
 * Obter apenas o ícone
 */
export function getStatusIcon(status) {
  return getStatusConfig(status).icon;
}

/**
 * Obter classe Tailwind do badge
 */
export function getStatusBadgeClass(status) {
  return getStatusConfig(status).badge;
}

/**
 * Obter todas as transições possíveis de um status
 */
export function getPossibleTransitions(status) {
  const transitions = STATUS_TRANSITIONS[status];
  if (!transitions) return [];

  return transitions.canTransitionTo.map((toStatus) => ({
    to: toStatus,
    label: getStatusLabelOnly(toStatus),
    icon: getStatusIcon(toStatus),
  }));
}

// ============================================================================
// 7. ARRAYS DE OPÇÕES PARA SELECTS/FILTERS
// ============================================================================

export const STATUS_OPTIONS = Object.entries(APPOINTMENT_STATUS_OFFICIAL).map(([key, value]) => ({
  value,
  label: STATUS_DISPLAY_CONFIG[value].label,
  icon: STATUS_DISPLAY_CONFIG[value].icon,
  description: STATUS_DISPLAY_CONFIG[value].description,
}));

export const OPERATIONAL_FLOW_STATUSES = [
  APPOINTMENT_STATUS_OFFICIAL.SCHEDULED,
  APPOINTMENT_STATUS_OFFICIAL.CONFIRMED,
  APPOINTMENT_STATUS_OFFICIAL.CHECKED_IN,
  APPOINTMENT_STATUS_OFFICIAL.WAITING,
  APPOINTMENT_STATUS_OFFICIAL.IN_PROGRESS,
  APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
];

export const FINAL_STATUSES = [
  APPOINTMENT_STATUS_OFFICIAL.COMPLETED,
  APPOINTMENT_STATUS_OFFICIAL.CANCELLED,
  APPOINTMENT_STATUS_OFFICIAL.NO_SHOW,
];

export const ACTIVE_STATUSES = [
  APPOINTMENT_STATUS_OFFICIAL.SCHEDULED,
  APPOINTMENT_STATUS_OFFICIAL.CONFIRMED,
  APPOINTMENT_STATUS_OFFICIAL.CHECKED_IN,
  APPOINTMENT_STATUS_OFFICIAL.WAITING,
  APPOINTMENT_STATUS_OFFICIAL.IN_PROGRESS,
];

// ============================================================================
// 8. VALIDAÇÃO DE STATUS
// ============================================================================

/**
 * Valida se um status é válido no sistema oficial
 */
export function isValidStatus(status) {
  return Object.values(APPOINTMENT_STATUS_OFFICIAL).includes(status);
}

/**
 * Valida se um status é do fluxo normal (não é final alternativo)
 */
export function isNormalFlowStatus(status) {
  return OPERATIONAL_FLOW_STATUSES.includes(status);
}

/**
 * Valida se um status deveria entrar no sistema financeiro
 */
export function isFinancialEligible(status) {
  return shouldTriggerFinancial(status);
}

/**
 * Validação completa de transição com mensagem de erro
 */
export function validateTransition(fromStatus, toStatus) {
  const result = {
    valid: false,
    message: '',
    canEdit: {},
  };

  // Verifica status válidos
  if (!isValidStatus(fromStatus)) {
    result.message = `Status origem inválido: ${fromStatus}`;
    return result;
  }

  if (!isValidStatus(toStatus)) {
    result.message = `Status destino inválido: ${toStatus}`;
    return result;
  }

  // Verifica se é transição válida
  if (!isValidTransition(fromStatus, toStatus)) {
    result.message = `Transição não permitida: ${getStatusLabelOnly(fromStatus)} → ${getStatusLabelOnly(toStatus)}`;
    return result;
  }

  // Sucesso
  result.valid = true;
  result.message = `Transição válida: ${getStatusLabelOnly(fromStatus)} → ${getStatusLabelOnly(toStatus)}`;

  // Mapeia quais campos podem ser editados no novo status
  const blockedFields = getBlockedEditFields(toStatus);
  Object.keys(APPOINTMENT_STATUS_OFFICIAL).forEach((field) => {
    result.canEdit[field] = !blockedFields.includes(field);
  });

  return result;
}

// ============================================================================
// 9. HELPERS PARA COMPATIBILIDADE FINANCEIRA
// ============================================================================

/**
 * Retorna o status que deveria ter sido usado no banco legado
 * Usado ao migrar ou fazer update compatível
 */
export function getLegacyEquivalent(officialStatus) {
  // Reverse map
  for (const [legacy, official] of Object.entries(STATUS_LEGACY_MAP)) {
    if (official === officialStatus) {
      return legacy;
    }
  }
  return null;
}

/**
 * Cria um payload de atualização seguro que lida com compatibilidade
 * @param {string} newStatus - O novo status oficial
 * @returns {object} Payload para atualizar appointment na API
 */
export function createStatusUpdatePayload(newStatus) {
  return {
    status: newStatus, // Novo padrão
    legacy_status_alias: getLegacyEquivalent(newStatus), // Para compatibilidade
    updated_at: new Date().toISOString(),
  };
}

/**
 * Log estruturado de mudança de status
 */
export function logStatusChange(appointmentId, fromStatus, toStatus, reason = '') {
  const timestamp = new Date().toISOString();
  const fromConfig = getStatusConfig(fromStatus);
  const toConfig = getStatusConfig(toStatus);

  console.log(
    `[APPOINTMENT STATUS] ${timestamp} | ${appointmentId}`,
    `${fromConfig.icon} ${fromConfig.label} → ${toConfig.icon} ${toConfig.label}`,
    reason ? `| Motivo: ${reason}` : '',
  );

  // Aqui poderia estar chamando um serviço de auditoria
}

export default {
  APPOINTMENT_STATUS_OFFICIAL,
  STATUS_LEGACY_MAP,
  STATUS_DISPLAY_CONFIG,
  STATUS_TRANSITIONS,
  normalizeToOfficialStatus,
  isValidTransition,
  getBlockedEditFields,
  canEditField,
  isStatusFinalized,
  shouldTriggerFinancial,
  getLegacyStatusForFinancial,
  getStatusConfig,
  getStatusLabel,
  getStatusLabelOnly,
  getStatusIcon,
  getStatusBadgeClass,
  getPossibleTransitions,
  STATUS_OPTIONS,
  OPERATIONAL_FLOW_STATUSES,
  FINAL_STATUSES,
  ACTIVE_STATUSES,
  isValidStatus,
  isNormalFlowStatus,
  isFinancialEligible,
  validateTransition,
  getLegacyEquivalent,
  createStatusUpdatePayload,
  logStatusChange,
};
