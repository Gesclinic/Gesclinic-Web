import { useState, useCallback } from 'react';

/**
 * useAgendaFilters - Hook para gerenciar estado dos filtros colapsáveis
 *
 * Responsável por:
 * - Estado aberto/fechado do accordion de filtros
 * - Quantidade de filtros ativos
 * - Reset de filtros
 */
export function useAgendaFilters() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeFilters = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updateActiveFiltersCount = useCallback((count) => {
    setActiveFiltersCount(count);
  }, []);

  return {
    isOpen,
    setIsOpen,
    toggleOpen,
    closeFilters,
    activeFiltersCount,
    updateActiveFiltersCount,
  };
}
