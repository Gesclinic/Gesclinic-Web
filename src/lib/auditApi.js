/**
 * auditApi.js
 * 
 * 🕒 AUDITORIA DE ATENDIMENTOS
 * 
 * Sistema de logging automático:
 * - Imutável (append-only)
 * - Invisível ao usuário comum
 * - Visível para gestor/admin
 * - Rastreável e auditável
 */

import { supabase } from "@/lib/customSupabaseClient";

/**
 * Tipos de ações de auditoria
 */
export const AUDIT_ACTION_TYPES = {
  APPOINTMENT_CREATED: "APPOINTMENT_CREATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  CHECKIN_STARTED: "CHECKIN_STARTED",
  CHECKLIST_UPDATED: "CHECKLIST_UPDATED",
  FINANCIAL_VALIDATED: "FINANCIAL_VALIDATED",
  MERGE_PRE_PATIENT: "MERGE_PRE_PATIENT",
  PATIENT_LINKED: "PATIENT_LINKED",
  PATIENT_CREATED: "PATIENT_CREATED",
  ATTENDANCE_STARTED: "ATTENDANCE_STARTED",
  ATTENDANCE_FINISHED: "ATTENDANCE_FINISHED",
  MARKED_NO_SHOW: "MARKED_NO_SHOW",
  RESCHEDULED: "RESCHEDULED",
  CANCELLED: "CANCELLED",
};

/**
 * Log de auditoria - Função principal
 * @param {Object} params
 * @param {string} params.appointmentId - ID do agendamento
 * @param {string} params.actionType - Tipo de ação (AUDIT_ACTION_TYPES)
 * @param {string} params.oldStatus - Status anterior (opcional)
 * @param {string} params.newStatus - Status novo (opcional)
 * @param {Object} params.context - Dados contextuais (opcional)
 * @returns {Promise<Object>} Log criado
 */
export async function logAppointmentAudit({
  appointmentId,
  actionType,
  oldStatus = null,
  newStatus = null,
  context = null,
}) {
  if (!appointmentId || !actionType) {
    console.error("appointmentId e actionType são obrigatórios");
    return null;
  }

  try {
    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Obter role do usuário (via RPC ou busca direta)
    let userRole = null;
    if (userId) {
      try {
        // ⚠️ COMENTADO: Coluna role_name não existe em user_roles
        // TODO: Verificar estrutura correta da tabela user_roles
        // const { data: roleData } = await supabase
        //   .from("user_roles")
        //   .select("role_name")
        //   .eq("user_id", userId)
        //   .single();
        //
        // userRole = roleData?.role_name || null;
      } catch (err) {
        console.warn("Erro ao buscar role do usuário:", err);
      }
    }

    // Obter IP e User-Agent (melhor esforço)
    let ipAddress = null;
    let userAgent = null;
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      if (response.ok) {
        const data = await response.json();
        ipAddress = data.ip;
      }
    } catch {
      // Silencioso - não bloqueia logging
    }
    userAgent = navigator?.userAgent || null;

    // Inserir log de auditoria
    const { data: log, error } = await supabase
      .from("appointment_audit_logs")
      .insert([
        {
          appointment_id: appointmentId,
          action_type: actionType,
          old_status: oldStatus,
          new_status: newStatus,
          performed_by: userId,
          performed_by_role: userRole,
          context: context ? JSON.stringify(context) : null,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Erro ao logar auditoria:", error);
      return null;
    }

    console.log(`[AUDIT] ${actionType} para agendamento ${appointmentId}`);
    return log;
  } catch (err) {
    console.error("Erro inesperado ao logar auditoria:", err);
    return null;
  }
}

/**
 * Buscar logs de auditoria de um agendamento
 * @param {string} appointmentId - ID do agendamento
 * @returns {Promise<Array>} Lista de logs
 */
export async function getAppointmentAuditLogs(appointmentId) {
  if (!appointmentId) return [];

  try {
    const { data, error } = await supabase
      .from("appointment_audit_logs")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("performed_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar logs:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Erro inesperado ao buscar logs:", err);
    return [];
  }
}

/**
 * Buscar logs de um período
 * @param {string} startDate - Data inicial (ISO)
 * @param {string} endDate - Data final (ISO)
 * @param {string} actionType - Filtrar por tipo de ação (opcional)
 * @returns {Promise<Array>} Lista de logs
 */
export async function getAuditLogsByDateRange({
  startDate,
  endDate,
  actionType = null,
}) {
  try {
    let query = supabase
      .from("appointment_audit_logs")
      .select("*")
      .gte("performed_at", startDate)
      .lte("performed_at", endDate);

    if (actionType) {
      query = query.eq("action_type", actionType);
    }

    const { data, error } = await query.order("performed_at", {
      ascending: false,
    });

    if (error) {
      console.error("Erro ao buscar logs por período:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Erro inesperado:", err);
    return [];
  }
}

/**
 * Contar logs de um agendamento
 * @param {string} appointmentId - ID do agendamento
 * @returns {Promise<number>} Quantidade de logs
 */
export async function countAppointmentAuditLogs(appointmentId) {
  if (!appointmentId) return 0;

  try {
    const { count, error } = await supabase
      .from("appointment_audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("appointment_id", appointmentId);

    if (error) {
      console.error("Erro ao contar logs:", error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error("Erro inesperado:", err);
    return 0;
  }
}

/**
 * Helper: Logar mudança de status
 */
export async function logStatusChange(appointmentId, oldStatus, newStatus) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.STATUS_CHANGED,
    oldStatus,
    newStatus,
  });
}

/**
 * Helper: Logar checkin iniciado
 */
export async function logCheckinStarted(appointmentId, context = null) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.CHECKIN_STARTED,
    context,
  });
}

/**
 * Helper: Logar merge de pré-paciente
 */
export async function logMergePrePatient(
  appointmentId,
  linkedPatientId,
  method
) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.MERGE_PRE_PATIENT,
    context: {
      from: "PRE_PATIENT",
      to: "PATIENT",
      linked_patient_id: linkedPatientId,
      method: method, // "SEARCH" ou "CREATE"
    },
  });
}

/**
 * Helper: Logar atendimento iniciado
 */
export async function logAttendanceStarted(appointmentId) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.ATTENDANCE_STARTED,
  });
}

/**
 * Helper: Logar atendimento finalizado
 */
export async function logAttendanceFinished(appointmentId, duration = null) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.ATTENDANCE_FINISHED,
    context: duration ? { duration_minutes: duration } : null,
  });
}
/**
 * Helper: Logar checklist atualizado
 */
export async function logChecklistUpdated(appointmentId, checklistData = null) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.CHECKLIST_UPDATED,
    context: checklistData || null,
  });
}

/**
 * Helper: Logar validação financeira
 */
export async function logFinancialValidated(appointmentId, paymentDetails = null) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.FINANCIAL_VALIDATED,
    context: paymentDetails || null,
  });
}

/**
 * Helper: Logar cancelamento
 */
export async function logAppointmentCancelled(appointmentId, reason = null) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.CANCELLED,
    context: reason ? { reason } : null,
  });
}

/**
 * Helper: Logar remarcação
 */
export async function logAppointmentRescheduled(appointmentId, newDate, newTime, reason = null) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.RESCHEDULED,
    context: {
      new_date: newDate,
      new_time: newTime,
      reason: reason || null,
    },
  });
}

/**
 * Helper: Logar falta marcada
 */
export async function logMarkedNoShow(appointmentId, reason = null) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.MARKED_NO_SHOW,
    context: reason ? { reason } : null,
  });
}

/**
 * Helper: Logar paciente linkado
 */
export async function logPatientLinked(appointmentId, patientId) {
  return logAppointmentAudit({
    appointmentId,
    actionType: AUDIT_ACTION_TYPES.PATIENT_LINKED,
    context: {
      patient_id: patientId,
    },
  });
}

/**
 * Mapa descritivo de ações para exibição amigável
 */
export const AUDIT_ACTION_DESCRIPTIONS = {
  [AUDIT_ACTION_TYPES.APPOINTMENT_CREATED]: {
    label: "Agendamento Criado",
    icon: "plus",
    color: "bg-green-100 text-green-800",
  },
  [AUDIT_ACTION_TYPES.STATUS_CHANGED]: {
    label: "Status Alterado",
    icon: "refresh-cw",
    color: "bg-blue-100 text-blue-800",
  },
  [AUDIT_ACTION_TYPES.CHECKIN_STARTED]: {
    label: "Check-in Iniciado",
    icon: "log-in",
    color: "bg-purple-100 text-purple-800",
  },
  [AUDIT_ACTION_TYPES.CHECKLIST_UPDATED]: {
    label: "Checklist Atualizado",
    icon: "check-square",
    color: "bg-cyan-100 text-cyan-800",
  },
  [AUDIT_ACTION_TYPES.FINANCIAL_VALIDATED]: {
    label: "Financeiro Validado",
    icon: "credit-card",
    color: "bg-green-100 text-green-800",
  },
  [AUDIT_ACTION_TYPES.MERGE_PRE_PATIENT]: {
    label: "Pré-paciente Linkado",
    icon: "merge",
    color: "bg-orange-100 text-orange-800",
  },
  [AUDIT_ACTION_TYPES.PATIENT_LINKED]: {
    label: "Paciente Linkado",
    icon: "link",
    color: "bg-orange-100 text-orange-800",
  },
  [AUDIT_ACTION_TYPES.PATIENT_CREATED]: {
    label: "Paciente Criado",
    icon: "user-plus",
    color: "bg-green-100 text-green-800",
  },
  [AUDIT_ACTION_TYPES.ATTENDANCE_STARTED]: {
    label: "Atendimento Iniciado",
    icon: "play",
    color: "bg-blue-100 text-blue-800",
  },
  [AUDIT_ACTION_TYPES.ATTENDANCE_FINISHED]: {
    label: "Atendimento Finalizado",
    icon: "check-circle",
    color: "bg-green-100 text-green-800",
  },
  [AUDIT_ACTION_TYPES.MARKED_NO_SHOW]: {
    label: "Falta Marcada",
    icon: "x-circle",
    color: "bg-red-100 text-red-800",
  },
  [AUDIT_ACTION_TYPES.RESCHEDULED]: {
    label: "Remarcado",
    icon: "calendar",
    color: "bg-yellow-100 text-yellow-800",
  },
  [AUDIT_ACTION_TYPES.CANCELLED]: {
    label: "Cancelado",
    icon: "x-circle",
    color: "bg-red-100 text-red-800",
  },
};