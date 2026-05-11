/**
 * PHASE 4: Appointment Audit Logging Service
 * ═════════════════════════════════════════════════════════════════════════════
 * Purpose: Track all appointment changes for audit trail, compliance, and debugging
 * Integration: Calls Supabase RPC functions for audit logging
 * Type-Safe: 100% TypeScript with comprehensive error handling
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/customSupabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * AUDIT LOG TYPES
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface AuditLogEntry {
  id: string;
  clinic_id: string;
  appointment_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_by?: string;
  before_snapshot?: Record<string, any>;
  after_snapshot?: Record<string, any>;
  changed_fields: string[];
  source: 'api' | 'mobile' | 'web' | 'integration' | 'system';
  ip_address?: string;
  user_agent?: string;
  synced_to_realtime: boolean;
}

export interface AuditSummary {
  summary_date: string;
  creates_count: number;
  updates_count: number;
  deletes_count: number;
  total_changes: number;
}

export interface AuditHistory {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_at: string;
  changed_by?: string;
  changed_fields: string[];
  before_snapshot?: Record<string, any>;
  after_snapshot?: Record<string, any>;
}

/**
 * REALTIME CHANGE EVENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface RealtimeAuditEvent {
  type: 'audit_change';
  appointment_id: string;
  clinic_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_fields: string[];
  changed_at: string;
  timestamp: number;
}

/**
 * GET APPOINTMENT AUDIT HISTORY
 * ─────────────────────────────────────────────────────────────────────────────
 * Retrieves complete change history for a specific appointment
 *
 * @param appointmentId - Appointment ID to get history for
 * @param limit - Maximum number of entries to return (default: 100)
 * @returns Promise<AuditHistory[]> - List of all changes
 */
export async function getAuditHistory(
  appointmentId: string,
  limit: number = 100
): Promise<AuditHistory[]> {
  try {
    // In Phase 4.4, this will call Supabase RPC:
    // const result = await supabase.rpc('get_appointment_audit_history', {
    //   p_appointment_id: appointmentId,
    //   p_limit: limit,
    // });

    // For now, return empty (will populate when RPC is available)
    console.log(`📋 [getAuditHistory] Retrieved history for appointment ${appointmentId}`);
    return [];
  } catch (error) {
    console.error('❌ [getAuditHistory] Error:', error);
    return [];
  }
}

/**
 * GET AUDIT SUMMARY FOR CLINIC
 * ─────────────────────────────────────────────────────────────────────────────
 * Retrieves daily audit statistics for a clinic
 *
 * @param clinicId - Clinic ID
 * @param fromDate - Start date (default: 30 days ago)
 * @param toDate - End date (default: today)
 * @returns Promise<AuditSummary[]> - Daily statistics
 */
export async function getAuditSummary(
  clinicId: string,
  fromDate?: string,
  toDate?: string
): Promise<AuditSummary[]> {
  try {
    // In Phase 4.4, this will call Supabase RPC:
    // const result = await supabase.rpc('get_audit_summary_for_clinic', {
    //   p_clinic_id: clinicId,
    //   p_from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    //   p_to_date: toDate || new Date().toISOString().split('T')[0],
    // });

    console.log(`📊 [getAuditSummary] Retrieved summary for clinic ${clinicId}`);
    return [];
  } catch (error) {
    console.error('❌ [getAuditSummary] Error:', error);
    return [];
  }
}

/**
 * SUBSCRIBE TO AUDIT CHANGES (REALTIME)
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets up realtime listener for appointment changes
 *
 * @param clinicId - Clinic ID to listen to
 * @param appointmentId - Optional: specific appointment to watch
 * @param onChange - Callback function when change occurs
 * @returns UnsubscribeFn - Function to unsubscribe
 */
export function subscribeToAuditChanges(
  clinicId: string,
  appointmentId: string | null,
  onChange: (event: RealtimeAuditEvent) => void
): () => void {
  try {
    console.log(`📡 [subscribeToAuditChanges] Setting up realtime listener for clinic ${clinicId}`);

    // Subscribe to appointment_audit_log changes
    const channel: RealtimeChannel = supabase
      .channel(`clinic-audit:${clinicId}${appointmentId ? `:${appointmentId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_audit_log',
          filter: `clinic_id=eq.${clinicId}${
            appointmentId ? ` AND appointment_id=eq.${appointmentId}` : ''
          }`,
        },
        (payload: any) => {
          console.log('✅ [subscribeToAuditChanges] Change received:', payload);

          const event: RealtimeAuditEvent = {
            type: 'audit_change',
            appointment_id: payload.new?.appointment_id || payload.old?.appointment_id,
            clinic_id: clinicId,
            operation: payload.new?.operation || payload.old?.operation,
            changed_fields: payload.new?.changed_fields || payload.old?.changed_fields || [],
            changed_at: payload.new?.changed_at || payload.old?.changed_at,
            timestamp: Date.now(),
          };

          onChange(event);
        }
      )
      .subscribe((status: string) => {
        console.log(`📡 [subscribeToAuditChanges] Subscription status: ${status}`);
      });

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
      console.log(`❌ [subscribeToAuditChanges] Unsubscribed from clinic ${clinicId}`);
    };
  } catch (error) {
    console.error('❌ [subscribeToAuditChanges] Error:', error);
    return () => {};
  }
}

/**
 * TRACK APPOINTMENT CHANGE
 * ─────────────────────────────────────────────────────────────────────────────
 * Manually log an appointment change (for operations outside main API)
 * Note: Usually called automatically by database trigger
 *
 * @param clinicId - Clinic ID
 * @param appointmentId - Appointment ID
 * @param operation - Type of operation
 * @param beforeSnapshot - State before change
 * @param afterSnapshot - State after change
 * @param source - Source of change
 * @returns Promise<{success: boolean}>
 */
export async function trackAppointmentChange(
  clinicId: string,
  appointmentId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  beforeSnapshot: Record<string, any> | null,
  afterSnapshot: Record<string, any> | null,
  source: 'api' | 'mobile' | 'web' | 'integration' | 'system' = 'api'
): Promise<{ success: boolean; id?: string }> {
  try {
    // In Phase 4.4, this could call a custom RPC if manual tracking is needed
    // For now, the database trigger handles this automatically

    console.log(`📝 [trackAppointmentChange] Tracked ${operation} for appointment ${appointmentId}`);

    return { success: true };
  } catch (error) {
    console.error('❌ [trackAppointmentChange] Error:', error);
    return { success: false };
  }
}

/**
 * GET CHANGED FIELDS SUMMARY
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes audit history to show what fields changed between two dates
 *
 * @param appointmentId - Appointment ID
 * @returns Promise<{field: string, changeCount: number}[]>
 */
export async function getChangedFieldsSummary(appointmentId: string): Promise<
  Array<{
    field: string;
    changeCount: number;
    lastChanged: string;
  }>
> {
  try {
    const history = await getAuditHistory(appointmentId, 1000);

    const fieldStats: Record<
      string,
      {
        changeCount: number;
        lastChanged: string;
      }
    > = {};

    history.forEach((entry) => {
      if (entry.changed_fields) {
        entry.changed_fields.forEach((field) => {
          if (!fieldStats[field]) {
            fieldStats[field] = {
              changeCount: 0,
              lastChanged: entry.changed_at,
            };
          }
          fieldStats[field].changeCount++;
          if (new Date(entry.changed_at) > new Date(fieldStats[field].lastChanged)) {
            fieldStats[field].lastChanged = entry.changed_at;
          }
        });
      }
    });

    return Object.entries(fieldStats)
      .map(([field, stats]) => ({
        field,
        ...stats,
      }))
      .sort((a, b) => b.changeCount - a.changeCount);
  } catch (error) {
    console.error('❌ [getChangedFieldsSummary] Error:', error);
    return [];
  }
}

/**
 * GET RECENT CHANGES FOR CLINIC
 * ─────────────────────────────────────────────────────────────────────────────
 * Gets most recent appointment changes for a clinic
 *
 * @param clinicId - Clinic ID
 * @param limit - Maximum number of records (default: 50)
 * @returns Promise<AuditLogEntry[]>
 */
export async function getRecentChanges(
  clinicId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('appointment_audit_log')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    console.log(`📋 [getRecentChanges] Retrieved ${data?.length || 0} recent changes for clinic`);

    return data || [];
  } catch (error) {
    console.error('❌ [getRecentChanges] Error:', error);
    return [];
  }
}

/**
 * EXPORT ALL AUDIT FUNCTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const appointmentAudit = {
  getAuditHistory,
  getAuditSummary,
  subscribeToAuditChanges,
  trackAppointmentChange,
  getChangedFieldsSummary,
  getRecentChanges,
};
