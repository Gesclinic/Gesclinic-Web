/**
 * 💰 React Query Hooks for Contas a Pagar
 * Data fetching and state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  listPayables,
  getPayable,
  createPayable,
  updatePayable,
  deletePayable,
  payPayable,
  cancelPayable,
  bulkUpdatePayables,
  bulkDeletePayables,
  createRecurringConfig,
  listRecurringConfigs,
  addPayableAttachment,
  listPayableAttachments,
  deletePayableAttachment,
  getPayableAudit,
  getPayablesSummary,
  getOverdueCount,
  applyPayableApprovalAction,
  runPayablesSmartReconciliation,
  approvePayableReconciliationMatch,
  rejectPayableReconciliationMatch,
} from '../services/payablesApi';
import {
  Payable,
  PayableCreateInput,
  PayableUpdateInput,
  PayableFilterParams,
  PayableRecurringConfig,
  PayableAttachment,
  PayableAudit,
  PayablesSummary,
  PaymentMethodType,
  PayableApprovalAction,
  PayableReconciliationMatch,
} from '../types';

// ============================================================
// QUERY KEYS
// ============================================================

const PAYABLES_QUERY_KEY = 'payables';

export const payablesQueryKeys = {
  all: [PAYABLES_QUERY_KEY],
  list: (clinicId: string) => [PAYABLES_QUERY_KEY, 'list', clinicId],
  filtered: (params: PayableFilterParams) => [PAYABLES_QUERY_KEY, 'list', params],
  detail: (id: string) => [PAYABLES_QUERY_KEY, 'detail', id],
  summary: (clinicId: string) => [PAYABLES_QUERY_KEY, 'summary', clinicId],
  audit: (id: string) => [PAYABLES_QUERY_KEY, 'audit', id],
  attachments: (id: string) => [PAYABLES_QUERY_KEY, 'attachments', id],
  recurring: (clinicId: string) => [PAYABLES_QUERY_KEY, 'recurring', clinicId],
  overdue: (clinicId: string) => [PAYABLES_QUERY_KEY, 'overdue', clinicId],
  reconciliation: (clinicId: string) => [PAYABLES_QUERY_KEY, 'reconciliation', clinicId],
};

// ============================================================
// QUERIES
// ============================================================

/**
 * List payables with filters
 */
export function usePayables(params: PayableFilterParams) {
  return useQuery({
    queryKey: payablesQueryKeys.filtered(params),
    queryFn: () => listPayables(params),
    enabled: !!params.clinic_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get single payable
 */
export function usePayable(id: string) {
  return useQuery({
    queryKey: payablesQueryKeys.detail(id),
    queryFn: () => getPayable(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get payables summary
 */
export function usePayablesSummary(clinicId: string) {
  return useQuery<PayablesSummary | null>({
    queryKey: payablesQueryKeys.summary(clinicId),
    queryFn: () => getPayablesSummary(clinicId),
    enabled: !!clinicId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get overdue count
 */
export function useOverdueCount(clinicId: string) {
  return useQuery<number>({
    queryKey: payablesQueryKeys.overdue(clinicId),
    queryFn: () => getOverdueCount(clinicId),
    enabled: !!clinicId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get payable audit trail
 */
export function usePayableAudit(id: string) {
  return useQuery<PayableAudit[]>({
    queryKey: payablesQueryKeys.audit(id),
    queryFn: () => getPayableAudit(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get payable attachments
 */
export function usePayableAttachments(id: string) {
  return useQuery<PayableAttachment[]>({
    queryKey: payablesQueryKeys.attachments(id),
    queryFn: () => listPayableAttachments(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * List recurring configs
 */
export function useRecurringConfigs(clinicId: string) {
  return useQuery<PayableRecurringConfig[]>({
    queryKey: payablesQueryKeys.recurring(clinicId),
    queryFn: () => listRecurringConfigs(clinicId),
    enabled: !!clinicId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create payable mutation
 */
export function useCreatePayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clinicId, input }: { clinicId: string; input: PayableCreateInput }) =>
      createPayable(clinicId, input),
    onSuccess: (newPayable) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: payablesQueryKeys.all,
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'summary'],
      });
    },
  });
}

/**
 * Update payable mutation
 */
export function useUpdatePayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PayableUpdateInput) => updatePayable(input),
    onSuccess: (updatedPayable) => {
      // Update detail query
      queryClient.setQueryData(payablesQueryKeys.detail(updatedPayable.id), updatedPayable);

      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: payablesQueryKeys.all,
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'summary'],
      });
    },
  });
}

/**
 * Delete payable mutation
 */
export function useDeletePayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePayable(id),
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: payablesQueryKeys.detail(id) });

      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: payablesQueryKeys.all,
      });

      // Invalidate summary
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'summary'],
      });
    },
  });
}

/**
 * Pay payable mutation
 *
 * IMPORTANTE: Invalida caches dependentes
 * - Fluxo de caixa (cash_flow)
 * - DRE (financial_statements)
 * - Saldos bancários (financial_accounts)
 *
 * Isso garante que a integração financeira funciona corretamente
 */
export function usePayPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      paidValue,
      paymentMethod,
      paidBy,
      paymentDate,
      paymentBank,
      notes,
    }: {
      id: string;
      paidValue: number;
      paymentMethod: PaymentMethodType;
      paidBy?: string;
      paymentDate?: string;
      paymentBank?: string;
      notes?: string;
    }) => payPayable(id, paidValue, paymentMethod, paidBy, paymentDate, paymentBank, notes),
    onSuccess: (updatedPayable) => {
      // Update cache
      queryClient.setQueryData(payablesQueryKeys.detail(updatedPayable.id), updatedPayable);

      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: payablesQueryKeys.all,
      });

      // Invalidate summary and overdue
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'summary'],
      });
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'overdue'],
      });

      // 🔥 CRÍTICO: Invalidar módulos dependentes para integração financeira funcionar
      // Fluxo de Caixa
      queryClient.invalidateQueries({
        queryKey: ['cashflow'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cash_flow'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cash_flow_snapshots'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cashflow_summary'],
      });

      // DRE / Demonstração de Resultados
      queryClient.invalidateQueries({
        queryKey: ['dre'],
      });
      queryClient.invalidateQueries({
        queryKey: ['financial_statements'],
      });
      queryClient.invalidateQueries({
        queryKey: ['dre_summary'],
      });

      // Contas Financeiras / Saldos Bancários
      queryClient.invalidateQueries({
        queryKey: ['financial_accounts'],
      });
      queryClient.invalidateQueries({
        queryKey: ['balance_summary'],
      });
      queryClient.invalidateQueries({
        queryKey: ['consolidated_balance'],
      });

      // Conciliação Bancária
      queryClient.invalidateQueries({ queryKey: ['bank_reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation_matches'] });

      // Repasse Médico
      queryClient.invalidateQueries({ queryKey: ['medical_repass'] });
      queryClient.invalidateQueries({ queryKey: ['doctor_commissions'] });
    },
  });
}

/**
 * Cancel payable mutation
 *
 * IMPORTANTE: Invalida fluxo de caixa pois cancelamento gera reversal
 */
export function useCancelPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelPayable(id),
    onSuccess: (updatedPayable) => {
      queryClient.setQueryData(payablesQueryKeys.detail(updatedPayable.id), updatedPayable);
      queryClient.invalidateQueries({
        queryKey: payablesQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'summary'],
      });

      // 🔥 Invalidar fluxo de caixa pois cancelamento cria reversal
      queryClient.invalidateQueries({ queryKey: ['cashflow'] });
      queryClient.invalidateQueries({ queryKey: ['cash_flow'] });
      queryClient.invalidateQueries({ queryKey: ['dre'] });
    },
  });
}

/**
 * Bulk update payables mutation
 */
export function useBulkUpdatePayables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, updateData }: { ids: string[]; updateData: Partial<PayableUpdateInput> }) =>
      bulkUpdatePayables(ids, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: payablesQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'summary'],
      });
    },
  });
}

/**
 * Bulk delete payables mutation
 */
export function useBulkDeletePayables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeletePayables(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: payablesQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'summary'],
      });
    },
  });
}

export function useApplyPayableApprovalAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      action,
      actorId,
      reason,
    }: {
      id: string;
      action: PayableApprovalAction;
      actorId?: string;
      reason?: string;
    }) => applyPayableApprovalAction(id, action, actorId, reason),
    onSuccess: (updatedPayable) => {
      queryClient.setQueryData(payablesQueryKeys.detail(updatedPayable.id), updatedPayable);
      queryClient.invalidateQueries({ queryKey: payablesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: [PAYABLES_QUERY_KEY, 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['cashflow'] });
      queryClient.invalidateQueries({ queryKey: ['dre'] });
    },
  });
}

export function useRunPayablesSmartReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clinicId, actorId }: { clinicId: string; actorId?: string }) =>
      runPayablesSmartReconciliation(clinicId, actorId),
    onSuccess: (_, { clinicId }) => {
      queryClient.invalidateQueries({ queryKey: payablesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: payablesQueryKeys.reconciliation(clinicId) });
      queryClient.invalidateQueries({ queryKey: ['bank_reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation_matches'] });
    },
  });
}

export function useApprovePayableReconciliationMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      payableId: string;
      bankTransactionId: string;
      actorId?: string;
      confidence?: number;
      matchType?: PayableReconciliationMatch['match_type'];
      scoreReason?: string;
    }) => approvePayableReconciliationMatch(input),
    onSuccess: (updatedPayable) => {
      queryClient.setQueryData(payablesQueryKeys.detail(updatedPayable.id), updatedPayable);
      queryClient.invalidateQueries({ queryKey: payablesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['bank_reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation_matches'] });
    },
  });
}

export function useRejectPayableReconciliationMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      payableId: string;
      bankTransactionId: string;
      actorId?: string;
      scoreReason?: string;
    }) => rejectPayableReconciliationMatch(input),
    onSuccess: (updatedPayable) => {
      queryClient.setQueryData(payablesQueryKeys.detail(updatedPayable.id), updatedPayable);
      queryClient.invalidateQueries({ queryKey: payablesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['bank_reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation_matches'] });
    },
  });
}

// ============================================================
// RECURRING CONFIG MUTATIONS
// ============================================================

/**
 * Create recurring config mutation
 */
export function useCreateRecurringConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clinicId,
      config,
    }: {
      clinicId: string;
      config: Omit<PayableRecurringConfig, 'id' | 'created_at' | 'updated_at'>;
    }) => createRecurringConfig(clinicId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'recurring'],
      });
    },
  });
}

// ============================================================
// ATTACHMENT MUTATIONS
// ============================================================

/**
 * Add attachment mutation
 */
export function useAddPayableAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clinicId,
      apBillId,
      attachment,
    }: {
      clinicId: string;
      apBillId: string;
      attachment: Omit<PayableAttachment, 'id' | 'clinic_id' | 'ap_bill_id' | 'created_at'>;
    }) => addPayableAttachment(clinicId, apBillId, attachment),
    onSuccess: (_, { apBillId }) => {
      queryClient.invalidateQueries({
        queryKey: payablesQueryKeys.attachments(apBillId),
      });
    },
  });
}

/**
 * Delete attachment mutation
 */
export function useDeletePayableAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePayableAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'attachments'],
      });
    },
  });
}

// ============================================================
// CUSTOM HOOKS (COMBINED OPERATIONS)
// ============================================================

/**
 * Hook for complete payable management
 */
export function usePayableManagement(clinicId: string, filters: Partial<PayableFilterParams> = {}) {
  const payablesQuery = usePayables({
    ...filters,
    clinic_id: clinicId,
    limit: filters.limit || 50,
  });

  const summaryQuery = usePayablesSummary(clinicId);
  const overdueQuery = useOverdueCount(clinicId);

  const createMutation = useCreatePayable();
  const updateMutation = useUpdatePayable();
  const deleteMutation = useDeletePayable();
  const payMutation = usePayPayable();
  const cancelMutation = useCancelPayable();
  const approvalMutation = useApplyPayableApprovalAction();
  const reconciliationMutation = useRunPayablesSmartReconciliation();
  const approveReconciliationMutation = useApprovePayableReconciliationMatch();
  const rejectReconciliationMutation = useRejectPayableReconciliationMatch();

  return {
    // Queries
    payables: payablesQuery.data?.payables || [],
    total: payablesQuery.data?.total || 0,
    summary: summaryQuery.data,
    overdueCount: overdueQuery.data || 0,
    isLoading:
      payablesQuery.isLoading || summaryQuery.isLoading || overdueQuery.isLoading,
    isError: payablesQuery.isError || summaryQuery.isError,
    error: payablesQuery.error || summaryQuery.error,

    // Mutations
    createPayable: createMutation.mutateAsync,
    updatePayable: updateMutation.mutateAsync,
    deletePayable: deleteMutation.mutateAsync,
    payPayable: payMutation.mutateAsync,
    cancelPayable: cancelMutation.mutateAsync,
    applyApprovalAction: approvalMutation.mutateAsync,
    runSmartReconciliation: reconciliationMutation.mutateAsync,
    approveReconciliationMatch: approveReconciliationMutation.mutateAsync,
    rejectReconciliationMatch: rejectReconciliationMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPaying: payMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isApplyingApproval: approvalMutation.isPending,
    isReconciling: reconciliationMutation.isPending,
    isApprovingReconciliation: approveReconciliationMutation.isPending,
    isRejectingReconciliation: rejectReconciliationMutation.isPending,
  };
}

/**
 * Hook for payable detail page
 */
export function usePayableDetail(id: string) {
  const payableQuery = usePayable(id);
  const auditQuery = usePayableAudit(id);
  const attachmentsQuery = usePayableAttachments(id);

  return {
    payable: payableQuery.data,
    audit: auditQuery.data || [],
    attachments: attachmentsQuery.data || [],
    isLoading: payableQuery.isLoading || auditQuery.isLoading || attachmentsQuery.isLoading,
    isError: payableQuery.isError || auditQuery.isError || attachmentsQuery.isError,
    error: payableQuery.error || auditQuery.error || attachmentsQuery.error,
  };
}

// ============================================================
// PREFETCH FUNCTIONS
// ============================================================

/**
 * Prefetch payables for given clinic
 */
export function usePrefetchPayables(clinicId: string) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: payablesQueryKeys.list(clinicId),
      queryFn: () =>
        listPayables({
          clinic_id: clinicId,
          limit: 50,
        }),
    });
  }, [queryClient, clinicId]);
}

/**
 * Prefetch payable detail
 */
export function usePrefetchPayable(id: string) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: payablesQueryKeys.detail(id),
      queryFn: () => getPayable(id),
    });
  }, [queryClient, id]);
}

// ============================================================
// INSTALLMENT OPERATIONS
// ============================================================

/**
 * Hook to split a payable into multiple installments
 */
export function useSplitPayableIntoInstallments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clinicId,
      payableId,
      installmentsCount,
    }: {
      clinicId: string;
      payableId: string;
      installmentsCount: number;
    }) => {
      const { splitPayableIntoInstallments } = await import('../services/payablesApi');
      return splitPayableIntoInstallments(clinicId, payableId, installmentsCount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY],
      });
    },
  });
}

// ============================================================
// RECURRENCE OPERATIONS
// ============================================================

/**
 * Hook to setup recurring payment
 */
export function useSetupRecurringPayable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clinicId,
      payableId,
      recurrenceType,
      recurrenceInterval,
      recurrenceEndDate,
    }: {
      clinicId: string;
      payableId: string;
      recurrenceType: string;
      recurrenceInterval: number;
      recurrenceEndDate?: string;
    }) => {
      const { setupRecurringPayable } = await import('../services/payablesApi');
      return setupRecurringPayable(
        clinicId,
        payableId,
        recurrenceType,
        recurrenceInterval,
        recurrenceEndDate
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY, 'recurring'],
      });
    },
  });
}

/**
 * Hook to generate next occurrences for recurring payables
 */
export function useGenerateRecurringPayables() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clinicId: string) => {
      const { generateRecurringPayables } = await import('../services/payablesApi');
      return generateRecurringPayables(clinicId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PAYABLES_QUERY_KEY],
      });
    },
  });
}

export default {
  usePayables,
  usePayable,
  usePayablesSummary,
  useOverdueCount,
  usePayableAudit,
  usePayableAttachments,
  useRecurringConfigs,
  useCreatePayable,
  useUpdatePayable,
  useDeletePayable,
  usePayPayable,
  useCancelPayable,
  useBulkUpdatePayables,
  useBulkDeletePayables,
  useApplyPayableApprovalAction,
  useRunPayablesSmartReconciliation,
  useCreateRecurringConfig,
  useAddPayableAttachment,
  useDeletePayableAttachment,
  usePayableManagement,
  usePayableDetail,
  usePrefetchPayables,
  usePrefetchPayable,
};
