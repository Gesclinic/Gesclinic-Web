/**
 * Hook for managing financial accounts state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import {
  FinancialAccount,
  FinancialAccountCreateInput,
  FinancialAccountUpdateInput,
  FinancialAccountsFilterOptions,
  ConsolidatedBalanceSummary,
  FinancialAccountsListResponse,
  AccountMovement,
  AccountReconciliation,
  DashboardMetrics,
} from '../types';
import {
  listFinancialAccounts,
  getConsolidatedBalanceSummary,
  createFinancialAccount,
  updateFinancialAccount,
  deactivateFinancialAccount,
  setDefaultFinancialAccount,
  listAccountMovements,
  createAccountMovement,
  getDashboardMetrics,
  getAccountReconciliationHistory,
  createReconciliation,
} from '../services';

export interface UseFinancialAccountsReturn {
  // Data
  accounts: FinancialAccount[];
  balanceSummary: ConsolidatedBalanceSummary | null;
  movements: AccountMovement[];
  metrics: DashboardMetrics | null;
  reconciliations: AccountReconciliation[];
  
  // Loading states
  loading: boolean;
  loadingBalance: boolean;
  loadingMovements: boolean;
  loadingMetrics: boolean;
  loadingReconciliations: boolean;
  
  // Error states
  error: string | null;
  
  // Totals
  total: number;
  page: number;
  pageSize: number;
  
  // Operations
  refetch: () => Promise<void>;
  refetchBalance: () => Promise<void>;
  refetchMovements: (accountId?: string) => Promise<void>;
  refetchMetrics: () => Promise<void>;
  refetchReconciliations: (accountId: string) => Promise<void>;
  create: (input: FinancialAccountCreateInput) => Promise<FinancialAccount>;
  update: (accountId: string, input: FinancialAccountUpdateInput) => Promise<FinancialAccount>;
  deactivate: (accountId: string) => Promise<FinancialAccount>;
  setDefault: (accountId: string) => Promise<FinancialAccount>;
  addMovement: (accountId: string, data: any) => Promise<AccountMovement>;
  createReconcile: (accountId: string, data: any) => Promise<AccountReconciliation>;
  
  // Filters
  setFilters: (filters: FinancialAccountsFilterOptions) => void;
  filters: FinancialAccountsFilterOptions;
}

const DEFAULT_PAGE_SIZE = 50;

export function useFinancialAccounts(
  initialFilters?: FinancialAccountsFilterOptions
): UseFinancialAccountsReturn {
  const { clinicId } = useClinicContext();
  
  // State
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<ConsolidatedBalanceSummary | null>(null);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [reconciliations, setReconciliations] = useState<AccountReconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingReconciliations, setLoadingReconciliations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FinancialAccountsFilterOptions>(
    initialFilters || { limit: DEFAULT_PAGE_SIZE, offset: 0 }
  );

  // Fetch accounts
  const refetch = useCallback(async () => {
    if (!clinicId) return;

    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * (filters.limit || DEFAULT_PAGE_SIZE);
      const response = await listFinancialAccounts(clinicId, {
        ...filters,
        offset,
        limit: filters.limit || DEFAULT_PAGE_SIZE,
      });

      setAccounts(response.accounts);
      setTotal(response.total);
    } catch (err: any) {
      const message = err?.message || 'Erro ao carregar contas financeiras';
      setError(message);
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [clinicId, page, filters]);

  // Fetch balance summary
  const refetchBalance = useCallback(async () => {
    if (!clinicId) return;

    try {
      setLoadingBalance(true);
      const summary = await getConsolidatedBalanceSummary(clinicId);
      setBalanceSummary(summary);
    } catch (err: any) {
      console.error('Error fetching balance summary:', err);
    } finally {
      setLoadingBalance(false);
    }
  }, [clinicId]);

  // Initial fetch
  useEffect(() => {
    refetch();
    refetchBalance();
  }, [refetch, refetchBalance]);

  // Create account
  const create = useCallback(
    async (input: FinancialAccountCreateInput): Promise<FinancialAccount> => {
      if (!clinicId) throw new Error('Clinic not available');

      try {
        const newAccount = await createFinancialAccount(clinicId, input);
        await refetch();
        await refetchBalance();
        return newAccount;
      } catch (err: any) {
        const message = err?.message || 'Erro ao criar conta financeira';
        setError(message);
        throw err;
      }
    },
    [clinicId, refetch, refetchBalance]
  );

  // Update account
  const update = useCallback(
    async (accountId: string, input: FinancialAccountUpdateInput): Promise<FinancialAccount> => {
      if (!clinicId) throw new Error('Clinic not available');

      try {
        const updated = await updateFinancialAccount(clinicId, accountId, input);
        await refetch();
        await refetchBalance();
        return updated;
      } catch (err: any) {
        const message = err?.message || 'Erro ao atualizar conta financeira';
        setError(message);
        throw err;
      }
    },
    [clinicId, refetch, refetchBalance]
  );

  // Deactivate account
  const deactivate = useCallback(
    async (accountId: string): Promise<FinancialAccount> => {
      if (!clinicId) throw new Error('Clinic not available');

      try {
        const updated = await deactivateFinancialAccount(clinicId, accountId);
        await refetch();
        await refetchBalance();
        return updated;
      } catch (err: any) {
        const message = err?.message || 'Erro ao desativar conta financeira';
        setError(message);
        throw err;
      }
    },
    [clinicId, refetch, refetchBalance]
  );

  // Set as default
  const setDefault = useCallback(
    async (accountId: string): Promise<FinancialAccount> => {
      if (!clinicId) throw new Error('Clinic not available');

      try {
        const updated = await setDefaultFinancialAccount(clinicId, accountId);
        await refetch();
        await refetchBalance();
        return updated;
      } catch (err: any) {
        const message = err?.message || 'Erro ao definir conta padrão';
        setError(message);
        throw err;
      }
    },
    [clinicId, refetch, refetchBalance]
  );

  // Update filters
  const handleSetFilters = useCallback((newFilters: FinancialAccountsFilterOptions) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page
  }, []);

  // Fetch movements
  const refetchMovements = useCallback(async (accountId?: string) => {
    if (!clinicId) return;

    try {
      setLoadingMovements(true);
      const { movements: data } = await listAccountMovements(clinicId, accountId);
      setMovements(data);
    } catch (err: any) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoadingMovements(false);
    }
  }, [clinicId]);

  // Fetch metrics
  const refetchMetrics = useCallback(async () => {
    if (!clinicId) return;

    try {
      setLoadingMetrics(true);
      const data = await getDashboardMetrics(clinicId);
      setMetrics(data);
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [clinicId]);

  // Fetch reconciliations
  const refetchReconciliations = useCallback(async (accountId: string) => {
    if (!clinicId) return;

    try {
      setLoadingReconciliations(true);
      const data = await getAccountReconciliationHistory(clinicId, accountId);
      setReconciliations(data);
    } catch (err: any) {
      console.error('Error fetching reconciliations:', err);
    } finally {
      setLoadingReconciliations(false);
    }
  }, [clinicId]);

  // Add movement
  const addMovement = useCallback(
    async (accountId: string, data: any): Promise<AccountMovement> => {
      if (!clinicId) throw new Error('Clinic not available');

      try {
        const movement = await createAccountMovement(clinicId, accountId, data);
        await refetchMovements(accountId);
        await refetchMetrics();
        return movement;
      } catch (err: any) {
        const message = err?.message || 'Erro ao adicionar movimentação';
        setError(message);
        throw err;
      }
    },
    [clinicId, refetchMovements, refetchMetrics]
  );

  // Create reconciliation
  const createReconcile = useCallback(
    async (accountId: string, data: any): Promise<AccountReconciliation> => {
      if (!clinicId) throw new Error('Clinic not available');

      try {
        const reconciliation = await createReconciliation(clinicId, accountId, data);
        await refetchReconciliations(accountId);
        await refetchBalance();
        return reconciliation;
      } catch (err: any) {
        const message = err?.message || 'Erro ao criar conciliação';
        setError(message);
        throw err;
      }
    },
    [clinicId, refetchReconciliations, refetchBalance]
  );

  return {
    accounts,
    balanceSummary,
    movements,
    metrics,
    reconciliations,
    loading,
    loadingBalance,
    loadingMovements,
    loadingMetrics,
    loadingReconciliations,
    error,
    total,
    page,
    pageSize: filters.limit || DEFAULT_PAGE_SIZE,
    refetch,
    refetchBalance,
    refetchMovements,
    refetchMetrics,
    refetchReconciliations,
    create,
    update,
    deactivate,
    setDefault,
    addMovement,
    createReconcile,
    setFilters: handleSetFilters,
    filters,
  };
}
