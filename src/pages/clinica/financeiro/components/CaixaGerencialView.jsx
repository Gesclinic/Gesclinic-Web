import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Wallet,
  Plus,
  ArrowLeftRight,
  X,
  AlertTriangle,
  Landmark,
  CreditCard,
  Zap,
  FileText,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import cashDrawerApi from '@/lib/cashDrawerApi';
import financeAccountsApi from '@/lib/financeAccountsApi';
import cashTransfersApi from '@/lib/cashTransfersApi';
import cashConsolidationApi from '@/lib/cashConsolidationApi';
import reconciliationApi from '@/lib/reconciliationApi';
import cashDrawerAdjustmentRequestsApi from '@/lib/cashDrawerAdjustmentRequestsApi';
import { formatSupabaseUtcDateTime } from '@/lib/dateTimeUtils';
import TransferApprovalModal from './TransferApprovalModal';
import { FiltersPanel } from './FiltersPanel';

import { ImportExportPanel } from './ImportExportPanel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/exportImportUtils';

const EMPTY_MANAGER_FILTERS = {
  startDate: '',
  endDate: '',
  status: '',
  paymentMethod: '',
  search: '',
  expenseSearch: '',
};

const CaixaGerencialView = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [drawers, setDrawers] = useState([]);
  const [drawerMovements, setDrawerMovements] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [expenseMovements, setExpenseMovements] = useState([]);
  const [consolidation, setConsolidation] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [awaitingApprovals, setAwaitingApprovals] = useState([]);
  const [awaitingDrawerRequests, setAwaitingDrawerRequests] = useState([]);
  const [drawerRequestHistory, setDrawerRequestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consolidacao');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [selectedApprovalTransfer, setSelectedApprovalTransfer] = useState(null);
  const [selectedApprovalIds, setSelectedApprovalIds] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
  const [importPreview, setImportPreview] = useState({ validRows: [], validations: [], rawTotal: 0 });
  const [importExecutionSummary, setImportExecutionSummary] = useState('');
  const [importProcessing, setImportProcessing] = useState(false);
  const [ignoreInvalidRowsForPersist, setIgnoreInvalidRowsForPersist] = useState(false);
  const [filters, setFilters] = useState(EMPTY_MANAGER_FILTERS);
  const [savedFilters, setSavedFilters] = useState([]);
  const [transferData, setTransferData] = useState({
    transferType: 'drawer_to_destination',
    fromDrawerId: '',
    fromAccountId: '',
    toAccountId: '',
    paymentMethod: 'DINHEIRO',
    amount: '',
    notes: '',
  });
  const [transferMethodSummary, setTransferMethodSummary] = useState([]);

  const loadData = async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    try {
      const [drawersRes, accountsRes, transfersRes, consolidationRes, reportRes, discrepanciesRes, approvalsRes, drawerRequestsRes, drawerHistoryRes] = await Promise.all([
        cashDrawerApi.listDrawers(clinicId),
        financeAccountsApi.listAccounts(clinicId, false),
        cashTransfersApi.listTransfers(clinicId),
        cashConsolidationApi.getCashConsolidation(clinicId, {
          startDate: parseFilterDateIso(filters.startDate),
          endDate: parseFilterDateIso(filters.endDate),
          paymentMethod: filters.paymentMethod,
        }),
        cashConsolidationApi.getDailyCashReport(clinicId, {
          startDate: parseFilterDateIso(filters.startDate),
          endDate: parseFilterDateIso(filters.endDate),
        }),
        cashConsolidationApi.getCashDiscrepancies(clinicId),
        reconciliationApi.getTransfersAwaitingApproval(clinicId),
        cashDrawerAdjustmentRequestsApi.listPending(clinicId),
        cashDrawerAdjustmentRequestsApi.listHistory(clinicId),
      ]);
      const loadedDrawers = drawersRes || [];
      let movementsQuery = supabase
        .from('drawer_movements')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      const startDate = parseFilterDateIso(filters.startDate);
      const endDate = parseFilterDateIso(filters.endDate);
      if (filters.paymentMethod) {
        movementsQuery = movementsQuery.eq('payment_method', filters.paymentMethod);
      }

      const { data: movementRows, error: movementError } = await movementsQuery;
      if (movementError) {
        console.error('Erro ao carregar movimentos do caixa:', movementError);
      }

      const drawersById = new Map(loadedDrawers.map((drawer) => [drawer.id, drawer]));
      const enrichedMovements = (movementRows || []).map((movement) => ({
        ...movement,
        drawer: drawersById.get(movement.drawer_id) || null,
      }));

      setDrawers(loadedDrawers);
      setDrawerMovements(enrichedMovements);
      setAccounts(accountsRes || []);
      setTransfers(transfersRes || []);
      setExpenseMovements(enrichedMovements.filter((movement) => movement.payment_type === 'saida'));
      setConsolidation(consolidationRes);
      setDailyReport(reportRes);
      setDiscrepancies(discrepanciesRes || []);
      setAwaitingApprovals(approvalsRes || []);
      setSelectedApprovalIds((prev) => prev.filter((id) => (approvalsRes || []).some((transfer) => transfer.id === id)));
      setAwaitingDrawerRequests(drawerRequestsRes || []);
      setDrawerRequestHistory(drawerHistoryRes || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setDrawers([]);
      setDrawerMovements([]);
      setAccounts([]);
      setTransfers([]);
      setExpenseMovements([]);
      setDailyReport(null);
      setAwaitingApprovals([]);
      setAwaitingDrawerRequests([]);
      setDrawerRequestHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId, filters.startDate, filters.endDate, filters.paymentMethod]);

  useEffect(() => {
    const saved = localStorage.getItem(`caixa-gerencial-filters-${clinicId}`);
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, [clinicId]);

  useEffect(() => {
    let active = true;

    const loadPaymentSummary = async () => {
      if (transferData.transferType !== 'drawer_to_destination' || !transferData.fromDrawerId) {
        setTransferMethodSummary([]);
        return;
      }

      const summary = await cashConsolidationApi.getPaymentMethodSummary(transferData.fromDrawerId);
      if (active) {
        setTransferMethodSummary(summary || []);
      }
    };

    loadPaymentSummary();

    return () => {
      active = false;
    };
  }, [transferData.transferType, transferData.fromDrawerId]);

  const handleCreateTransfer = () => {
    const hasDrawerBalance = drawers.some((drawer) => Number(drawer.expected_balance ?? drawer.closing_balance ?? drawer.opening_balance ?? 0) > 0);
    const hasGeneralCashBalance = Number(consolidation?.summary?.generalCash || 0) > 0;
    const hasBankTransferAccounts = accounts.filter((account) => getAccountDestinationBucket(account) === 'bank').length >= 2;
    if (!hasDrawerBalance && !hasGeneralCashBalance && !hasBankTransferAccounts) {
      setActiveTab('drawers');
      alert('Não há saldo disponível em caixa individual, Caixa Geral ou contas bancárias suficientes para transferir.');
      return;
    }
    setEditingTransfer(null);
    setTransferData((prev) => ({
      ...prev,
      transferType: prev.transferType || 'drawer_to_destination',
      fromAccountId: '',
      paymentMethod: prev.paymentMethod || 'DINHEIRO',
      toAccountId: '',
    }));
    setShowTransferForm(true);
  };

  const handleEditTransfer = (transfer) => {
    setEditingTransfer(transfer);
    setTransferData({
      transferType: transfer.from_account_id ? 'general_cash_to_bank' : 'drawer_to_destination',
      fromDrawerId: transfer.from_drawer_id || '',
      fromAccountId: transfer.from_account_id || '',
      toAccountId: transfer.to_account_id || '',
      paymentMethod: transfer.payment_method || 'DINHEIRO',
      amount: String(Number(transfer.amount || 0)),
      notes: transfer.notes || '',
    });
    setShowTransferForm(true);
  };

  const handleCancelTransfer = async (transfer) => {
    const reason = window.prompt('Informe o motivo do cancelamento da transferência:');
    if (reason === null) {
      return;
    }
    if (!reason.trim()) {
      alert('Informe o motivo do cancelamento.');
      return;
    }

    try {
      await cashTransfersApi.cancelTransfer(transfer.id, `Cancelada pelo Caixa Gerencial. Motivo: ${reason.trim()}`);
      alert('Transferência cancelada.');
      await loadData();
    } catch (error) {
      console.error('Erro ao cancelar transferência:', error);
      alert(`Erro ao cancelar transferência: ${error.message || 'tente novamente.'}`);
    }
  };

  const handleToggleApprovalSelection = (transferId) => {
    setSelectedApprovalIds((prev) => (
      prev.includes(transferId)
        ? prev.filter((id) => id !== transferId)
        : [...prev, transferId]
    ));
  };

  const handleToggleAllApprovalSelection = () => {
    setSelectedApprovalIds((prev) => (
      prev.length === awaitingApprovals.length
        ? []
        : awaitingApprovals.map((transfer) => transfer.id)
    ));
  };

  const handleApproveSelectedTransfers = async () => {
    const selectedTransfers = awaitingApprovals.filter((transfer) => selectedApprovalIds.includes(transfer.id));
    if (selectedTransfers.length === 0) {
      alert('Selecione pelo menos uma transferência para aprovar.');
      return;
    }

    const confirmed = window.confirm(`Aprovar ${selectedTransfers.length} transferência(s) selecionada(s)?`);
    if (!confirmed) {
      return;
    }

    setApprovalLoading(true);
    try {
      await Promise.all(selectedTransfers.map((transfer) => reconciliationApi.approveTransfer(transfer.id, {
        approvedBy: user.id,
        signature: null,
        notes: 'Aprovada em lote pelo Caixa Gerencial.',
      })));
      alert('Transferências aprovadas com sucesso.');
      setSelectedApprovalIds([]);
      await loadData();
    } catch (error) {
      console.error('Erro ao aprovar transferências em lote:', error);
      alert(`Erro ao aprovar transferências: ${error.message || 'tente novamente.'}`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleCancelSelectedTransfers = async () => {
    const selectedTransfers = awaitingApprovals.filter((transfer) => selectedApprovalIds.includes(transfer.id));
    if (selectedTransfers.length === 0) {
      alert('Selecione pelo menos uma transferência para cancelar.');
      return;
    }

    const reason = window.prompt(`Informe o motivo do cancelamento de ${selectedTransfers.length} transferência(s):`);
    if (reason === null) {
      return;
    }
    if (!reason.trim()) {
      alert('Informe o motivo do cancelamento.');
      return;
    }

    setApprovalLoading(true);
    try {
      await Promise.all(selectedTransfers.map((transfer) => cashTransfersApi.cancelTransfer(
        transfer.id,
        `Cancelada em lote pelo Caixa Gerencial. Motivo: ${reason.trim()}`,
      )));
      alert('Transferências canceladas com sucesso.');
      setSelectedApprovalIds([]);
      await loadData();
    } catch (error) {
      console.error('Erro ao cancelar transferências em lote:', error);
      alert(`Erro ao cancelar transferências: ${error.message || 'tente novamente.'}`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!clinicId) {
      return;
    }

    const amount = Number(transferData.amount || 0);
    if (amount <= 0 || amount > selectedTransferAvailable) {
      alert('Informe um valor válido dentro do saldo disponível.');
      return;
    }

    let toAccountId = transferData.toAccountId;
    let fromAccountId = null;
    let fromDrawerId = transferData.fromDrawerId;

    if (transferData.transferType === 'bank_to_bank') {
      if (!transferData.fromAccountId || !toAccountId) {
        alert('Selecione a conta bancária de origem e a conta bancária de destino.');
        return;
      }
      if (transferData.fromAccountId === toAccountId) {
        alert('A conta de origem e destino precisam ser diferentes.');
        return;
      }

      const selectedOriginAccount = bankAccountsForTransfer.find((account) => account.id === transferData.fromAccountId);
      const selectedDestinationAccount = bankAccountsForTransfer.find((account) => account.id === toAccountId);
      const originTransferAccount = await financeAccountsApi.ensureTransferAccount(clinicId, selectedOriginAccount);
      const destinationTransferAccount = await financeAccountsApi.ensureTransferAccount(clinicId, selectedDestinationAccount);
      fromAccountId = originTransferAccount?.id || transferData.fromAccountId;
      fromDrawerId = null;
      toAccountId = destinationTransferAccount?.id || toAccountId;
    } else if (transferData.transferType === 'general_cash_to_bank') {
      if (!toAccountId) {
        alert('Selecione a conta corrente que recebeu o depósito.');
        return;
      }
      const generalCashAccount = await financeAccountsApi.ensureGeneralCashAccount(clinicId);
      const selectedDestinationAccount = destinationAccounts.find((account) => account.id === toAccountId);
      const transferAccount = await financeAccountsApi.ensureTransferAccount(clinicId, selectedDestinationAccount);
      fromAccountId = generalCashAccount.id;
      fromDrawerId = null;
      toAccountId = transferAccount?.id || toAccountId;
    } else if (transferData.paymentMethod === 'DINHEIRO') {
      const generalCashAccount = await financeAccountsApi.ensureGeneralCashAccount(clinicId);
      toAccountId = generalCashAccount.id;
    } else if (!toAccountId) {
      alert('Selecione uma conta destino para esta forma de transferência.');
      return;
    } else {
      const selectedDestinationAccount = destinationAccounts.find((account) => account.id === toAccountId);
      const transferAccount = await financeAccountsApi.ensureTransferAccount(clinicId, selectedDestinationAccount);
      toAccountId = transferAccount?.id || toAccountId;
    }

    try {
      const payload = {
        clinic_id: clinicId,
        from_drawer_id: fromDrawerId,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        payment_method: transferData.paymentMethod,
        amount,
        transfer_date: toLocalIsoDate(),
        status: 'pending_approval',
        notes: transferData.notes,
        created_by: user.id,
      };

      if (editingTransfer?.id) {
        await cashTransfersApi.updatePendingTransfer(editingTransfer.id, payload);
      } else {
        await cashTransfersApi.create(payload);
      }
      setShowTransferForm(false);
      setEditingTransfer(null);
      setTransferData({ transferType: 'drawer_to_destination', fromDrawerId: '', fromAccountId: '', toAccountId: '', paymentMethod: 'DINHEIRO', amount: '', notes: '' });
      setActiveTab('approvals');
      await loadData();
    } catch (error) {
      console.error('Erro ao transferir:', error);
      alert(`Erro ao lançar transferência: ${error.message || 'tente novamente.'}`);
    }
  };

  const handleApproveDrawerRequest = async (request) => {
    const notes = 'Liberado para reabertura/reajuste pelo Caixa Gerencial';
    try {
      await cashDrawerAdjustmentRequestsApi.approveRequest(request.id, {
        reviewedBy: user.id,
        reviewNotes: notes,
      });
      alert('✓ Solicitação aprovada. O caixa foi reaberto para ajuste.');
      await loadData();
    } catch (error) {
      console.error('Erro ao aprovar solicitação de caixa:', error);
      alert(`Erro ao aprovar solicitação: ${error.message || 'tente novamente.'}`);
    }
  };

  const handleRejectDrawerRequest = async (request) => {
    const confirmed = window.confirm('Rejeitar esta solicitação de reabertura/reajuste?');
    if (!confirmed) {
      return;
    }

    const notes = 'Solicitação rejeitada pelo Caixa Gerencial.';

    try {
      await cashDrawerAdjustmentRequestsApi.rejectRequest(request.id, {
        reviewedBy: user.id,
        reviewNotes: notes,
      });
      alert('Solicitação rejeitada.');
      await loadData();
    } catch (error) {
      console.error('Erro ao rejeitar solicitação de caixa:', error);
      alert(`Erro ao rejeitar solicitação: ${error.message || 'tente novamente.'}`);
    }
  };

  const exportToExcelConsolidation = () => {
    if (!consolidation) {
      return;
    }

    const data = [
      ['RELATORIO CAIXA GERAL - CONSOLIDACAO'],
      ['Data Geracao', new Date().toLocaleDateString('pt-BR')],
      [],
      ['RESUMO'],
      ['Dinheiro em Caixas', formatCurrency(consolidation?.summary?.cashInDrawers)],
      ['Caixa Geral', formatCurrency(consolidation?.summary?.generalCash)],
      ['Saldos Bancarios', formatCurrency(consolidation?.summary?.bank)],
      ['Cartoes', formatCurrency(consolidation?.summary?.card)],
      ['PIX/TED', formatCurrency(consolidation?.summary?.pix)],
      ['Cheques/Boletos', formatCurrency(consolidation?.summary?.check)],
      ['Total Consolidado', formatCurrency(consolidation?.summary?.total)],
      [],
      ['CAIXAS INDIVIDUAIS'],
      ['Data', 'Operador', 'Status', 'Saldo Abertura', 'Saldo Esperado', 'Saldo Real'],
      ...filteredDrawers.map((d) => [
        new Date(d.date_opened).toLocaleDateString('pt-BR'),
        d.operator?.name || 'N/A',
        d.status,
        Number(d.opening_balance || 0),
        Number(d.expected_balance || 0),
        Number(d.closing_balance || 0),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Caixa Geral');
    XLSX.writeFile(wb, `Caixa_Geral_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSVConsolidation = () => {
    if (!consolidation) {
      return;
    }

    const lines = [
      'Data;Operador;Status;Saldo_Abertura;Saldo_Esperado;Saldo_Real',
      ...filteredDrawers.map((d) => [
        new Date(d.date_opened).toLocaleDateString('pt-BR'),
        d.operator?.name || 'N/A',
        d.status,
        Number(d.opening_balance || 0).toFixed(2),
        Number(d.expected_balance || 0).toFixed(2),
        Number(d.closing_balance || 0).toFixed(2),
      ].join(';')),
    ];

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Caixa_Geral_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDFConsolidation = () => {
    if (!consolidation) {
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('RELATORIO CAIXA GERAL - CONSOLIDACAO', 14, 16);
      doc.setFontSize(10);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 24);

      autoTable(doc, {
        startY: 30,
        head: [['Indicador', 'Valor']],
        body: [
          ['Dinheiro em Caixas', formatCurrency(consolidation?.summary?.cashInDrawers)],
          ['Caixa Geral', formatCurrency(consolidation?.summary?.generalCash)],
          ['Saldos Bancarios', formatCurrency(consolidation?.summary?.bank)],
          ['Cartoes', formatCurrency(consolidation?.summary?.card)],
          ['PIX/TED', formatCurrency(consolidation?.summary?.pix)],
          ['Cheques/Boletos', formatCurrency(consolidation?.summary?.check)],
          ['Total Consolidado', formatCurrency(consolidation?.summary?.total)],
        ],
        styles: { fontSize: 9 },
      });

      const firstTableEndY = doc.lastAutoTable?.finalY || 90;
      autoTable(doc, {
        startY: firstTableEndY + 8,
        head: [['Data', 'Operador', 'Status', 'Saldo Esperado', 'Saldo Real']],
        body: filteredDrawers.map((d) => [
          new Date(d.date_opened).toLocaleDateString('pt-BR'),
          d.operator?.name || 'N/A',
          d.status,
          formatCurrency(d.expected_balance || 0),
          formatCurrency(d.closing_balance || 0),
        ]),
        styles: { fontSize: 8 },
      });

      doc.save(`Caixa_Geral_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF do caixa geral:', error);
      alert('Nao foi possivel gerar o PDF. Tente novamente.');
    }
  };

  const parseImportedDate = (value) => {
    if (!value) {
      return null;
    }

    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
      const [dd, mm, yyyy] = text.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  };

  const normalizeImportedStatus = (value) => {
    const status = String(value || 'open').trim().toLowerCase();
    if (['open', 'aberto'].includes(status)) {
      return 'open';
    }
    if (['closed_full', 'fechado_ok', 'fechado ok', 'fechado'].includes(status)) {
      return 'closed_full';
    }
    if (['closed_partial', 'divergencia', 'fechado_divergencia', 'fechado divergencia'].includes(status)) {
      return 'closed_partial';
    }
    return null;
  };

  const buildImportPreview = (rows) => {
    const validations = [];
    const validRows = [];

    rows.forEach((row, index) => {
      const line = index + 2;
      const operatorId = String(row['Operador ID'] || '').trim();
      const dateIso = parseImportedDate(row['Data']);
      const status = normalizeImportedStatus(row['Status']);
      const opening = row['Saldo Abertura'] === undefined || row['Saldo Abertura'] === ''
        ? 0
        : Number(row['Saldo Abertura']);
      const closing = row['Saldo Fechamento'] === undefined || row['Saldo Fechamento'] === ''
        ? null
        : Number(row['Saldo Fechamento']);

      const errors = [];
      if (!operatorId) {
        errors.push('Operador ID obrigatório');
      }
      if (!dateIso) {
        errors.push('Data inválida (use dd/mm/aaaa ou yyyy-mm-dd)');
      }
      if (Number.isNaN(opening) || opening < 0) {
        errors.push('Saldo Abertura inválido');
      }
      if (closing !== null && (Number.isNaN(closing) || closing < 0)) {
        errors.push('Saldo Fechamento inválido');
      }
      if (!status) {
        errors.push('Status inválido (open/closed_full/closed_partial)');
      }
      if (status && status !== 'open' && closing === null) {
        errors.push('Saldo Fechamento obrigatório para caixas fechados');
      }

      if (errors.length > 0) {
        validations.push(`Linha ${line}: ${errors.join(' | ')}`);
      } else {
        validRows.push({
          operatorId,
          dateIso,
          opening,
          closing,
          status,
          notes: String(row['Notas'] || ''),
        });
      }
    });

    return { validRows, validations, rawTotal: rows.length };
  };

  const executeDrawerImport = async (simulationMode) => {
    if (!clinicId || !user?.id) {
      alert('Clínica/usuário não identificados para importação.');
      return;
    }

    if (!importPreview.validRows || importPreview.validRows.length === 0) {
      alert('Nenhuma linha válida para processar.');
      return;
    }

    if (!simulationMode && importPreview.validations.length > 0 && !ignoreInvalidRowsForPersist) {
      setImportExecutionSummary(
        'Existem linhas inválidas. Marque a opção "Ignorar inválidas e persistir apenas válidas" para continuar.',
      );
      return;
    }

    setImportProcessing(true);
    try {
      const counters = {
        created: 0,
        closed: 0,
        unchanged: 0,
        failed: 0,
      };
      const actionLog = [];

      for (const row of importPreview.validRows) {
        try {
          const existing = await cashDrawerApi.getDrawerForDate(clinicId, row.operatorId, row.dateIso);

          if (!existing) {
            if (simulationMode) {
              counters.created++;
              actionLog.push(`Criaria caixa ${row.dateIso} operador ${row.operatorId}`);
            } else {
              const created = await cashDrawerApi.openDrawer(clinicId, row.operatorId, row.dateIso, row.opening);
              counters.created++;

              if (row.status !== 'open') {
                await cashDrawerApi.closeDrawer(
                  created.id,
                  row.closing,
                  row.status === 'closed_full' ? row.closing : row.opening,
                  row.notes,
                );
                counters.closed++;
              }
            }
            continue;
          }

          if (row.status !== 'open') {
            if (simulationMode) {
              counters.closed++;
              actionLog.push(`Fecharia caixa existente ${row.dateIso} operador ${row.operatorId}`);
            } else {
              await cashDrawerApi.closeDrawer(
                existing.id,
                row.closing,
                row.status === 'closed_full' ? row.closing : row.opening,
                row.notes,
              );
              counters.closed++;
            }
          } else {
            counters.unchanged++;
          }
        } catch (error) {
          counters.failed++;
          actionLog.push(`Falha ${row.dateIso}/${row.operatorId}: ${error.message}`);
        }
      }

      const summary = [
        simulationMode ? 'SIMULAÇÃO concluída:' : 'IMPORTAÇÃO concluída:',
        `Criados: ${counters.created}`,
        `Fechados/atualizados: ${counters.closed}`,
        `Sem alteração: ${counters.unchanged}`,
        `Falhas: ${counters.failed}`,
        importPreview.validations.length > 0 ? `Linhas inválidas: ${importPreview.validations.length}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      setImportExecutionSummary(
        simulationMode && actionLog.length > 0
          ? `${summary}\n\nAmostra:\n${actionLog.slice(0, 10).join('\n')}`
          : summary,
      );

      if (!simulationMode) {
        await loadData();
      }
    } finally {
      setImportProcessing(false);
    }
  };

  const handleImportDrawerData = async (rows) => {
    if (!clinicId || !user?.id) {
      alert('Clínica/usuário não identificados para importação.');
      return;
    }

    if (!rows || rows.length === 0) {
      alert('Arquivo sem linhas para importar.');
      return;
    }

    const preview = buildImportPreview(rows);
    setImportPreview(preview);
    setImportExecutionSummary('');
    setIgnoreInvalidRowsForPersist(false);
    setShowImportPreviewModal(true);

    if (preview.validRows.length === 0) {
      setImportExecutionSummary(`Importação bloqueada.\n${preview.validations.slice(0, 10).join('\n')}`);
      return;
    }
  };

  const handlePrintConsolidation = () => {
    window.print();
  };

  const parseFilterDate = (value, endOfDay = false) => {
    if (!value) {
      return null;
    }

    let day;
    let month;
    let year;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      [day, month, year] = value.split('/').map(Number);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      [year, month, day] = value.split('-').map(Number);
    } else {
      return null;
    }

    const date = endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const parseFilterDateIso = (value) => {
    const date = parseFilterDate(value);
    if (!date) {
      return null;
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const toLocalIsoDate = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatLocalDate = (value) => {
    if (!value) {
      return 'N/A';
    }

    const raw = String(value);
    const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const [year, month, day] = dateOnly.split('-');
      return `${day}/${month}/${year}`;
    }

    return new Date(value).toLocaleDateString('pt-BR');
  };

  const parseRecordDate = (value) => {
    if (!value) {
      return null;
    }

    const raw = String(value);
    const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return parseFilterDate(dateOnly);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const clearFilters = () => {
    setFilters({ ...EMPTY_MANAGER_FILTERS });
  };

  const saveFilterWithName = (nameArg, filtersArg = filters) => {
    const effectiveName = (nameArg || '').trim();
    if (!effectiveName) {
      return;
    }

    const newFilter = {
      id: Date.now(),
      name: effectiveName,
      filters: { ...filtersArg },
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(`caixa-gerencial-filters-${clinicId}`, JSON.stringify(updated));
  };

  const loadSavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
  };

  const deleteSavedFilter = (id) => {
    const updated = savedFilters.filter((filter) => filter.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(`caixa-gerencial-filters-${clinicId}`, JSON.stringify(updated));
  };

  const drawersForOperatorOptions = drawers.filter((drawer) => {
    const opened = parseRecordDate(drawer.date_opened || drawer.opened_at || drawer.created_at);
    const start = parseFilterDate(filters.startDate);
    const end = parseFilterDate(filters.endDate, true);

    if (start && (!opened || opened < start)) {
      return false;
    }
    if (end && (!opened || opened > end)) {
      return false;
    }
    if (filters.status && drawer.status !== filters.status) {
      return false;
    }
    return true;
  });

  const operatorOptions = Array.from(
    new Map(
      drawersForOperatorOptions
        .map((drawer) => ({
          id: drawer.operator?.id || drawer.operator_id || drawer.operator?.name,
          name: drawer.operator?.name || 'Operador não informado',
        }))
        .filter((operator) => operator.name)
        .map((operator) => [operator.id || operator.name, operator]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const filteredDrawers = drawers.filter((d) => {
    const opened = parseRecordDate(d.date_opened || d.opened_at || d.created_at);
    const start = parseFilterDate(filters.startDate);
    const end = parseFilterDate(filters.endDate, true);

    if (start && (!opened || opened < start)) {
      return false;
    }
    if (end && (!opened || opened > end)) {
      return false;
    }
    if (filters.status && d.status !== filters.status) {
      return false;
    }
    if (filters.search && !(d.operator?.name || '').toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredTransfers = transfers.filter((t) => {
    const transferDate = parseRecordDate(t.transfer_date || t.created_at);
    const start = parseFilterDate(filters.startDate);
    const end = parseFilterDate(filters.endDate, true);

    if (start && (!transferDate || transferDate < start)) {
      return false;
    }
    if (end && (!transferDate || transferDate > end)) {
      return false;
    }
    if (filters.status && t.status !== filters.status) {
      return false;
    }
    if (filters.paymentMethod && t.payment_method !== filters.paymentMethod) {
      return false;
    }
    if (filters.search) {
      const search = filters.search.toLowerCase().trim();
      const searchableText = [
        t.from_drawer?.operator?.name,
        t.from_account?.account_name,
        t.to_account?.account_name,
        t.payment_method,
        t.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(search)) {
        return false;
      }
    }
    return true;
  });

  const filteredDrawerIds = new Set(filteredDrawers.map((drawer) => drawer.id));
  const filteredExpenseMovements = expenseMovements.filter((movement) => {
    if (!filteredDrawerIds.has(movement.drawer_id)) {
      return false;
    }

    if (filters.expenseSearch) {
      const search = filters.expenseSearch.toLowerCase().trim();
      const searchableText = [
        movement.description,
        movement.reference_document,
        movement.counterparty_name,
        movement.expense_supplier_name,
        movement.expense_provider_name,
        movement.expense_service_description,
        movement.financial_category,
        movement.drawer?.operator?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(search)) {
        return false;
      }
    }

    return true;
  });
  const filteredExpenseTotal = filteredExpenseMovements.reduce(
    (sum, movement) => sum + Number(movement.amount || 0),
    0,
  );

  const normalizeTransferMethod = (method) => {
    const normalized = String(method || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9_ ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized.includes('DINHEIRO') || normalized === 'CASH') {
      return 'DINHEIRO';
    }
    if (normalized.includes('PIX')) {
      return 'PIX';
    }
    if (normalized.includes('DEBITO')) {
      return 'CARTAO_DEBITO';
    }
    if (normalized.includes('CREDITO') || normalized.includes('CARTAO')) {
      return 'CARTAO_CREDITO';
    }
    if (normalized.includes('TRANSFERENCIA') || normalized.includes('BANCO') || normalized.includes('TED')) {
      return 'TED';
    }
    if (normalized.includes('DOC')) {
      return 'DOC';
    }
    if (normalized.includes('BOLETO')) {
      return 'BOLETO';
    }
    if (normalized.includes('CHEQUE')) {
      return 'CHEQUE';
    }
    return normalized || 'OUTROS';
  };

  const movementMatchesExpenseSearch = (movement) => {
    if (!filters.expenseSearch) {
      return true;
    }

    const search = filters.expenseSearch.toLowerCase().trim();
    const searchableText = [
      movement.description,
      movement.reference_document,
      movement.counterparty_name,
      movement.expense_supplier_name,
      movement.expense_provider_name,
      movement.expense_service_description,
      movement.financial_category,
      movement.drawer?.operator?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(search);
  };

  const filteredMovementsForTotals = drawerMovements
    .filter((movement) => filteredDrawerIds.has(movement.drawer_id))
    .filter(movementMatchesExpenseSearch);

  const drawerMovementSummary = filteredMovementsForTotals.reduce((acc, movement) => {
    const drawerId = movement.drawer_id;
    if (!drawerId) {
      return acc;
    }
    if (!acc[drawerId]) {
      acc[drawerId] = {
        totalIn: 0,
        totalOut: 0,
        inCount: 0,
        outCount: 0,
      };
    }
    const amount = Number(movement.amount || 0);
    if (movement.payment_type === 'saida') {
      acc[drawerId].totalOut += amount;
      acc[drawerId].outCount += 1;
      if (normalizeTransferMethod(movement.payment_method) === 'DINHEIRO') {
        acc[drawerId].cashOut = (acc[drawerId].cashOut || 0) + amount;
      }
    } else {
      acc[drawerId].totalIn += amount;
      acc[drawerId].inCount += 1;
      if (normalizeTransferMethod(movement.payment_method) === 'DINHEIRO') {
        acc[drawerId].cashIn = (acc[drawerId].cashIn || 0) + amount;
      }
    }
    return acc;
  }, {});

  const selectedDrawer = drawers.find((drawer) => drawer.id === transferData.fromDrawerId);
  const selectedDrawerAvailable = Number(
    selectedDrawer?.expected_balance ?? selectedDrawer?.closing_balance ?? selectedDrawer?.opening_balance ?? 0,
  );
  const selectedMethodSummary = transferMethodSummary.find(
    (item) => normalizeTransferMethod(item.method) === normalizeTransferMethod(transferData.paymentMethod),
  );
  const selectedDrawerMovementMethodSaldo = drawerMovements
    .filter((movement) => movement.drawer_id === transferData.fromDrawerId)
    .filter((movement) => normalizeTransferMethod(movement.payment_method) === normalizeTransferMethod(transferData.paymentMethod))
    .reduce((sum, movement) => {
      const amount = Number(movement.amount || 0);
      return movement.payment_type === 'saida' ? sum - amount : sum + amount;
    }, 0);
  const isGeneralCashDeposit = transferData.transferType === 'general_cash_to_bank';
  const isBankToBankTransfer = transferData.transferType === 'bank_to_bank';
  const generalCashAvailable = Number(consolidation?.summary?.generalCash || 0);
  const alreadyTransferredByMethod = transfers
    .filter((transfer) => transfer.from_drawer_id === transferData.fromDrawerId)
    .filter((transfer) => transfer.id !== editingTransfer?.id)
    .filter((transfer) => normalizeTransferMethod(transfer.payment_method) === normalizeTransferMethod(transferData.paymentMethod))
    .filter((transfer) => ['pending', 'pending_approval', 'confirmed'].includes(transfer.status))
    .reduce((sum, transfer) => sum + Number(transfer.amount || 0), 0);
  const selectedMethodBalance = Number(selectedMethodSummary?.saldo || 0);
  const selectedMovementMethodBalance = Number(selectedDrawerMovementMethodSaldo || 0);
  const selectedCashSourceBalance = Math.max(
    selectedMethodBalance,
    selectedMovementMethodBalance,
    transferData.paymentMethod === 'DINHEIRO' ? selectedDrawerAvailable : 0,
  );
  const getAccountDestinationBucket = (account = {}) => {
    const type = String(account.account_type || account.type || '').toUpperCase();
    const name = String(account.account_name || account.name || '').toLowerCase();
    const sourceTable = String(account.source_table || '').toLowerCase();
    const hasBankData = Boolean(account.bank_name || account.bank_code || account.agency_code || account.account_number);

    if (['DINHEIRO', 'CASH', 'CAIXA'].includes(type) || name.includes('caixa geral')) {
      return 'generalCash';
    }
    if (['CARTAO', 'CARD', 'CREDIT_CARD', 'CARTAO_CREDITO'].includes(type)) {
      return 'card';
    }
    if (['PIX', 'DIGITAL_WALLET'].includes(type)) {
      return 'pix';
    }
    if (type === 'CHEQUE') {
      return 'check';
    }
    if (
      ['BANCO', 'BANK', 'CHECKING', 'SAVINGS', 'CONTA_CORRENTE', 'CORRENTE', 'CONTA_BANCARIA', 'BANK_ACCOUNT'].includes(type)
      || ['bank_accounts', 'clinic_bank_accounts'].includes(sourceTable)
      || name.includes('banco')
      || name.includes('conta corrente')
      || hasBankData
    ) {
      return 'bank';
    }

    return 'bank';
  };
  const bankAccountsForTransfer = accounts.filter((account) => getAccountDestinationBucket(account) === 'bank');
  const selectedBankOriginAccount = bankAccountsForTransfer.find((account) => account.id === transferData.fromAccountId);
  const selectedBankAvailable = Number(
    selectedBankOriginAccount?.external_balance
      ?? selectedBankOriginAccount?.current_balance
      ?? selectedBankOriginAccount?.balance
      ?? selectedBankOriginAccount?.initial_balance
      ?? 0,
  );
  const selectedTransferAvailable = Math.max(
    0,
    isBankToBankTransfer
      ? selectedBankAvailable
      : isGeneralCashDeposit
        ? generalCashAvailable
        : selectedCashSourceBalance - alreadyTransferredByMethod,
  );
  const accountMatchesTransferMethod = (account) => {
    const bucket = getAccountDestinationBucket(account);

    if (isBankToBankTransfer) {
      return bucket === 'bank' && account.id !== transferData.fromAccountId;
    }
    if (isGeneralCashDeposit) {
      return bucket === 'bank';
    }
    if (transferData.paymentMethod === 'DINHEIRO') {
      return bucket === 'generalCash';
    }
    if (['PIX', 'TED', 'DOC', 'CHEQUE'].includes(transferData.paymentMethod)) {
      return ['bank', 'pix', 'check'].includes(bucket);
    }
    if (['CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(transferData.paymentMethod)) {
      return ['bank', 'card'].includes(bucket);
    }

    return true;
  };
  const requiresDestinationAccount = isGeneralCashDeposit || isBankToBankTransfer || transferData.paymentMethod !== 'DINHEIRO';
  const transferSubmitDisabled = (
    (!isGeneralCashDeposit && !isBankToBankTransfer && !transferData.fromDrawerId)
    || (isBankToBankTransfer && !transferData.fromAccountId)
    || (requiresDestinationAccount && !transferData.toAccountId)
    || (isBankToBankTransfer && transferData.fromAccountId === transferData.toAccountId)
    || !transferData.amount
    || Number(transferData.amount) <= 0
    || Number(transferData.amount) > selectedTransferAvailable
  );
  const matchingDestinationAccounts = accounts.filter(accountMatchesTransferMethod);
  const destinationAccounts = requiresDestinationAccount && matchingDestinationAccounts.length === 0 && !isGeneralCashDeposit
    ? accounts
    : matchingDestinationAccounts;
  const groupedDestinationAccounts = destinationAccounts.reduce((groups, account) => {
    const bucket = getAccountDestinationBucket(account);
    const label = {
      generalCash: 'Caixa Geral',
      bank: 'Bancos cadastrados',
      card: 'Processadoras de cartão',
      pix: 'Carteiras PIX',
      check: 'Contas para cheque',
    }[bucket] || 'Outras contas';

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(account);
    return groups;
  }, {});
  const transferOriginOptions = [
    {
      value: 'DINHEIRO',
      label: 'Dinheiro recebido',
      description: 'Destino padrão: Caixa Geral',
    },
    {
      value: 'PIX',
      label: 'PIX recebido',
      description: 'Selecione o banco ou carteira digital de destino',
    },
    {
      value: 'CARTAO_DEBITO',
      label: 'Cartão de débito recebido',
      description: 'Selecione o banco ou processadora de débito',
    },
    {
      value: 'CARTAO_CREDITO',
      label: 'Cartão de crédito recebido',
      description: 'Selecione o banco ou processadora de crédito',
    },
    {
      value: 'TED',
      label: 'TED recebida',
      description: 'Selecione o banco cadastrado de destino',
    },
    {
      value: 'DOC',
      label: 'DOC recebido',
      description: 'Selecione o banco cadastrado de destino',
    },
    {
      value: 'CHEQUE',
      label: 'Cheque recebido',
      description: 'Selecione a conta onde será compensado',
    },
  ];
  const selectedOriginOption = transferOriginOptions.find((option) => option.value === transferData.paymentMethod);
  const filteredReceivedByMethod = filteredMovementsForTotals
    .filter((movement) => movement.payment_type !== 'saida')
    .reduce((acc, movement) => {
      const method = normalizeTransferMethod(movement.payment_method);
      acc[method] = (acc[method] || 0) + Number(movement.amount || 0);
      return acc;
    }, {});
  const receivedByMethod = filteredReceivedByMethod;
  const statusLabels = {
    open: 'Aberto',
    closed_full: 'Fechado OK',
    closed_partial: 'Fechado com divergência',
    pending: 'Pendente',
    pending_approval: 'Aguardando aprovação',
    confirmed: 'Confirmado',
    rejected: 'Rejeitado',
    canceled: 'Cancelado',
    reversed: 'Estornado',
  };
  const drawerRequestStatusLabels = {
    approved: 'Aprovada',
    rejected: 'Rejeitada',
  };
  const reportMethods = dailyReport?.methods || [
    { key: 'DINHEIRO', label: 'Dinheiro' },
    { key: 'PIX', label: 'PIX' },
    { key: 'CARTAO_DEBITO', label: 'Débito' },
    { key: 'CARTAO_CREDITO', label: 'Crédito' },
    { key: 'TED', label: 'TED' },
    { key: 'DOC', label: 'DOC' },
    { key: 'CHEQUE', label: 'Cheque' },
  ];
  const formatMoney = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const reportMethodCells = (bucket, className = '') => reportMethods.map((method) => (
    <td key={method.key} className={`px-3 py-3 text-right text-sm ${className}`}>
      {formatMoney(bucket?.[method.key])}
    </td>
  ));
  const getAccountBalance = (account) => Number(
    account.external_balance ?? account.current_balance ?? account.balance ?? account.opening_balance ?? 0,
  );
  const formatAccountTypeLabel = (type) => {
    const labels = {
      BANCO: 'Banco',
      BANK: 'Banco',
      CHECKING: 'Conta corrente',
      SAVINGS: 'Poupança',
      PIX: 'PIX',
      DIGITAL_WALLET: 'Carteira digital',
      CARTAO: 'Cartão',
      CARD: 'Cartão',
      CREDIT_CARD: 'Cartão',
      CHEQUE: 'Cheque',
      DINHEIRO: 'Dinheiro',
      CASH: 'Dinheiro',
    };
    return labels[String(type || '').toUpperCase()] || 'Conta financeira';
  };

  const filteredConfirmedTransfers = filteredTransfers.filter((transfer) => transfer.status === 'confirmed');
  const getTransferDestinationBucket = (transfer) => {
    const destinationAccount = transfer.to_account || accounts.find((account) => account.id === transfer.to_account_id) || {};
    if (!destinationAccount.id && normalizeTransferMethod(transfer.payment_method) === 'DINHEIRO') {
      return 'generalCash';
    }
    return getAccountDestinationBucket(destinationAccount);
  };
  const sumTransfersToBucket = (bucket) => filteredConfirmedTransfers
    .filter((transfer) => getTransferDestinationBucket(transfer) === bucket)
    .reduce((sum, transfer) => sum + Number(transfer.amount || 0), 0);
  const sumTransfersFromBucket = (bucket) => filteredConfirmedTransfers
    .filter((transfer) => {
      const originAccount = transfer.from_account || accounts.find((account) => account.id === transfer.from_account_id) || {};
      return getAccountDestinationBucket(originAccount) === bucket;
    })
    .reduce((sum, transfer) => sum + Number(transfer.amount || 0), 0);
  const transferEndpointMatchesAccount = (account, endpointId, endpointAccount) => {
    if (!endpointId || account.id !== endpointId) {
      return false;
    }

    if (!endpointAccount) {
      return account.source_table === 'finance_accounts';
    }

    const endpointName = String(endpointAccount.account_name || endpointAccount.name || endpointAccount.bank_name || '').trim().toLowerCase();
    const accountName = String(account.account_name || account.name || account.bank_name || '').trim().toLowerCase();
    const endpointType = String(endpointAccount.account_type || endpointAccount.type || '').trim().toUpperCase();
    const accountType = String(account.account_type || account.type || '').trim().toUpperCase();

    return endpointName === accountName && (!endpointType || endpointType === accountType);
  };
  const transferredCashByDrawerId = filteredConfirmedTransfers.reduce((acc, transfer) => {
    if (!transfer.from_drawer_id || normalizeTransferMethod(transfer.payment_method) !== 'DINHEIRO') {
      return acc;
    }
    acc[transfer.from_drawer_id] = (acc[transfer.from_drawer_id] || 0) + Number(transfer.amount || 0);
    return acc;
  }, {});
  const filteredCashInDrawers = filters.paymentMethod && normalizeTransferMethod(filters.paymentMethod) !== 'DINHEIRO'
    ? 0
    : filteredDrawers.reduce((sum, drawer) => {
      const movementSummary = drawerMovementSummary[drawer.id] || {};
      const cashBalance = Number(drawer.opening_balance || 0)
        + Number(movementSummary.cashIn || 0)
        - Number(movementSummary.cashOut || 0)
        - Number(transferredCashByDrawerId[drawer.id] || 0);
      const fallbackBalance = Number(drawer.expected_balance ?? drawer.closing_balance ?? drawer.opening_balance ?? 0)
        - Number(transferredCashByDrawerId[drawer.id] || 0);
      return sum + Math.max(0, filteredMovementsForTotals.length > 0 ? cashBalance : fallbackBalance);
    }, 0);
  const filteredGeneralCash = Math.max(0, sumTransfersToBucket('generalCash') - sumTransfersFromBucket('generalCash'));
  const filteredBank = sumTransfersToBucket('bank');
  const filteredCard = sumTransfersToBucket('card');
  const filteredPixTed = sumTransfersToBucket('pix');
  const filteredCheck = sumTransfersToBucket('check');
  const filteredGrossConsolidated = filteredCashInDrawers + filteredGeneralCash + filteredBank + filteredCard + filteredPixTed + filteredCheck;
  const filteredTotalConsolidated = filteredGrossConsolidated - filteredExpenseTotal;
  const getAccountOperationalBalance = (account) => {
    if (account.is_active === false) {
      return getAccountBalance(account);
    }

    const transferBalance = filteredConfirmedTransfers.reduce((sum, transfer) => {
      const amount = Number(transfer.amount || 0);
      const incoming = transferEndpointMatchesAccount(account, transfer.to_account_id, transfer.to_account) ? amount : 0;
      const outgoing = transferEndpointMatchesAccount(account, transfer.from_account_id, transfer.from_account) ? amount : 0;
      return sum + incoming - outgoing;
    }, 0);

    return getAccountBalance(account) + transferBalance;
  };

  const summaryCards = [
        {
          title: 'Dinheiro em Espécie',
          value: formatMoney(filteredCashInDrawers),
          icon: Wallet,
          color: 'from-green-500 to-green-600',
          detail: `${filteredDrawers.filter((d) => d.status !== 'open').length} caixas fechados`,
        },
        {
          title: 'Caixa Geral',
          value: formatMoney(filteredGeneralCash),
          icon: Landmark,
          color: 'from-blue-500 to-blue-600',
          detail: 'Transferências confirmadas',
        },
        {
          title: 'Saldos Bancários',
          value: formatMoney(filteredBank),
          icon: Landmark,
          color: 'from-purple-500 to-purple-600',
          detail: `${accounts.filter((account) => getAccountDestinationBucket(account) === 'bank').length} contas`,
        },
        {
          title: 'Cartões',
          value: formatMoney(filteredCard),
          icon: CreditCard,
          color: 'from-orange-500 to-orange-600',
          detail: `${accounts.filter((account) => getAccountDestinationBucket(account) === 'card').length} processadores`,
        },
        {
          title: 'PIX/TED',
          value: formatMoney(filteredPixTed),
          icon: Zap,
          color: 'from-cyan-500 to-cyan-600',
          detail: 'Transferências confirmadas',
        },
        {
          title: 'Saídas/Despesas',
          value: formatMoney(filteredExpenseTotal),
          icon: TrendingDown,
          color: 'from-rose-500 to-rose-600',
          detail: `${filteredExpenseMovements.length} ${filteredExpenseMovements.length === 1 ? 'transação' : 'transações'}`,
        },
        {
          title: 'Saldo Total Consolidado',
          value: formatMoney(filteredTotalConsolidated),
          icon: TrendingUp,
          color: 'from-amber-500 to-amber-600',
          detail: 'Fontes menos saídas',
        },
      ];

  const tabs = [
    { id: 'consolidacao', label: 'Consolidação', icon: BarChart3 },
    { id: 'drawers', label: 'Caixas Individuais', icon: Wallet },
    { id: 'expenses', label: `Saídas / Despesas (${filteredExpenseMovements.length})`, icon: TrendingDown },
    { id: 'transfers', label: 'Transferências', icon: ArrowLeftRight },
    { id: 'dailyReport', label: 'Relatório Diário', icon: FileText },
    { id: 'approvals', label: `Aprovações Pendentes (${awaitingApprovals.length + awaitingDrawerRequests.length})`, icon: Clock },
    { id: 'accounts', label: 'Contas Financeiras', icon: Landmark },
  ];

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-5 gap-4">
        <div className="-mt-4 xl:max-w-[560px]">
          <h1 className="text-2xl font-bold text-slate-800">Caixa Gerencial</h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Conferência diária dos caixas individuais e transferência
            <br />
            para caixa geral,bancos e contas de pagamento
          </p>
        </div>
        <div className="w-full xl:w-auto xl:pt-5">
          <div className="flex flex-wrap items-center justify-end gap-2 xl:flex-nowrap xl:whitespace-nowrap">
          <button
            onClick={handleCreateTransfer}
            className="flex h-10 shrink-0 items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-sm"
          >
            <Plus size={16} />
            Nova Transferência
          </button>

          <button
            onClick={() => exportToExcelConsolidation()}
            className="flex h-10 shrink-0 items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-bold shadow-sm"
          >
            <FileText size={16} />
            Excel
          </button>

          <button
            onClick={() => exportToCSVConsolidation()}
            className="flex h-10 shrink-0 items-center gap-2 px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-all text-sm font-bold shadow-sm"
          >
            <FileText size={16} />
            CSV
          </button>

          <button
            onClick={() => exportToPDFConsolidation()}
            className="flex h-10 shrink-0 items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-bold shadow-sm"
          >
            <FileText size={16} />
            PDF
          </button>

          <button
            onClick={handlePrintConsolidation}
            className="flex h-10 shrink-0 items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all text-sm font-bold shadow-sm"
          >
            <FileText size={16} />
            Imprimir
          </button>

          <ImportExportPanel
            onImportSuccess={handleImportDrawerData}
            templateColumns={['Operador ID', 'Data', 'Saldo Abertura', 'Saldo Fechamento', 'Status', 'Notas']}
            templateFilename="template_caixa_geral.xlsx"
            requiredFields={['Operador ID', 'Data']}
            title="Importar Caixa"
            buttonClassName="h-10 shrink-0 font-bold"
          />
          </div>
        </div>
      </div>

      <div className="mb-5">
        <FiltersPanel
          filters={filters}
          onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onApplyFilters={setFilters}
          onClearFilters={clearFilters}
          onSaveFilter={saveFilterWithName}
          savedFilters={savedFilters}
          onLoadFilter={loadSavedFilter}
          onDeleteFilter={deleteSavedFilter}
          operatorOptions={operatorOptions}
          paymentMethods={[
            'DINHEIRO',
            'CARTAO_CREDITO',
            'CARTAO_DEBITO',
            'PIX',
            'TED',
            'BOLETO',
            'CHEQUE',
          ]}
          statusOptions={[
            { value: 'open', label: 'Aberto' },
            { value: 'closed_full', label: 'Fechado OK' },
            { value: 'closed_partial', label: 'Fechado com Divergência' },
            { value: 'pending', label: 'Pendente' },
            { value: 'confirmed', label: 'Confirmado' },
            { value: 'canceled', label: 'Cancelado' },
          ]}
          showTypeFilter={false}
          showStatusFilter
          showOperatorSearch
        />
      </div>

      {/* Alertas de Divergências */}
      {discrepancies.length > 0 && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
          <div className="flex gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-amber-800">⚠️ Divergências Encontradas</h3>
              <p className="text-sm text-amber-700 mt-1">
                {discrepancies.length} caixa(s) com diferença entre esperado e realizado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Consolidação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 mb-5">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`h-1 bg-gradient-to-r ${card.color}`} />
            <div className="p-3">
              <div className="p-2 w-fit rounded-lg bg-slate-50 text-slate-600 mb-2">
                <card.icon size={18} />
              </div>
              <p className="text-xs font-medium text-slate-500">{card.title}</p>
              <h3 className="text-base font-bold text-slate-800 mt-1 whitespace-nowrap">{card.value}</h3>
              {card.detail && <p className="text-xs text-slate-400 mt-1">{card.detail}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 flex p-2 gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div>
              {/* Consolidação Tab */}
              {activeTab === 'consolidacao' && consolidation && (
                <div className="space-y-6">
                  {/* 💰 Resumo de Entradas por Forma de Pagamento do Dia */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
                    <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                      💰 Movimentações do Dia por Forma de Pagamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Dinheiro em Espécie', value: consolidation?.summary?.cashInDrawers || 0, color: 'from-green-500 to-emerald-600', icon: '💵' },
                        { label: 'Cartão Crédito', value: receivedByMethod.CARTAO_CREDITO || 0, color: 'from-blue-500 to-indigo-600', icon: '💳' },
                        { label: 'Cartão Débito', value: receivedByMethod.CARTAO_DEBITO || 0, color: 'from-cyan-500 to-sky-600', icon: '🔵' },
                        { label: 'PIX', value: consolidation?.summary?.pix || 0, color: 'from-purple-500 to-violet-600', icon: '⚡' },
                        { label: 'TED/DOC', value: receivedByMethod.TED || 0, color: 'from-orange-500 to-red-600', icon: '📤' },
                        { label: 'Boleto', value: receivedByMethod.BOLETO || 0, color: 'from-yellow-500 to-amber-600', icon: '📋' },
                        { label: 'Cheque', value: consolidation?.summary?.check || 0, color: 'from-slate-500 to-slate-600', icon: '✓' },
                      ].map((item, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-lg border-2 border-green-100 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{item.icon}</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold text-white bg-gradient-to-r ${item.color}`}>
                              {item.label}
                            </span>
                          </div>
                          <p className="text-xl font-bold text-slate-800">
                            R$ {Number(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Caixas Individuais Tab */}
              {activeTab === 'drawers' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1120px] text-left">
                      <thead>
                        <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Operador</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Saldo Abertura</th>
                          <th className="px-4 py-3 text-right">Total de Entradas</th>
                          <th className="px-4 py-3 text-right">Total de Saídas</th>
                          <th className="px-4 py-3 text-right">Saldo Esperado</th>
                          <th className="px-4 py-3 text-right">Saldo Real</th>
                          <th className="px-4 py-3">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredDrawers && filteredDrawers.length > 0 ? (
                          filteredDrawers.map((d) => {
                            const movementSummary = drawerMovementSummary[d.id] || {};
                            const openingBalance = Number(d.opening_balance || 0);
                            const totalIn = Number(movementSummary.totalIn || 0);
                            const totalOut = Number(movementSummary.totalOut || 0);
                            const inCount = Number(movementSummary.inCount || 0);
                            const outCount = Number(movementSummary.outCount || 0);
                            const expected = Number(d.expected_balance || 0);
                            const actual = Number(d.closing_balance || 0);
                            const diff = actual - expected;
                            return (
                              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-semibold text-sm">
                                  {formatLocalDate(d.date_opened)}
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-sm">
                                  {d.operator?.name || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                      d.status === 'open'
                                        ? 'bg-blue-100 text-blue-700'
                                        : d.status === 'closed_full'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                      {statusLabels[d.status] || d.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="font-bold text-slate-900">
                                    R$ {openingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">Valor inicial</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="font-bold text-emerald-700">
                                    R$ {totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">
                                    {inCount} {inCount === 1 ? 'transação' : 'transações'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="font-bold text-rose-700">
                                    R$ {totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">
                                    {outCount} {outCount === 1 ? 'transação' : 'transações'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600 text-sm">
                                  R$ {expected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900 font-bold text-sm">
                                  R$ {actual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3">
                                  {Math.abs(diff) < 0.01 ? (
                                    <span className="text-green-700 text-xs font-bold">✓ OK</span>
                                  ) : (
                                    <span className="text-red-700 text-xs font-bold">
                                      {diff > 0 ? '+' : ''}
                                      {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                              Nenhum caixa encontrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'transfers' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50">
                      <th className="px-4 py-4">Data</th>
                      <th className="px-4 py-4">Origem</th>
                      <th className="px-4 py-4">Destino</th>
                      <th className="px-4 py-4">Forma</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTransfers && filteredTransfers.length > 0 ? (
                      filteredTransfers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 text-slate-500 text-sm">
                            {formatLocalDate(t.transfer_date || t.created_at)}
                          </td>
                          <td className="px-4 py-4 text-slate-600 text-sm">
                            {t.from_drawer?.operator?.name || t.from_account?.account_name || 'Caixa individual'}
                          </td>
                          <td className="px-4 py-4 text-slate-600 text-sm">
                            {t.to_account?.account_name || 'Conta não informada'}
                          </td>
                          <td className="px-4 py-4 text-slate-600 text-sm">
                            {t.payment_method || 'N/A'}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                t.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : ['pending', 'pending_approval'].includes(t.status)
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {statusLabels[t.status] || t.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-slate-900 font-bold">
                            R${' '}
                            {(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                          Nenhuma transferência encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {activeTab === 'expenses' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                      <p className="text-xs font-bold uppercase text-rose-700">Saídas filtradas</p>
                      <p className="mt-2 text-2xl font-bold text-rose-950">{formatMoney(filteredExpenseTotal)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase text-slate-600">Quantidade</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{filteredExpenseMovements.length}</p>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-bold uppercase text-blue-700">Filtro de despesa</p>
                      <p className="mt-2 truncate text-sm font-semibold text-blue-950">
                        {filters.expenseSearch || 'Sem busca textual'}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                    <table className="w-full min-w-[1100px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-3">Data</th>
                          <th className="px-3 py-3">Operador</th>
                          <th className="px-3 py-3">Favorecido</th>
                          <th className="px-3 py-3">Fornecedor</th>
                          <th className="px-3 py-3">Prestador</th>
                          <th className="px-3 py-3">Serviço / Despesa</th>
                          <th className="px-3 py-3">Forma</th>
                          <th className="px-3 py-3">Documento</th>
                          <th className="px-3 py-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredExpenseMovements.length > 0 ? (
                          filteredExpenseMovements.map((movement) => (
                            <tr key={movement.id} className="hover:bg-slate-50/50">
                              <td className="px-3 py-3 text-sm font-semibold text-slate-700">
                                {formatLocalDate(movement.drawer?.date_opened || movement.created_at)}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-600">
                                {movement.drawer?.operator?.name || 'Operador não informado'}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                {movement.counterparty_name || 'Não informado'}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                {movement.expense_supplier_name || '-'}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                {movement.expense_provider_name || '-'}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-700">
                                <div className="font-semibold">{movement.expense_service_description || movement.description || '-'}</div>
                                {movement.description && movement.expense_service_description && (
                                  <div className="mt-1 text-xs text-slate-400">{movement.description}</div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-600">
                                {movement.payment_method || '-'}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-600">
                                {movement.reference_document || '-'}
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-bold text-rose-700">
                                -{formatMoney(movement.amount)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                              Nenhuma saída encontrada para os filtros selecionados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'dailyReport' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-bold uppercase text-blue-700">Entradas conferidas</p>
                      <p className="mt-2 text-2xl font-bold text-blue-950">{formatMoney(dailyReport?.totals?.totalReceived)}</p>
                    </div>
                    <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                      <p className="text-xs font-bold uppercase text-green-700">Transferido</p>
                      <p className="mt-2 text-2xl font-bold text-green-950">{formatMoney(dailyReport?.totals?.totalTransferred)}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-bold uppercase text-amber-700">Pendente no caixa individual</p>
                      <p className="mt-2 text-2xl font-bold text-amber-950">{formatMoney(dailyReport?.totals?.totalPending)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Relatório por Operador</h3>
                        <p className="text-sm text-slate-500">Entradas do caixa individual, transferências confirmadas e saldo pendente por forma de pagamento.</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full min-w-[1100px] text-left">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <th className="px-3 py-3">Operador</th>
                            <th className="px-3 py-3">Movimento</th>
                            {reportMethods.map((method) => (
                              <th key={method.key} className="px-3 py-3 text-right">{method.label}</th>
                            ))}
                            <th className="px-3 py-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {dailyReport?.byOperator?.length > 0 ? (
                            dailyReport.byOperator.map((row) => (
                              <React.Fragment key={row.id}>
                                <tr className="bg-white">
                                  <td rowSpan="3" className="px-3 py-3 align-top text-sm font-bold text-slate-700">
                                    {row.operatorName}
                                    <p className="mt-1 text-xs font-normal text-slate-400">
                                      {row.drawerDates.map((date) => new Date(date).toLocaleDateString('pt-BR')).join(', ')}
                                    </p>
                                  </td>
                                  <td className="px-3 py-3 text-sm font-semibold text-blue-700">Entrada</td>
                                  {reportMethodCells(row.received, 'text-slate-700')}
                                  <td className="px-3 py-3 text-right text-sm font-bold text-slate-900">{formatMoney(row.totalReceived)}</td>
                                </tr>
                                <tr className="bg-green-50/40">
                                  <td className="px-3 py-3 text-sm font-semibold text-green-700">Transferido</td>
                                  {reportMethodCells(row.transferred, 'text-green-800')}
                                  <td className="px-3 py-3 text-right text-sm font-bold text-green-900">{formatMoney(row.totalTransferred)}</td>
                                </tr>
                                <tr className="bg-amber-50/40">
                                  <td className="px-3 py-3 text-sm font-semibold text-amber-700">Pendente</td>
                                  {reportMethodCells(row.pending, 'text-amber-800')}
                                  <td className="px-3 py-3 text-right text-sm font-bold text-amber-900">{formatMoney(row.totalPending)}</td>
                                </tr>
                              </React.Fragment>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={reportMethods.length + 3} className="px-4 py-8 text-center text-slate-500">
                                Nenhum movimento encontrado para o período selecionado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-slate-800">Relatório por Profissional</h3>
                      <p className="text-sm text-slate-500">Entradas vinculadas aos atendimentos, separadas por profissional e forma de pagamento.</p>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full min-w-[900px] text-left">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <th className="px-3 py-3">Profissional</th>
                            {reportMethods.map((method) => (
                              <th key={method.key} className="px-3 py-3 text-right">{method.label}</th>
                            ))}
                            <th className="px-3 py-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {dailyReport?.byProfessional?.length > 0 ? (
                            dailyReport.byProfessional.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50/50">
                                <td className="px-3 py-3 text-sm font-bold text-slate-700">{row.professionalName}</td>
                                {reportMethodCells(row.received, 'text-slate-700')}
                                <td className="px-3 py-3 text-right text-sm font-bold text-slate-900">{formatMoney(row.totalReceived)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={reportMethods.length + 2} className="px-4 py-8 text-center text-slate-500">
                                Nenhum atendimento com profissional encontrado para o período selecionado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'accounts' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50">
                      <th className="px-4 py-4">Conta</th>
                      <th className="px-4 py-4">Tipo</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accounts && accounts.length > 0 ? (
                      accounts.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 text-slate-700 font-semibold">{a.account_name}</td>
                          <td className="px-4 py-4 text-slate-500 text-sm">
                            {a.account_type || 'Conta'}
                          </td>
                          <td className="px-4 py-4 text-slate-500 text-sm">
                            {a.is_active === false ? 'Inativa' : 'Ativa'}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-900 font-bold">
                            R$ {getAccountOperationalBalance(a).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                          Nenhuma conta encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {activeTab === 'approvals' && (
                <div className="space-y-4">
                  {awaitingDrawerRequests && awaitingDrawerRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase text-slate-600">Solicitações de Caixa Diário</h3>
                      {awaitingDrawerRequests.map((request) => (
                        <div
                          key={request.id}
                          className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 transition-all hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="mb-2 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-blue-700" />
                                <h3 className="font-bold text-slate-800">
                                  {request.request_type === 'reopen' ? 'Reabertura de caixa' : 'Reajuste de caixa'}
                                </h3>
                                <span className="rounded-full bg-blue-200 px-2 py-1 text-xs font-bold text-blue-900">
                                  Aguardando Liberação
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                                <div>
                                  <p className="text-xs font-semibold text-blue-700">Operador</p>
                                  <p className="text-slate-700">{request.requestedBy?.name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-blue-700">Data do caixa</p>
                                  <p className="text-slate-700">
                                    {request.drawer?.date_opened
                                      ? new Date(request.drawer.date_opened).toLocaleDateString('pt-BR')
                                      : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-blue-700">Status atual</p>
                                  <p className="text-slate-700">{statusLabels[request.drawer?.status] || request.drawer?.status || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-blue-700">Solicitado em</p>
                                  <p className="text-slate-700">
                                    {request.requested_at ? formatSupabaseUtcDateTime(request.requested_at) : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 rounded border border-blue-200 bg-white p-2 text-xs">
                                <span className="font-semibold text-blue-900">Motivo:</span> {request.reason}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2">
                              <button
                                onClick={() => handleApproveDrawerRequest(request)}
                                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-all hover:bg-green-700"
                              >
                                <CheckCircle size={16} />
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleRejectDrawerRequest(request)}
                                className="rounded-lg bg-red-100 px-4 py-2 font-semibold text-red-700 transition-all hover:bg-red-200"
                              >
                                Rejeitar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {awaitingApprovals && awaitingApprovals.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-sm font-bold uppercase text-slate-600">Transferências</h3>
                          <p className="text-xs font-semibold text-amber-800">
                            {selectedApprovalIds.length} de {awaitingApprovals.length} selecionada(s)
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleToggleAllApprovalSelection}
                            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-800 transition-all hover:bg-amber-100"
                          >
                            {selectedApprovalIds.length === awaitingApprovals.length ? 'Limpar seleção' : 'Selecionar todas'}
                          </button>
                          <button
                            type="button"
                            onClick={handleApproveSelectedTransfers}
                            disabled={approvalLoading || selectedApprovalIds.length === 0}
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Aprovar selecionadas
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelSelectedTransfers}
                            disabled={approvalLoading || selectedApprovalIds.length === 0}
                            className="rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-700 transition-all hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancelar selecionadas
                          </button>
                        </div>
                      </div>
                    {awaitingApprovals.map((transfer) => (
                      <div
                        key={transfer.id}
                        className={`border-2 rounded-lg p-4 hover:shadow-md transition-all ${
                          selectedApprovalIds.includes(transfer.id)
                            ? 'border-amber-500 bg-amber-100'
                            : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <label className="mt-1 flex shrink-0 items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedApprovalIds.includes(transfer.id)}
                              onChange={() => handleToggleApprovalSelection(transfer.id)}
                              className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                              aria-label="Selecionar transferência"
                            />
                          </label>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock size={18} className="text-amber-600" />
                              <h3 className="font-bold text-slate-800">
                                Transferência de {transfer.from_drawer?.operator?.name || 'Operador'}
                              </h3>
                              <span className="px-2 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-bold">
                                Aguardando Aprovação
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                              <div>
                                <p className="text-xs text-amber-700 font-semibold">De</p>
                                <p className="text-slate-700">
                                  {transfer.from_drawer?.operator?.name || 'N/A'} (
                                  {transfer.from_drawer && transfer.from_drawer.date_opened
                                    ? new Date(transfer.from_drawer.date_opened).toLocaleDateString('pt-BR')
                                    : 'N/A'}
                                  )
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-amber-700 font-semibold">Para</p>
                                <p className="text-slate-700">{transfer.to_account?.account_name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-amber-700 font-semibold">Tipo</p>
                                <p className="text-slate-700">{transfer.payment_method || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-amber-700 font-semibold">Valor</p>
                                <p className="font-bold text-amber-900">
                                  R$ {(Number(transfer.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                            {transfer.notes && (
                              <div className="mt-3 p-2 bg-white rounded border border-amber-200 text-xs">
                                <span className="font-semibold text-amber-900">Observação:</span> {transfer.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col gap-2">
                            <button
                              onClick={() => setSelectedApprovalTransfer(transfer)}
                              disabled={approvalLoading}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all whitespace-nowrap flex items-center justify-center gap-2"
                            >
                              <CheckCircle size={16} />
                              Aprovar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditTransfer(transfer)}
                              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-all whitespace-nowrap"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelTransfer(transfer)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-all whitespace-nowrap"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                    }
                    </div>
                  )}

                  {drawerRequestHistory && drawerRequestHistory.length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <h3 className="text-sm font-bold uppercase text-slate-600">Histórico de solicitações</h3>
                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <table className="w-full min-w-[900px] text-left">
                          <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-3">Resultado</th>
                              <th className="px-3 py-3">Tipo</th>
                              <th className="px-3 py-3">Operador</th>
                              <th className="px-3 py-3">Data do caixa</th>
                              <th className="px-3 py-3">Solicitado em</th>
                              <th className="px-3 py-3">Processado em</th>
                              <th className="px-3 py-3">Responsável</th>
                              <th className="px-3 py-3">Motivo / Observação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {drawerRequestHistory.map((request) => {
                              const approved = request.status === 'approved';
                              return (
                                <tr key={request.id} className="hover:bg-slate-50">
                                  <td className="px-3 py-3">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {approved ? <CheckCircle size={13} /> : <X size={13} />}
                                      {drawerRequestStatusLabels[request.status] || request.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-slate-700">
                                    {request.request_type === 'reopen' ? 'Reabertura' : 'Reajuste'}
                                  </td>
                                  <td className="px-3 py-3 text-slate-700">{request.requestedBy?.name || 'N/A'}</td>
                                  <td className="px-3 py-3 text-slate-700">
                                    {request.drawer?.date_opened ? formatLocalDate(request.drawer.date_opened) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-3 text-slate-700">
                                    {request.requested_at ? formatSupabaseUtcDateTime(request.requested_at) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-3 text-slate-700">
                                    {request.reviewed_at ? formatSupabaseUtcDateTime(request.reviewed_at) : 'N/A'}
                                  </td>
                                  <td className="px-3 py-3 text-slate-700">{request.reviewedBy?.name || 'N/A'}</td>
                                  <td className="px-3 py-3 text-xs text-slate-600">
                                    <div><span className="font-semibold">Motivo:</span> {request.reason}</div>
                                    {request.review_notes && (
                                      <div className="mt-1"><span className="font-semibold">Obs.:</span> {request.review_notes}</div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(!awaitingApprovals || awaitingApprovals.length === 0)
                    && (!awaitingDrawerRequests || awaitingDrawerRequests.length === 0)
                    && (!drawerRequestHistory || drawerRequestHistory.length === 0) && (
                    <div className="text-center py-8 bg-green-50 rounded-lg border-2 border-green-200">
                      <CheckCircle2 size={40} className="mx-auto mb-2 text-green-600" />
                      <p className="text-slate-600 font-semibold">Nenhuma transferência aguardando aprovação</p>
                      <p className="text-sm text-slate-500">Todas as transferências e solicitações de caixa foram processadas!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showTransferForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto p-2 sm:items-center sm:p-4">
          <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editingTransfer ? 'Editar Transferência' : 'Nova Transferência'}</h2>
                <p className="text-sm text-slate-500 mt-1">Informe como o valor entrou e para onde ele será lançado.</p>
              </div>
              <button
                onClick={() => {
                  setShowTransferForm(false);
                  setEditingTransfer(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-3">
                <label className="block text-sm font-bold text-slate-900 mb-2">Tipo de transferência</label>
                <select
                  className="w-full border-2 border-slate-300 rounded-lg p-2.5 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 transition-all font-semibold"
                  value={transferData.transferType}
                  onChange={(e) => setTransferData({
                    ...transferData,
                    transferType: e.target.value,
                    fromDrawerId: '',
                    fromAccountId: '',
                    toAccountId: '',
                    paymentMethod: e.target.value === 'bank_to_bank'
                      ? 'TED'
                      : e.target.value === 'general_cash_to_bank'
                        ? 'DINHEIRO'
                        : transferData.paymentMethod,
                    amount: '',
                  })}
                  required
                >
                  <option value="drawer_to_destination">Caixa individual para destino financeiro</option>
                  <option value="general_cash_to_bank">Depósito: Caixa Geral para conta corrente</option>
                  <option value="bank_to_bank">Transferência entre contas bancárias</option>
                </select>
              </div>

              {isBankToBankTransfer ? (
                <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-3">
                  <label className="block text-sm font-bold text-blue-900 mb-2">Conta bancária de origem</label>
                  <select
                    className="w-full border-2 border-blue-300 rounded-lg p-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-semibold"
                    value={transferData.fromAccountId}
                    onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value, toAccountId: '' })}
                    required
                  >
                    <option value="">Selecione a conta de origem</option>
                    {bankAccountsForTransfer.map((account) => (
                      <option key={`${account.source_table || 'account'}-${account.id}`} value={account.id}>
                        {account.account_name} - {formatAccountTypeLabel(account.account_type)}
                      </option>
                    ))}
                  </select>
                  {selectedBankOriginAccount && (
                    <div className="mt-2 p-2.5 bg-white rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-blue-700">Saldo disponível cadastrado:</span>
                        <span className="text-base font-bold text-blue-900">
                          R$ {selectedBankAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : isGeneralCashDeposit ? (
                <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-3">
                  <label className="block text-sm font-bold text-blue-900 mb-2">Origem</label>
                  <div className="w-full border-2 border-blue-200 bg-white rounded-lg p-2.5 font-semibold text-blue-950">
                    Caixa Geral - dinheiro em espécie
                  </div>
                  <div className="mt-2 p-2.5 bg-white rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-blue-700">Disponível para depósito bancário:</span>
                      <span className="text-base font-bold text-blue-900">
                        R$ {generalCashAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-3">
                  <label className="block text-sm font-bold text-blue-900 mb-2">Caixa individual de origem</label>
                  <select
                    className="w-full border-2 border-blue-300 rounded-lg p-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-semibold"
                    value={transferData.fromDrawerId}
                    onChange={(e) => setTransferData({ ...transferData, fromDrawerId: e.target.value })}
                    required
                  >
                    <option value="">Selecione um caixa</option>
                    {drawers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {new Date(d.date_opened).toLocaleDateString('pt-BR')} - {d.operator?.name || 'Operador'} - {statusLabels[d.status] || d.status} - R$ {Number(d.expected_balance ?? d.closing_balance ?? d.opening_balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                  {selectedDrawer && (
                    <div className="mt-2 p-2.5 bg-white rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-blue-700">Disponível nessa forma de entrada:</span>
                        <span className="text-base font-bold text-blue-900">
                          R$ {selectedTransferAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Grid 2 Colunas */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Origem do Recebimento */}
                <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-3">
                  <label className="block text-sm font-bold text-orange-900 mb-2">Origem do recebimento</label>
                  {isBankToBankTransfer ? (
                    <>
                      <div className="w-full border-2 border-orange-200 bg-white rounded-lg p-2.5 font-semibold text-orange-950">
                        Transferência bancária entre contas
                      </div>
                      <p className="mt-2 text-xs font-semibold text-orange-800">
                        Registre aqui quando o valor sair de uma conta bancária e entrar em outra conta bancária cadastrada.
                      </p>
                    </>
                  ) : isGeneralCashDeposit ? (
                    <>
                      <div className="w-full border-2 border-orange-200 bg-white rounded-lg p-2.5 font-semibold text-orange-950">
                        Dinheiro em espécie depositado
                      </div>
                      <p className="mt-2 text-xs font-semibold text-orange-800">
                        Registre aqui quando o dinheiro físico saiu do Caixa Geral e entrou na conta corrente.
                      </p>
                    </>
                  ) : (
                    <>
                      <select
                        className="w-full border-2 border-orange-300 rounded-lg p-2.5 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all font-semibold"
                        value={transferData.paymentMethod}
                        onChange={(e) => setTransferData({ ...transferData, paymentMethod: e.target.value, toAccountId: '' })}
                        required
                      >
                        {transferOriginOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs font-semibold text-orange-800">
                        {selectedOriginOption?.description || 'Selecione como o valor entrou no caixa.'}
                      </p>
                    </>
                  )}
                </div>

                {/* Destino do Valor */}
                <div className="bg-purple-50 rounded-xl border-2 border-purple-200 p-3">
                  <label className="block text-sm font-bold text-purple-900 mb-2">Destino do valor</label>
                  {requiresDestinationAccount ? (
                    <select
                      className="w-full border-2 border-purple-300 rounded-lg p-2.5 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all font-semibold"
                      value={transferData.toAccountId}
                      onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                      required
                    >
                      <option value="">
                        {isBankToBankTransfer ? 'Selecione a conta de destino' : isGeneralCashDeposit ? 'Selecione a conta corrente' : 'Selecione uma conta'}
                      </option>
                      {Object.entries(groupedDestinationAccounts).map(([groupLabel, groupAccounts]) => (
                        <optgroup key={groupLabel} label={groupLabel}>
                          {groupAccounts.map((a) => (
                            <option key={`${a.source_table || 'account'}-${a.id}`} value={a.id}>
                              {a.account_name} - {formatAccountTypeLabel(a.account_type)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full border-2 border-purple-200 bg-white rounded-lg p-2.5 font-semibold text-purple-950">
                      Caixa Geral
                    </div>
                  )}
                  {!requiresDestinationAccount && (
                    <p className="mt-2 text-xs font-semibold text-purple-800">
                      Dinheiro conferido fica vinculado ao Caixa Geral.
                    </p>
                  )}
                  {isGeneralCashDeposit && (
                    <p className="mt-2 text-xs font-semibold text-purple-800">
                      O valor sai do Caixa Geral e passa a compor o saldo bancário para conciliação.
                    </p>
                  )}
                  {isBankToBankTransfer && (
                    <p className="mt-2 text-xs font-semibold text-purple-800">
                      A conta de destino deve ser diferente da conta de origem.
                    </p>
                  )}
                  {requiresDestinationAccount && matchingDestinationAccounts.length === 0 && destinationAccounts.length > 0 && (
                    <p className="mt-2 text-xs font-semibold text-blue-700">
                      Exibindo todas as contas cadastradas.
                    </p>
                  )}
                  {requiresDestinationAccount && destinationAccounts.length === 0 && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Nenhuma conta financeira cadastrada para destino.
                    </p>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div className="bg-green-50 rounded-xl border-2 border-green-200 p-3">
                <label className="block text-sm font-bold text-green-900 mb-2">
                  Valor (R$)
                  {selectedTransferAvailable > 0 && (
                    <span className="ml-2 text-xs font-normal text-green-700">
                      (Limite: R$ {selectedTransferAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    className="flex-1 border-2 border-green-300 rounded-lg p-2.5 text-lg font-bold outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all"
                    placeholder="0.00"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    max={selectedTransferAvailable || undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setTransferData({ ...transferData, amount: String(selectedTransferAvailable) })}
                    className="px-3 py-2.5 bg-green-200 text-green-900 rounded-lg font-bold hover:bg-green-300 transition-all text-sm"
                    title="Usar saldo total disponível"
                  >
                    Max
                  </button>
                </div>
                {transferData.amount && (
                  <div className="mt-2 p-2 bg-white rounded border border-green-200">
                    {Number(transferData.amount) > selectedTransferAvailable ? (
                      <p className="text-xs text-red-700 font-bold">Valor excede o saldo disponível.</p>
                    ) : (
                      <p className="text-xs text-green-700 font-bold">Saldo após transferência: R$ {(selectedTransferAvailable - Number(transferData.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Observação */}
              <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-3">
                <label className="block text-sm font-bold text-slate-700 mb-2">Observação</label>
                <textarea
                  className="w-full border-2 border-slate-300 rounded-lg p-2.5 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 transition-all min-h-[56px] font-mono text-xs"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder="Descreva a conferência realizada ou informe uma referência interna."
                />
              </div>
              </div>

              {/* Botões */}
              <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-white p-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferForm(false);
                    setEditingTransfer(null);
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitDisabled}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTransfer ? 'Salvar alteração' : 'Lançar no destino'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aprovação */}
      <TransferApprovalModal
        transfer={selectedApprovalTransfer}
        isOpen={!!selectedApprovalTransfer}
        onClose={() => setSelectedApprovalTransfer(null)}
        onApprove={async (approvalData) => {
          setApprovalLoading(true);
          try {
            await reconciliationApi.approveTransfer(approvalData.transferId, {
              approvedBy: user.id,
              signature: approvalData.signature,
              notes: approvalData.notes,
            });
            alert('✓ Transferência aprovada com sucesso!');
            setSelectedApprovalTransfer(null);
            await loadData();
          } catch (error) {
            console.error('Erro ao aprovar:', error);
            alert('❌ Erro ao aprovar transferência');
          } finally {
            setApprovalLoading(false);
          }
        }}
        onReject={async (rejectionData) => {
          setApprovalLoading(true);
          try {
            await reconciliationApi.rejectTransfer(rejectionData.transferId, {
              rejectedBy: user.id,
              reason: rejectionData.reason,
            });
            alert('✓ Transferência rejeitada!');
            setSelectedApprovalTransfer(null);
            await loadData();
          } catch (error) {
            console.error('Erro ao rejeitar:', error);
            alert('❌ Erro ao rejeitar transferência');
          } finally {
            setApprovalLoading(false);
          }
        }}
        isLoading={approvalLoading}
      />

      {showImportPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Prévia da Importação de Caixa</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Total: {importPreview.rawTotal} | Válidas: {importPreview.validRows.length} | Inválidas: {importPreview.validations.length}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!importProcessing) {
                    setShowImportPreviewModal(false);
                  }
                }}
                className="text-slate-400 hover:text-slate-600"
                disabled={importProcessing}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
              {importPreview.validRows.length > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-green-800 mb-3">Linhas válidas (prévia)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-slate-500 text-xs uppercase">
                          <th className="py-2 pr-4">Operador ID</th>
                          <th className="py-2 pr-4">Data</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4 text-right">Abertura</th>
                          <th className="py-2 pr-4 text-right">Fechamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.validRows.slice(0, 30).map((row, idx) => (
                          <tr key={`${row.operatorId}-${row.dateIso}-${idx}`} className="border-t border-green-100">
                            <td className="py-2 pr-4 text-slate-700">{row.operatorId}</td>
                            <td className="py-2 pr-4 text-slate-700">{row.dateIso}</td>
                            <td className="py-2 pr-4 text-slate-700">{row.status}</td>
                            <td className="py-2 pr-4 text-right text-slate-700">{Number(row.opening).toFixed(2)}</td>
                            <td className="py-2 pr-4 text-right text-slate-700">{row.closing === null ? '-' : Number(row.closing).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.validRows.length > 30 && (
                    <p className="text-xs text-slate-500 mt-2">
                      Exibindo 30 de {importPreview.validRows.length} linhas válidas.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-800">Nenhuma linha válida para processar.</p>
                </div>
              )}

              {importPreview.validations.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-amber-800 mb-3">Linhas inválidas</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importPreview.validations.slice(0, 120).map((msg, idx) => (
                      <p key={`${msg}-${idx}`} className="text-xs text-amber-900">• {msg}</p>
                    ))}
                  </div>
                </div>
              )}

              {importPreview.validations.length > 0 && (
                <label className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={ignoreInvalidRowsForPersist}
                    onChange={(e) => setIgnoreInvalidRowsForPersist(e.target.checked)}
                    disabled={importProcessing}
                  />
                  <span className="text-sm text-amber-900">
                    Ignorar inválidas e persistir apenas válidas
                    <span className="block text-xs text-amber-700 mt-1">
                      Serão persistidas {importPreview.validRows.length} de {importPreview.rawTotal} linhas.
                    </span>
                  </span>
                </label>
              )}

              {importExecutionSummary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 whitespace-pre-line text-sm text-blue-900">
                  {importExecutionSummary}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex flex-wrap justify-end gap-2 bg-white">
              <button
                onClick={() => setShowImportPreviewModal(false)}
                disabled={importProcessing}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Fechar
              </button>
              <button
                onClick={() => executeDrawerImport(true)}
                disabled={importProcessing || importPreview.validRows.length === 0}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {importProcessing ? 'Processando...' : 'Simular'}
              </button>
              <button
                onClick={() => executeDrawerImport(false)}
                disabled={
                  importProcessing ||
                  importPreview.validRows.length === 0 ||
                  (importPreview.validations.length > 0 && !ignoreInvalidRowsForPersist)
                }
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {importProcessing ? 'Processando...' : 'Persistir no Banco'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaixaGerencialView;
