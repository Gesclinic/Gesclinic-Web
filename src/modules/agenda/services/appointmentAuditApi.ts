/**
 * Appointment Audit Logging API Service
 * Handles querying appointment change history and audit summaries
 */

import { supabase } from '@/lib/customSupabaseClient';

// ============================================================================
// Types
// ============================================================================

export interface AuditLogEntry {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_by: string | null;
  changed_fields: string[];
  before_snapshot: Record<string, any> | null;
  after_snapshot: Record<string, any> | null;
}

export interface AuditSummary {
  summary_date: string;
  creates_count: number;
  updates_count: number;
  deletes_count: number;
  total_changes: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get complete audit history for a specific appointment
 */
export async function getAppointmentAuditHistory(
  appointmentId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_appointment_audit_history', {
      p_appointment_id: appointmentId,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch appointment audit history:', error);
    throw error;
  }
}

/**
 * Get audit summary statistics for a clinic
 */
export async function getAuditSummaryForClinic(
  clinicId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<AuditSummary[]> {
  try {
    const from = fromDate ? fromDate.toISOString().split('T')[0] : undefined;
    const to = toDate ? toDate.toISOString().split('T')[0] : undefined;

    const { data, error } = await supabase.rpc('get_audit_summary_for_clinic', {
      p_clinic_id: clinicId,
      p_from_date: from,
      p_to_date: to,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch audit summary:', error);
    throw error;
  }
}

/**
 * Get raw audit logs with filters
 * Note: This is a direct table query, requires client-side filtering
 */
export async function queryAuditLogs(
  clinicId: string,
  filters?: {
    appointmentId?: string;
    operation?: 'CREATE' | 'UPDATE' | 'DELETE';
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }
) {
  try {
    let query = supabase
      .from('appointment_audit_log')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('changed_at', { ascending: false });

    if (filters?.appointmentId) {
      query = query.eq('appointment_id', filters.appointmentId);
    }

    if (filters?.operation) {
      query = query.eq('operation', filters.operation);
    }

    if (filters?.fromDate) {
      const fromIso = filters.fromDate.toISOString();
      query = query.gte('changed_at', fromIso);
    }

    if (filters?.toDate) {
      const toIso = filters.toDate.toISOString();
      query = query.lte('changed_at', toIso);
    }

    const limit = filters?.limit || 100;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    throw error;
  }
}

/**
 * Get field-level change details from audit entry
 */
export function getChangedFieldDetails(
  auditEntry: AuditLogEntry
): Array<{
  field: string;
  oldValue: any;
  newValue: any;
}> {
  const details: Array<{ field: string; oldValue: any; newValue: any }> = [];

  if (!auditEntry.changed_fields || auditEntry.changed_fields.length === 0) {
    return details;
  }

  for (const field of auditEntry.changed_fields) {
    const oldValue = auditEntry.before_snapshot?.[field];
    const newValue = auditEntry.after_snapshot?.[field];

    details.push({
      field,
      oldValue,
      newValue,
    });
  }

  return details;
}

/**
 * Format audit entry for display
 */
export function formatAuditEntry(entry: AuditLogEntry): {
  type: string;
  timestamp: string;
  user: string;
  fields: number;
  summary: string;
} {
  const typeLabels = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
  };

  const timestamp = new Date(entry.changed_at).toLocaleString();
  const user = entry.changed_by || 'System';
  const fields = entry.changed_fields?.length || 0;
  const type = typeLabels[entry.operation] || entry.operation;

  let summary = `${type} at ${timestamp}`;
  if (entry.operation === 'UPDATE' && fields > 0) {
    summary += ` (${fields} field${fields !== 1 ? 's' : ''} changed)`;
  }

  return {
    type,
    timestamp,
    user,
    fields,
    summary,
  };
}
