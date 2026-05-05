/**
 * useAppointmentPermissions.js
 * 
 * 🔐 Hook de Permissões para Agendamentos
 * 
 * Valida e controla o acesso a ações específicas
 * baseado no perfil do usuário e no status do agendamento.
 * 
 * Uso:
 * const { canRelease, canStartCare, isActionAllowed } = useAppointmentPermissions();
 */

import { useAuth } from "@/contexts/SupabaseAuthContext";
import { APPOINTMENT_STATUS, ROLE_PERMISSIONS, canPerformAction, getValidStatusTransitions } from "@/lib/appointmentStatusEnums";
export function useAppointmentPermissions() {
  const {
    currentRole,
    user
  } = useAuth();

  // ============================================
  // 1️⃣ PERMISSÕES BÁSICAS POR ROLE
  // ============================================

  const permissions = ROLE_PERMISSIONS[currentRole?.toLowerCase()] || ROLE_PERMISSIONS.reception || {
    canConfirmAppointment: false,
    canMarkArrival: false,
    canMarkPending: false,
    canProcessPayment: false,
    canReleaseForCare: false,
    canStartCare: false,
    canFinishCare: false,
    canViewFinance: false,
    canEditAppointment: false
  };

  // ============================================
  // 2️⃣ FUNÇÕES DE VALIDAÇÃO
  // ============================================

  /**
   * Verifica se o usuário pode realizar uma ação específica
   */
  const canPerformActionForAppointment = (action, appointment = null) => {
    // Permissão base
    if (!permissions[action]) {
      return false;
    }

    // Se não há agendamento, retorna permission base
    if (!appointment) {
      return true;
    }

    // ⚠️ CRÍTICO: Não permitir ação em agendamentos finalizados
    if ([APPOINTMENT_STATUS.FINALIZADO, APPOINTMENT_STATUS.CANCELADO, APPOINTMENT_STATUS.FALTA].includes(appointment.status)) {
      return false;
    }
    return true;
  };

  /**
   * Verifica se a transição de status é válida
   */
  const isStatusTransitionValid = (currentStatus, nextStatus, actionType = null) => {
    const validTransitions = getValidStatusTransitions(currentStatus);
    if (!validTransitions.includes(nextStatus)) {
      return false;
    }

    // Validações específicas por perfil
    if (currentRole?.toLowerCase() === "professional") {
      // Profissional só pode fazer transições EM_ATENDIMENTO → FINALIZADO
      if (![APPOINTMENT_STATUS.EM_ATENDIMENTO, APPOINTMENT_STATUS.LIBERADO_PARA_ATENDIMENTO].includes(currentStatus)) {
        return false;
      }
    }
    if (currentRole?.toLowerCase() === "reception") {
      // Recepção não pode fazer certas transições
      if ([APPOINTMENT_STATUS.EM_ATENDIMENTO, APPOINTMENT_STATUS.FINALIZADO].includes(nextStatus)) {
        return false;
      }
    }
    return true;
  };

  /**
   * Retorna o motivo de bloqueio se uma ação não é permitida
   */
  const getBlockReason = (action, appointment = null) => {
    // Sem permissão base
    if (!permissions[action]) {
      return `Seu perfil (${currentRole}) não pode ${action}`;
    }

    // Agendamento finalizado
    if (appointment && [APPOINTMENT_STATUS.FINALIZADO, APPOINTMENT_STATUS.CANCELADO, APPOINTMENT_STATUS.FALTA].includes(appointment.status)) {
      return `Não é possível realizar ações em agendamentos ${appointment.status}`;
    }
    return null;
  };

  /**
   * Valida se o profissional é o responsável (se necessário)
   */
  const isProfessionalAuthorized = appointment => {
    if (currentRole?.toLowerCase() !== "professional") {
      return true; // Recepção e Gestor não precisam dessa validação
    }

    // Profissional deve estar associado ao agendamento
    if (appointment?.professional_id !== user?.id) {
      return false;
    }
    return true;
  };

  // ============================================
  // 3️⃣ SHORTCUTS PARA AÇÕES COMUNS
  // ============================================

  return {
    // Permissões base
    permissions,
    // Funções de validação
    canPerformActionForAppointment,
    isStatusTransitionValid,
    getBlockReason,
    isProfessionalAuthorized,
    // Shortcuts (ações comuns)
    canConfirmAppointment: (apt = null) => canPerformActionForAppointment("canConfirmAppointment", apt),
    canMarkArrival: (apt = null) => canPerformActionForAppointment("canMarkArrival", apt),
    canMarkPending: (apt = null) => canPerformActionForAppointment("canMarkPending", apt),
    canProcessPayment: (apt = null) => canPerformActionForAppointment("canProcessPayment", apt),
    canReleaseForCare: (apt = null) => canPerformActionForAppointment("canReleaseForCare", apt),
    canStartCare: (apt = null) => {
      if (!canPerformActionForAppointment("canStartCare", apt)) {
        return false;
      }
      return isProfessionalAuthorized(apt);
    },
    canFinishCare: (apt = null) => {
      if (!canPerformActionForAppointment("canFinishCare", apt)) {
        return false;
      }
      return isProfessionalAuthorized(apt);
    },
    canViewFinance: (apt = null) => canPerformActionForAppointment("canViewFinance", apt),
    canEditAppointment: (apt = null) => canPerformActionForAppointment("canEditAppointment", apt),
    // Role/Profissional
    currentRole,
    isReceptionist: currentRole?.toLowerCase() === "reception",
    isProfessional: currentRole?.toLowerCase() === "professional",
    isManager: ["manager", "admin"].includes(currentRole?.toLowerCase())
  };
}