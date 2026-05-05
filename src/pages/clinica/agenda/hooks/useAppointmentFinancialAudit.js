/**
 * Custom Hook: useAppointmentFinancialAudit
 *
 * Hook para gerenciar auditoria financeira de atendimentos
 * com auto-refresh e sincronização
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAppointmentFinancialAuditTrail,
  getAppointmentFinancialSummary,
  checkFinancialDivergences,
} from '@/lib/auditFinancialApi';

export function useAppointmentFinancialAudit(appointmentId, options = {}) {
  const {
    autoLoad = true,
    refreshInterval = null, // milliseconds
    onError = null,
  } = options;

  const [trail, setTrail] = useState([]);
  const [summary, setSummary] = useState(null);
  const [divergences, setDivergences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Função para carregar auditoria
  const loadAudit = useCallback(
    async (appointmentId) => {
      if (!appointmentId) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [auditTrail, financialSummary, divergencesList] = await Promise.all([
          getAppointmentFinancialAuditTrail(appointmentId),
          getAppointmentFinancialSummary(appointmentId),
          checkFinancialDivergences(appointmentId),
        ]);

        setTrail(auditTrail || []);
        setSummary(financialSummary);
        setDivergences(divergencesList || []);
        setLastFetch(new Date());
      } catch (err) {
        const errorMsg = err.message || 'Erro ao carregar auditoria';
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  // Auto-load inicial
  useEffect(() => {
    if (autoLoad && appointmentId) {
      loadAudit(appointmentId);
    }
  }, [appointmentId, autoLoad, loadAudit]);

  // Refresh automático periodicamente
  useEffect(() => {
    if (!refreshInterval || !appointmentId) {
      return;
    }

    const interval = setInterval(() => {
      loadAudit(appointmentId);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, appointmentId, loadAudit]);

  // Funções públicas
  const refresh = useCallback(async () => {
    await loadAudit(appointmentId);
  }, [appointmentId, loadAudit]);

  return {
    // Data
    trail,
    summary,
    divergences,
    lastFetch,

    // State
    loading,
    error,
    isEmpty: trail.length === 0,
    hasError: error !== null,
    hasDivergences: divergences.length > 0,

    // Methods
    refresh,
    loadAudit,
  };
}

export default useAppointmentFinancialAudit;
