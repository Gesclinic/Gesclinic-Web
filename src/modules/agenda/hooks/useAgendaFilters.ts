/**
 * 🪝 useAgendaFilters HOOK
 * ========================
 *
 * Hook para gerenciar estado dos filtros da agenda
 * Centraliza lógica de filtros, estado, e persistência
 */

import { useState, useCallback, useEffect } from 'react';
import { AgendaFilters, AppointmentStatus } from '../types';
import { AGENDA_CONFIG } from '../constants';

export interface UseAgendaFiltersReturn {
  // Estado
  filters: AgendaFilters;
  isFiltered: boolean;
  hasActiveFilters: boolean;

  // Operações
  setDateFrom: (date: string) => void;
  setDateTo: (date: string) => void;
  setProfessionalId: (id: string | undefined) => void;
  setRoomId: (id: string | undefined) => void;
  setPayerId: (id: string | undefined) => void;
  setStatus: (statuses: AppointmentStatus[]) => void;
  setPatientName: (name: string | undefined) => void;

  // Em lote
  setFilters: (filters: Partial<AgendaFilters>) => void;
  resetFilters: () => void;

  // Persistência
  saveToLocalStorage: (key: string) => void;
  loadFromLocalStorage: (key: string) => boolean;
}

// Estado padrão
const DEFAULT_FILTERS: AgendaFilters = {
  dateFrom: undefined,
  dateTo: undefined,
  professionalId: undefined,
  roomId: undefined,
  payerId: undefined,
  status: undefined,
  patientName: undefined,
};

export function useAgendaFilters(
  initialFilters?: AgendaFilters
): UseAgendaFiltersReturn {
  const [filters, setFiltersState] = useState<AgendaFilters>(
    initialFilters || DEFAULT_FILTERS
  );

  // Setters individuais
  const setDateFrom = useCallback(
    (date: string) => {
      setFiltersState(prev => ({ ...prev, dateFrom: date }));
    },
    []
  );

  const setDateTo = useCallback(
    (date: string) => {
      setFiltersState(prev => ({ ...prev, dateTo: date }));
    },
    []
  );

  const setProfessionalId = useCallback(
    (id: string | undefined) => {
      setFiltersState(prev => ({ ...prev, professionalId: id }));
    },
    []
  );

  const setRoomId = useCallback(
    (id: string | undefined) => {
      setFiltersState(prev => ({ ...prev, roomId: id }));
    },
    []
  );

  const setPayerId = useCallback(
    (id: string | undefined) => {
      setFiltersState(prev => ({ ...prev, payerId: id }));
    },
    []
  );

  const setStatus = useCallback(
    (statuses: AppointmentStatus[]) => {
      setFiltersState(prev => ({
        ...prev,
        status: statuses.length > 0 ? statuses : undefined,
      }));
    },
    []
  );

  const setPatientName = useCallback(
    (name: string | undefined) => {
      setFiltersState(prev => ({ ...prev, patientName: name }));
    },
    []
  );

  // Em lote
  const setFilters = useCallback((newFilters: Partial<AgendaFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Persistência
  const saveToLocalStorage = useCallback((key: string) => {
    try {
      localStorage.setItem(
        `agenda-filters-${key}`,
        JSON.stringify(filters)
      );
    } catch (err) {
      console.error('Error saving filters to localStorage:', err);
    }
  }, [filters]);

  const loadFromLocalStorage = useCallback(
    (key: string): boolean => {
      try {
        const stored = localStorage.getItem(`agenda-filters-${key}`);
        if (stored) {
          const parsed = JSON.parse(stored) as AgendaFilters;
          setFiltersState(parsed);
          return true;
        }
      } catch (err) {
        console.error('Error loading filters from localStorage:', err);
      }
      return false;
    },
    []
  );

  // Propriedades derivadas
  const isFiltered = !!(
    filters.dateFrom ||
    filters.dateTo ||
    filters.professionalId ||
    filters.roomId ||
    filters.payerId ||
    (filters.status && filters.status.length > 0) ||
    filters.patientName
  );

  const hasActiveFilters = isFiltered;

  return {
    filters,
    isFiltered,
    hasActiveFilters,
    setDateFrom,
    setDateTo,
    setProfessionalId,
    setRoomId,
    setPayerId,
    setStatus,
    setPatientName,
    setFilters,
    resetFilters,
    saveToLocalStorage,
    loadFromLocalStorage,
  };
}

export default useAgendaFilters;
