/**
 * ✅ EXEMPLO: Como usar RealtimeManager + QueryInvalidation na Agenda
 * 
 * Este arquivo demonstra o padrão correto para integrar realtime
 * com cache invalidation seletiva.
 * 
 * ANTES (❌ Com problemas):
 * - Múltiplos listeners para mesma tabela
 * - Refetch excessivo
 * - Memory leaks
 * - Race conditions
 * 
 * DEPOIS (✅ Com RealtimeManager):
 * - Um listener centralizado por tabela/clínica
 * - Refetch seletivo
 * - Cleanup automático
 * - Deduplicação de eventos
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';
import { useQueryInvalidation } from '@/hooks/useQueryInvalidation';

/**
 * ============================================================
 * PADRÃO RECOMENDADO: useAgendaRealtime
 * ============================================================
 * 
 * Uso em componentes:
 * const { isLive, appointmentCount } = useAgendaRealtime(selectedDate);
 */
export function useAgendaRealtime(selectedDate) {
  const { clinicId } = useClinicContext();
  const manager = useRealtimeManager(clinicId);
  const { invalidateAppointments } = useQueryInvalidation();

  /**
   * 📬 Callback que processa eventos realtime
   */
  const handleAppointmentChange = useCallback(
    async (payload) => {
      console.log('[useAgendaRealtime] 📬 Evento de agendamento:', {
        event: payload.eventType,
        appointmentId: payload.new?.id || payload.old?.id,
      });

      // Invalidar APENAS a query do dia que foi modificado
      const changedDate = payload.new?.scheduled_date || payload.old?.scheduled_date;
      
      if (changedDate) {
        console.log('[useAgendaRealtime] 🔄 Invalidando cache do dia:', changedDate);
        await invalidateAppointments({
          clinic_id: clinicId,
          date: changedDate, // ⭐ SELETIVO: apenas esse dia
        });
      }
    },
    [clinicId, invalidateAppointments]
  );

  /**
   * 🔗 Setup realtime com cleanup automático
   */
  useEffect(() => {
    if (!clinicId || !selectedDate) {
      return;
    }

    console.log('[useAgendaRealtime] ✅ Setup realtime', {
      clinic: clinicId,
      date: selectedDate,
    });

    // Subscribe com RealtimeManager (centralizado)
    const unsubscribe = manager.subscribe('appointments', {
      onUpdate: handleAppointmentChange,
      filter: `clinic_id=eq.${clinicId}`,
    });

    // Cleanup ao desmontar
    return () => {
      console.log('[useAgendaRealtime] 🧹 Cleanup realtime');
      unsubscribe();
    };
  }, [clinicId, selectedDate, manager, handleAppointmentChange]);

  return {
    isLive: manager.status?.isConnected ?? false,
  };
}

/**
 * ============================================================
 * PADRÃO: AgendaPage com Realtime + Cache
 * ============================================================
 * 
 * Componente exemplo que usa o hook corretamente
 */
export function AgendaPageWithRealtime() {
  const { clinicId } = useClinicContext();
  const [selectedDate, setSelectedDate] = React.useState('2026-05-10');

  // Setup realtime + invalidation automático
  const { isLive } = useAgendaRealtime(selectedDate);

  // Get appointments via React Query
  const { data: appointments, refetch } = React.useQuery({
    queryKey: ['appointments', clinicId, selectedDate],
    queryFn: async () => {
      console.log('[AgendaPage] 📥 Buscando appointments do dia:', selectedDate);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('scheduled_date', selectedDate);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId && !!selectedDate,
    staleTime: 5000, // Cache por 5 segundos
    gcTime: 30000, // Garbage collect após 30 segundos
  });

  return (
    <div>
      {/* Status de conexão */}
      <div className={`p-2 text-sm ${isLive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
        {isLive ? '✅ Realtime Conectado' : '⚠️ Realtime Desconectado'}
      </div>

      {/* Agenda */}
      <div>
        <h2>Agendamentos de {selectedDate}</h2>
        <p>Total: {appointments?.length || 0}</p>
        {/* ... render appointments ... */}
      </div>
    </div>
  );
}

/**
 * ============================================================
 * COMPARAÇÃO: ANTES vs DEPOIS
 * ============================================================
 * 
 * ANTES (❌ useAgendaLive antigo):
 * 
 * export function useAgendaLive(onChange) {
 *   useEffect(() => {
 *     const channel = supabase.channel('agenda-events')
 *       .on('postgres_changes', { event: '*', table: 'appointments' }, onChange)
 *       .subscribe();
 *     return () => supabase.removeChannel(channel);
 *   }, []); // ❌ PROBLEMA: missing onChange dependency!
 * }
 * 
 * PROBLEMAS:
 * - onChange sempre stale (closure de primeira renderização)
 * - Não trata reconexão
 * - Sem deduplicação
 * - Sem logs estruturados
 * - Sem broadcast cross-tab
 * 
 * 
 * DEPOIS (✅ useRealtimeManager):
 * 
 * export function useAgendaLive({ onChange } = {}) {
 *   const { clinicId } = useClinicContext();
 *   const manager = useRealtimeManager(clinicId);
 * 
 *   useEffect(() => {
 *     const unsubscribe = manager.subscribe('appointments', {
 *       onUpdate: onChange,
 *       filter: `clinic_id=eq.${clinicId}`,
 *     });
 *     return () => unsubscribe();
 *   }, [clinicId, onChange, manager]); // ✅ Dependências corretas
 * }
 * 
 * BENEFÍCIOS:
 * - ✅ Dependencies corretas (sem closures stale)
 * - ✅ Reconnection com backoff exponencial
 * - ✅ Deduplicação automática
 * - ✅ Logs estruturados com timestamp
 * - ✅ Broadcast Channel para cross-tab
 * - ✅ Memory leak prevention
 * - ✅ Único listener centralizado por clínica
 */

/**
 * ============================================================
 * CHECKLIST DE VALIDAÇÃO
 * ============================================================
 * 
 * Para cada hook/componente que usa realtime:
 * 
 * ☑️ 1. Usar RealtimeManager (não criar canais diretos)
 * ☑️ 2. Incluir dependencies corretas em useEffect
 * ☑️ 3. Usar useQueryInvalidation para cache (não invalidateQueries genérico)
 * ☑️ 4. Ter cleanup function (unsubscribe)
 * ☑️ 5. Adicionar console.log com timestamp
 * ☑️ 6. Testar em 2 abas simultâneas (Broadcast Channel)
 * ☑️ 7. Testar reconexão (disable network, esperar, reconectar)
 * ☑️ 8. Verificar memory leaks (DevTools > Memory)
 * 
 * TESTE MANUAL:
 * 
 * 1. Abra Agenda em 2 abas
 * 2. Na aba 1, crie um agendamento
 * 3. Espere < 1 segundo
 * 4. Verifique se aparece na aba 2
 * 5. Abra Console (F12) e verifique logs
 * 6. Desabilite internet (DevTools > Network > Offline)
 * 7. Habilite internet novamente
 * 8. Verifique se reconecta automaticamente
 */
