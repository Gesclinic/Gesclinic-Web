// src/modules/financeiro/centro-custo/hooks/useCostCenters.ts

import { useState, useCallback, useEffect } from 'react';
import type {
  CostCenter,
  CostCenterNode,
  CostCenterFilters,
  CreateCostCenterPayload,
  UpdateCostCenterPayload,
} from '../types';
import * as costCentersApi from '../services/costCentersApi';

interface UseCostCentersState {
  centers: CostCenter[];
  tree: CostCenterNode[];
  loading: boolean;
  error: string | null;
  filters: CostCenterFilters;
  selectedId: string | null;
}

interface UseCostCentersActions {
  fetchCenters: () => Promise<void>;
  fetchTree: () => Promise<void>;
  createCenter: (payload: CreateCostCenterPayload) => Promise<CostCenter>;
  updateCenter: (id: string, payload: UpdateCostCenterPayload) => Promise<CostCenter>;
  deleteCenter: (id: string) => Promise<void>;
  toggleStatus: (id: string, isActive: boolean) => Promise<CostCenter>;
  checkCanDelete: (id: string) => Promise<boolean>;
  setFilters: (filters: CostCenterFilters) => void;
  clearError: () => void;
  setSelectedId: (id: string | null) => void;
}

export function useCostCenters(clinicId: string | null): UseCostCentersState & UseCostCentersActions {
  const [state, setState] = useState<UseCostCentersState>({
    centers: [],
    tree: [],
    loading: false,
    error: null,
    filters: {},
    selectedId: null,
  });

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const fetchCenters = useCallback(async () => {
    if (!clinicId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await costCentersApi.listCostCenters(clinicId, state.filters);
      setState((prev) => ({ ...prev, centers: data, loading: false }));
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar centros de custo');
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [clinicId, state.filters, setError]);

  const fetchTree = useCallback(async () => {
    if (!clinicId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await costCentersApi.getCostCentersTree(clinicId);
      setState((prev) => ({ ...prev, tree: data, loading: false }));
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar árvore de centros de custo');
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [clinicId, setError]);

  const createCenter = useCallback(
    async (payload: CreateCostCenterPayload): Promise<CostCenter> => {
      if (!clinicId) throw new Error('Clínica não identificada');

      setState((prev) => ({ ...prev, error: null }));
      try {
        const newCenter = await costCentersApi.createCostCenter(clinicId, payload);
        setState((prev) => ({
          ...prev,
          centers: [...prev.centers, newCenter],
        }));
        return newCenter;
      } catch (err: any) {
        setError(err?.message || 'Erro ao criar centro de custo');
        throw err;
      }
    },
    [clinicId, setError]
  );

  const updateCenter = useCallback(
    async (id: string, payload: UpdateCostCenterPayload): Promise<CostCenter> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const updated = await costCentersApi.updateCostCenter(id, payload);
        setState((prev) => ({
          ...prev,
          centers: prev.centers.map((c) => (c.id === id ? updated : c)),
        }));
        return updated;
      } catch (err: any) {
        setError(err?.message || 'Erro ao atualizar centro de custo');
        throw err;
      }
    },
    [setError]
  );

  const deleteCenter = useCallback(
    async (id: string): Promise<void> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        await costCentersApi.deleteCostCenter(id);
        setState((prev) => ({
          ...prev,
          centers: prev.centers.filter((c) => c.id !== id),
        }));
      } catch (err: any) {
        setError(err?.message || 'Erro ao excluir centro de custo');
        throw err;
      }
    },
    [setError]
  );

  const toggleStatus = useCallback(
    async (id: string, isActive: boolean): Promise<CostCenter> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const updated = await costCentersApi.toggleCostCenterStatus(id, isActive);
        setState((prev) => ({
          ...prev,
          centers: prev.centers.map((c) => (c.id === id ? updated : c)),
        }));
        return updated;
      } catch (err: any) {
        setError(err?.message || 'Erro ao alterar status do centro de custo');
        throw err;
      }
    },
    [setError]
  );

  const checkCanDelete = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await costCentersApi.checkCanDeleteCostCenter(id);
    } catch (err: any) {
      setError(err?.message || 'Erro ao verificar se pode excluir');
      return false;
    }
  }, [setError]);

  const setFilters = useCallback((filters: CostCenterFilters) => {
    setState((prev) => ({ ...prev, filters }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const setSelectedId = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedId: id }));
  }, []);

  // Auto-fetch on mount or when clinicId changes
  useEffect(() => {
    if (clinicId) {
      fetchCenters();
    }
  }, [clinicId, fetchCenters]);

  return {
    ...state,
    fetchCenters,
    fetchTree,
    createCenter,
    updateCenter,
    deleteCenter,
    toggleStatus,
    checkCanDelete,
    setFilters,
    clearError,
    setSelectedId,
  };
}
