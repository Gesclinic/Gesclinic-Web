/**
 * useFinancialPrioritySuggestions Hook
 *
 * Hook customizado para gerenciar sugestões financeiras
 * - Carrega sugestões baseadas em data e clínica
 * - Executa ações (criar encaixe, ignorar)
 * - Registra auditoria
 * - Gerencia estado de carregamento e erro
 */

import { useState, useEffect, useCallback } from 'react';
import {
  generateFinancialPrioritySuggestions,
  logFinancialSuggestionAction,
} from '../../../lib/financialPriorityApi';

/**
 * Hook para gerenciar sugestões de prioridade financeira
 *
 * @param {string} clinicId - ID da clínica
 * @param {string} date - Data no formato YYYY-MM-DD
 * @param {Object} options - Opções de configuração
 * @param {number} options.limit - Número máximo de sugestões (default: 5)
 * @param {string} options.minPriority - Prioridade mínima (default: BAIXA)
 * @param {boolean} options.autoLoad - Carregar automaticamente (default: true)
 * @param {number} options.refreshInterval - Intervalo de refresh em ms (default: 0, desativado)
 * @returns {Object} Estado e funções
 */
export function useFinancialPrioritySuggestions(clinicId, date, options = {}) {
  const { limit = 5, minPriority = 'BAIXA', autoLoad = true, refreshInterval = 0 } = options;

  // Estado
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // ========================================
  // Load Suggestions
  // ========================================

  const loadSuggestions = useCallback(async () => {
    if (!clinicId || !date) {
      console.warn('[useFinancialPrioritySuggestions] clinicId ou date inválidos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await generateFinancialPrioritySuggestions(clinicId, date, {
        limit,
        minPriority,
      });

      setSuggestions(data || []);
      setLastFetch(new Date());

      console.log('[useFinancialPrioritySuggestions] Sugestões carregadas:', data.length);
    } catch (err) {
      console.error('[useFinancialPrioritySuggestions] Erro ao carregar:', err);
      setError({
        message: err.message || 'Erro ao carregar sugestões',
        details: err,
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId, date, limit, minPriority]);

  // ========================================
  // Auto-load on mount or when deps change
  // ========================================

  useEffect(() => {
    if (autoLoad) {
      loadSuggestions();
    }
  }, [autoLoad, loadSuggestions]);

  // ========================================
  // Refresh Interval
  // ========================================

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      console.log('[useFinancialPrioritySuggestions] Refresh automático');
      loadSuggestions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, loadSuggestions]);

  // ========================================
  // Execute Suggestion Action
  // ========================================

  const executeSuggestion = useCallback(
    async (suggestion, appointmentId, executedBy) => {
      if (!suggestion || !appointmentId) {
        return {
          success: false,
          error: 'Dados incompletos',
        };
      }

      try {
        // Registrar auditoria
        const result = await logFinancialSuggestionAction({
          clinic_id: clinicId,
          appointment_id: appointmentId,
          score_financeiro: suggestion.score_financeiro,
          valor_estimado: suggestion.valor_estimado,
          executed_by: executedBy,
        });

        console.log('[useFinancialPrioritySuggestions] Ação executada:', result);

        return {
          success: result.success,
          data: result.data,
          error: result.error,
        };
      } catch (err) {
        console.error('[useFinancialPrioritySuggestions] Erro ao executar:', err);
        return {
          success: false,
          error: err.message,
        };
      }
    },
    [clinicId],
  );

  // ========================================
  // Create Appointment from Suggestion
  // ========================================

  const createAppointmentFromSuggestion = useCallback(
    async (suggestion, appointmentData, executedBy) => {
      try {
        // Aqui você faria a chamada para criar o agendamento
        // Este é um placeholder - adaptar conforme sua API
        console.log('[useFinancialPrioritySuggestions] Criando agendamento:', {
          suggestion,
          appointmentData,
        });

        // Após criar, registrar auditoria
        if (appointmentData.id) {
          await executeSuggestion(suggestion, appointmentData.id, executedBy);
        }

        return {
          success: true,
          appointmentId: appointmentData.id,
        };
      } catch (err) {
        console.error('[useFinancialPrioritySuggestions] Erro ao criar agendamento:', err);
        return {
          success: false,
          error: err.message,
        };
      }
    },
    [executeSuggestion],
  );

  // ========================================
  // Ignore Suggestion
  // ========================================

  const ignoreSuggestion = useCallback((suggestionId) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    console.log('[useFinancialPrioritySuggestions] Sugestão ignorada:', suggestionId);
  }, []);

  // ========================================
  // Manual Refresh
  // ========================================

  const refresh = useCallback(() => {
    console.log('[useFinancialPrioritySuggestions] Refresh manual');
    loadSuggestions();
  }, [loadSuggestions]);

  // ========================================
  // Get Statistics
  // ========================================

  const stats = {
    total: suggestions.length,
    byPriority: {
      ALTA: suggestions.filter((s) => s.prioridade === 'ALTA').length,
      MEDIA: suggestions.filter((s) => s.prioridade === 'MEDIA').length,
      BAIXA: suggestions.filter((s) => s.prioridade === 'BAIXA').length,
    },
    totalValue: suggestions.reduce((sum, s) => sum + (s.valor_estimado || 0), 0),
    totalMargin: suggestions.reduce((sum, s) => sum + (s.margem_estimada || 0), 0),
    averageScore:
      suggestions.length > 0
        ? Math.round(
          suggestions.reduce((sum, s) => sum + s.score_financeiro, 0) / suggestions.length,
        )
        : 0,
  };

  // ========================================
  // Return Hook Interface
  // ========================================

  return {
    // Estado
    suggestions,
    loading,
    error,
    lastFetch,

    // Ações
    loadSuggestions,
    refresh,
    executeSuggestion,
    createAppointmentFromSuggestion,
    ignoreSuggestion,

    // Estatísticas
    stats,

    // Helpers
    isEmpty: suggestions.length === 0,
    hasError: error !== null,
  };
}

export default useFinancialPrioritySuggestions;
