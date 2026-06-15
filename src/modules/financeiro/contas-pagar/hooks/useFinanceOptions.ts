/**
 * 💼 Finance Options Hooks
 * Hooks para carregar opções de plano de contas e centros de custo
 */

import { useQuery } from '@tanstack/react-query';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  listAccountPlans,
  listCostCenters,
} from '@/lib/financeApi';

// ============================================================
// QUERY KEYS
// ============================================================

export const financeOptionsQueryKeys = {
  all: ['financeOptions'],
  accountPlans: (clinicId: string) => ['financeOptions', 'accountPlans', clinicId],
  costCenters: (clinicId: string) => ['financeOptions', 'costCenters', clinicId],
};

// ============================================================
// INTERFACE
// ============================================================

interface AccountPlan {
  id: string;
  name: string;
  code?: string;
  parent_id?: string | null;
  level?: number;
}

interface CostCenter {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Hook para carregar lista de planos de contas (chart of accounts)
 * Filtra apenas as contas com parent_id (sub-contas)
 */
export function useAccountPlans() {
  const { clinicId } = useClinicContext();

  return useQuery({
    queryKey: financeOptionsQueryKeys.accountPlans(clinicId!),
    queryFn: async () => {
      if (!clinicId) return [];
      const plans = await listAccountPlans(clinicId);
      // Filtrar apenas contas com parent_id (sub-contas)
      return (plans || []).filter((p: AccountPlan) => !!p.parent_id);
    },
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime)
  });
}

/**
 * Hook para carregar lista de centros de custo
 */
export function useCostCenters() {
  const { clinicId } = useClinicContext();

  return useQuery({
    queryKey: financeOptionsQueryKeys.costCenters(clinicId!),
    queryFn: async () => {
      if (!clinicId) return [];
      const centers = await listCostCenters(clinicId);
      return centers || [];
    },
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook combinado para carregar ambas as listas em paralelo
 * Útil para modals que precisam de ambas as opções
 */
export function useFinanceOptions() {
  const accountPlans = useAccountPlans();
  const costCenters = useCostCenters();

  return {
    accountPlans: accountPlans.data || [],
    costCenters: costCenters.data || [],
    isLoading: accountPlans.isLoading || costCenters.isLoading,
    error: accountPlans.error || costCenters.error,
    refetch: () => {
      accountPlans.refetch();
      costCenters.refetch();
    },
  };
}
