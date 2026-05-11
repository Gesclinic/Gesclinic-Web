/**
 * STATUS VALIDATION - Regras de validação de transições
 * ===================================================
 * 
 * Garante que apenas transições válidas ocorrem no sistema
 */

import {
  OfficialAppointmentStatus,
  STATUS_TRANSITIONS,
  OFFICIAL_STATUS_CONFIG,
  isValidTransition,
  canEditAppointmentInStatus,
  blocksEditingInStatus,
} from './officialStatusModel';

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  targetStatus?: OfficialAppointmentStatus;
}

export interface EditValidationResult {
  canEdit: boolean;
  reason?: string;
  criticalBlockage?: boolean;
}

// ============================================================================
// STATUS TRANSITION VALIDATION
// ============================================================================

/**
 * Valida uma transição de status
 */
export function validateStatusTransition(
  currentStatus: OfficialAppointmentStatus,
  targetStatus: OfficialAppointmentStatus,
  context?: { 
    reason?: string;
    userRole?: string;
  }
): TransitionValidationResult {
  // Check se o status target é válido
  const validStatuses = Object.keys(OFFICIAL_STATUS_CONFIG) as OfficialAppointmentStatus[];
  if (!validStatuses.includes(targetStatus)) {
    return {
      valid: false,
      error: `Status inválido: ${targetStatus}`,
    };
  }

  // Check se a transição é permitida
  if (!isValidTransition(currentStatus, targetStatus)) {
    const possibleNext = STATUS_TRANSITIONS[currentStatus] || [];
    return {
      valid: false,
      error: `Transição não permitida: ${currentStatus} → ${targetStatus}`,
      warning: `Apenas possível: ${possibleNext.join(', ') || 'nenhuma transição'}`,
    };
  }

  // Se chegou aqui, é válido
  return {
    valid: true,
    targetStatus,
  };
}

/**
 * Valida se pode editar agendamento em um status
 */
export function validateEditPermission(
  status: OfficialAppointmentStatus,
  fieldName?: string,
  userRole?: string
): EditValidationResult {
  const config = OFFICIAL_STATUS_CONFIG[status];

  // Check crítico: status bloqueia edição crítica
  if (blocksEditingInStatus(status) && (!fieldName || fieldName !== 'notes')) {
    return {
      canEdit: false,
      reason: `Status ${config.label} não permite edição crítica`,
      criticalBlockage: true,
    };
  }

  // Check: pode editar neste status
  if (!canEditAppointmentInStatus(status)) {
    return {
      canEdit: false,
      reason: `Agendamentos em status ${config.label} não podem ser editados`,
    };
  }

  return {
    canEdit: true,
  };
}

/**
 * Valida se pode cancelar em um status
 */
export function validateCancelPermission(
  status: OfficialAppointmentStatus
): EditValidationResult {
  const config = OFFICIAL_STATUS_CONFIG[status];

  if (!config.allowsCancelation) {
    return {
      canEdit: false,
      reason: `Não é possível cancelar agendamento em status ${config.label}`,
    };
  }

  return {
    canEdit: true,
  };
}

/**
 * Valida se agendamento gera financeiro
 */
export function validateFinancialGeneration(
  status: OfficialAppointmentStatus
): { generatesFinancial: boolean; reason?: string } {
  const config = OFFICIAL_STATUS_CONFIG[status];

  if (!config.generatesFinancial) {
    return {
      generatesFinancial: false,
      reason: `Status ${config.label} não gera faturamento automático`,
    };
  }

  return {
    generatesFinancial: true,
  };
}

/**
 * Valida se recepção está desbloqueada
 */
export function validateReceptionUnlock(
  status: OfficialAppointmentStatus
): { receptionUnlocked: boolean; reason?: string } {
  const config = OFFICIAL_STATUS_CONFIG[status];

  if (!config.receptionUnlocked) {
    return {
      receptionUnlocked: false,
      reason: `Recepção ainda não foi desbloqueada para status ${config.label}`,
    };
  }

  return {
    receptionUnlocked: true,
  };
}

// ============================================================================
// BULK VALIDATION
// ============================================================================

/**
 * Valida múltiplos agendamentos em lote
 */
export function validateAppointmentStatusesBulk(
  appointments: Array<{ id: string; status: OfficialAppointmentStatus }>
): {
  valid: number;
  invalid: number;
  errors: Array<{ id: string; error: string }>;
} {
  const validStatuses = Object.keys(OFFICIAL_STATUS_CONFIG) as OfficialAppointmentStatus[];
  const errors: Array<{ id: string; error: string }> = [];

  appointments.forEach((apt) => {
    if (!validStatuses.includes(apt.status)) {
      errors.push({
        id: apt.id,
        error: `Status inválido: ${apt.status}`,
      });
    }
  });

  return {
    valid: appointments.length - errors.length,
    invalid: errors.length,
    errors,
  };
}

// ============================================================================
// MIGRATION VALIDATION
// ============================================================================

/**
 * Valida se um agendamento legado pode ser migrado
 */
export function validateLegacyAppointmentMigration(
  legacyStatus: string,
  currentDate: string,
  appointmentDate: string
): {
  migratable: boolean;
  targetStatus?: OfficialAppointmentStatus;
  warning?: string;
} {
  // Por enquanto, qualquer status legado pode ser mapeado
  // No futuro, pode incluir lógica temporal
  return {
    migratable: true,
    warning:
      new Date(appointmentDate) < new Date(currentDate)
        ? 'Agendamento em data passada'
        : undefined,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  validateStatusTransition,
  validateEditPermission,
  validateCancelPermission,
  validateFinancialGeneration,
  validateReceptionUnlock,
  validateAppointmentStatusesBulk,
  validateLegacyAppointmentMigration,
};
