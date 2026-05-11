import { useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';

/**
 * useAgendaLive - Hook para monitorar mudanças de agendamentos em realtime
 * 
 * CORREÇÕES APLICADAS:
 * ✅ Usa RealtimeManager centralizado (evita múltiplos listeners)
 * ✅ Deduplicação de eventos automaticamente
 * ✅ Cleanup seguro ao desmontar
 * ✅ Reconexão automática com backoff
 * ✅ Logs estruturados para debug
 * 
 * Uso:
 * const { isLive } = useAgendaLive({ onChange: handleUpdate });
 */
export function useAgendaLive({ onChange, events = '*' } = {}) {
  const { clinicId } = useClinicContext();
  const manager = useRealtimeManager(clinicId);

  useEffect(() => {
    if (!clinicId || !onChange) {
      return;
    }

    console.log('[useAgendaLive] Setup realtime para appointments', { clinicId });

    // Subscribe usando RealtimeManager
    const unsubscribe = manager.subscribe('appointments', {
      onUpdate: (payload) => {
        console.log('📬 [useAgendaLive] Evento recebido:', {
          event: payload.eventType,
          recordId: payload.new?.id || payload.old?.id,
        });
        onChange(payload);
      },
      events,
      filter: `clinic_id=eq.${clinicId}`,
    });

    // Cleanup ao desmontar
    return () => {
      console.log('[useAgendaLive] Limpando subscription');
      unsubscribe();
    };
  }, [clinicId, onChange, events, manager]);

  return {
    isLive: manager.status?.isConnected ?? false,
    subscriptionStatus: manager.getStatus(),
  };
}
