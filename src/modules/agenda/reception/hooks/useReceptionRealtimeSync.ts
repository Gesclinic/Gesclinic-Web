/**
 * Hook: useReceptionRealtimeSync
 * 
 * Sincroniza recepção entre múltiplas abas
 * Inclui deduplicação, reconexão e logging
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToWaitingQueue, subscribeToAppointmentStatusChanges } from '../services/receptionApi';
import { ReceptionRealtimeEvent, ReceptionRealtimeSyncState } from '../types/reception';

const RECONNECT_INTERVAL = 5000; // 5 segundos
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Hook para sincronizar recepção em tempo real
 * 
 * Características:
 * - Sincroniza entre múltiplas abas do navegador
 * - Deduplicação de eventos
 * - Reconexão automática com backoff exponencial
 * - Logging de eventos para debug
 * 
 * Uso:
 * ```
 * const { sync_state, on_event, off_event } = useReceptionRealtimeSync(clinic_id);
 * 
 * useEffect(() => {
 *   const handler = (event) => console.log('Evento:', event);
 *   on_event(handler);
 *   return () => off_event(handler);
 * }, [on_event, off_event]);
 * ```
 */
export function useReceptionRealtimeSync(clinic_id: string): ReturnType<
  typeof useReceptionRealtimeSync
> {
  const [syncState, setSyncState] = useState<ReceptionRealtimeSyncState>({
    is_connected: false,
    last_sync: new Date().toISOString(),
    pending_updates: 0,
    error: undefined,
  });

  const eventHandlers = useRef<Set<(event: ReceptionRealtimeEvent) => void>>(new Set());
  const processedEvents = useRef<Set<string>>(new Set());
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const unsubscribers = useRef<Array<() => void>>([]);

  // Broadcast Channel para sincronização entre abas
  const broadcastChannel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!clinic_id) return;

    // Inicializar Broadcast Channel
    try {
      broadcastChannel.current = new BroadcastChannel(`reception:${clinic_id}`);
      broadcastChannel.current.onmessage = (event) => {
        const incomingEvent = event.data as ReceptionRealtimeEvent;
        notifyHandlers(incomingEvent);
      };
    } catch (err) {
      console.warn('BroadcastChannel não suportado:', err);
    }

    // Subscribe aos eventos realtime
    const setupSubscriptions = () => {
      try {
        // Limpar subscriptions anteriores antes de criar novas
        unsubscribers.current.forEach((unsub) => {
          try {
            unsub();
          } catch (err) {
            console.warn('Erro ao limpar subscription anterior:', err);
          }
        });
        unsubscribers.current = [];

        // Subscribe à fila
        const unsubQueue = subscribeToWaitingQueue(clinic_id, () => {
          setSyncState((prev) => ({
            ...prev,
            is_connected: true,
            last_sync: new Date().toISOString(),
            pending_updates: Math.max(0, prev.pending_updates - 1),
            error: undefined,
          }));
          reconnectAttempts.current = 0;
        });

        // Subscribe aos status
        const unsubStatus = subscribeToAppointmentStatusChanges(clinic_id, (event) => {
          const receptionEvent: ReceptionRealtimeEvent = {
            type: event.eventType,
            table: 'reception_checkins',
            record: event.new,
            timestamp: new Date().toISOString(),
          };

          // Deduplicação: ignore se já processamos esse evento
          const eventId = `${event.new.id}-${event.new.updated_at}`;
          if (processedEvents.current.has(eventId)) {
            return;
          }

          processedEvents.current.add(eventId);

          // Limpar IDs antigos (manter últimos 100)
          if (processedEvents.current.size > 100) {
            const arr = Array.from(processedEvents.current);
            arr.slice(0, arr.length - 100).forEach((id) => processedEvents.current.delete(id));
          }

          notifyHandlers(receptionEvent);

          // Broadcast para outras abas
          if (broadcastChannel.current) {
            broadcastChannel.current.postMessage(receptionEvent);
          }

          setSyncState((prev) => ({
            ...prev,
            pending_updates: prev.pending_updates + 1,
          }));
        });

        unsubscribers.current = [unsubQueue, unsubStatus];

        setSyncState((prev) => ({
          ...prev,
          is_connected: true,
          error: undefined,
        }));
      } catch (err) {
        console.error('Erro ao se inscrever em eventos:', err);
        setSyncState((prev) => ({
          ...prev,
          is_connected: false,
          error: err instanceof Error ? err.message : 'Erro de conexão',
        }));

        // Tentar reconectar com backoff exponencial
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts.current - 1);
          reconnectTimer.current = setTimeout(setupSubscriptions, delay);
        }
      }
    };

    setupSubscriptions();

    return () => {
      // Cleanup
      unsubscribers.current.forEach((unsub) => unsub());
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (broadcastChannel.current) {
        broadcastChannel.current.close();
      }
    };
  }, [clinic_id]);

  const notifyHandlers = (event: ReceptionRealtimeEvent) => {
    eventHandlers.current.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('Erro ao notificar handler:', err);
      }
    });
  };

  const on_event = useCallback((callback: (event: ReceptionRealtimeEvent) => void) => {
    eventHandlers.current.add(callback);
  }, []);

  const off_event = useCallback((callback: (event: ReceptionRealtimeEvent) => void) => {
    eventHandlers.current.delete(callback);
  }, []);

  return {
    sync_state: syncState,
    on_event,
    off_event,
  };
}
