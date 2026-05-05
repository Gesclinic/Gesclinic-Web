// src/hooks/useFeatureBlocker.js
// ============================================================
// Hook para bloquear funcionalidades baseado em config da clínica
// ============================================================

import { useCallback } from 'react';
import * as baseSystemApi from '@/lib/baseSystemApi';

/**
 * Hook que fornece validações para bloquear funcionalidades
 *
 * Bloqueios:
 * - Agenda: Sem vínculo profissional-serviço
 * - Check-in: Sem serviço cadastrado
 * - Faturamento: Sem convênio cadastrado
 */
export function useFeatureBlocker(clinicId) {
  /**
   * Valida se agenda pode ser acessada
   * @returns {Promise<{blocked: boolean, reason: string}>}
   */
  const canAccessAgenda = useCallback(async () => {
    try {
      const { counts } = await baseSystemApi.calculateProgressPercentage(clinicId);

      // Bloquear se não há vínculos profissional-serviço
      if (!counts.professionalServices || counts.professionalServices === 0) {
        return {
          blocked: true,
          reason:
            '� Agenda bloqueada: Configure vinculações em Regras Operacionais > Profissionais × Serviços',
          action: 'base-sistema/professional-services',
        };
      }

      return { blocked: false };
    } catch (error) {
      console.error('Erro ao validar acesso à agenda:', error);
      return { blocked: true, reason: 'Erro ao validar acesso' };
    }
  }, [clinicId]);

  /**
   * Valida se check-in pode ser acessado
   * @returns {Promise<{blocked: boolean, reason: string}>}
   */
  const canAccessCheckIn = useCallback(async () => {
    try {
      const { counts } = await baseSystemApi.calculateProgressPercentage(clinicId);

      // Bloquear se não há serviços cadastrados
      if (!counts.services || counts.services === 0) {
        return {
          blocked: true,
          reason: '✅ Check-in bloqueado: Cadastre serviços em Cadastros Estruturais > Serviços',
          action: 'base-sistema/servicos',
        };
      }

      return { blocked: false };
    } catch (error) {
      console.error('Erro ao validar acesso ao check-in:', error);
      return { blocked: true, reason: 'Erro ao validar acesso' };
    }
  }, [clinicId]);

  /**
   * Valida se faturamento pode ser acessado
   * @returns {Promise<{blocked: boolean, reason: string}>}
   */
  const canAccessFinance = useCallback(async () => {
    try {
      const { counts } = await baseSystemApi.calculateProgressPercentage(clinicId);

      // Bloquear se não há convênios cadastrados
      if (!counts.insurances || counts.insurances === 0) {
        return {
          blocked: true,
          reason:
            '� Faturamento bloqueado: Cadastre convênios em Cadastros Estruturais > Convênios (ou configure como clínica particular)',
          action: 'base-sistema/convenios',
        };
      }

      return { blocked: false };
    } catch (error) {
      console.error('Erro ao validar acesso ao faturamento:', error);
      return { blocked: true, reason: 'Erro ao validar acesso' };
    }
  }, [clinicId]);

  /**
   * Valida acesso geral a uma feature
   * @param {string} feature - 'agenda', 'checkin', 'finance'
   */
  const validateFeatureAccess = useCallback(
    async (feature) => {
      switch (feature.toLowerCase()) {
        case 'agenda':
          return canAccessAgenda();
        case 'checkin':
        case 'check-in':
          return canAccessCheckIn();
        case 'finance':
        case 'faturamento':
          return canAccessFinance();
        default:
          return { blocked: false };
      }
    },
    [canAccessAgenda, canAccessCheckIn, canAccessFinance],
  );

  return {
    canAccessAgenda,
    canAccessCheckIn,
    canAccessFinance,
    validateFeatureAccess,
  };
}
