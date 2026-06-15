/**
 * Hook: useChartOfAccounts
 * Manages state and operations for chart of accounts
 */

import { useState, useCallback, useEffect } from 'react';
import {
  ChartOfAccount,
  ChartOfAccountCreateInput,
  ChartOfAccountUpdateInput,
  ChartOfAccountTreeNode,
  ChartOfAccountFilter,
  ListResponse,
} from '../types';
import {
  listChartOfAccounts,
  getChartOfAccountsTree,
  getChartOfAccountById,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  toggleChartOfAccountStatus,
  canDeleteAccount,
  getChartOfAccountAuditLogs,
} from '../services/chartOfAccountsApi';

interface UseChartOfAccountsState {
  accounts: ChartOfAccount[];
  tree: ChartOfAccountTreeNode[];
  loading: boolean;
  error: string | null;
  filters: ChartOfAccountFilter;
  pagination: { page: number; limit: number };
}

export const useChartOfAccounts = (
  clinicId: string,
  initialFilters?: ChartOfAccountFilter
) => {
  const [state, setState] = useState<UseChartOfAccountsState>({
    accounts: [],
    tree: [],
    loading: false,
    error: null,
    filters: initialFilters || {},
    pagination: { page: 1, limit: 100 },
  });

  /**
   * Fetch accounts list with current filters
   */
  const fetchAccounts = useCallback(
    async (
      filters?: ChartOfAccountFilter,
      pagination?: { page?: number; limit?: number }
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await listChartOfAccounts(clinicId, filters, pagination);
        setState((prev) => ({
          ...prev,
          accounts: result.data,
          pagination: {
            page: result.page,
            limit: result.limit,
          },
          loading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false,
        }));
      }
    },
    [clinicId]
  );

  /**
   * Fetch accounts tree
   */
  const fetchTree = useCallback(async (activeOnly: boolean = true) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await getChartOfAccountsTree(clinicId, activeOnly);
      setState((prev) => ({ ...prev, tree: result, loading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, [clinicId]);

  /**
   * Create new account
   */
  const createAccount = useCallback(
    async (input: ChartOfAccountCreateInput, userId: string) => {
      try {
        const account = await createChartOfAccount(input, userId);
        await fetchTree(); // Refresh tree
        return account;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        throw error;
      }
    },
    [fetchTree]
  );

  /**
   * Update account
   */
  const updateAccount = useCallback(
    async (accountId: string, input: ChartOfAccountUpdateInput) => {
      try {
        const account = await updateChartOfAccount(accountId, input);
        await fetchTree(); // Refresh tree
        return account;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        throw error;
      }
    },
    [fetchTree]
  );

  /**
   * Delete account with validation
   */
  const deleteAccount = useCallback(
    async (accountId: string) => {
      try {
        await deleteChartOfAccount(accountId);
        await fetchTree(); // Refresh tree
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        throw error;
      }
    },
    [fetchTree]
  );

  /**
   * Toggle account status
   */
  const toggleStatus = useCallback(
    async (accountId: string, isActive: boolean) => {
      try {
        await toggleChartOfAccountStatus(accountId, isActive);
        await fetchTree(); // Refresh tree
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        throw error;
      }
    },
    [fetchTree]
  );

  /**
   * Check if account can be deleted
   */
  const checkCanDelete = useCallback(async (accountId: string) => {
    try {
      return await canDeleteAccount(accountId);
    } catch (error) {
      return false;
    }
  }, []);

  /**
   * Update filters
   */
  const setFilters = useCallback((filters: ChartOfAccountFilter) => {
    setState((prev) => ({ ...prev, filters }));
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    accounts: state.accounts,
    tree: state.tree,
    loading: state.loading,
    error: state.error,
    filters: state.filters,
    pagination: state.pagination,
    fetchAccounts,
    fetchTree,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleStatus,
    checkCanDelete,
    setFilters,
    clearError,
  };
};

/**
 * Hook: useChartOfAccountAudit
 * Manages audit logs for chart of accounts
 */
export const useChartOfAccountAudit = (clinicId: string) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(
    async (accountId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const logs = await getChartOfAccountAuditLogs(clinicId, accountId);
        setAuditLogs(logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [clinicId]
  );

  return {
    auditLogs,
    loading,
    error,
    fetchAuditLogs,
  };
};
