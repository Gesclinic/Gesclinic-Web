import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * useAuditRealtimeSync - Hook for real-time synchronization of audit data
 * Subscribes to changes in audit tables and triggers callbacks
 */
export function useAuditRealtimeSync(clinicId) {
  /**
   * Subscribe to alerts in real-time
   */
  const subscribeToAlerts = useCallback((onNewAlert, onAlertDeleted) => {
    const channel = supabase.channel(`audit_alerts_${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_alerts_persistent',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          console.log('📍 New alert received:', payload.new);
          if (onNewAlert) onNewAlert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'audit_alerts_persistent',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          console.log('🗑️ Alert deleted:', payload.old.id);
          if (onAlertDeleted) onAlertDeleted(payload.old.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  /**
   * Subscribe to user events in real-time
   */
  const subscribeToUserEvents = useCallback((onNewEvent) => {
    const channel = supabase.channel(`user_events_${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_audit_events',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          console.log('👤 New user event:', payload.new);
          if (onNewEvent) onNewEvent(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  /**
   * Subscribe to audit reports in real-time
   */
  const subscribeToReports = useCallback((onNewReport, onReportUpdated) => {
    const channel = supabase.channel(`audit_reports_${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_reports',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          console.log('📊 New report created:', payload.new.id);
          if (onNewReport) onNewReport(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audit_reports',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          console.log('🔄 Report updated:', payload.new.id);
          if (onReportUpdated) onReportUpdated(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  /**
   * Create a multi-table listener
   */
  const subscribeToAllAuditData = useCallback((callbacks) => {
    const unsubscribeAlerts = subscribeToAlerts(callbacks.onNewAlert, callbacks.onAlertDeleted);
    const unsubscribeEvents = subscribeToUserEvents(callbacks.onNewEvent);
    const unsubscribeReports = subscribeToReports(callbacks.onNewReport, callbacks.onReportUpdated);

    return () => {
      unsubscribeAlerts();
      unsubscribeEvents();
      unsubscribeReports();
    };
  }, [subscribeToAlerts, subscribeToUserEvents, subscribeToReports]);

  return {
    subscribeToAlerts,
    subscribeToUserEvents,
    subscribeToReports,
    subscribeToAllAuditData,
  };
}

/**
 * useAuditDataSync - Hook for syncing data between localStorage and Supabase
 * Detects changes in localStorage and pushes to Supabase
 */
export function useAuditDataSync(clinicId, userId) {
  useEffect(() => {
    if (!clinicId || !userId) return;

    const checkAndSyncData = async () => {
      try {
        // Check if migration has been done
        const migrationDone = localStorage.getItem('audit_migration_completed');
        
        if (!migrationDone) {
          console.log('Migration marker not found. Skipping sync.');
          return;
        }

        // Monitor localStorage for changes
        const originalSetItem = localStorage.setItem;
        
        localStorage.setItem = function(key, value) {
          originalSetItem.call(this, key, value);

          // Sync alerts to Supabase when localStorage alerts change
          if (key === 'audit_alerts') {
            const alerts = JSON.parse(value || '[]');
            if (alerts.length > 0) {
              // Latest alert should be synced to Supabase
              const latestAlert = alerts[alerts.length - 1];
              syncNewAlert(latestAlert, clinicId).catch(err => 
                console.error('Error syncing alert:', err)
              );
            }
          }

          // Sync user events
          if (key === 'user_audit_log') {
            const events = JSON.parse(value || '[]');
            if (events.length > 0) {
              const latestEvent = events[events.length - 1];
              syncNewEvent(latestEvent, clinicId, userId).catch(err => 
                console.error('Error syncing event:', err)
              );
            }
          }
        };

        return () => {
          localStorage.setItem = originalSetItem;
        };
      } catch (err) {
        console.error('Error setting up localStorage sync:', err);
      }
    };

    checkAndSyncData();
  }, [clinicId, userId]);
}

/**
 * Helper functions for syncing individual items
 */

async function syncNewAlert(alert, clinicId) {
  try {
    // Check if alert already exists in Supabase
    const { data: existing } = await supabase
      .from('audit_alerts_persistent')
      .select('id')
      .eq('title', alert.title)
      .eq('clinic_id', clinicId)
      .limit(1);

    if (existing?.length === 0) {
      // Alert doesn't exist, insert it
      await supabase
        .from('audit_alerts_persistent')
        .insert({
          clinic_id: clinicId,
          alert_type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          details: alert.details || {},
          created_at: alert.timestamp,
        });
    }
  } catch (err) {
    console.error('Error syncing alert to Supabase:', err);
  }
}

async function syncNewEvent(event, clinicId, userId) {
  try {
    // Check if event already exists
    const { data: existing } = await supabase
      .from('user_audit_events')
      .select('id')
      .eq('email', event.email)
      .eq('event_type', event.type)
      .eq('created_at', event.timestamp)
      .limit(1);

    if (existing?.length === 0) {
      // Event doesn't exist, insert it
      await supabase
        .from('user_audit_events')
        .insert({
          clinic_id: clinicId,
          user_id: userId,
          email: event.email,
          event_type: event.type,
          session_duration_seconds: event.sessionDuration,
          details: event.details || {},
          created_at: event.timestamp,
        });
    }
  } catch (err) {
    console.error('Error syncing event to Supabase:', err);
  }
}

export { syncNewAlert, syncNewEvent };
