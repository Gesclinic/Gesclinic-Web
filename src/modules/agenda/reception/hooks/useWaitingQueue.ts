/**
 * Hook: useWaitingQueue
 * 
 * Gerencia a fila de espera com realtime updates
 * Inclui cache, auto-refresh e estatísticas
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWaitingQueue,
  getWaitingQueueStats,
  subscribeToWaitingQueue,
} from '../services/receptionApi';
import {
  WaitingQueueAppointment,
  WaitingQueueStats,
  UseWaitingQueueState,
  WaitingQueueParams,
} from '../types/reception';

const CACHE_TIME = 30 * 1000; // 30 segundos
const STALE_TIME = 5 * 1000; // 5 segundos

/**
 * Hook para gerenciar fila de espera em tempo real
 * 
 * Uso:
 * ```
 * const { queue, stats, loading, is_live, refetch } = useWaitingQueue(clinic_id);
 * 
 * return (
 *   <div>
 *     <h2>Fila: {queue.length} pacientes</h2>
 *     <p>Tempo médio: {stats.average_wait_time_minutes}min</p>
 *     {queue.map(apt => (
 *       <div key={apt.appointment_id}>
 *         {apt.patient_name} - {apt.tempo_espera_minutos}min
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useWaitingQueue(clinic_id: string): UseWaitingQueueState {
  const [isLive, setIsLive] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  const queryClient = useQueryClient();

  // Query: Obter fila
  const { data: queueData, isLoading: queueLoading, error: queueError } = useQuery({
    queryKey: ['waiting_queue', clinic_id],
    queryFn: () => getWaitingQueue({ clinic_id, limit: 100 }),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!clinic_id,
  });

  // Query: Obter estatísticas
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['waiting_queue_stats', clinic_id],
    queryFn: async () => {
      const result = await getWaitingQueueStats(clinic_id);
      return result.stats;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!clinic_id,
  });

  // Subscribe realtime
  useEffect(() => {
    if (!clinic_id) return;

    try {
      const unsubscribeFn = subscribeToWaitingQueue(clinic_id, () => {
        setIsLive(true);
        // Invalidar queries para refetch
        queryClient.invalidateQueries({ queryKey: ['waiting_queue', clinic_id] });
        queryClient.invalidateQueries({ queryKey: ['waiting_queue_stats', clinic_id] });
      });

      setUnsubscribe(() => unsubscribeFn);

      return () => {
        unsubscribeFn();
        setIsLive(false);
      };
    } catch (err) {
      console.error('Erro ao se inscrever na fila:', err);
    }
  }, [clinic_id, queryClient]);

  const refetch = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['waiting_queue', clinic_id] });
    await queryClient.refetchQueries({ queryKey: ['waiting_queue_stats', clinic_id] });
  }, [clinic_id, queryClient]);

  // Memoizar resultado
  const result: UseWaitingQueueState = useMemo(
    () => ({
      queue: queueData?.queue || [],
      stats: statsData || {
        total_waiting: 0,
        total_in_progress: 0,
        average_wait_time_minutes: 0,
        max_wait_time_minutes: 0,
        critical_count: 0,
        warning_count: 0,
      },
      loading: queueLoading || statsLoading,
      error: (queueError as any)?.message,
      is_live: isLive,
      refetch,
    }),
    [queueData, statsData, queueLoading, statsLoading, queueError, isLive, refetch]
  );

  return result;
}
