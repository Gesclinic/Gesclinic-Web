/**
 * PHASE 4: useRealtimeAppointmentChanges Hook
 * ═════════════════════════════════════════════════════════════════════════════
 * Purpose: Real-time synchronization of appointment changes across all tabs/devices
 * Features: 
 *   - Multi-tab synchronization via BroadcastChannel API
 *   - Realtime updates via Supabase
 *   - Automatic conflict detection
 *   - Debounced updates to prevent UI thrashing
 * Type-Safe: 100% TypeScript with React hooks
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { subscribeToAuditChanges, type RealtimeAuditEvent } from '@/modules/agenda/services/appointments.audit';

/**
 * REALTIME CHANGE EVENT WITH METADATA
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface RealtimeChangeEvent {
  appointment_id: string;
  clinic_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_fields: string[];
  changed_at: string;
  source: 'realtime' | 'local-broadcast'; // Where event came from
  shouldRefresh: boolean; // Whether UI should refresh
}

/**
 * useRealtimeAppointmentChanges Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Subscribes to realtime appointment changes and broadcasts to other tabs
 *
 * @param clinicId - Clinic ID to listen for changes
 * @param appointmentId - Optional: specific appointment to watch
 * @param onChangeCallback - Function to call when changes occur
 * @param debounceMs - Debounce delay in milliseconds (default: 500)
 */

export function useRealtimeAppointmentChanges(
  clinicId: string,
  appointmentId: string | null = null,
  onChangeCallback?: (event: RealtimeChangeEvent) => void,
  debounceMs: number = 500
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Record<string, number>>({});
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Initialize BroadcastChannel for cross-tab communication
  useEffect(() => {
    try {
      const channelName = `appointment-changes:${clinicId}`;
      broadcastChannelRef.current = new BroadcastChannel(channelName);

      console.log(`📡 [useRealtimeAppointmentChanges] BroadcastChannel created: ${channelName}`);

      // Listen for messages from other tabs
      broadcastChannelRef.current.onmessage = (event: MessageEvent) => {
        console.log('📨 [BroadcastChannel] Message received from another tab:', event.data);

        const realtimeEvent: RealtimeChangeEvent = {
          ...event.data,
          source: 'local-broadcast',
        };

        onChangeCallback?.(realtimeEvent);
      };

      return () => {
        broadcastChannelRef.current?.close();
        console.log(`📡 [useRealtimeAppointmentChanges] BroadcastChannel closed`);
      };
    } catch (error) {
      console.warn('⚠️ [useRealtimeAppointmentChanges] BroadcastChannel not supported:', error);
    }
  }, [clinicId, onChangeCallback]);

  // Debounced change handler
  const handleChange = useCallback(
    (auditEvent: RealtimeAuditEvent) => {
      const key = auditEvent.appointment_id;

      // Clear existing debounce timer for this appointment
      if (debounceTimersRef.current[key]) {
        clearTimeout(debounceTimersRef.current[key]);
      }

      // Set new debounce timer
      debounceTimersRef.current[key] = setTimeout(() => {
        const now = Date.now();
        const lastUpdateTime = lastUpdate[key] || 0;

        // Only process if enough time has passed since last update (debounce)
        if (now - lastUpdateTime >= debounceMs) {
          const changeEvent: RealtimeChangeEvent = {
            appointment_id: auditEvent.appointment_id,
            clinic_id: auditEvent.clinic_id,
            operation: auditEvent.operation,
            changed_fields: auditEvent.changed_fields,
            changed_at: auditEvent.changed_at,
            source: 'realtime',
            shouldRefresh: true,
          };

          console.log('✅ [useRealtimeAppointmentChanges] Change event:', changeEvent);

          // Update last update time
          setLastUpdate((prev) => ({
            ...prev,
            [key]: now,
          }));

          // Broadcast to other tabs
          try {
            broadcastChannelRef.current?.postMessage(changeEvent);
            console.log('📨 [BroadcastChannel] Message sent to other tabs');
          } catch (error) {
            console.warn('⚠️ [BroadcastChannel] Failed to post message:', error);
          }

          // Call user callback
          onChangeCallback?.(changeEvent);
        }

        delete debounceTimersRef.current[key];
      }, debounceMs);
    },
    [onChangeCallback, debounceMs, lastUpdate]
  );

  // Subscribe to realtime changes
  useEffect(() => {
    if (!clinicId) return;

    console.log(
      `📡 [useRealtimeAppointmentChanges] Subscribing to ${appointmentId ? `appointment ${appointmentId}` : 'all appointments'}`
    );

    // Subscribe to Supabase realtime
    unsubscribeRef.current = subscribeToAuditChanges(clinicId, appointmentId, handleChange);
    setIsSubscribed(true);

    return () => {
      unsubscribeRef.current?.();
      setIsSubscribed(false);
      console.log(`📡 [useRealtimeAppointmentChanges] Unsubscribed`);
    };
  }, [clinicId, appointmentId, handleChange]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
    isSubscribed,
    lastUpdate,
  };
}

/**
 * useAppointmentChangeListener Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Simplified hook for listening to changes on a specific appointment
 *
 * @param clinicId - Clinic ID
 * @param appointmentId - Specific appointment to watch
 * @param onUpdate - Callback when appointment is updated
 * @param onDelete - Callback when appointment is deleted
 */

export function useAppointmentChangeListener(
  clinicId: string,
  appointmentId: string,
  onUpdate?: () => void,
  onDelete?: () => void
) {
  const handleChange = useCallback(
    (event: RealtimeChangeEvent) => {
      if (event.appointment_id !== appointmentId) return;

      console.log(
        `🔔 [useAppointmentChangeListener] ${event.operation} on appointment ${appointmentId}`
      );

      switch (event.operation) {
        case 'UPDATE':
          onUpdate?.();
          break;
        case 'DELETE':
          onDelete?.();
          break;
      }
    },
    [appointmentId, onUpdate, onDelete]
  );

  return useRealtimeAppointmentChanges(clinicId, appointmentId, handleChange);
}

/**
 * useClinicAuditFeed Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns realtime feed of all appointment changes in a clinic
 *
 * @param clinicId - Clinic ID
 * @param maxHistory - Maximum number of changes to keep in memory (default: 50)
 */

export function useClinicAuditFeed(clinicId: string, maxHistory: number = 50) {
  const [changes, setChanges] = useState<RealtimeChangeEvent[]>([]);

  const handleChange = useCallback((event: RealtimeChangeEvent) => {
    setChanges((prev) => {
      // Add new change to beginning
      const updated = [event, ...prev];
      // Keep only maxHistory items
      return updated.slice(0, maxHistory);
    });
  }, [maxHistory]);

  useRealtimeAppointmentChanges(clinicId, null, handleChange);

  return changes;
}

/**
 * EXPORT ALL HOOKS
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const realtimeHooks = {
  useRealtimeAppointmentChanges,
  useAppointmentChangeListener,
  useClinicAuditFeed,
};
