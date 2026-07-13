/**
 * 💰 Contas a Pagar - Página Principal
 * Enterprise payables management dashboard
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Filter, X, Save, AlertCircle, Check, Calendar, ReceiptText, ShieldCheck, WalletCards, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { usePayable, usePayableManagement } from '../hooks/usePayables';
import { PayablesExtendedDashboard } from '../components/PayablesDashboard';
import { PayablesTable } from '../components/PayablesTable';
import { Payable, PayableApprovalAction, PayableFilterParams, PayableReconciliationMatch, PayableReconciliationSummary, PayableStatus, PayableType, PaymentMethodType } from '../types';
import { CreateEditPayableModal } from '../components/modals/CreateEditPayableModal';
import { PayPayableModal } from '../components/modals/PayPayableModal';
import { CancelPayableModal } from '../components/modals/CancelPayableModal';
import { ApprovalWorkflowDrawer } from '../components/ApprovalWorkflowDrawer';
import RelatoriosToolbar from '@/components/financeiro/RelatoriosToolbar';
import {
  labelApprovalStage,
  labelPaymentMethod,
  labelPayableStatus,
  labelPayableType,
  labelReconciliationMatchType,
  labelReconciliationStatus,
} from '../utils/labels';
import { generatePayablesReport } from '../utils/payablesReportUtils';

const emptyPayableFilters = {
  status: '',
  statusList: undefined as PayableStatus[] | undefined,
  type: '',
  dueStartDate: '',
  dueEndDate: '',
  emissionStartDate: '',
  emissionEndDate: '',
  competencyStartDate: '',
  competencyEndDate: '',
  supplier: '',
  category: '',
  subcategory: '',
  paymentMethod: '',
};

function normalizePayableStatusParam(value: string | null): PayableStatus | '' {
  if (!value) {
    return '';
  }
  const normalized = value.toUpperCase();
  if (normalized === 'OPEN' || normalized === 'ABERTO') return PayableStatus.OPEN;
  if (normalized === 'APPROVING' || normalized === 'APROVANDO') return PayableStatus.APPROVING;
  if (normalized === 'APPROVED' || normalized === 'APROVADO') return PayableStatus.APPROVED;
  if (normalized === 'OVERDUE' || normalized === 'VENCIDO') return PayableStatus.OVERDUE;
  if (normalized === 'PARTIAL' || normalized === 'PARCIAL') return PayableStatus.PARTIAL;
  if (normalized === 'PAID' || normalized === 'PAGO') return PayableStatus.PAID;
  if (normalized === 'BLOCKED' || normalized === 'BLOQUEADO') return PayableStatus.BLOCKED;
  if (normalized === 'CANCELED' || normalized === 'CANCELADO') return PayableStatus.CANCELED;
  if (normalized === 'NEGOTIATED' || normalized === 'NEGOCIADO') return PayableStatus.NEGOTIATED;
  if (normalized === 'REVERSED' || normalized === 'ESTORNADO') return PayableStatus.REVERSED;
  return '';
}

function normalizePayableStatusParams(values: string[]): PayableStatus[] {
  const uniqueStatuses = new Set<PayableStatus>();
  values
    .flatMap((value) => value.split(','))
    .map((value) => normalizePayableStatusParam(value.trim()))
    .filter(Boolean)
    .forEach((status) => uniqueStatuses.add(status as PayableStatus));

  return Array.from(uniqueStatuses);
}

function normalizePayableTypeParam(value: string | null): PayableType | '' {
  if (!value) {
    return '';
  }
  const normalized = value.toUpperCase();
  return Object.values(PayableType).includes(normalized as PayableType) ? normalized as PayableType : '';
}

function buildPayableStateFromSearchParams(searchParams: URLSearchParams) {
  const statusList = normalizePayableStatusParams(searchParams.getAll('status'));

  return {
    filters: {
      ...emptyPayableFilters,
      status: statusList.length === 1 ? statusList[0] : '',
      statusList: statusList.length > 1 ? statusList : undefined,
      type: normalizePayableTypeParam(searchParams.get('type')),
      dueStartDate: searchParams.get('dueStartDate') || searchParams.get('dueStart') || '',
      dueEndDate: searchParams.get('dueEndDate') || searchParams.get('dueEnd') || '',
      emissionStartDate: searchParams.get('emissionStartDate') || searchParams.get('emissionStart') || '',
      emissionEndDate: searchParams.get('emissionEndDate') || searchParams.get('emissionEnd') || '',
      competencyStartDate: searchParams.get('competencyStartDate') || searchParams.get('competencyStart') || '',
      competencyEndDate: searchParams.get('competencyEndDate') || searchParams.get('competencyEnd') || '',
      supplier: searchParams.get('supplier') || searchParams.get('vendor') || '',
      category: searchParams.get('category') || '',
      subcategory: searchParams.get('subcategory') || '',
      paymentMethod: searchParams.get('paymentMethod') || '',
    },
    searchQuery: searchParams.get('search') || '',
  };
}

function getSafeInternalReturnPath(value: string | null) {
  if (!value || !value.startsWith('/clinica/')) return '';
  if (value.startsWith('//')) return '';
  return value;
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = 45000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function getBulkActionLabel(action: string) {
  const labels: Record<string, string> = {
    pay: 'Registrando pagamentos',
    send_to_approval: 'Enviando para aprovação',
    check: 'Marcando como conferida',
    approve: 'Aprovando contas',
    release: 'Liberando pagamentos',
    block: 'Bloqueando contas',
    reverse: 'Estornando contas',
    cancel: 'Cancelando contas',
    delete: 'Excluindo contas a pagar',
  };
  return labels[action] || 'Processando ação em lote';
}

export default function ContasApagarPage() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Contas a Pagar' },
  ]);
  const { clinicId, clinic } = useClinicContext();
  const { user, currentRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const urlState = useMemo(
    () => buildPayableStateFromSearchParams(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );
  const source = searchParams.get('from');
  const trace = searchParams.get('trace');
  const legacyAction = searchParams.get('action');
  const legacyEditId = searchParams.get('edit') || '';
  const returnToParam = getSafeInternalReturnPath(searchParams.get('returnTo'));
  const cameFromCashflow = source === 'fluxo-caixa';

  // UI State
  const [showFilters, setShowFilters] = useState(cameFromCashflow || Object.values(urlState.filters).some(Boolean) || !!urlState.searchQuery);
  const [searchQuery, setSearchQuery] = useState(urlState.searchQuery);
  const [selectedPayables, setSelectedPayables] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    active: false,
    action: '',
    current: 0,
    total: 0,
    succeeded: 0,
    failed: 0,
    currentLabel: '',
  });
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [reconciliationSummary, setReconciliationSummary] = useState<string>('');
  const [reconciliationResult, setReconciliationResult] = useState<PayableReconciliationSummary | null>(null);
  const [returnToAfterEdit, setReturnToAfterEdit] = useState(returnToParam);

  // Advanced Filters State
  const [filters, setFilters] = useState(urlState.filters);

  React.useEffect(() => {
    if (returnToParam) {
      setReturnToAfterEdit(returnToParam);
    }
    setFilters(urlState.filters);
    setSearchQuery(urlState.searchQuery);
    if (cameFromCashflow || Object.values(urlState.filters).some(Boolean) || !!urlState.searchQuery) {
      setShowFilters(true);
    }
  }, [cameFromCashflow, returnToParam, searchParamsKey, urlState.filters, urlState.searchQuery]);

  const payableQueryParams = useMemo<Partial<PayableFilterParams>>(() => ({
    status: filters.statusList?.length ? filters.statusList : filters.status ? [filters.status as PayableStatus] : undefined,
    type: filters.type ? [filters.type as PayableType] : undefined,
    supplier_name: filters.supplier || undefined,
    category: filters.category || undefined,
    subcategory: filters.subcategory || undefined,
    payment_method: filters.paymentMethod ? [filters.paymentMethod as any] : undefined,
    due_date_start: filters.dueStartDate || undefined,
    due_date_end: filters.dueEndDate || undefined,
    issue_date_start: filters.emissionStartDate || undefined,
    issue_date_end: filters.emissionEndDate || undefined,
    competency_date_start: filters.competencyStartDate || undefined,
    competency_date_end: filters.competencyEndDate || undefined,
    search: searchQuery || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order_by: 'due_date.asc',
  }), [filters, page, pageSize, searchQuery]);

  React.useEffect(() => {
    setPage(1);
  }, [filters, searchQuery, pageSize]);

  // Fetch data
  const {
    payables,
    total,
    summary,
    isLoading,
    deletePayable,
    payPayable,
    cancelPayable,
    applyApprovalAction,
    runSmartReconciliation,
    approveReconciliationMatch,
    rejectReconciliationMatch,
    isApplyingApproval,
    isPaying,
    isCanceling,
    isReconciling,
    isApprovingReconciliation,
    isRejectingReconciliation,
  } = usePayableManagement(clinicId || '', payableQueryParams);
  const {
    data: legacyEditPayable,
    isFetched: isLegacyEditFetched,
  } = usePayable(legacyEditId);
  const operationalSummary = useMemo(() => {
    const totalFilteredAmount = payables.reduce((sum, payable) => {
      const balanceAmount = Number(payable.balance_amount ?? payable.net_amount ?? payable.amount ?? 0);
      const isSettled = payable.status === PayableStatus.PAID
        || payable.status === PayableStatus.CANCELED
        || payable.status === PayableStatus.REVERSED
        || balanceAmount <= 0;

      return isSettled ? sum : sum + balanceAmount;
    }, 0);
    const withInvoiceCount = payables.filter((payable) => payable.has_invoice || payable.invoice_xml_url || payable.invoice_pdf_url || payable.attachment_url).length;
    const medicationTraceCount = payables.filter((payable) => {
      const traceability = payable.medication_traceability || payable.metadata?.nfe?.medication_traceability;
      return Array.isArray(traceability) && traceability.length > 0;
    }).length;
    const nextDueDate = payables
      .filter((payable) => payable.status === PayableStatus.OPEN && payable.due_date)
      .map((payable) => payable.due_date)
      .sort()[0];

    return { totalFilteredAmount, withInvoiceCount, medicationTraceCount, nextDueDate };
  }, [payables]);

  // Hook para gerenciar filtros salvos
  const { savedFilters, saveFilter, deleteFilter, getFilter } = useSavedFilters('contas_pagar_filters');

  // Modal States
  const [modals, setModals] = useState({
    createEdit: false,
    pay: false,
    cancel: false,
    approval: false,
  });
  const [currentPayable, setCurrentPayable] = useState<Payable | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Modal handlers
  const handleOpenCreateModal = useCallback(() => {
    navigate('/clinica/financeiro/contas-pagar/nova');
  }, [navigate]);

  const handleOpenEditModal = useCallback((payable: Payable) => {
    setCurrentPayable(payable);
    setIsEditMode(true);
    setModals(prev => ({ ...prev, createEdit: true }));
  }, []);

  React.useEffect(() => {
    if (legacyAction !== 'new') return;
    navigate('/clinica/financeiro/contas-pagar/nova', { replace: true });
  }, [legacyAction, navigate]);

  React.useEffect(() => {
    if (!legacyEditId || !isLegacyEditFetched) return;
    if (legacyEditPayable) {
      handleOpenEditModal(legacyEditPayable);
    }
    navigate('/clinica/financeiro/contas-pagar', { replace: true });
  }, [handleOpenEditModal, isLegacyEditFetched, legacyEditId, legacyEditPayable, navigate]);

  const handleOpenPayModal = useCallback((payable: Payable) => {
    setCurrentPayable(payable);
    setModals(prev => ({ ...prev, pay: true }));
  }, []);

  const handleOpenCancelModal = useCallback((payable: Payable) => {
    setCurrentPayable(payable);
    setModals(prev => ({ ...prev, cancel: true }));
  }, []);

  const handleCloseModals = useCallback(() => {
    setModals({ createEdit: false, pay: false, cancel: false, approval: false });
    setCurrentPayable(null);
    setIsEditMode(false);
    if (returnToAfterEdit) {
      const target = returnToAfterEdit;
      setReturnToAfterEdit('');
      navigate(target, { replace: true });
    }
  }, [navigate, returnToAfterEdit]);

  // Table handlers
  const handleViewPayable = useCallback((payable: Payable) => {
    setCurrentPayable(payable);
    setModals(prev => ({ ...prev, approval: true }));
  }, []);

  const handleSelectChange = useCallback((selected: string[]) => {
    setSelectedPayables(selected);
  }, []);

  const handleDeletePayable = useCallback(async (payable: Payable) => {
    try {
      await deletePayable(payable.id);
      toast({
        title: 'Título excluído',
        description: 'A conta a pagar foi removida com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir título',
        description: error?.message || 'Não foi possível excluir a conta a pagar.',
        variant: 'destructive',
      });
    }
  }, [deletePayable, toast]);

  const handleApprovalAction = useCallback(async (action: PayableApprovalAction, reason?: string) => {
    if (!currentPayable) return;
    await applyApprovalAction({
      id: currentPayable.id,
      action,
      actorId: user?.id,
      reason,
    });
  }, [applyApprovalAction, currentPayable, user?.id]);

  const handleRunReconciliation = useCallback(async () => {
    if (!clinicId) return;
    const result = await runSmartReconciliation({ clinicId, actorId: user?.id });
    setReconciliationResult(result);
    setReconciliationSummary(`${result.matched} conciliada(s), ${result.review} para revisão, ${result.unmatched} sem conciliação.`);
  }, [clinicId, runSmartReconciliation, user?.id]);

  const handleApproveReconciliation = useCallback(async (match: PayableReconciliationMatch) => {
    await approveReconciliationMatch({
      payableId: match.payable_id,
      bankTransactionId: match.bank_transaction_id,
      actorId: user?.id,
      confidence: match.confidence,
      matchType: match.match_type,
      scoreReason: match.score_reason,
    });
    setReconciliationResult((current) => current
      ? {
          ...current,
          matches: current.matches.map((item) => item.bank_transaction_id === match.bank_transaction_id ? { ...item, status: 'matched' } : item),
          matched: current.matches.filter((item) => item.bank_transaction_id === match.bank_transaction_id || item.status === 'matched').length,
          review: current.matches.filter((item) => item.bank_transaction_id !== match.bank_transaction_id && item.status === 'review').length,
        }
      : current);
  }, [approveReconciliationMatch, user?.id]);

  const handleRejectReconciliation = useCallback(async (match: PayableReconciliationMatch) => {
    await rejectReconciliationMatch({
      payableId: match.payable_id,
      bankTransactionId: match.bank_transaction_id,
      actorId: user?.id,
      scoreReason: match.score_reason,
    });
    setReconciliationResult((current) => current
      ? {
          ...current,
          matches: current.matches.filter((item) => item.bank_transaction_id !== match.bank_transaction_id),
          review: current.matches.filter((item) => item.bank_transaction_id !== match.bank_transaction_id && item.status === 'review').length,
          unmatched: current.unmatched + 1,
        }
      : current);
  }, [rejectReconciliationMatch, user?.id]);

  // Filter handlers
  const handleSaveFilter = (name: string) => {
    const filterData = { ...filters, searchQuery };
    saveFilter(name, filterData);
  };

  const handleLoadFilter = (name: string) => {
    const filterData = getFilter(name);
    if (filterData) {
      setFilters(filterData);
      setSearchQuery(filterData.searchQuery || '');
    }
  };

  const handleClearFilters = () => {
    setFilters(emptyPayableFilters);
    setSearchQuery('');
    if (cameFromCashflow || searchParamsKey) {
      navigate('/clinica/financeiro/contas-pagar', { replace: true });
    }
  };

  const formatDateInput = (date: Date) => date.toISOString().split('T')[0];

  const applyQuickFilter = (type: string) => {
    const today = new Date();
    const next30 = new Date(today);
    next30.setDate(today.getDate() + 30);

    const nextFilters = { ...emptyPayableFilters };
    let nextSearchQuery = '';

    if (type === 'overdue') {
      nextFilters.status = PayableStatus.OVERDUE;
    } else if (type === 'next30') {
      nextFilters.dueStartDate = formatDateInput(today);
      nextFilters.dueEndDate = formatDateInput(next30);
      nextFilters.statusList = [PayableStatus.OPEN, PayableStatus.APPROVING, PayableStatus.APPROVED, PayableStatus.PARTIAL];
    } else if (type === 'dueToday') {
      nextFilters.dueStartDate = formatDateInput(today);
      nextFilters.dueEndDate = formatDateInput(today);
      nextFilters.statusList = [PayableStatus.OPEN, PayableStatus.APPROVING, PayableStatus.APPROVED, PayableStatus.PARTIAL];
    } else if (type === 'approval') {
      nextFilters.statusList = [PayableStatus.APPROVING, PayableStatus.APPROVED, PayableStatus.BLOCKED];
    } else if (type === 'open') {
      nextFilters.status = PayableStatus.OPEN;
    } else if (type === 'paid') {
      nextFilters.status = PayableStatus.PAID;
    }

    setFilters(nextFilters);
    setSearchQuery(nextSearchQuery);
    setShowFilters(false);
    if (cameFromCashflow || searchParamsKey) {
      navigate('/clinica/financeiro/contas-pagar', { replace: true });
    }
  };

  // Filter display
  const hasActiveFilters = searchQuery.length > 0 || Object.values(filters).some(v => v);
  const activeFilterLabels = [
    searchQuery ? `Busca: ${searchQuery}` : '',
    filters.statusList?.length ? `Status: em aberto operacional (${filters.statusList.length})` : filters.status ? `Status: ${labelPayableStatus(filters.status)}` : '',
    filters.type ? `Tipo: ${labelPayableType(filters.type)}` : '',
    filters.supplier ? `Fornecedor: ${filters.supplier}` : '',
    filters.category ? `Categoria: ${filters.category}` : '',
    filters.subcategory ? `Subcategoria: ${filters.subcategory}` : '',
    filters.paymentMethod ? `Pagamento: ${labelPaymentMethod(filters.paymentMethod)}` : '',
    filters.dueStartDate || filters.dueEndDate ? `Vencimento: ${filters.dueStartDate || '...'} a ${filters.dueEndDate || '...'}` : '',
    filters.emissionStartDate || filters.emissionEndDate ? `Emissao: ${filters.emissionStartDate || '...'} a ${filters.emissionEndDate || '...'}` : '',
    filters.competencyStartDate || filters.competencyEndDate ? `Competencia: ${filters.competencyStartDate || '...'} a ${filters.competencyEndDate || '...'}` : '',
  ].filter(Boolean);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const payableById = useMemo(() => new Map(payables.map((payable) => [payable.id, payable])), [payables]);
  const selectedRows = useMemo(
    () => selectedPayables.map((id) => payableById.get(id)).filter(Boolean) as Payable[],
    [payableById, selectedPayables],
  );
  const selectedTotal = useMemo(
    () => selectedRows.reduce((sum, payable) => sum + Number(payable.balance_amount || payable.net_amount || payable.amount || 0), 0),
    [selectedRows],
  );
  const currentRoleName = String(currentRole || '').toLowerCase();
  const isAdmin = ['admin', 'administrator', 'gestor'].includes(currentRoleName);
  const actionBusy = bulkProcessing || isApplyingApproval || isPaying || isCanceling;
  const bulkProgressPercent = bulkProgress.total > 0
    ? Math.min(100, Math.round(((bulkProgress.succeeded + bulkProgress.failed) / bulkProgress.total) * 100))
    : 0;

  const selectablePayables = useMemo(
    () => payables.filter((payable) => ![PayableStatus.CANCELED, PayableStatus.REVERSED].includes(payable.status)),
    [payables],
  );

  const selectAllVisible = useCallback(() => {
    setSelectedPayables(selectablePayables.map((payable) => payable.id));
  }, [selectablePayables]);

  const clearSelection = useCallback(() => {
    setSelectedPayables([]);
    setBulkAction('');
    setBulkProgress({ active: false, action: '', current: 0, total: 0, succeeded: 0, failed: 0, currentLabel: '' });
  }, []);

  const getBulkActionTargets = useCallback((action: string) => {
    if (action === 'pay') {
      return selectedRows.filter((payable) => Number(payable.balance_amount || payable.net_amount || payable.amount || 0) > 0 && ![PayableStatus.PAID, PayableStatus.CANCELED, PayableStatus.REVERSED].includes(payable.status));
    }
    if (action === 'cancel') {
      return selectedRows.filter((payable) => ![PayableStatus.PAID, PayableStatus.CANCELED, PayableStatus.REVERSED].includes(payable.status));
    }
    if (action === 'delete') {
      return isAdmin ? selectedRows : [];
    }
    if (action === 'reverse') {
      return selectedRows.filter((payable) => payable.status === PayableStatus.PAID || payable.approval_stage === 'PAID');
    }
    if (action === 'block') {
      return selectedRows.filter((payable) => ![PayableStatus.PAID, PayableStatus.CANCELED, PayableStatus.REVERSED].includes(payable.status));
    }
    return selectedRows.filter((payable) => ![PayableStatus.PAID, PayableStatus.CANCELED, PayableStatus.REVERSED].includes(payable.status));
  }, [isAdmin, selectedRows]);

  const handleApplyBulkAction = useCallback(async () => {
    if (!bulkAction || !selectedRows.length) return;

    const targets = getBulkActionTargets(bulkAction);
    if (!targets.length) {
      toast({
        title: 'Nenhuma conta elegível',
        description: 'Os lançamentos selecionados não permitem essa ação em lote.',
        variant: 'destructive',
      });
      return;
    }

    if (bulkAction === 'delete' && !isAdmin) {
      toast({
        title: 'Ação restrita',
        description: 'Somente administradores podem excluir contas a pagar em lote.',
        variant: 'destructive',
      });
      return;
    }

    if (['cancel', 'delete', 'reverse'].includes(bulkAction)) {
      const confirmed = window.confirm(`Confirmar ação em ${targets.length} conta(s) a pagar selecionada(s)?`);
      if (!confirmed) return;
    }

    setBulkProcessing(true);
    setBulkProgress({
      active: true,
      action: bulkAction,
      current: 0,
      total: targets.length,
      succeeded: 0,
      failed: 0,
      currentLabel: 'Preparando ação em lote',
    });
    try {
      const failures: string[] = [];
      let succeeded = 0;

      for (const [index, payable] of targets.entries()) {
        const payableLabel = payable.supplier_name || payable.description || payable.document_number || payable.invoice_number || payable.id;
        setBulkProgress((prev) => ({
          ...prev,
          current: index + 1,
          succeeded,
          failed: failures.length,
          currentLabel: payableLabel,
        }));

        try {
          if (bulkAction === 'pay') {
            const amount = Number(payable.balance_amount || payable.net_amount || payable.amount || 0);
            await withTimeout(payPayable({
              id: payable.id,
              paidValue: amount,
              paymentMethod: payable.payment_method || PaymentMethodType.PIX,
              paidBy: user?.id,
              paymentDate: new Date().toISOString().split('T')[0],
              paymentBank: payable.payment_bank,
              notes: 'Pagamento registrado em lote',
            }), `Tempo excedido ao registrar pagamento de ${payableLabel}.`);
          } else if (bulkAction === 'cancel') {
            await withTimeout(cancelPayable(payable.id), `Tempo excedido ao cancelar ${payableLabel}.`);
          } else if (bulkAction === 'delete') {
            await withTimeout(deletePayable(payable.id), `Tempo excedido ao excluir ${payableLabel}.`);
          } else {
            const actionMap: Record<string, PayableApprovalAction> = {
              send_to_approval: PayableApprovalAction.SEND_TO_APPROVAL,
              check: PayableApprovalAction.CHECK,
              approve: PayableApprovalAction.APPROVE,
              release: PayableApprovalAction.RELEASE,
              block: PayableApprovalAction.BLOCK,
              reverse: PayableApprovalAction.REVERSE,
            };
            await withTimeout(applyApprovalAction({
              id: payable.id,
              action: actionMap[bulkAction],
              actorId: user?.id,
              reason: 'Ação aplicada em lote',
            }), `Tempo excedido ao processar ${payableLabel}.`);
          }
          succeeded += 1;
          setBulkProgress((prev) => ({ ...prev, succeeded }));
        } catch (error: any) {
          failures.push(`${payableLabel}: ${error?.message || 'erro desconhecido'}`);
          setBulkProgress((prev) => ({ ...prev, failed: failures.length }));
        }
      }

      if (failures.length) {
        toast({
          title: 'Ação em lote concluída com falhas',
          description: `${succeeded} processada(s), ${failures.length} com falha. ${failures.slice(0, 2).join(' | ')}`,
          variant: 'destructive',
        });
        if (succeeded > 0) {
          setSelectedPayables([]);
          setBulkAction('');
        }
      } else {
        toast({
          title: 'Ação em lote concluída',
          description: `${targets.length} conta(s) processada(s) com sucesso.`,
        });
        clearSelection();
      }
    } catch (error: any) {
      toast({
        title: 'Erro na ação em lote',
        description: error?.message || 'Não foi possível concluir a ação selecionada.',
        variant: 'destructive',
      });
    } finally {
      setBulkProcessing(false);
      setBulkProgress((prev) => ({ ...prev, active: false, currentLabel: '' }));
    }
  }, [applyApprovalAction, bulkAction, cancelPayable, clearSelection, deletePayable, getBulkActionTargets, isAdmin, payPayable, selectedRows, toast, user?.id]);

  const exportRows = payables.map((payable) => ({
    vencimento: payable.due_date,
    fornecedor: payable.supplier_name,
    documento: payable.document_number || payable.invoice_number || '',
    descricao: payable.description,
    competencia: payable.competency_date || '',
    categoria: payable.category || '',
    subcategoria: payable.subcategory || '',
    valor: Number(payable.net_amount || payable.amount || 0),
    desconto: Number(payable.discount_amount || 0),
    multa_juros: Number(payable.fine_amount || 0) + Number(payable.interest_amount || 0),
    saldo: Number(payable.balance_amount || 0),
    forma: labelPaymentMethod(payable.payment_method),
    status: labelPayableStatus(payable.status),
    aprovacao: labelApprovalStage(payable.approval_stage),
    conciliacao: labelReconciliationStatus(payable.metadata?.enterprise?.reconciliation?.status),
  }));

  const exportColumns = [
    { key: 'vencimento', label: 'Vencimento', width: 12 },
    { key: 'fornecedor', label: 'Fornecedor', width: 24 },
    { key: 'documento', label: 'Documento', width: 16 },
    { key: 'descricao', label: 'Descrição', width: 28 },
    { key: 'competencia', label: 'Competência', width: 12 },
    { key: 'categoria', label: 'Categoria', width: 16 },
    { key: 'valor', label: 'Valor', width: 14, format: 'currency' },
    { key: 'desconto', label: 'Desconto', width: 14, format: 'currency' },
    { key: 'multa_juros', label: 'Multa/Juros', width: 14, format: 'currency' },
    { key: 'saldo', label: 'Saldo', width: 14, format: 'currency' },
    { key: 'forma', label: 'Forma', width: 12 },
    { key: 'status', label: 'Status', width: 12 },
    { key: 'aprovacao', label: 'Aprovação', width: 14 },
    { key: 'conciliacao', label: 'Conciliação', width: 14 },
  ];

  // Funções de relatório avançado
  const handleGenerateAdvancedReport = useCallback((format: 'excel' | 'pdf' | 'csv', groupBy: 'status' | 'supplier' | 'category' | 'none' = 'status') => {
    try {
      generatePayablesReport({
        title: 'Relatório de Contas a Pagar',
        clinic,
        payables,
        groupBy,
        format,
      });
      toast({
        title: 'Sucesso',
        description: `Relatório gerado em ${format.toUpperCase()} com agrupamento por ${groupBy}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar relatório',
        description: error?.message || 'Não foi possível gerar o relatório',
        variant: 'destructive',
      });
    }
  }, [clinic, payables, toast]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Contas a Pagar"
      subtitle="Gerencie as contas a pagar de fornecedores, serviços e despesas operacionais."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={isReconciling || !clinicId}
            onClick={handleRunReconciliation}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isReconciling ? 'Conciliando' : 'Conciliar'}
          </Button>
          <Button
            className="bg-blue-600 text-white"
            onClick={handleOpenCreateModal}
          >
            <Plus className="mr-2 w-4 h-4" /> Nova Conta
          </Button>
        </div>
      }
    >
      {reconciliationSummary && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Conciliação inteligente concluída: {reconciliationSummary}
        </Card>
      )}
      {reconciliationResult?.matches?.length ? (
        <Card className="mb-4 border-slate-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Revisão de conciliação</CardTitle>
                <CardDescription>
                  Confirme ou rejeite matches sugeridos antes de fechar a conciliação bancária.
                </CardDescription>
              </div>
              <Badge variant="outline">
                {reconciliationResult.matches.filter((match) => match.status === 'review').length} para revisar
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-medium">Conta</th>
                    <th className="px-3 py-2 font-medium">Extrato</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 text-center font-medium">Confiança</th>
                    <th className="px-3 py-2 font-medium">Evidência</th>
                    <th className="px-3 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationResult.matches.map((match) => {
                    const payable = payableById.get(match.payable_id);
                    const isMatched = match.status === 'matched';
                    const isBusy = isApprovingReconciliation || isRejectingReconciliation;

                    return (
                      <tr key={`${match.payable_id}-${match.bank_transaction_id}`} className="border-b last:border-0">
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium text-slate-900">
                            {payable?.supplier_name || 'Conta fora da página atual'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {payable?.description || match.payable_id}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium text-slate-900">{match.description || 'Transação bancária'}</div>
                          <div className="text-xs text-slate-500">{match.transaction_date}</div>
                        </td>
                        <td className="px-3 py-3 text-right align-top font-medium">
                          {Number(match.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          <Badge variant={match.confidence >= 85 ? 'default' : 'outline'}>
                            {Math.round(match.confidence)}%
                          </Badge>
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-600">
                          <div>{labelReconciliationMatchType(match.match_type)}</div>
                          <div>{match.score_reason}</div>
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant={isMatched ? 'outline' : 'default'}
                              disabled={isBusy || isMatched}
                              onClick={() => handleApproveReconciliation(match)}
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy || isMatched}
                              onClick={() => handleRejectReconciliation(match)}
                            >
                              Rejeitar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {cameFromCashflow && (
        <Card className="mb-4 border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Origem: Fluxo de Caixa{trace ? ` (${trace})` : ''}. Os filtros desta tela foram carregados a partir do atalho financeiro.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/clinica/financeiro/fluxo-caixa')}
              >
                Voltar ao Fluxo de Caixa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/clinica/financeiro/contas-pagar', { replace: true })}
              >
                Limpar rastreio
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 📊 RESUMO FINANCEIRO */}
      <div className="grid gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {[
          { label: 'Total em Aberto (Geral)', value: (summary?.open_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Clínica inteira', tone: 'text-yellow-700', icon: AlertCircle },
          { label: 'Total em Aberto (Período)', value: operationalSummary.totalFilteredAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Filtro atual', tone: 'text-amber-600', icon: AlertCircle },
          { label: 'Total Vencido', value: (summary?.overdue_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Atraso', tone: 'text-red-700', icon: AlertCircle },
          { label: 'Pago este Mês', value: (summary?.paid_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Efetivado', tone: 'text-green-700', icon: Check },
          { label: 'Próximos 30 Dias', value: (summary?.due_next_30_days_count || 0).toLocaleString('pt-BR'), hint: 'Contas', tone: 'text-blue-700', icon: Calendar },
          { label: 'Vence Hoje', value: (summary?.due_today_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: `${summary?.due_today_count || 0} contas`, tone: 'text-slate-700', icon: Calendar },
          { label: 'Próximos 7 Dias', value: (summary?.due_next_7_days_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: `${summary?.due_next_7_days_count || 0} contas`, tone: 'text-slate-700', icon: Calendar },
          { label: 'Previsão de Saídas', value: (summary?.forecast_outflow_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Fluxo previsto', tone: 'text-slate-700', icon: WalletCards },
          { label: 'Saídas Realizadas', value: (summary?.realized_outflow_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Fluxo realizado', tone: 'text-slate-700', icon: Check },
          { label: 'Despesas Operacionais', value: (summary?.operational_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Impacto DRE', tone: 'text-slate-700', icon: WalletCards },
          { label: 'Despesas Administrativas', value: (summary?.administrative_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Impacto DRE', tone: 'text-slate-700', icon: WalletCards },
          { label: 'Despesas Assistenciais', value: (summary?.assistential_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Impacto DRE', tone: 'text-slate-700', icon: WalletCards },
          { label: 'Bloqueado/Aprovação', value: ((summary?.blocked_amount || 0) + (summary?.approving_amount || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Governança', tone: 'text-slate-700', icon: AlertCircle },
          { label: 'Com NF/anexo', value: operationalSummary.withInvoiceCount.toLocaleString('pt-BR'), hint: 'Documentos', tone: 'text-blue-700', icon: ReceiptText },
          { label: 'Medicamentos rastreados', value: operationalSummary.medicationTraceCount.toLocaleString('pt-BR'), hint: 'Rastreabilidade', tone: 'text-emerald-700', icon: ShieldCheck },
          { label: 'Proximo vencimento', value: operationalSummary.nextDueDate || 'Sem aberto', hint: 'Agenda financeira', tone: 'text-orange-700', icon: Calendar },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-3 border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">{item.label}</p>
                  <p className={`mt-1 text-lg font-bold ${item.tone}`}>{item.value}</p>
                  <p className="mt-1 text-[11px] text-gray-500 truncate">{item.hint}</p>
                </div>
                <Icon className={`w-5 h-5 ${item.tone}`} />
              </div>
            </Card>
          );
        })}
      </div>

          {/* RelatoriosToolbar com filtros salvos */}
        <RelatoriosToolbar
          title="Contas a Pagar"
          data={exportRows}
          columns={exportColumns}
          templateFileName="contas_pagar"
          onExportExcel={() => handleGenerateAdvancedReport('excel', 'status')}
          onExportCsv={() => handleGenerateAdvancedReport('csv', 'status')}
          onExportPdf={() => handleGenerateAdvancedReport('pdf', 'status')}
          onExportPowerBi={() => handleGenerateAdvancedReport('csv', 'category')}
          onExportContabil={() => handleGenerateAdvancedReport('pdf', 'category')}
          onExportAuditoria={() => handleGenerateAdvancedReport('pdf', 'supplier')}
          onGenerateReport={() => handleGenerateAdvancedReport('pdf', 'status')}
          selectedFiltersCount={Object.keys(savedFilters).length}
          onAddFilter={() => setSaveFilterDialogOpen(true)}
          savedFilters={Object.keys(savedFilters)}
          onSelectFilter={(filterName) => handleLoadFilter(filterName)}
          onDeleteFilter={(filterName) => deleteFilter(filterName)}
        />

        <Card className="p-4 border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Atalhos operacionais</p>
              <p className="text-xs text-slate-500">Use os recortes mais frequentes de pagamentos sem configurar filtros manualmente.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('overdue')}>Vencidos</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('next30')}>Próx. 30 dias</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('dueToday')}>Vence hoje</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('approval')}>Aprovação</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('open')}>Em aberto</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('paid')}>Pagos</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 w-full border border-slate-100 shadow-sm rounded-xl bg-white">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={showFilters}
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-600" />
              Filtros Avançados
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-normal text-slate-500">
                {activeFilterLabels.length} ativo(s)
              </span>
            </h3>
            {showFilters ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
          </button>

          {showFilters && (
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
              {activeFilterLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilterLabels.map((label) => (
                    <Badge key={label} variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
                <Input
                  placeholder="Fornecedor, descrição ou documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {/* Status Filter */}
                <div>
                  <label className="text-xs text-gray-600">Status</label>
                  <select
                    title="Status"
                    value={filters.status}
                    onChange={(e) => setFilters(p => ({ ...p, status: e.target.value, statusList: undefined }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="OPEN">Aberto</option>
                    <option value="APPROVING">Aprovando</option>
                    <option value="APPROVED">Aprovado</option>
                    <option value="OVERDUE">Vencido</option>
                    <option value="PARTIAL">Parcial</option>
                    <option value="PAID">Pago</option>
                    <option value="NEGOTIATED">Negociado</option>
                    <option value="BLOCKED">Bloqueado</option>
                    <option value="CANCELED">Cancelado</option>
                    <option value="REVERSED">Estornado</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="text-xs text-gray-600">Tipo</label>
                  <select
                    title="Tipo"
                    value={filters.type}
                    onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="SUPPLIER">Fornecedor</option>
                    <option value="SERVICE">Serviço</option>
                    <option value="UTILITIES">Utilidades</option>
                    <option value="PAYROLL">Folha</option>
                    <option value="RENT">Aluguel</option>
                    <option value="TAX">Impostos</option>
                  </select>
                </div>

                {/* Due Date Range */}
                <div>
                  <label className="text-xs text-gray-600">Vencimento De</label>
                  <input
                    type="date"
                    title="Vencimento De"
                    lang="pt-BR"
                    value={filters.dueStartDate}
                    onChange={(e) => setFilters(p => ({ ...p, dueStartDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Vencimento Até</label>
                  <input
                    type="date"
                    title="Vencimento Até"
                    lang="pt-BR"
                    value={filters.dueEndDate}
                    onChange={(e) => setFilters(p => ({ ...p, dueEndDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Emission Date Range */}
                <div>
                  <label className="text-xs text-gray-600">Emissão De</label>
                  <input
                    type="date"
                    title="Emissão De"
                    lang="pt-BR"
                    value={filters.emissionStartDate}
                    onChange={(e) => setFilters(p => ({ ...p, emissionStartDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Emissão Até</label>
                  <input
                    type="date"
                    title="Emissão Até"
                    lang="pt-BR"
                    value={filters.emissionEndDate}
                    onChange={(e) => setFilters(p => ({ ...p, emissionEndDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Supplier Filter */}
                <div>
                  <label className="text-xs text-gray-600">Fornecedor</label>
                  <input
                    type="text"
                    title="Fornecedor"
                    placeholder="Nome ou CNPJ..."
                    value={filters.supplier}
                    onChange={(e) => setFilters(p => ({ ...p, supplier: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Categoria</label>
                  <input
                    type="text"
                    title="Categoria"
                    placeholder="Categoria..."
                    value={filters.category}
                    onChange={(e) => setFilters(p => ({ ...p, category: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Subcategoria</label>
                  <input
                    type="text"
                    title="Subcategoria"
                    placeholder="Subcategoria..."
                    value={filters.subcategory}
                    onChange={(e) => setFilters(p => ({ ...p, subcategory: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Forma Pagamento</label>
                  <select
                    title="Forma Pagamento"
                    value={filters.paymentMethod}
                    onChange={(e) => setFilters(p => ({ ...p, paymentMethod: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas</option>
                    <option value="PIX">PIX</option>
                    <option value="TED">TED</option>
                    <option value="DOC">DOC</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="CREDIT_CARD">Cartão Crédito</option>
                    <option value="DEBIT_CARD">Cartão Débito</option>
                    <option value="BANK_SLIP">Boleto</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Competência De</label>
                  <input
                    type="date"
                    title="Competência De"
                    lang="pt-BR"
                    value={filters.competencyStartDate}
                    onChange={(e) => setFilters(p => ({ ...p, competencyStartDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Competência Até</label>
                  <input
                    type="date"
                    title="Competência Até"
                    lang="pt-BR"
                    value={filters.competencyEndDate}
                    onChange={(e) => setFilters(p => ({ ...p, competencyEndDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button className="bg-blue-600 text-white" onClick={() => setPage(1)} disabled={isLoading}>
                  {isLoading ? 'Filtrando...' : 'Filtrar'}
                </Button>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpar Filtros
                </Button>
                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSaveFilterDialogOpen(true)}
                    disabled={isLoading}
                    title="Salvar configuração atual como filtro"
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Filtro
                  </Button>
                )}
              </div>
            </div>
          )}

        </Card>

        {/* Payables Table */}
        <Card className="overflow-hidden">
          <CardContent className="px-0 pt-0">
            <PayablesTable
              payables={payables}
              isLoading={isLoading}
              onView={handleViewPayable}
              onEdit={handleOpenEditModal}
              onPay={handleOpenPayModal}
              onCancel={handleOpenCancelModal}
              onDelete={handleDeletePayable}
              onSelectChange={handleSelectChange}
              selectedIds={selectedPayables}
              renderColumnsControl={(columnsControl) => (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                      <label className="inline-flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={selectablePayables.length > 0 && selectedPayables.length === selectablePayables.length}
                          onChange={(event) => (event.target.checked ? selectAllVisible() : clearSelection())}
                          disabled={!selectablePayables.length || actionBusy}
                          aria-label="Marcar todas as contas a pagar visíveis"
                        />
                        Marcar todos visíveis
                      </label>
                      <span className="text-slate-500">
                        {selectedPayables.length} selecionada{selectedPayables.length === 1 ? '' : 's'}
                        {selectedPayables.length ? ` · ${selectedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                      </span>
                      {selectedPayables.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={actionBusy}>
                          Desmarcar
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {columnsControl}
                      <select
                        title="Ação em lote"
                        value={bulkAction}
                        onChange={(event) => setBulkAction(event.target.value)}
                        disabled={!selectedPayables.length || actionBusy}
                        className="h-9 min-w-[210px] rounded-md border bg-white px-3 text-sm"
                      >
                        <option value="">Ação selecionada</option>
                        <option value="pay">Registrar pagamento</option>
                        <option value="send_to_approval">Enviar para aprovação</option>
                        <option value="check">Marcar conferida</option>
                        <option value="approve">Aprovar</option>
                        <option value="release">Liberar pagamento</option>
                        <option value="block">Bloquear</option>
                        <option value="reverse">Estornar</option>
                        <option value="cancel">Cancelar</option>
                        {isAdmin && <option value="delete">Excluir</option>}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-blue-600 text-white"
                        onClick={handleApplyBulkAction}
                        disabled={!selectedPayables.length || !bulkAction || actionBusy}
                      >
                        {bulkProgress.active ? `Processando ${bulkProgress.succeeded + bulkProgress.failed} de ${bulkProgress.total}` : 'Aplicar'}
                      </Button>
                    </div>
                  </div>

                  {bulkProgress.active && (
                    <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                      <div className="flex items-start gap-3">
                        <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-blue-700" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold">{getBulkActionLabel(bulkProgress.action)}</p>
                            <Badge variant="outline" className="border-blue-200 bg-white text-blue-800">
                              {bulkProgress.succeeded + bulkProgress.failed} de {bulkProgress.total}
                            </Badge>
                          </div>
                          <Progress value={bulkProgressPercent} className="h-2 bg-blue-100" />
                          <p className="truncate">Atual: {bulkProgress.currentLabel}</p>
                          <p className="text-xs text-blue-800">
                            Concluídas: {bulkProgress.succeeded} · Falhas: {bulkProgress.failed}. Mantenha a tela aberta até finalizar.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            />
            <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Linhas por página</span>
                <select
                  title="Linhas por página"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-md border px-2 py-1 text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm text-slate-600">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                  Próxima <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MODALS */}
        <CreateEditPayableModal
          open={modals.createEdit}
          onOpenChange={(open) => {
            if (!open) handleCloseModals();
            else setModals(prev => ({ ...prev, createEdit: true }));
          }}
          payable={isEditMode ? currentPayable : undefined}
          clinicId={clinicId!}
          onSuccess={handleCloseModals}
        />

        <PayPayableModal
          open={modals.pay}
          onOpenChange={(open) => {
            if (!open) handleCloseModals();
            else setModals(prev => ({ ...prev, pay: true }));
          }}
          payable={currentPayable}
          onSuccess={handleCloseModals}
        />

        <CancelPayableModal
          open={modals.cancel}
          onOpenChange={(open) => {
            if (!open) handleCloseModals();
            else setModals(prev => ({ ...prev, cancel: true }));
          }}
          payable={currentPayable}
          onSuccess={handleCloseModals}
        />

        <ApprovalWorkflowDrawer
          open={modals.approval}
          payable={currentPayable}
          loading={isApplyingApproval}
          onOpenChange={(open) => {
            if (!open) handleCloseModals();
            else setModals(prev => ({ ...prev, approval: true }));
          }}
          onAction={handleApprovalAction}
        />
    </PageLayout>
  );
}
