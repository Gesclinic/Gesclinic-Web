/**
 * appointmentStatusEnums.js
 *
 * 📋 FLUXO COMPLETO DE ATENDIMENTO (END-TO-END)
 *
 * Status enum que governa todo o fluxo de agendamento,
 * recepção (check-in) e atendimento (profissional).
 *
 * FLUXO:
 *   AGENDADO
 *   → CONFIRMADO (opcional)
 *   → AGUARDANDO (no dia do agendamento)
 *     → PENDENTE (falta conferência)
 *     → FINANCEIRO_PENDENTE (falta autorização/pagamento)
 *     → LIBERADO_PARA_ATENDIMENTO ⭐ (gatilho para profissional)
 *       → EM_ATENDIMENTO (atendimento em andamento)
 *         → FINALIZADO (atendimento completo)
 *     → FALTA (paciente não apareceu)
 */

// ============================================
// 1️⃣ ENUM DE STATUS
// ============================================

export const APPOINTMENT_STATUS = {
  AGENDADO: 'agendado',
  CONFIRMADO: 'confirmado',
  AGUARDANDO: 'aguardando',
  PENDENTE: 'pendente',
  FINANCEIRO_PENDENTE: 'financeiro_pendente',
  LIBERADO_PARA_ATENDIMENTO: 'liberado_para_atendimento',
  EM_ATENDIMENTO: 'em_atendimento',
  FINALIZADO: 'finalizado',
  FALTA: 'falta',
  CANCELADO: 'cancelado',
  REMARCADO: 'remarcado',
};

// ============================================
// 2️⃣ LABELS E CORES
// ============================================

export const appointmentStatusLabels = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  aguardando: 'Aguardando',
  pendente: 'Pendência',
  financeiro_pendente: 'Financeiro Pendente',
  liberado_para_atendimento: 'Liberado para Atendimento',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
  falta: 'Falta',
  cancelado: 'Cancelado',
  remarcado: 'Remarcado',
};

export const appointmentStatusColors = {
  agendado: 'bg-blue-100 text-blue-800 border-blue-300',
  confirmado: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  aguardando: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  pendente: 'bg-orange-100 text-orange-800 border-orange-300',
  financeiro_pendente: 'bg-rose-100 text-rose-800 border-rose-300',
  liberado_para_atendimento: 'bg-green-100 text-green-800 border-green-300',
  em_atendimento: 'bg-purple-100 text-purple-800 border-purple-300',
  finalizado: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  falta: 'bg-red-100 text-red-800 border-red-300',
  cancelado: 'bg-gray-100 text-gray-800 border-gray-300',
  remarcado: 'bg-slate-100 text-slate-800 border-slate-300',
};

// ============================================
// 3️⃣ FUNÇÕES AUXILIARES
// ============================================

/**
 * Retorna o label legível do status
 */
export function getStatusLabel(status) {
  return appointmentStatusLabels[status] || status;
}

/**
 * Retorna as cores Tailwind do status
 */
export function getStatusColor(status) {
  return appointmentStatusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Verifica se o status é um status final (não pode mudar)
 */
export function isFinalStatus(status) {
  return [
    APPOINTMENT_STATUS.FINALIZADO,
    APPOINTMENT_STATUS.CANCELADO,
    APPOINTMENT_STATUS.REMARCADO,
    APPOINTMENT_STATUS.FALTA,
  ].includes(status);
}

/**
 * Verifica se o agendamento está liberado para atendimento
 */
export function isReadyForCare(status) {
  return status === APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO;
}

/**
 * Verifica se está em atendimento
 */
export function isInCare(status) {
  return status === APPOINTMENT_STATUS.EM_ATENDIMENTO;
}

/**
 * Verifica se o atendimento foi completado
 */
export function isCareCompleted(status) {
  return status === APPOINTMENT_STATUS.FINALIZADO;
}

/**
 * Verifica se o agendamento aguarda algo (recepção/financeiro)
 */
export function isPendingAction(status) {
  return [
    APPOINTMENT_STATUS.AGUARDANDO,
    APPOINTMENT_STATUS.PENDENTE,
    APPOINTMENT_STATUS.FINANCEIRO_PENDENTE,
  ].includes(status);
}

/**
 * Retorna todas as transições válidas de status
 */
export function getValidStatusTransitions(currentStatus) {
  const transitions = {
    [APPOINTMENT_STATUS.AGENDADO]: [APPOINTMENT_STATUS.CONFIRMADO, APPOINTMENT_STATUS.CANCELADO],
    [APPOINTMENT_STATUS.CONFIRMADO]: [APPOINTMENT_STATUS.AGUARDANDO, APPOINTMENT_STATUS.CANCELADO],
    [APPOINTMENT_STATUS.AGUARDANDO]: [
      APPOINTMENT_STATUS.PENDENTE,
      APPOINTMENT_STATUS.FINANCEIRO_PENDENTE,
      APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO,
      APPOINTMENT_STATUS.FALTA,
    ],
    [APPOINTMENT_STATUS.PENDENTE]: [APPOINTMENT_STATUS.AGUARDANDO, APPOINTMENT_STATUS.FALTA],
    [APPOINTMENT_STATUS.FINANCEIRO_PENDENTE]: [
      APPOINTMENT_STATUS.AGUARDANDO,
      APPOINTMENT_STATUS.FALTA,
    ],
    [APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO]: [
      APPOINTMENT_STATUS.EM_ATENDIMENTO,
      APPOINTMENT_STATUS.FALTA,
    ],
    [APPOINTMENT_STATUS.EM_ATENDIMENTO]: [APPOINTMENT_STATUS.FINALIZADO],
    [APPOINTMENT_STATUS.FINALIZADO]: [],
    [APPOINTMENT_STATUS.FALTA]: [],
    [APPOINTMENT_STATUS.CANCELADO]: [],
    [APPOINTMENT_STATUS.REMARCADO]: [],
  };

  return transitions[currentStatus] || [];
}

// ============================================
// 4️⃣ MAPA DE FASES DO FLUXO
// ============================================

export const APPOINTMENT_PHASE = {
  SCHEDULING: 'scheduling', // Agendamento
  RECEPTION: 'reception', // Recepção (check-in)
  CARE: 'care', // Atendimento (profissional)
  COMPLETED: 'completed', // Finalizado
};

export function getPhaseForStatus(status) {
  switch (status) {
    case APPOINTMENT_STATUS.AGENDADO:
    case APPOINTMENT_STATUS.CONFIRMADO:
      return APPOINTMENT_PHASE.SCHEDULING;

    case APPOINTMENT_STATUS.AGUARDANDO:
    case APPOINTMENT_STATUS.PENDENTE:
    case APPOINTMENT_STATUS.FINANCEIRO_PENDENTE:
      return APPOINTMENT_PHASE.RECEPTION;

    case APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO:
    case APPOINTMENT_STATUS.EM_ATENDIMENTO:
      return APPOINTMENT_PHASE.CARE;

    case APPOINTMENT_STATUS.FINALIZADO:
      return APPOINTMENT_PHASE.COMPLETED;

    case APPOINTMENT_STATUS.FALTA:
    case APPOINTMENT_STATUS.CANCELADO:
    case APPOINTMENT_STATUS.REMARCADO:
      return APPOINTMENT_PHASE.COMPLETED;

    default:
      return APPOINTMENT_PHASE.SCHEDULING;
  }
}

// ============================================
// 5️⃣ VALIDAÇÕES POR PERFIL
// ============================================

export const ROLE_PERMISSIONS = {
  // Recepção
  reception: {
    canConfirmAppointment: true,
    canMarkArrival: true,
    canMarkPending: true,
    canProcessPayment: true,
    canReleaseForCare: true,
    canStartCare: false,
    canFinishCare: false,
    canViewFinance: false,
    canEditAppointment: true,
  },
  // Profissional
  professional: {
    canConfirmAppointment: false,
    canMarkArrival: false,
    canMarkPending: false,
    canProcessPayment: false,
    canReleaseForCare: false,
    canStartCare: true,
    canFinishCare: true,
    canViewFinance: false,
    canEditAppointment: false,
  },
  // Gestor/Admin
  manager: {
    canConfirmAppointment: true,
    canMarkArrival: true,
    canMarkPending: true,
    canProcessPayment: true,
    canReleaseForCare: true,
    canStartCare: true,
    canFinishCare: true,
    canViewFinance: true,
    canEditAppointment: true,
  },
};

export function canPerformAction(userRole, action) {
  const role = userRole?.toLowerCase() || 'reception';
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.reception;
  return permissions[action] || false;
}

// ============================================
// 6️⃣ VISIBILIDADE POR PERFIL
// ============================================

/**
 * Retorna os status visíveis para cada perfil
 */
export function getVisibleStatusByRole(role) {
  const r = role?.toLowerCase() || 'reception';

  if (r === 'professional') {
    // Profissional só vê agendamentos liberados para atendimento
    return [APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO];
  }

  if (r === 'manager' || r === 'admin') {
    // Gestor vê tudo
    return Object.values(APPOINTMENT_STATUS);
  }

  // Recepção vê agendamento até liberação
  return [
    APPOINTMENT_STATUS.AGENDADO,
    APPOINTMENT_STATUS.CONFIRMADO,
    APPOINTMENT_STATUS.AGUARDANDO,
    APPOINTMENT_STATUS.PENDENTE,
    APPOINTMENT_STATUS.FINANCEIRO_PENDENTE,
    APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO,
    APPOINTMENT_STATUS.FALTA,
  ];
}

// ============================================
// 7️⃣ MODO DE VISUALIZAÇÃO
// ============================================

export const AGENDA_MODE = {
  RECEPTION: 'reception', // Recepção (check-in)
  PROFESSIONAL: 'professional', // Profissional (atendimento)
  MANAGER: 'manager', // Gestor (visão completa)
};

export function getAgendaModeForRole(role) {
  const r = role?.toLowerCase() || 'reception';

  if (r === 'professional') {
    return AGENDA_MODE.PROFESSIONAL;
  }
  if (r === 'manager' || r === 'admin') {
    return AGENDA_MODE.MANAGER;
  }

  return AGENDA_MODE.RECEPTION;
}
