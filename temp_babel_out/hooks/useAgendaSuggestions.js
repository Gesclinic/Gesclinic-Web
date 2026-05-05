/**
 * useAgendaSuggestions.js
 * 
 * Hook customizado para gerenciar sugestões de encaixe
 * com integração automática com indicadores e agenda
 */

import { useState, useEffect, useCallback } from "react";
import { generateEncaixeSuggestions, logSuggestionAction } from "@/lib/agendaSuggestionsApi";
export function useAgendaSuggestions(clinicId, date, refreshTrigger) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carregar sugestões
  const loadSuggestions = useCallback(async () => {
    if (!clinicId || !date) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await generateEncaixeSuggestions(clinicId, date);
      setSuggestions(data);
    } catch (err) {
      console.error("Erro ao carregar sugestões:", err);
      setError(err.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId, date]);

  // Atualizar sugestões quando dependências mudam
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions, refreshTrigger]);

  // Executar ação de sugestão
  const executeSuggestion = useCallback(async (suggestion, action) => {
    try {
      await logSuggestionAction({
        suggestionType: suggestion.type,
        clinicId,
        appointmentId: suggestion.metadata?.noShowAppointmentId,
        action
      });
      return {
        success: true
      };
    } catch (err) {
      console.error("Erro ao executar sugestão:", err);
      return {
        success: false,
        error: err.message
      };
    }
  }, [clinicId]);

  // Refresh manual
  const refresh = useCallback(() => {
    loadSuggestions();
  }, [loadSuggestions]);
  return {
    suggestions,
    loading,
    error,
    refresh,
    executeSuggestion
  };
}