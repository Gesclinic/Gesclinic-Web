import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para gerenciar filtros salvos em localStorage
 * Compartilhado entre diferentes módulos financeiros
 * 
 * @param storageKey - Chave para armazenar no localStorage (ex: 'lancamentos_filters')
 * @returns {Object} { savedFilters, saveFilter, deleteFilter, getFilter }
 */
export function useSavedFilters(storageKey) {
  const [savedFilters, setSavedFilters] = useState([]);

  // Carregar filtros do localStorage ao montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSavedFilters(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar filtros salvos:', error);
    }
  }, [storageKey]);

  // Salvar novo filtro
  const saveFilter = useCallback(
    (name, filters) => {
      try {
        const newFilter = {
          name,
          filters,
          createdAt: new Date().toISOString(),
        };

        // Remover filtro com mesmo nome se existir
        const updated = savedFilters.filter((f) => f.name !== name);
        updated.push(newFilter);

        setSavedFilters(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return true;
      } catch (error) {
        console.error('Erro ao salvar filtro:', error);
        return false;
      }
    },
    [savedFilters, storageKey]
  );

  // Deletar filtro
  const deleteFilter = useCallback(
    (name) => {
      try {
        const updated = savedFilters.filter((f) => f.name !== name);
        setSavedFilters(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return true;
      } catch (error) {
        console.error('Erro ao deletar filtro:', error);
        return false;
      }
    },
    [savedFilters, storageKey]
  );

  // Obter filtro por nome
  const getFilter = useCallback(
    (name) => {
      return savedFilters.find((f) => f.name === name)?.filters;
    },
    [savedFilters]
  );

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    getFilter,
  };
}
