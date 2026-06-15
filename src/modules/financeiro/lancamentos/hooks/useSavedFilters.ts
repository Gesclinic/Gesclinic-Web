import { useState, useCallback, useEffect } from 'react';

interface SavedFilter {
  name: string;
  filters: any;
  createdAt: string;
}

/**
 * Hook para gerenciar filtros salvos em localStorage
 * @param storageKey - Chave para armazenar no localStorage (ex: 'lancamentos_filters')
 */
export function useSavedFilters(storageKey: string) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

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
    (name: string, filters: any) => {
      try {
        const newFilter: SavedFilter = {
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
    (name: string) => {
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
    (name: string) => {
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
