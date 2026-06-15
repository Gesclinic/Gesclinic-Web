/**
 * auditApi.js
 *
 * 🕒 AUDITORIA DE ATENDIMENTOS
 *
 * Sistema de logging automático com triggers:
 * - Imutável (append-only)
 * - Invisível ao usuário comum
 * - Visível para gestor/admin
 * - Rastreável e auditável
 *
 * ✅ Uses appointment_audit_logs table (plural) with database triggers
 * Triggers fire automatically on INSERT/UPDATE/DELETE of appointments
 */

import { supabase } from '@/lib/customSupabaseClient';

/**
 * Action types for appointment audit logs
 */
export const AUDIT_ACTION_TYPES = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  DELETED: 'DELETED',
  APPOINTMENT_CREATED: 'CREATED',
  STATUS_CHANGED: 'UPDATED',
  CHECKIN_STARTED: 'UPDATED',
  MARKED_NO_SHOW: 'UPDATED',
  RESCHEDULED: 'UPDATED',
  CANCELLED: 'UPDATED',
  ATTENDANCE_STARTED: 'UPDATED',
  ATTENDANCE_FINISHED: 'UPDATED',
};

/**
 * Action descriptions for UI display
 */
export const AUDIT_ACTION_DESCRIPTIONS = {
  CREATED: {
    label: 'Criado',
    icon: 'plus',
    color: 'bg-green-100 text-green-800',
  },
  UPDATED: {
    label: 'Atualizado',
    icon: 'edit',
    color: 'bg-blue-100 text-blue-800',
  },
  DELETED: {
    label: 'Deletado',
    icon: 'trash',
    color: 'bg-red-100 text-red-800',
  },
};

/**
 * Action type labels for UI display (used in tables)
 */
export const AUDIT_ACTION_LABELS = {
  CREATED: 'Criado',
  UPDATED: 'Atualizado',
  DELETED: 'Deletado',
};

/**
 * Role labels for UI display (used in tables)
 */
export const AUDIT_ROLE_LABELS = {
  system: 'Sistema',
  authenticated: 'Autenticado',
  admin: 'Administrador',
  gestor: 'Gestor',
  medico: 'Médico',
  atendente: 'Atendente',
};

/**
 * Main audit logging function (legacy - now handled by triggers)
 * Kept for backward compatibility
 */
export async function logAppointmentAudit({
  appointmentId,
  actionType,
  oldStatus = null,
  newStatus = null,
  context = null,
}) {
  // Triggers now handle this automatically - this is a no-op for backward compatibility
  console.log('[AUDIT] Automatic trigger will log:', {
    appointmentId,
    actionType,
    oldStatus,
    newStatus,
    context,
  });
  return null;
}

/**
 * Helper: Log status change (handled by UPDATE trigger)
 */
export async function logStatusChange(appointmentId, oldStatus, newStatus) {
  // Triggers handle this - no explicit insert needed
  return null;
}

/**
 * Helper: Log checkin started (handled by UPDATE trigger)
 */
export async function logCheckinStarted(appointmentId, context = null) {
  return null;
}

/**
 * Helper: Log marked as no-show (handled by UPDATE trigger)
 */
export async function logMarkedNoShow(appointmentId, reason = null) {
  return null;
}

/**
 * Helper: Log appointment rescheduled (handled by UPDATE trigger)
 */
export async function logAppointmentRescheduled(appointmentId, newDate, newTime, reason = null) {
  return null;
}

/**
 * List audit logs with filters
 * @param {Object} params
 * @param {string} params.clinicId - Filter by clinic (required for RLS)
 * @param {string} [params.appointmentId] - Filter by specific appointment
 * @param {string} [params.actionType] - Filter by action (CREATED, UPDATED, DELETED)
 * @param {string} [params.performedBy] - Filter by user UUID
 * @param {string} [params.startDate] - ISO datetime start
 * @param {string} [params.endDate] - ISO datetime end
 * @param {number} [params.limit=100] - Max results
 * @returns {Promise<Array>}
 */
export async function listAuditLogs({
  clinicId,
  appointmentId,
  actionType,
  performedBy,
  startDate,
  endDate,
  limit = 100,
}) {
  try {
    let query = supabase
      .from('appointment_audit_logs')
      .select(
        `
        id,
        appointment_id,
        action_type,
        performed_by,
        performed_by_role,
        context,
        created_at,
        clinic_id
      `
      );

    // RLS: Filter by clinic_id
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    if (appointmentId) {
      query = query.eq('appointment_id', appointmentId);
    }

    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    if (performedBy) {
      query = query.eq('performed_by', performedBy);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }

    // Post-process logs to extract patient and professional names from context
    const processedData = (data || []).map(log => {
      let patientName = null;
      let professionalName = null;

      // Extract from context.new (for CREATED and UPDATED)
      if (log.context?.new?.patient_id) {
        patientName = log.context.new.patient_name || null;
        professionalName = log.context.new.professional_name || null;
      }
      // Extract from context.old (fallback for DELETED)
      else if (log.context?.old?.patient_id) {
        patientName = log.context.old.patient_name || null;
        professionalName = log.context.old.professional_name || null;
      }
      // Extract from flat context (old format or backfilled data)
      else if (log.context?.patient_id) {
        patientName = log.context.patient_name || null;
        professionalName = log.context.professional_name || null;
      }

      return {
        ...log,
        // Add patient and professional info for display
        patient: { name: patientName },
        professional: { name: professionalName },
      };
    });

    return processedData;
  } catch (error) {
    console.error('Audit API error:', error);
    return [];
  }
}

/**
 * Get audit history for a specific appointment (legacy name)
 */
export async function getAppointmentAuditLogs(appointmentId) {
  return getAppointmentAuditHistory(appointmentId);
}

/**
 * Get audit history for a specific appointment
 */
export async function getAppointmentAuditHistory(appointmentId) {
  try {
    const { data, error } = await supabase
      .from('appointment_audit_logs')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching appointment history:', error);
    return [];
  }
}

/**
 * Get audit summary statistics
 */
export async function getAuditSummary(clinicId, dateRange = '7d') {
  try {
    const now = new Date();
    let startDate;

    switch (dateRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const logs = await listAuditLogs({
      clinicId,
      startDate: startDate.toISOString(),
      limit: 1000,
    });

    // Build summary
    const summary = {
      totalActions: logs.length,
      byActionType: {
        CREATED: 0,
        UPDATED: 0,
        DELETED: 0,
      },
      byRole: {},
      dateRange,
    };

    logs.forEach(log => {
      if (log.action_type) {
        summary.byActionType[log.action_type] = (summary.byActionType[log.action_type] || 0) + 1;
      }
      if (log.performed_by_role) {
        summary.byRole[log.performed_by_role] = (summary.byRole[log.performed_by_role] || 0) + 1;
      }
    });

    return summary;
  } catch (error) {
    console.error('Error getting audit summary:', error);
    return {
      totalActions: 0,
      byActionType: { CREATED: 0, UPDATED: 0, DELETED: 0 },
      byRole: {},
      dateRange,
    };
  }
}

/**
 * Count total audit logs
 */
export async function countAuditLogs(clinicId) {
  try {
    const { count, error } = await supabase
      .from('appointment_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting audit logs:', error);
    return 0;
  }
}
