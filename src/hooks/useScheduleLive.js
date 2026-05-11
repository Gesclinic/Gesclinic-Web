import { useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';

/**
 * useScheduleLive - Monitor em realtime de mudanças de agendamentos
 * 
 * CORREÇÕES APLICADAS:
 * ✅ Usa RealtimeManager (deduplicação, cleanup, reconexão)
 * ✅ Dependency array completo
 * ✅ Logs estruturados
 * ✅ Sem memory leaks
 */
export default function useScheduleLive({ onChange } = {}) {
  const { clinicId } = useClinicContext();
  const manager = useRealtimeManager(clinicId);

  useEffect(() => {
    if (!clinicId || !onChange) {
      return;
    }

    console.log('[useScheduleLive] Setup realtime para agendamentos', { clinicId });

    // Subscribe
    const unsubscribe = manager.subscribe('appointments', {
      onUpdate: (payload) => {
        console.log('📬 [useScheduleLive] Mudança detectada:', {
          event: payload.eventType,
          id: payload.new?.id || payload.old?.id,
        });
        onChange(payload);
      },
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [clinicId, onChange, manager]);

  return null;
}
