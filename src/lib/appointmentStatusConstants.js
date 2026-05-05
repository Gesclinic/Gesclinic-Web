/**
 * SISTEMA OFICIAL DE STATUS DO GESCLINIC
 * Modelo completo com 15 statuses, 3 categorias, regras inteligentes
 * Versão: 2.0 - Status Model Pro
 */

// ============================================================================
// 1. CATEGORIAS DE STATUS
// ============================================================================

/**
 * 🟦 Status de Agendamento (antes do atendimento)
 * Usados pela recepção / call center / agenda
 */
export const BOOKING_STATUSES = {
  SCHEDULED: 'scheduled', // 🗓️ Agendado
  CONFIRMED_PHONE: 'confirmed_phone', // ☎️ Confirmado via Telefone
  CONFIRMED_WHATSAPP: 'confirmed_whatsapp', // 💬 Confirmado via WhatsApp
  CONFIRMED: 'confirmed', // ✅ Confirmado (genérico)
  AT_RECEPTION: 'at_reception', // 📍 Na Recepção (Check-in realizado)
  AT_CHECKOUT: 'at_checkout', // 🪟 No Guichê (Validação de dados obrigatórios)
  SQUEEZEIN: 'squeezein', // 👉 Encaixe
  AWAITING_INSURANCE: 'awaiting_insurance', // 🧡 Aguardando Convênio
  BLOCKED: 'blocked', // 🔒 Bloqueado
};

/**
 * 🟨 Status de Atendimento (durante / após)
 * Usados pela recepção e profissional
 */
export const SERVICE_STATUSES = {
  AWAITING_PROFESSIONAL: 'awaiting_professional', // 👨‍⚕️ Aguardando Profissional
  IN_SERVICE: 'in_service', // ⏳ Em Atendimento
  ATTENDED: 'attended', // ✔️ Atendido
  NO_SHOW: 'no_show', // ❌ Faltou
  CANCELED: 'canceled', // 🚫 Cancelado
};

/**
 * 🟦 Status de Gestão (ações pós atendimento)
 */
export const MANAGEMENT_STATUSES = {
  RESCHEDULED: 'rescheduled', // 📅 Remarcado
};

/**
 * 🟥 Status Financeiro / Faturamento
 * ⚠️ NÃO aparecem no modal de recepção, apenas no módulo Financeiro
 */
export const FINANCIAL_STATUSES = {
  AWAITING_BILLING: 'awaiting_billing', // Aguardando Faturamento
  BILLED: 'billed', // Faturado
  DENIED: 'denied', // Glosado
  PAID: 'paid', // Pago
  RESUBMITTED: 'resubmitted', // Reapresentado
  NOT_BILLABLE: 'not_billable', // Perda / Não faturável
};

/**
 * TODOS os statuses do sistema (completo)
 */
export const ALL_APPOINTMENT_STATUSES = {
  ...BOOKING_STATUSES,
  ...SERVICE_STATUSES,
  ...MANAGEMENT_STATUSES,
  ...FINANCIAL_STATUSES,
};

/**
 * ✅ BACKWARD COMPATIBILITY - Alias para código antigo
 * Use BOOKING_STATUSES ou SERVICE_STATUSES em código novo
 */
export const APPOINTMENT_STATUSES = {
  SCHEDULED: BOOKING_STATUSES.SCHEDULED,
  DONE: SERVICE_STATUSES.ATTENDED,
  NO_SHOW: SERVICE_STATUSES.NO_SHOW,
  CANCELED: SERVICE_STATUSES.CANCELED,
};

// ============================================================================
// 2. STATUS VISÍVEIS NO MODAL PARA RECEPÇÃO (9 operacionais)
// ============================================================================

export const MODAL_VISIBLE_STATUSES = [
  BOOKING_STATUSES.SCHEDULED, // 🗓️ Agendado
  BOOKING_STATUSES.CONFIRMED_PHONE, // ☎️ Confirmado via Telefone
  BOOKING_STATUSES.CONFIRMED_WHATSAPP, // 💬 Confirmado via WhatsApp
  BOOKING_STATUSES.CONFIRMED, // ✅ Confirmado
  BOOKING_STATUSES.AT_RECEPTION, // 📍 Na Recepção
  BOOKING_STATUSES.AT_CHECKOUT, // 🪟 No Guichê
  SERVICE_STATUSES.AWAITING_PROFESSIONAL, // 👨‍⚕️ Aguardando Profissional
  SERVICE_STATUSES.IN_SERVICE, // ⏳ Em Atendimento
  SERVICE_STATUSES.ATTENDED, // ✔️ Atendido
  SERVICE_STATUSES.NO_SHOW, // ❌ Faltou
  SERVICE_STATUSES.CANCELED, // 🚫 Cancelado
  MANAGEMENT_STATUSES.RESCHEDULED, // 📅 Remarcado
];

// ============================================================================
// 3. CONFIGURAÇÃO DE COR, ÍCONE E LABEL
// ============================================================================

export const STATUS_CONFIG = {
  // 🟦 BOOKING STATUSES
  [BOOKING_STATUSES.SCHEDULED]: {
    label: 'Agendado',
    icon: '🗓️',
    description: 'Criado na agenda, ainda não confirmado pelo paciente',
    color: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    badgeColor: 'bg-blue-500',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 1,
  },
  [BOOKING_STATUSES.CONFIRMED_PHONE]: {
    label: 'Confirmado via Telefone',
    icon: '☎️',
    description: 'Paciente confirmou presença por telefone',
    color: 'bg-cyan-100',
    textColor: 'text-cyan-800',
    borderColor: 'border-cyan-300',
    badgeColor: 'bg-cyan-500',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 1.5,
  },
  [BOOKING_STATUSES.CONFIRMED_WHATSAPP]: {
    label: 'Confirmado via WhatsApp',
    icon: '💬',
    description: 'Paciente confirmou presença via WhatsApp',
    color: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    badgeColor: 'bg-green-500',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 1.7,
  },
  [BOOKING_STATUSES.CONFIRMED]: {
    label: 'Confirmado',
    icon: '✅',
    description: 'Paciente confirmou presença (reduz no-show)',
    color: 'bg-blue-200',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-400',
    badgeColor: 'bg-blue-600',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 2,
  },
  [BOOKING_STATUSES.AT_RECEPTION]: {
    label: 'Na Recepção',
    icon: '📍',
    description: 'Paciente chegou e foi fazer check-in na recepção',
    color: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    badgeColor: 'bg-yellow-500',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 2.5,
  },
  [BOOKING_STATUSES.AT_CHECKOUT]: {
    label: 'No Guichê',
    icon: '🪟',
    description: 'Paciente no guichê (validando dados obrigatórios)',
    color: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    badgeColor: 'bg-orange-500',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 2.7,
  },
  [BOOKING_STATUSES.SQUEEZEIN]: {
    label: 'Encaixe',
    icon: '👉',
    description: 'Atendimento fora da agenda padrão (importante para auditoria)',
    color: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    badgeColor: 'bg-yellow-500',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 3,
  },
  [BOOKING_STATUSES.AWAITING_INSURANCE]: {
    label: 'Aguardando Convênio',
    icon: '🧡',
    description: 'Depende de autorização (não conta como produção)',
    color: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    badgeColor: 'bg-orange-500',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 4,
  },
  [BOOKING_STATUSES.BLOCKED]: {
    label: 'Bloqueado',
    icon: '🔒',
    description: 'Horário indisponível (feriado, manutenção, decisão interna)',
    color: 'bg-slate-400',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-500',
    badgeColor: 'bg-slate-600',
    badgeTextColor: 'text-white',
    category: 'booking',
    priority: 5,
  },

  // 🟨 SERVICE STATUSES
  [SERVICE_STATUSES.AWAITING_PROFESSIONAL]: {
    label: 'Aguardando Profissional',
    icon: '👨‍⚕️',
    description: 'Paciente na recepção, aguardando profissional atender',
    color: 'bg-cyan-100',
    textColor: 'text-cyan-800',
    borderColor: 'border-cyan-300',
    badgeColor: 'bg-cyan-500',
    badgeTextColor: 'text-white',
    category: 'service',
    priority: 5.5,
  },
  [SERVICE_STATUSES.IN_SERVICE]: {
    label: 'Em Atendimento',
    icon: '⏳',
    description: 'Paciente chegou, atendimento em andamento',
    color: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    badgeColor: 'bg-purple-500',
    badgeTextColor: 'text-white',
    category: 'service',
    priority: 6,
  },
  [SERVICE_STATUSES.ATTENDED]: {
    label: 'Atendido',
    icon: '✔️',
    description: 'Atendimento realizado (base para faturamento)',
    color: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    badgeColor: 'bg-green-500',
    badgeTextColor: 'text-white',
    category: 'service',
    priority: 7,
    isFinalized: true,
  },
  [SERVICE_STATUSES.NO_SHOW]: {
    label: 'Faltou',
    icon: '❌',
    description: 'Paciente não compareceu (indicador crítico de gestão)',
    color: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    badgeColor: 'bg-red-500',
    badgeTextColor: 'text-white',
    category: 'service',
    priority: 8,
    isFinalized: true,
  },
  [SERVICE_STATUSES.CANCELED]: {
    label: 'Cancelado',
    icon: '🚫',
    description: 'Cancelado antes do atendimento (não gera faturamento)',
    color: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
    badgeColor: 'bg-gray-500',
    badgeTextColor: 'text-white',
    category: 'service',
    priority: 9,
    isFinalized: true,
  },

  // � MANAGEMENT STATUSES
  [MANAGEMENT_STATUSES.RESCHEDULED]: {
    label: 'Remarcado',
    icon: '📅',
    description: 'Agendamento foi remarcado para outra data/horário',
    color: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    badgeColor: 'bg-orange-500',
    badgeTextColor: 'text-white',
    category: 'management',
    priority: 10,
  },

  // �🟥 FINANCIAL STATUSES (não visível no modal da recepção)
  [FINANCIAL_STATUSES.AWAITING_BILLING]: {
    label: 'Aguardando Faturamento',
    icon: '📋',
    description: 'Pronto para ser faturado',
    color: 'bg-indigo-100',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-300',
    badgeColor: 'bg-indigo-500',
    badgeTextColor: 'text-white',
    category: 'financial',
    priority: 11,
  },
  [FINANCIAL_STATUSES.BILLED]: {
    label: 'Faturado',
    icon: '📄',
    description: 'Já foi faturado',
    color: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    badgeColor: 'bg-green-500',
    badgeTextColor: 'text-white',
    category: 'financial',
    priority: 12,
  },
  [FINANCIAL_STATUSES.DENIED]: {
    label: 'Glosado',
    icon: '❌',
    description: 'Faturamento recusado pela operadora',
    color: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    badgeColor: 'bg-red-500',
    badgeTextColor: 'text-white',
    category: 'financial',
    priority: 13,
  },
  [FINANCIAL_STATUSES.PAID]: {
    label: 'Pago',
    icon: '💰',
    description: 'Faturamento já foi pago',
    color: 'bg-green-200',
    textColor: 'text-green-900',
    borderColor: 'border-green-400',
    badgeColor: 'bg-green-600',
    badgeTextColor: 'text-white',
    category: 'financial',
    priority: 14,
  },
  [FINANCIAL_STATUSES.RESUBMITTED]: {
    label: 'Reapresentado',
    icon: '🔄',
    description: 'Faturamento foi reapresentado após glosa',
    color: 'bg-cyan-100',
    textColor: 'text-cyan-800',
    borderColor: 'border-cyan-300',
    badgeColor: 'bg-cyan-500',
    badgeTextColor: 'text-white',
    category: 'financial',
    priority: 15,
  },
  [FINANCIAL_STATUSES.NOT_BILLABLE]: {
    label: 'Perda / Não Faturável',
    icon: '⚠️',
    description: 'Não será faturado',
    color: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    badgeColor: 'bg-slate-500',
    badgeTextColor: 'text-white',
    category: 'financial',
    priority: 16,
  },
};

// ============================================================================
// 4. REGRAS INTELIGENTES (SMART TRANSITIONS)
// ============================================================================

/**
 * Valida se uma transição de status é permitida
 * ✅ Agendado → Confirmado, Em Atendimento, Cancelado
 * ❌ Compareceu → Não pode voltar (é final)
 * ❌ Faturado → Não pode virar Cancelado
 */
export const STATUS_TRANSITIONS = {
  [BOOKING_STATUSES.SCHEDULED]: {
    canTransitionTo: [
      BOOKING_STATUSES.CONFIRMED,
      SERVICE_STATUSES.IN_SERVICE,
      SERVICE_STATUSES.CANCELED,
      BOOKING_STATUSES.AWAITING_INSURANCE,
    ],
    description:
      'Agendado pode ir para: Confirmado, Em Atendimento, Cancelado, Aguardando Convênio',
  },
  [BOOKING_STATUSES.CONFIRMED]: {
    canTransitionTo: [
      BOOKING_STATUSES.SCHEDULED,
      SERVICE_STATUSES.IN_SERVICE,
      SERVICE_STATUSES.CANCELED,
    ],
    description: 'Confirmado pode voltar para Agendado ou ir para Em Atendimento/Cancelado',
  },
  [BOOKING_STATUSES.SQUEEZEIN]: {
    canTransitionTo: [SERVICE_STATUSES.IN_SERVICE, SERVICE_STATUSES.CANCELED],
    description: 'Encaixe pode ir para Em Atendimento ou Cancelado',
  },
  [BOOKING_STATUSES.AWAITING_INSURANCE]: {
    canTransitionTo: [BOOKING_STATUSES.SCHEDULED, SERVICE_STATUSES.CANCELED],
    description: 'Aguardando Convênio pode voltar para Agendado ou Cancelado',
  },
  [BOOKING_STATUSES.BLOCKED]: {
    canTransitionTo: [BOOKING_STATUSES.SCHEDULED],
    description: 'Bloqueado pode ser liberado manualmente',
  },
  [SERVICE_STATUSES.IN_SERVICE]: {
    canTransitionTo: [
      SERVICE_STATUSES.ATTENDED,
      SERVICE_STATUSES.NO_SHOW,
      SERVICE_STATUSES.CANCELED,
    ],
    description: 'Em Atendimento pode ir para: Compareceu, Faltou, Cancelado',
  },
  // Final states - não podem mudar
  [SERVICE_STATUSES.ATTENDED]: {
    canTransitionTo: [FINANCIAL_STATUSES.AWAITING_BILLING],
    description: '🔒 Compareceu é final (não pode reverter para status anterior)',
    isFinalized: true,
  },
  [SERVICE_STATUSES.NO_SHOW]: {
    canTransitionTo: [],
    description: '🔒 Faltou é final (não pode mudar)',
    isFinalized: true,
  },
  [SERVICE_STATUSES.CANCELED]: {
    canTransitionTo: [],
    description: '🔒 Cancelado é final (não pode mudar)',
    isFinalized: true,
  },
};

/**
 * Verifica se uma transição é válida
 */
export function canTransitionTo(fromStatus, toStatus) {
  // Se saindo de um status finalized, não permite
  if (STATUS_CONFIG[fromStatus]?.isFinalized) {
    return false;
  }

  const transitions = STATUS_TRANSITIONS[fromStatus];
  if (!transitions) {
    return true;
  } // Se não há regra, permite

  return transitions.canTransitionTo.includes(toStatus);
}

// ============================================================================
// 5. HELPER FUNCTIONS
// ============================================================================

/**
 * Obter configuração de status
 */
export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG[BOOKING_STATUSES.SCHEDULED];
}

/**
 * Obter label de status com ícone
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
 * Badge semelhante ao StatusBadge component
 */
export function getStatusBadge(status) {
  const config = getStatusConfig(status);
  return {
    label: config.label,
    icon: config.icon,
    color: `${config.badgeColor} ${config.badgeTextColor}`,
  };
}

/**
 * Verificar se é status finalized
 */
export function isStatusFinalized(status) {
  return STATUS_CONFIG[status]?.isFinalized || false;
}

/**
 * Verificar se é status financeiro
 */
export function isFinancialStatus(status) {
  return [
    FINANCIAL_STATUSES.AWAITING_BILLING,
    FINANCIAL_STATUSES.BILLED,
    FINANCIAL_STATUSES.DENIED,
    FINANCIAL_STATUSES.PAID,
    FINANCIAL_STATUSES.RESUBMITTED,
    FINANCIAL_STATUSES.NOT_BILLABLE,
  ].includes(status);
}

// ============================================================================
// 6. STATUS OPTIONS ARRAYS
// ============================================================================

/**
 * Status visíveis no modal para recepção (6 operacionais)
 */
export const MODAL_STATUS_OPTIONS = MODAL_VISIBLE_STATUSES.map((status) => ({
  value: status,
  label: STATUS_CONFIG[status].label,
  icon: STATUS_CONFIG[status].icon,
}));

/**
 * Todos os status disponíveis no sistema (para admin/dev)
 */
export const ALL_STATUS_OPTIONS = Object.entries(ALL_APPOINTMENT_STATUSES).map(([key, value]) => ({
  value,
  label: STATUS_CONFIG[value].label,
  icon: STATUS_CONFIG[value].icon,
  category: STATUS_CONFIG[value].category,
}));

/**
 * Status de booking apenas
 */
export const BOOKING_STATUS_OPTIONS = Object.values(BOOKING_STATUSES).map((status) => ({
  value: status,
  label: STATUS_CONFIG[status].label,
  icon: STATUS_CONFIG[status].icon,
}));

/**
 * Status de serviço apenas
 */
export const SERVICE_STATUS_OPTIONS = Object.values(SERVICE_STATUSES).map((status) => ({
  value: status,
  label: STATUS_CONFIG[status].label,
  icon: STATUS_CONFIG[status].icon,
}));

// ============================================================================
// 5. FUNÇÕES DE VALIDAÇÃO DE TRANSIÇÃO E DADOS OBRIGATÓRIOS
// ============================================================================

/**
 * Valida dados obrigatórios para diferentes estágios
 * @param {string} status - Status alvo
 * @param {object} patientData - Dados do paciente
 * @returns {array} Array de campos faltantes
 */
export function validatePatientDataForStatus(status, patientData = {}) {
  const missingFields = [];

  // 🪟 NO GUICHÊ: nome e CPF obrigatórios
  if (status === BOOKING_STATUSES.AT_CHECKOUT) {
    if (!patientData.name?.trim()) {
      missingFields.push('Nome Completo');
    }
    if (!patientData.document_id?.trim()) {
      missingFields.push('CPF/RG');
    }
  }

  // 👨‍⚕️ AGUARDANDO PROFISSIONAL: nome e CPF obrigatórios
  if (status === SERVICE_STATUSES.AWAITING_PROFESSIONAL) {
    if (!patientData.name?.trim()) {
      missingFields.push('Nome Completo');
    }
    if (!patientData.document_id?.trim()) {
      missingFields.push('CPF/RG');
    }
  }

  return missingFields;
}

/**
 * Valida se uma transição de status é permitida
 * @param {string} fromStatus - Status atual
 * @param {string} toStatus - Status desejado
 * @returns {object} { allowed: boolean, reason: string }
 */
export function isStatusTransitionAllowed(fromStatus, toStatus) {
  // Mapa de transições permitidas
  const allowedTransitions = {
    [BOOKING_STATUSES.SCHEDULED]: [
      BOOKING_STATUSES.CONFIRMED_PHONE,
      BOOKING_STATUSES.CONFIRMED_WHATSAPP,
      BOOKING_STATUSES.CONFIRMED,
      BOOKING_STATUSES.AT_RECEPTION,
      SERVICE_STATUSES.NO_SHOW,
      SERVICE_STATUSES.CANCELED,
      MANAGEMENT_STATUSES.RESCHEDULED,
    ],
    [BOOKING_STATUSES.CONFIRMED_PHONE]: [
      BOOKING_STATUSES.AT_RECEPTION,
      BOOKING_STATUSES.CONFIRMED,
      SERVICE_STATUSES.NO_SHOW,
      SERVICE_STATUSES.CANCELED,
      MANAGEMENT_STATUSES.RESCHEDULED,
    ],
    [BOOKING_STATUSES.CONFIRMED_WHATSAPP]: [
      BOOKING_STATUSES.AT_RECEPTION,
      BOOKING_STATUSES.CONFIRMED,
      SERVICE_STATUSES.NO_SHOW,
      SERVICE_STATUSES.CANCELED,
      MANAGEMENT_STATUSES.RESCHEDULED,
    ],
    [BOOKING_STATUSES.CONFIRMED]: [
      BOOKING_STATUSES.AT_RECEPTION,
      SERVICE_STATUSES.NO_SHOW,
      SERVICE_STATUSES.CANCELED,
      MANAGEMENT_STATUSES.RESCHEDULED,
    ],
    [BOOKING_STATUSES.AT_RECEPTION]: [
      BOOKING_STATUSES.AT_CHECKOUT,
      SERVICE_STATUSES.NO_SHOW,
      SERVICE_STATUSES.CANCELED,
    ],
    [BOOKING_STATUSES.AT_CHECKOUT]: [
      SERVICE_STATUSES.AWAITING_PROFESSIONAL,
      SERVICE_STATUSES.NO_SHOW,
      SERVICE_STATUSES.CANCELED,
    ],
    [SERVICE_STATUSES.AWAITING_PROFESSIONAL]: [
      SERVICE_STATUSES.IN_SERVICE,
      SERVICE_STATUSES.NO_SHOW,
      SERVICE_STATUSES.CANCELED,
    ],
    [SERVICE_STATUSES.IN_SERVICE]: [SERVICE_STATUSES.ATTENDED, SERVICE_STATUSES.NO_SHOW],
    [SERVICE_STATUSES.ATTENDED]: [FINANCIAL_STATUSES.AWAITING_BILLING],
  };

  const allowed = allowedTransitions[fromStatus]?.includes(toStatus) ?? false;

  if (!allowed) {
    return {
      allowed: false,
      reason: `Transição de '${STATUS_CONFIG[fromStatus]?.label}' para '${STATUS_CONFIG[toStatus]?.label}' não permitida`,
    };
  }

  return { allowed: true };
}

/**
 * Obtém ícone formatado + label para um status
 */
export function getFormattedStatus(status) {
  const config = STATUS_CONFIG[status];
  return config ? `${config.icon} ${config.label}` : status;
}
// ============================================================================
// 7. BACKWARD COMPATIBILITY (old → new mapping)
// ============================================================================

/**
 * Map de status antigos para novos para compatibilidade
 */
export const STATUS_MIGRATION_MAP = {
  scheduled: BOOKING_STATUSES.SCHEDULED,
  agendado: BOOKING_STATUSES.SCHEDULED,
  confirmado: BOOKING_STATUSES.CONFIRMED,
  confirmed: BOOKING_STATUSES.CONFIRMED,
  presente: BOOKING_STATUSES.AT_RECEPTION, // Check-in: marca como na recepção
  at_reception: BOOKING_STATUSES.AT_RECEPTION,
  na_recepcao: BOOKING_STATUSES.AT_RECEPTION,
  liberado_para_atendimento: SERVICE_STATUSES.AWAITING_PROFESSIONAL, // Released for care
  aguardando_profissional: SERVICE_STATUSES.AWAITING_PROFESSIONAL,
  awaiting_professional: SERVICE_STATUSES.AWAITING_PROFESSIONAL,
  pronto_atendimento: SERVICE_STATUSES.IN_SERVICE,
  em_atendimento: SERVICE_STATUSES.IN_SERVICE,
  in_service: SERVICE_STATUSES.IN_SERVICE,
  done: SERVICE_STATUSES.ATTENDED,
  compareceu: SERVICE_STATUSES.ATTENDED,
  atendido: SERVICE_STATUSES.ATTENDED,
  attended: SERVICE_STATUSES.ATTENDED,
  finalizado: SERVICE_STATUSES.ATTENDED,
  no_show: SERVICE_STATUSES.NO_SHOW,
  faltou: SERVICE_STATUSES.NO_SHOW,
  cancelado: SERVICE_STATUSES.CANCELED,
  canceled: SERVICE_STATUSES.CANCELED,
  remarcado: MANAGEMENT_STATUSES.RESCHEDULED,
  rescheduled: MANAGEMENT_STATUSES.RESCHEDULED,
};

/**
 * Converter status antigo para novo
 */
export function migrateStatus(oldStatus) {
  const newStatus = STATUS_MIGRATION_MAP[oldStatus?.toLowerCase()];
  return newStatus || BOOKING_STATUSES.SCHEDULED;
}
