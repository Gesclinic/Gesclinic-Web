/**
 * ⚡ Query Invalidation Helper - Invalidação Seletiva
 * 
 * PROBLEMA:
 * invalidateQueries(['appointments']) invalida TODAS as queries de appointments
 * (muito genérico, causa refetch desnecessário)
 * 
 * SOLUÇÃO:
 * Invalidar apenas queries específicas baseado em clinic_id, date, etc
 * 
 * Uso:
 * const { invalidateAppointments } = useQueryInvalidation();
 * 
 * // Invalida apenas a query do dia específico
 * invalidateAppointments({ clinic_id: 'clinic-123', date: '2026-05-10' });
 * 
 * // Invalida apenas queries de um profissional
 * invalidateAppointments({ clinic_id: 'clinic-123', professional_id: 'prof-456' });
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export function useQueryInvalidation() {
  const queryClient = useQueryClient();

  /**
   * 🔄 Invalidar appointments - SELETIVO
   * 
   * Opções:
   * - clinic_id (obrigatório)
   * - date (YYYY-MM-DD) - invalida apenas esse dia
   * - professional_id - invalida apenas profissional
   * - room_id - invalida apenas sala
   * - range: { start, end } - invalida intervalo
   */
  const invalidateAppointments = useCallback(
    async (options = {}) => {
      const { clinic_id, date, professional_id, room_id, range } = options;

      if (!clinic_id) {
        console.warn('[useQueryInvalidation] clinic_id obrigatório');
        return;
      }

      console.log('[useQueryInvalidation] Invalidando appointments', {
        clinic_id,
        date,
        professional_id,
        room_id,
        range,
      });

      // Caso 1: Invalidar dia específico
      if (date) {
        await queryClient.invalidateQueries({
          queryKey: ['appointments', clinic_id, date],
          exact: true,
        });
        console.log('[useQueryInvalidation] ✅ Invalidadas queries do dia:', date);
        return;
      }

      // Caso 2: Invalidar intervalo de datas
      if (range?.start && range?.end) {
        const queries = queryClient.getQueryCache().getAll();
        const toInvalidate = queries.filter((query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;

          // Match: ['appointments', clinic_id, 'YYYY-MM-DD']
          if (key[0] === 'appointments' && key[1] === clinic_id && typeof key[2] === 'string') {
            const date = key[2];
            return date >= range.start && date <= range.end;
          }
          return false;
        });

        for (const query of toInvalidate) {
          await queryClient.invalidateQueries({ queryKey: query.queryKey });
        }
        console.log('[useQueryInvalidation] ✅ Invalidadas queries do intervalo:', range);
        return;
      }

      // Caso 3: Invalidar todas appointments da clínica (fallback)
      await queryClient.invalidateQueries({
        queryKey: ['appointments', clinic_id],
      });
      console.log('[useQueryInvalidation] ✅ Invalidadas todas queries da clínica:', clinic_id);
    },
    [queryClient]
  );

  /**
   * 🔄 Invalidar dashboard KPIs - SELETIVO
   */
  const invalidateDashboard = useCallback(
    async (options = {}) => {
      const { clinic_id, range } = options;

      if (!clinic_id) {
        console.warn('[useQueryInvalidation] clinic_id obrigatório');
        return;
      }

      if (range?.start && range?.end) {
        await queryClient.invalidateQueries({
          queryKey: ['agenda_kpis', clinic_id, range.start, range.end],
          exact: true,
        });
        console.log('[useQueryInvalidation] ✅ Invalidadas KPIs do intervalo:', range);
      }
    },
    [queryClient]
  );

  /**
   * 🔄 Invalidar notificações do usuário
   */
  const invalidateNotifications = useCallback(
    async (userId) => {
      if (!userId) {
        console.warn('[useQueryInvalidation] userId obrigatório');
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ['notifications', userId],
        exact: true,
      });
      console.log('[useQueryInvalidation] ✅ Invalidadas notificações do usuário:', userId);
    },
    [queryClient]
  );

  /**
   * 🧹 Limpar cache específico (sem refetch)
   * Útil para quando sabemos que os dados estão desatualizados
   */
  const removeFromCache = useCallback(
    (queryKey) => {
      queryClient.removeQueries({ queryKey });
      console.log('[useQueryInvalidation] 🗑️ Removidas queries:', queryKey);
    },
    [queryClient]
  );

  /**
   * 📊 Get status das queries
   */
  const getQueryStatus = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();
    const summary = {
      total: queries.length,
      fresh: 0,
      stale: 0,
      error: 0,
    };

    queries.forEach((query) => {
      if (query.state.status === 'error') {
        summary.error++;
      } else if (query.isStale()) {
        summary.stale++;
      } else {
        summary.fresh++;
      }
    });

    return summary;
  }, [queryClient]);

  return {
    invalidateAppointments,
    invalidateDashboard,
    invalidateNotifications,
    removeFromCache,
    getQueryStatus,
  };
}

export default useQueryInvalidation;
