// src/pages/clinica/base-sistema/useSetupWizard.js
// ============================================================
// HOOK - Setup Wizard Logic
// ============================================================
// Gerencia estado e lógica do wizard de configuração

import { useState, useEffect, useCallback } from "react";
import * as baseSystemApi from "@/lib/baseSystemApi";
import { isWizardComplete } from "./setupWizardSteps";

/**
 * Hook para gerenciar o estado do wizard
 * @param {string} clinicId
 * @param {Object} options
 * @returns {Object}
 */
export function useSetupWizard(clinicId, options = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 5000,
    onComplete = null,
    onError = null,
  } = options;

  const [wizardStatus, setWizardStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  // Load wizard status
  const loadStatus = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const steps = await baseSystemApi.getSetupWizardStatus(clinicId);

      // Ensure steps is an array
      if (!Array.isArray(steps)) {
        setWizardStatus({});
        setIsComplete(false);
        return;
      }

      const statusMap = {};
      steps.forEach((step) => {
        statusMap[step.step] = {
          completed: step.completed,
          count: step.count,
        };
      });

      setWizardStatus(statusMap);
      
      // Check if complete using safe method
      try {
        const complete = isWizardComplete(statusMap);
        setIsComplete(complete);
      } catch (e) {
        console.warn("Error checking wizard completion:", e);
        setIsComplete(false);
      }
      
      setError(null);

      if (isComplete && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Erro ao carregar wizard status:", err);
      setError(err.message || "Erro ao carregar status");
      setWizardStatus({});
      setIsComplete(false);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [clinicId, onComplete, onError]);

  // Setup load on mount
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Get specific step status
  const getStepStatus = useCallback((stepId) => {
    return wizardStatus?.[stepId] || { completed: false, count: 0 };
  }, [wizardStatus]);

  // Get issues from base system
  const getValidationIssues = useCallback(async () => {
    if (!clinicId) return [];
    try {
      const validation = await baseSystemApi.validateBaseSystemSetup(clinicId);
      return validation.issues || [];
    } catch (err) {
      console.error("Erro ao validar sistema:", err);
      return [];
    }
  }, [clinicId]);

  // Get warnings
  const getValidationWarnings = useCallback(async () => {
    if (!clinicId) return [];
    try {
      const validation = await baseSystemApi.validateBaseSystemSetup(clinicId);
      return validation.warnings || [];
    } catch (err) {
      console.error("Erro ao validar sistema:", err);
      return [];
    }
  }, [clinicId]);

  // Refresh manually
  const refresh = useCallback(() => {
    return loadStatus();
  }, [loadStatus]);

  return {
    wizardStatus,
    loading,
    error,
    isComplete,
    getStepStatus,
    getValidationIssues,
    getValidationWarnings,
    refresh,
  };
}

/**
 * Hook para bloqueio de features baseado no wizard
 * @param {string} clinicId
 * @returns {Object}
 */
export function useWizardBlocker(clinicId) {
  const [blockedFeatures, setBlockedFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBlockers = async () => {
      try {
        const validation = await baseSystemApi.validateBaseSystemSetup(clinicId);
        
        // Feature blocker rules
        const blockers = [];

        // Se tem issues, bloqueia agenda
        if (validation.issues?.length > 0) {
          const criticalIssues = validation.issues.filter(
            (i) => i.id !== "incomplete_agenda_rules"
          );
          if (criticalIssues.length > 0) {
            blockers.push({
              feature: "agenda",
              reason: "Configuração obrigatória incompleta",
              issues: criticalIssues,
            });
          }
        }

        // Se não tem regras de agenda, bloqueia agendamento
        if (validation.issues?.some((i) => i.id === "incomplete_agenda_rules")) {
          blockers.push({
            feature: "scheduling",
            reason: "Regras de agenda não configuradas",
            message: "Configure regras de agenda para agendamentos",
          });
        }

        setBlockedFeatures(blockers);
      } catch (err) {
        console.error("Erro ao verificar bloqueadores:", err);
      } finally {
        setLoading(false);
      }
    };

    if (clinicId) {
      checkBlockers();
    }
  }, [clinicId]);

  const canAccess = useCallback((feature) => {
    return !blockedFeatures.some((b) => b.feature === feature);
  }, [blockedFeatures]);

  const getBlockReason = useCallback((feature) => {
    const blocker = blockedFeatures.find((b) => b.feature === feature);
    return blocker || null;
  }, [blockedFeatures]);

  return {
    blockedFeatures,
    loading,
    canAccess,
    getBlockReason,
  };
}
