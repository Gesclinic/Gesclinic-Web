/**
 * useFinancialDRE Hook
 * 
 * Gerencia estado da DRE Enterprise com suporte a:
 * - 7 variantes (gerencial, contábil, centro, médico, convênio, unidade, projetada)
 * - Filtros complexos
 * - Comparações de período
 * - Drill-down interativo
 * - Cache de cálculos
 * 
 * Data: 2026-06-20
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  calculateDREVariant,
  compareDREPeriods,
  drillDownReceita,
  getBenchmarkMetrics,
  type DREVariantType,
  type DREPeriod,
  type DREFilters,
  type DREResult,
  type DREComparison,
  type DRELineItem,
  type BenchmarkMetrics,
} from '@/lib/dreEnterpriseEngine';

export interface UseFinancialDREState {
  // Dados
  dre: DREResult | null;
  comparison: DREComparison | null;
  drillDowns: Map<string, DRELineItem[]>; // Cache de drill-downs
  benchmarks: BenchmarkMetrics[] | null;

  // Carregamento
  loading: boolean;
  loadingDrillDown: boolean;
  loadingComparison: boolean;
  loadingBenchmark: boolean;
  error: string | null;

  // Controles
  variant: DREVariantType;
  period: DREPeriod;
  filters: DREFilters;
  breadcrumbs: Array<{ id: string; name: string; level: number }>; // Para drill-down
}

export interface UseFinancialDREActions {
  // Variantes
  setVariant: (variant: DREVariantType) => void;

  // Períodos
  setPeriod: (period: DREPeriod) => void;

  // Filtros
  setFilters: (filters: DREFilters) => void;
  clearFilters: () => void;

  // Comparação
  compareToPreviousPeriod: () => Promise<void>;

  // Drill-down
  drillDown: (drillBy: 'convenio' | 'guia' | 'paciente' | 'atendimento' | 'centro' | 'medico', context?: Record<string, any>) => Promise<void>;
  goBackDrillDown: () => void;

  // Benchmark
  loadBenchmarks: () => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Hook principal para DRE Enterprise
 */
export function useFinancialDRE(
  clinicId: string,
  initialVariant: DREVariantType = 'gerencial',
  initialPeriod?: DREPeriod
) {
  // Estado principal
  const [state, setState] = useState<UseFinancialDREState>({
    dre: null,
    comparison: null,
    drillDowns: new Map(),
    benchmarks: null,
    loading: false,
    loadingDrillDown: false,
    loadingComparison: false,
    loadingBenchmark: false,
    error: null,
    variant: initialVariant,
    period: initialPeriod || getDefaultPeriod(),
    filters: {},
    breadcrumbs: [],
  });

  // Refs para cache
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  // =========================================================================
  // HELPERS
  // =========================================================================

  function getDefaultPeriod(): DREPeriod {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  function getCacheKey(variant: DREVariantType, period: DREPeriod, filters: DREFilters): string {
    return `dre_${variant}_${period.start}_${period.end}_${JSON.stringify(filters)}`;
  }

  function getFromCache(key: string): any | null {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    cacheRef.current.delete(key);
    return null;
  }

  function setInCache(key: string, data: any): void {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }

  // =========================================================================
  // AÇÕES
  // =========================================================================

  const setVariant = useCallback((variant: DREVariantType) => {
    setState(s => ({ ...s, variant }));
  }, []);

  const setPeriod = useCallback((period: DREPeriod) => {
    setState(s => ({ ...s, period }));
  }, []);

  const setFilters = useCallback((filters: DREFilters) => {
    setState(s => ({ ...s, filters }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(s => ({ ...s, filters: {} }));
  }, []);

  const loadDRE = useCallback(async (variant: DREVariantType, period: DREPeriod, filters: DREFilters) => {
    if (!clinicId) {
      setState(s => ({ ...s, dre: null, loading: false, error: null }));
      return;
    }

    const cacheKey = getCacheKey(variant, period, filters);
    const cached = getFromCache(cacheKey);

    if (cached) {
      setState(s => ({ ...s, dre: cached, loading: false, error: null }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const result = await calculateDREVariant(clinicId, variant, period, filters);
      setInCache(cacheKey, result);
      setState(s => ({ ...s, dre: result, loading: false }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar DRE';
      setState(s => ({ ...s, error: errorMsg, loading: false }));
      console.error('❌ Erro ao carregar DRE:', err);
    }
  }, [clinicId]);

  const compareToPreviousPeriod = useCallback(async () => {
    if (!clinicId) return;

    setState(s => ({ ...s, loadingComparison: true }));

    try {
      const previousPeriod = calculatePreviousPeriod(state.period);
      const comparison = await compareDREPeriods(
        clinicId,
        state.variant,
        state.period,
        previousPeriod,
        state.filters
      );

      setState(s => ({ ...s, comparison, loadingComparison: false }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao comparar períodos';
      setState(s => ({ ...s, error: errorMsg, loadingComparison: false }));
    }
  }, [clinicId, state.variant, state.period, state.filters]);

  const drillDown = useCallback(
    async (drillBy: 'convenio' | 'guia' | 'profissional' | 'servico' | 'paciente' | 'atendimento' | 'centro' | 'medico', context: Record<string, any> = {}) => {
      if (!clinicId) return;

      setState(s => ({ ...s, loadingDrillDown: true }));

      try {
        const drillKey = `v11:${drillBy}:${JSON.stringify(context || {})}`;
        const cacheKey = `drilldown_${drillKey}_${JSON.stringify(state.filters || {})}`;
        const cached = getFromCache(cacheKey);

        let drilled: DRELineItem[];

        if (cached) {
          drilled = cached;
        } else {
          drilled = await drillDownReceita(clinicId, drillBy, { ...state.filters, ...context });
          setInCache(cacheKey, drilled);
        }

        setState(s => {
          const newDrillDowns = new Map(s.drillDowns);
          newDrillDowns.set(drillKey, drilled);

          const level = drillBy === 'convenio' ? 2 : drillBy === 'guia' ? 3 : drillBy === 'paciente' ? 4 : 5;

          return {
            ...s,
            drillDowns: newDrillDowns,
            loadingDrillDown: false,
            breadcrumbs: [
              ...s.breadcrumbs,
              { id: drillBy, name: drillBy.charAt(0).toUpperCase() + drillBy.slice(1), level },
            ],
          };
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao expandir dados';
        setState(s => ({ ...s, error: errorMsg, loadingDrillDown: false }));
      }
    },
    [clinicId, state.filters]
  );

  const goBackDrillDown = useCallback(() => {
    setState(s => {
      if (s.breadcrumbs.length === 0) return s;

      const newBreadcrumbs = s.breadcrumbs.slice(0, -1);
      const newDrillDowns = new Map(s.drillDowns);

      // Remove última entrada de drilldown
      const lastLevel = s.breadcrumbs[s.breadcrumbs.length - 1];
      newDrillDowns.delete(lastLevel.id);

      return {
        ...s,
        breadcrumbs: newBreadcrumbs,
        drillDowns: newDrillDowns,
      };
    });
  }, []);

  const loadBenchmarks = useCallback(async () => {
    if (!clinicId) return;

    setState(s => ({ ...s, loadingBenchmark: true }));

    try {
      const benchmarks = await getBenchmarkMetrics(state.variant, state.dre?.summary || {});
      setState(s => ({ ...s, benchmarks, loadingBenchmark: false }));
    } catch (err) {
      console.error('❌ Erro ao carregar benchmark:', err);
      setState(s => ({ ...s, loadingBenchmark: false }));
    }
  }, [clinicId, state.variant, state.dre?.summary]);

  const refresh = useCallback(async () => {
    if (!clinicId) return;

    cacheRef.current.clear();
    await loadDRE(state.variant, state.period, state.filters);
  }, [state.variant, state.period, state.filters, loadDRE]);

  // =========================================================================
  // EFEITOS
  // =========================================================================

  useEffect(() => {
    loadDRE(state.variant, state.period, state.filters);
  }, [state.variant, state.period, state.filters, loadDRE]);

  useEffect(() => {
    if (!clinicId || !state.dre) return;
    compareToPreviousPeriod();
  }, [clinicId, state.dre?.timestamp, state.variant, state.period, state.filters, compareToPreviousPeriod]);

  useEffect(() => {
    if (!clinicId || !state.dre?.summary) return;
    loadBenchmarks();
  }, [clinicId, state.dre?.timestamp, state.variant, loadBenchmarks]);

  // =========================================================================
  // RETORNO
  // =========================================================================

  return {
    ...state,
    // Ações
    setVariant,
    setPeriod,
    setFilters,
    clearFilters,
    compareToPreviousPeriod,
    drillDown,
    goBackDrillDown,
    loadBenchmarks,
    refresh,
  } as UseFinancialDREState & UseFinancialDREActions;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcula período anterior para comparação
 */
export function calculatePreviousPeriod(period: DREPeriod): DREPeriod {
  const currentStart = new Date(`${period.start}T00:00:00`);
  const currentEnd = new Date(`${period.end}T00:00:00`);

  const durationDays = Math.max(
    1,
    Math.floor((currentEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );

  const prevEnd = new Date(currentStart);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (durationDays - 1));

  const toISODate = (value: Date) => value.toISOString().split('T')[0];

  return {
    start: toISODate(prevStart),
    end: toISODate(prevEnd),
  };
}

export default useFinancialDRE;
