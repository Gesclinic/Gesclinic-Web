import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Wallet,
  Plus,
  ArrowLeftRight,
  MoreVertical,
  X,
  AlertTriangle,
  Landmark,
  CreditCard,
  Zap,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
  Loader,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import cashDrawerApi from '@/lib/cashDrawerApi';
import financeAccountsApi from '@/lib/financeAccountsApi';
import cashTransfersApi from '@/lib/cashTransfersApi';
import cashConsolidationApi from '@/lib/cashConsolidationApi';
import externalBalanceApi from '@/lib/externalBalanceApi';
import reconciliationApi from '@/lib/reconciliationApi';
import TransferApprovalModal from './TransferApprovalModal';

import { ImportExportPanel } from './ImportExportPanel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/exportImportUtils';

const CaixaGerencialView = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [drawers, setDrawers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [consolidation, setConsolidation] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [bankBalances, setBankBalances] = useState([]);
  const [cardBalances, setCardBalances] = useState([]);
  const [awaitingApprovals, setAwaitingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consolidacao');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedApprovalTransfer, setSelectedApprovalTransfer] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
  const [importPreview, setImportPreview] = useState({ validRows: [], validations: [], rawTotal: 0 });
  const [importExecutionSummary, setImportExecutionSummary] = useState('');
  const [importProcessing, setImportProcessing] = useState(false);
  const [ignoreInvalidRowsForPersist, setIgnoreInvalidRowsForPersist] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    paymentMethod: '',
    search: '',
  });
  const [transferData, setTransferData] = useState({
    fromDrawerId: '',
    toAccountId: '',
    paymentMethod: 'DINHEIRO',
    amount: '',
    notes: '',
  });

  const loadData = async () => {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    try {
      const [drawersRes, accountsRes, transfersRes, consolidationRes, discrepanciesRes, bankRes, cardRes, approvalsRes] = await Promise.all([
        cashDrawerApi.listDrawers(clinicId),
        financeAccountsApi.listAccounts(clinicId),
        cashTransfersApi.listTransfers(clinicId),
        cashConsolidationApi.getCashConsolidation(clinicId),
        cashConsolidationApi.getCashDiscrepancies(clinicId),
        externalBalanceApi.getLatestBankBalances(clinicId),
        externalBalanceApi.getLatestCardBalances(clinicId),
        reconciliationApi.getTransfersAwaitingApproval(clinicId),
      ]);
      setDrawers(drawersRes || []);
      setAccounts(accountsRes || []);
      setTransfers(transfersRes || []);
      setConsolidation(consolidationRes);
      setDiscrepancies(discrepanciesRes || []);
      setBankBalances(bankRes || []);
      setCardBalances(cardRes || []);
      setAwaitingApprovals(approvalsRes || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setDrawers([]);
      setAccounts([]);
      setTransfers([]);
      setBankBalances([]);
      setCardBalances([]);
      setAwaitingApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const handleCreateTransfer = () => setShowTransferForm(true);

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!clinicId) {
      return;
    }
    try {
      await cashTransfersApi.create({
        clinic_id: clinicId,
        from_drawer_id: transferData.fromDrawerId,
        to_account_id: transferData.toAccountId,
        payment_method: transferData.paymentMethod,
        amount: parseFloat(transferData.amount),
        transfer_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: transferData.notes,
        created_by: user.id,
      });
      setShowTransferForm(false);
      setTransferData({ fromDrawerId: '', toAccountId: '', paymentMethod: 'DINHEIRO', amount: '', notes: '' });
      await loadData();
    } catch (error) {
      console.error('Erro ao transferir:', error);
      alert('Erro ao criar transferência. Tente novamente.');
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

      if (simulationMode && actionLog.length > 0) {
        console.table(actionLog.slice(0, 100));
      }

      setImportExecutionSummary(summary);

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

  const normalizeDateInput = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
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

  const handleDateFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: normalizeDateInput(value),
    }));
  };

  const filteredDrawers = drawers.filter((d) => {
    const opened = new Date(d.date_opened);
    const start = parseFilterDate(filters.startDate);
    const end = parseFilterDate(filters.endDate, true);

    if (start && opened < start) {
      return false;
    }
    if (end && opened > end) {
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
    const transferDate = new Date(t.transfer_date || t.created_at);
    const start = parseFilterDate(filters.startDate);
    const end = parseFilterDate(filters.endDate, true);

    if (start && transferDate < start) {
      return false;
    }
    if (end && transferDate > end) {
      return false;
    }
    if (filters.status && t.status !== filters.status) {
      return false;
    }
    if (filters.paymentMethod && t.payment_method !== filters.paymentMethod) {
      return false;
    }
    return true;
  });

  const selectedDrawer = drawers.find((drawer) => drawer.id === transferData.fromDrawerId);
  const selectedDrawerAvailable = Number(
    selectedDrawer?.expected_balance ?? selectedDrawer?.closing_balance ?? selectedDrawer?.opening_balance ?? 0,
  );
  const destinationAccounts = accounts.filter(
    (account) => !transferData.paymentMethod || account.account_type === transferData.paymentMethod,
  );

  const summaryCards = consolidation
    ? [
        {
          title: 'Dinheiro em Espécie',
          value: `R$ ${(consolidation?.summary?.cashInDrawers || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: Wallet,
          color: 'from-green-500 to-green-600',
          detail: `${drawers.filter((d) => d.status !== 'open').length} caixas fechados`,
        },
        {
          title: 'Caixa Geral',
          value: `R$ ${(consolidation?.summary?.generalCash || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: Landmark,
          color: 'from-blue-500 to-blue-600',
          detail: 'Transferências confirmadas',
        },
        {
          title: 'Saldos Bancários',
          value: `R$ ${(consolidation?.summary?.bank || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: Landmark,
          color: 'from-purple-500 to-purple-600',
          detail: `${consolidation?.details?.bankAccounts?.length || 0} contas`,
        },
        {
          title: 'Cartões',
          value: `R$ ${(consolidation?.summary?.card || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: CreditCard,
          color: 'from-orange-500 to-orange-600',
          detail: `${consolidation?.details?.cardAccounts?.length || 0} processadores`,
        },
        {
          title: 'PIX/TED',
          value: `R$ ${(consolidation?.summary?.pix || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: Zap,
          color: 'from-cyan-500 to-cyan-600',
          detail: 'Transferências confirmadas',
        },
        {
          title: 'Saldo Total Consolidado',
          value: `R$ ${(consolidation?.summary?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          icon: TrendingUp,
          color: 'from-amber-500 to-amber-600',
          detail: 'Todas as fontes',
        },
      ]
    : [];

  const tabs = [
    { id: 'consolidacao', label: 'Consolidação', icon: BarChart3 },
    { id: 'drawers', label: 'Caixas Individuais', icon: Wallet },
    { id: 'transfers', label: 'Transferências', icon: ArrowLeftRight },
    { id: 'approvals', label: `Aprovações Pendentes (${awaitingApprovals.length})`, icon: Clock },
    { id: 'accounts', label: 'Contas Financeiras', icon: Landmark },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Caixa Geral / Controle de Caixa</h1>
          <p className="text-slate-500 mt-2">
            Conferência diária dos caixas individuais e transferência para caixa geral, bancos e contas de
            pagamento
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCreateTransfer}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-sm"
          >
            <Plus size={18} />
            Nova Transferência
          </button>

          <button
            onClick={() => exportToExcelConsolidation()}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold shadow-sm"
          >
            <FileText size={18} />
            Excel
          </button>

          <button
            onClick={() => exportToCSVConsolidation()}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-all font-bold shadow-sm"
          >
            <FileText size={18} />
            CSV
          </button>

          <button
            onClick={() => exportToPDFConsolidation()}
            className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-bold shadow-sm"
          >
            <FileText size={18} />
            PDF
          </button>

          <button
            onClick={handlePrintConsolidation}
            className="flex items-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all font-bold shadow-sm"
          >
            <FileText size={18} />
            Imprimir
          </button>

          <ImportExportPanel
            onImportSuccess={handleImportDrawerData}
            templateColumns={['Operador ID', 'Data', 'Saldo Abertura', 'Saldo Fechamento', 'Status', 'Notas']}
            templateFilename="template_caixa_geral.xlsx"
            requiredFields={['Operador ID', 'Data']}
            title="Importar Caixa"
          />
        </div>
      </div>

      <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">Data Início</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              maxLength={10}
              value={filters.startDate}
              onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
              className="h-10 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">Data Fim</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              maxLength={10}
              value={filters.endDate}
              onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
              className="h-10 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="h-10 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Todos</option>
              <option value="open">Aberto</option>
              <option value="closed_full">Fechado OK</option>
              <option value="closed_partial">Fechado com Divergencia</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">Forma de Pagamento</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              className="h-10 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Todas</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_CREDITO">Cartao Credito</option>
              <option value="CARTAO_DEBITO">Cartao Debito</option>
              <option value="PIX">PIX</option>
              <option value="TED">TED</option>
              <option value="BOLETO">Boleto</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 xl:col-span-2">
            <label className="text-xs font-semibold text-slate-500">Buscar Operador</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digite o nome do operador..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="h-10 flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button
                onClick={() =>
                  setFilters({ startDate: '', endDate: '', status: '', paymentMethod: '', search: '' })
                }
                className="h-10 px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold hover:bg-slate-200"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`h-1 bg-gradient-to-r ${card.color}`} />
            <div className="p-4">
              <div className="p-2 w-fit rounded-lg bg-slate-50 text-slate-600 mb-3">
                <card.icon size={20} />
              </div>
              <p className="text-xs font-medium text-slate-500">{card.title}</p>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{card.value}</h3>
              {card.detail && <p className="text-xs text-slate-400 mt-2">{card.detail}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 flex p-2 gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
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
                        { label: 'Cartão Crédito', value: 0, color: 'from-blue-500 to-indigo-600', icon: '💳' },
                        { label: 'Cartão Débito', value: 0, color: 'from-cyan-500 to-sky-600', icon: '🔵' },
                        { label: 'PIX', value: consolidation?.summary?.pix || 0, color: 'from-purple-500 to-violet-600', icon: '⚡' },
                        { label: 'TED/DOC', value: 0, color: 'from-orange-500 to-red-600', icon: '📤' },
                        { label: 'Boleto', value: 0, color: 'from-yellow-500 to-amber-600', icon: '📋' },
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
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Operador</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Saldo Abertura</th>
                          <th className="px-4 py-3 text-right">Saldo Esperado</th>
                          <th className="px-4 py-3 text-right">Saldo Real</th>
                          <th className="px-4 py-3">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredDrawers && filteredDrawers.length > 0 ? (
                          filteredDrawers.map((d) => {
                            const expected = Number(d.expected_balance || 0);
                            const actual = Number(d.closing_balance || 0);
                            const diff = actual - expected;
                            return (
                              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-semibold text-sm">
                                  {new Date(d.date_opened).toLocaleDateString('pt-BR')}
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
                                    {d.status === 'open' ? 'Aberto' : d.status === 'closed_full' ? 'Fechado OK' : 'Divergência'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500 text-sm">
                                  R$ {Number(d.opening_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                            <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
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
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Valor</th>
                      <th className="px-4 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTransfers && filteredTransfers.length > 0 ? (
                      filteredTransfers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 text-slate-500 text-sm">
                            {new Date(t.transfer_date || t.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                t.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : t.status === 'pending'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {t.status === 'confirmed'
                                ? 'Concluído'
                                : t.status === 'pending'
                                  ? 'Pendente'
                                  : 'Cancelado'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-slate-900 font-bold">
                            R${' '}
                            {(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button className="text-slate-400 hover:text-slate-600">
                              <MoreVertical size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                          Nenhuma transferência encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {activeTab === 'accounts' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50">
                      <th className="px-4 py-4">Conta</th>
                      <th className="px-4 py-4">Tipo</th>
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
                          <td className="px-4 py-4 text-right text-slate-900 font-bold">
                            R${' '}
                            {transfers
                              .filter((transfer) => transfer.status === 'confirmed' && transfer.to_account_id === a.id)
                              .reduce((acc, transfer) => acc + Number(transfer.amount || 0), 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-slate-500">
                          Nenhuma conta encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {activeTab === 'approvals' && (
                <div className="space-y-4">
                  {awaitingApprovals && awaitingApprovals.length > 0 ? (
                    awaitingApprovals.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
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
                          <button
                            onClick={() => setSelectedApprovalTransfer(transfer)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all whitespace-nowrap flex items-center gap-2"
                          >
                            <CheckCircle size={16} />
                            Aprovar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-green-50 rounded-lg border-2 border-green-200">
                      <CheckCircle2 size={40} className="mx-auto mb-2 text-green-600" />
                      <p className="text-slate-600 font-semibold">Nenhuma transferência aguardando aprovação</p>
                      <p className="text-sm text-slate-500">Todas as transferências foram processadas!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showTransferForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">💳 Nova Transferência</h2>
                <p className="text-sm text-slate-500 mt-1">Transferir de caixa individual para caixa geral ou conta financeira</p>
              </div>
              <button
                onClick={() => setShowTransferForm(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="p-6 space-y-6">
              {/* Origem Card */}
              <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-4">
                <label className="block text-sm font-bold text-blue-900 mb-2">📍 ORIGEM (Caixa Individual)</label>
                <select
                  className="w-full border-2 border-blue-300 rounded-lg p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-semibold"
                  value={transferData.fromDrawerId}
                  onChange={(e) => setTransferData({ ...transferData, fromDrawerId: e.target.value })}
                  required
                >
                  <option value="">➜ Selecione um caixa...</option>
                  {drawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {new Date(d.date_opened).toLocaleDateString('pt-BR')} - {d.status === 'open' ? '🔵 Aberto' : '🔴 Fechado'} | R$ {Number(d.expected_balance ?? d.closing_balance ?? d.opening_balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
                {selectedDrawer && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-blue-700">Saldo Disponível:</span>
                      <span className="text-lg font-bold text-blue-900">
                        R$ {selectedDrawerAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid 2 Colunas */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de Destino */}
                <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-4">
                  <label className="block text-sm font-bold text-orange-900 mb-2">🎯 TIPO DE DESTINO</label>
                  <select
                    className="w-full border-2 border-orange-300 rounded-lg p-3 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all font-semibold"
                    value={transferData.paymentMethod}
                    onChange={(e) => setTransferData({ ...transferData, paymentMethod: e.target.value, toAccountId: '' })}
                    required
                  >
                    <option value="DINHEIRO">💵 Dinheiro / Caixa Geral</option>
                    <option value="BANCO">🏦 Banco / Transferência</option>
                    <option value="CARTAO">💳 Processador Cartão</option>
                    <option value="PIX">⚡ PIX / TED</option>
                    <option value="CHEQUE">📄 Cheque</option>
                  </select>
                </div>

                {/* Conta Destino */}
                <div className="bg-purple-50 rounded-xl border-2 border-purple-200 p-4">
                  <label className="block text-sm font-bold text-purple-900 mb-2">🏦 CONTA DESTINO</label>
                  <select
                    className="w-full border-2 border-purple-300 rounded-lg p-3 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all font-semibold"
                    value={transferData.toAccountId}
                    onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                    required
                  >
                    <option value="">➜ Selecione...</option>
                    {destinationAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor */}
              <div className="bg-green-50 rounded-xl border-2 border-green-200 p-4">
                <label className="block text-sm font-bold text-green-900 mb-2">
                  💰 VALOR (R$)
                  {selectedDrawerAvailable > 0 && (
                    <span className="ml-2 text-xs font-normal text-green-700">
                      (Limite: R$ {selectedDrawerAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    className="flex-1 border-2 border-green-300 rounded-lg p-3 text-lg font-bold outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all"
                    placeholder="0.00"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    max={selectedDrawerAvailable || undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setTransferData({ ...transferData, amount: String(selectedDrawerAvailable) })}
                    className="px-3 py-3 bg-green-200 text-green-900 rounded-lg font-bold hover:bg-green-300 transition-all text-sm"
                    title="Usar saldo total disponível"
                  >
                    Max
                  </button>
                </div>
                {transferData.amount && (
                  <div className="mt-2 p-2 bg-white rounded border border-green-200">
                    {Number(transferData.amount) > selectedDrawerAvailable ? (
                      <p className="text-xs text-red-700 font-bold">
                        ⚠️ Valor excede o saldo disponível!
                      </p>
                    ) : (
                      <p className="text-xs text-green-700 font-bold">
                        ✓ Valor OK - Sobra: R$ {(selectedDrawerAvailable - Number(transferData.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Observação */}
              <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">📝 OBSERVAÇÃO</label>
                <textarea
                  className="w-full border-2 border-slate-300 rounded-lg p-3 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 transition-all min-h-[80px] font-mono text-xs"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder="Ex: Conferência OK, Lote 2025-01-17, NSU: 123456, Gestor: João Silva"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferForm(false)}
                  className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  ✕ Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!transferData.fromDrawerId || !transferData.toAccountId || !transferData.amount || Number(transferData.amount) > selectedDrawerAvailable}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓ Confirmar Transferência
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
