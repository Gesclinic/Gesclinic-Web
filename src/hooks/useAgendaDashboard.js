import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';

/**
 * useAgendaDashboard - KPIs em tempo real com cache inteligente
 * 
 * CORREÇÕES APLICADAS:
 * ✅ RealtimeManager para deduplicação
 * ✅ `load` em dependencies (evita stale closure)
 * ✅ Throttle de refetch (evita refetch excessivo)
 * ✅ Logs estruturados
 * ✅ Cleanup seguro
 */
export function useAgendaDashboard(range) {
  const { clinicId } = useClinicContext();
  const manager = useRealtimeManager(clinicId);
  
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // 📝 Carregar dados - memoizado para evitar closures
  const load = useCallback(async () => {
    if (!clinicId || !range.start || !range.end) {
      return;
    }

    // Throttle: não refetch se foi feito há menos de 1s
    if (lastRefresh && Date.now() - lastRefresh < 1000) {
      console.log('[useAgendaDashboard] Throttle: ignorando refetch muito rápido');
      return;
    }

    try {
      setLoading(true);
      console.log('[useAgendaDashboard] Carregando KPIs', { clinicId, range });

      const { data, error } = await supabase
        .from('view_agenda_kpis')
        .select('*')
        .eq('clinic_id', clinicId)
        .gte('day', range.start)
        .lte('day', range.end);

      if (error) {
        console.error('[useAgendaDashboard] Erro ao carregar:', error);
        return;
      }

      setRows(data || []);
      setLastRefresh(Date.now());
      console.log('[useAgendaDashboard] ✅ KPIs carregadas:', data?.length);
    } catch (err) {
      console.error('[useAgendaDashboard] Erro:', err.message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, range.start, range.end, lastRefresh]);

  // 🔗 Setup realtime - agora com `load` nas dependências
  useEffect(() => {
    // Carregar dados inicialmente
    load();

    if (!clinicId) {
      return;
    }

    console.log('[useAgendaDashboard] Setup realtime para KPIs', { clinicId });

    // Subscribe a mudanças de appointments (que afetam KPIs)
    const unsubscribe = manager.subscribe('appointments', {
      onUpdate: (payload) => {
        console.log('[useAgendaDashboard] 📬 Atualização detectada, recarregando KPIs');
        load();
      },
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [clinicId, load, manager]);

  return {
    rows,
    loading,
    refresh: load,
  };
}
