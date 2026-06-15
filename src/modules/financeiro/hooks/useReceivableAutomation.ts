/**
 * useReceivableAutomation
 * 
 * React hook for receivable automation features
 * Installments, payments, aging analysis, reconciliation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClinicContext } from '@/contexts/ClinicContext';
import receivableAutomationApi, {
  ReceivableInstallment,
  ReceivablePayment,
  ReceivableReconciliation,
} from '@/lib/receivableAutomationApi';

/**
 * Hook to fetch installments for receivable
 */
export function useReceivableInstallments(receivableId?: string | number) {
  return useQuery({
    queryKey: ['ar_invoice_installments', receivableId],
    queryFn: async () => {
      if (!receivableId) return [];
      return receivableAutomationApi.getReceivableInstallments(receivableId);
    },
    enabled: !!receivableId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch single installment
 */
export function useInstallmentDetails(installmentId?: string | number) {
  return useQuery({
    queryKey: ['installment_details', installmentId],
    queryFn: async () => {
      if (!installmentId) return null;
      return receivableAutomationApi.getInstallmentDetails(installmentId);
    },
    enabled: !!installmentId,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook to fetch payments for receivable
 */
export function useReceivablePayments(receivableId?: string | number) {
  return useQuery({
    queryKey: ['receivable_payments', receivableId],
    queryFn: async () => {
      if (!receivableId) return [];
      return receivableAutomationApi.getReceivablePayments(receivableId);
    },
    enabled: !!receivableId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch payment history for period
 */
export function usePaymentHistory(
  fromDate?: string,
  toDate?: string,
  paymentMethod?: string
) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['payment_history', clinic?.id, fromDate, toDate, paymentMethod],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return receivableAutomationApi.getPaymentHistory(
        clinic.id,
        fromDate,
        toDate,
        paymentMethod
      );
    },
    enabled: !!clinic?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch aging report
 */
export function useReceivablesAging() {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['receivables_aging', clinic?.id],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return receivableAutomationApi.getReceivablesAging(clinic.id);
    },
    enabled: !!clinic?.id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch overdue receivables
 */
export function useOverdueReceivables() {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['overdue_receivables', clinic?.id],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return receivableAutomationApi.getOverdueReceivables(clinic.id);
    },
    enabled: !!clinic?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch pending payments
 */
export function usePendingPayments() {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['pending_payments', clinic?.id],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return receivableAutomationApi.getPendingPayments(clinic.id);
    },
    enabled: !!clinic?.id,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook to fetch partially paid receivables
 */
export function usePartiallyPaidReceivables() {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['partially_paid_receivables', clinic?.id],
    queryFn: async () => {
      if (!clinic?.id) return { installments: [], totalPending: 0 };
      return receivableAutomationApi.getPartiallyPaidReceivables(clinic.id);
    },
    enabled: !!clinic?.id,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook to fetch payment statistics
 */
export function usePaymentStats(fromDate?: string, toDate?: string) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['payment_stats', clinic?.id, fromDate, toDate],
    queryFn: async () => {
      if (!clinic?.id) return null;
      return receivableAutomationApi.getPaymentStats(
        clinic.id,
        fromDate,
        toDate
      );
    },
    enabled: !!clinic?.id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch reconciliation records
 */
export function useReconciliationRecords(reconciled?: boolean) {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['reconciliation_records', clinic?.id, reconciled],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return receivableAutomationApi.getReconciliationRecords(
        clinic.id,
        reconciled
      );
    },
    enabled: !!clinic?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch pending reconciliations
 */
export function usePendingReconciliations() {
  const { clinic } = useClinicContext();

  return useQuery({
    queryKey: ['pending_reconciliations', clinic?.id],
    queryFn: async () => {
      if (!clinic?.id) return [];
      return receivableAutomationApi.getPendingReconciliations(clinic.id);
    },
    enabled: !!clinic?.id,
    staleTime: 3 * 60 * 1000,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook to split receivable into installments
 */
export function useSplitReceivableIntoInstallments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: receivableAutomationApi.splitReceivableIntoInstallments,
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['ar_invoice_installments', result.receivable_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['receivables_aging'],
      });
      queryClient.invalidateQueries({
        queryKey: ['pending_payments'],
      });
    },
  });
}

/**
 * Hook to register payment
 */
export function useRegisterReceivablePayment() {
  const queryClient = useQueryClient();
  const { clinic } = useClinicContext();

  return useMutation({
    mutationFn: receivableAutomationApi.registerReceivablePayment,
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['receivable_payments', variables.receivableId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ar_invoice_installments', variables.receivableId],
      });
      queryClient.invalidateQueries({
        queryKey: ['pending_payments', clinic?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['overdue_receivables', clinic?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['partially_paid_receivables', clinic?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['receivables_aging', clinic?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['payment_stats'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cashflow'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cash_flow'],
      });
    },
  });
}

/**
 * Hook to refund payment
 */
export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      clinicId,
      refundAmount,
    }: {
      paymentId: number;
      clinicId: string;
      refundAmount?: number;
    }) =>
      receivableAutomationApi.refundPayment(paymentId, clinicId, refundAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['receivable_payments'],
      });
      queryClient.invalidateQueries({
        queryKey: ['payment_history'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cashflow'],
      });
      queryClient.invalidateQueries({
        queryKey: ['cash_flow'],
      });
    },
  });
}

/**
 * Hook to update installment status
 */
export function useUpdateInstallmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      installmentId,
      newStatus,
    }: {
      installmentId: string | number;
      newStatus: string;
    }) =>
      receivableAutomationApi.updateInstallmentStatus(
        installmentId,
        newStatus
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ar_invoice_installments'],
      });
      queryClient.invalidateQueries({
        queryKey: ['pending_payments'],
      });
      queryClient.invalidateQueries({
        queryKey: ['overdue_receivables'],
      });
    },
  });
}

// ============================================================================
// COMPOSITE HOOKS
// ============================================================================

/**
 * Hook for dashboard summary
 */
export function useReceivableDashboard() {
  const { data: aging, isLoading: agingLoading } = useReceivablesAging();
  const { data: overdue, isLoading: overdueLoading } = useOverdueReceivables();
  const { data: pending, isLoading: pendingLoading } = usePendingPayments();
  const { data: partial, isLoading: partialLoading } =
    usePartiallyPaidReceivables();
  const { data: stats, isLoading: statsLoading } = usePaymentStats();

  return {
    aging: aging || [],
    overdue: overdue || [],
    pending: pending || [],
    partial,
    stats,
    isLoading:
      agingLoading ||
      overdueLoading ||
      pendingLoading ||
      partialLoading ||
      statsLoading,
    summary: {
      totalOverdue: (overdue || []).length,
      totalPending: (pending || []).length,
      totalPartial: partial?.installments.length || 0,
      totalAmountPending:
        (pending || []).reduce((acc, p) => acc + (p.value_net || 0), 0) +
        (partial?.totalPending || 0),
    },
  };
}

/**
 * Hook for payment collection workflow
 */
export function usePaymentCollection(receivableId?: string | number) {
  const { data: installments, isLoading: installmentsLoading } =
    useReceivableInstallments(receivableId);
  const { data: payments, isLoading: paymentsLoading } =
    useReceivablePayments(receivableId);

  const registerPayment = useRegisterReceivablePayment();
  const refundPayment = useRefundPayment();

  const totalValue = (installments || []).reduce(
    (acc, inst) => acc + (inst.value_net || 0),
    0
  );

  const totalPaid = (payments || []).reduce(
    (acc, p) => acc + (p.amount_paid || 0),
    0
  );

  return {
    installments: installments || [],
    payments: payments || [],
    totalValue,
    totalPaid,
    remaining: totalValue - totalPaid,
    percentagePaid: totalValue > 0 ? (totalPaid / totalValue) * 100 : 0,
    registerPayment: registerPayment.mutate,
    refundPayment: refundPayment.mutate,
    isRegistering: registerPayment.isPending,
    isRefunding: refundPayment.isPending,
    isLoading: installmentsLoading || paymentsLoading,
  };
}

export default {
  useReceivableInstallments,
  useInstallmentDetails,
  useReceivablePayments,
  usePaymentHistory,
  useReceivablesAging,
  useOverdueReceivables,
  usePendingPayments,
  usePartiallyPaidReceivables,
  usePaymentStats,
  useReconciliationRecords,
  usePendingReconciliations,
  useSplitReceivableIntoInstallments,
  useRegisterReceivablePayment,
  useRefundPayment,
  useUpdateInstallmentStatus,
  useReceivableDashboard,
  usePaymentCollection,
};
