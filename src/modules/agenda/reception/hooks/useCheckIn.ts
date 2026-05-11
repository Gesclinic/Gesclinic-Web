/**
 * Hook: useCheckIn
 * 
 * Gerencia a lógica de check-in de paciente na recepção
 * Inclui validação, otimismo e cache invalidation
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { performCheckIn } from '../services/receptionApi';
import { CheckInParams, UseCheckInState } from '../types/reception';

/**
 * Hook para gerenciar check-in
 * 
 * Uso:
 * ```
 * const { loading, error, success, perform_checkin, reset } = useCheckIn(clinic_id);
 * 
 * async function handleCheckIn(appointment_id: string) {
 *   await perform_checkin({
 *     appointment_id,
 *     notes: 'Chegou na recepção'
 *   });
 * }
 * ```
 */
export function useCheckIn(clinic_id: string): UseCheckInState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [checkin_id, setCheckInId] = useState<string>();

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const perform_checkin = useCallback(
    async (params: CheckInParams) => {
      if (!user?.id) {
        setError('Usuário não autenticado');
        return;
      }

      setLoading(true);
      setError(undefined);
      setSuccess(false);

      try {
        // Validações básicas
        if (!params.appointment_id) {
          throw new Error('ID do agendamento não fornecido');
        }

        if (!clinic_id) {
          throw new Error('ID da clínica não fornecido');
        }

        // Executar check-in
        const result = await performCheckIn({
          ...params,
          clinic_id,
          checked_in_by: user.id,
        });

        if (!result.success) {
          throw new Error(result.message || 'Erro ao fazer check-in');
        }

        // Sucesso!
        setSuccess(true);
        setCheckInId(result.checkin_id);

        // Invalidar queries relacionadas
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['waiting_queue', clinic_id] }),
          queryClient.invalidateQueries({
            queryKey: ['appointment', params.appointment_id],
          }),
          queryClient.invalidateQueries({
            queryKey: ['reception_operations', clinic_id],
          }),
        ]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    },
    [clinic_id, user?.id, queryClient]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(undefined);
    setSuccess(false);
    setCheckInId(undefined);
  }, []);

  return {
    loading,
    error,
    success,
    checkin_id,
    perform_checkin,
    reset,
  };
}
