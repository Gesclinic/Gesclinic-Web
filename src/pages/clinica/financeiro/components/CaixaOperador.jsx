import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  FileSpreadsheet,
  Printer,
  AlertTriangle,
  AlertCircle,
  Wallet,
  ShieldCheck,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import cashDrawerApi from '@/lib/cashDrawerApi';
import cashConsolidationApi from '@/lib/cashConsolidationApi';
import cashDrawerAdjustmentRequestsApi from '@/lib/cashDrawerAdjustmentRequestsApi';
import { formatSupabaseUtcDateTime } from '@/lib/dateTimeUtils';
import { CashTable } from './CashTable';
import { CashModal } from './CashModal';
import { EditCashMovementModal } from './EditCashMovementModal';
import { ToastContainer } from './ToastContainer';
import { useCashMovements } from '../hooks/useCashMovements';
import { useCashFormData } from '../hooks/useCashFormData';
import { toastService } from '../hooks/useToastManager';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { addClinicHeaderToPDF } from '@/lib/reportHeaderUtils';

import { FiltersPanel } from './FiltersPanel';
import { ImportExportPanel } from './ImportExportPanel';

const padDatePart = (value) => String(value).padStart(2, '0');

const formatDateToIsoLocal = (date) => {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

const getDatePartsFromIso = (value) => {
  const [year, month, day] = value.split('-');
  return {
    day: day || '',
    month: month || '',
    year: year || '',
  };
};

const formatIsoToDateText = (value) => {
  const { day, month, year } = getDatePartsFromIso(value);
  return day && month && year ? `${day}/${month}/${year}` : '';
};

const parseDrawerDateInputToIso = (value) => {
  const text = value.trim();
  let dayText;
  let monthText;
  let yearText;

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
    [dayText, monthText, yearText] = text.split('/');
  } else {
    if (text.includes('/')) {
      return null;
    }

    const digits = text.replace(/\D/g, '');

    if (digits.length !== 8) {
      return null;
    }

    dayText = digits.slice(0, 2);
    monthText = digits.slice(2, 4);
    yearText = digits.slice(4, 8);
  }

  if (!dayText || !monthText || yearText.length !== 4) {
    return null;
  }

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return formatDateToIsoLocal(date);
};

const DATE_DIGIT_POSITIONS = [0, 1, 3, 4, 6, 7, 8, 9];

const getEditableDatePosition = (position) => {
  return DATE_DIGIT_POSITIONS.find((digitPosition) => digitPosition >= position) ?? null;
};

const getNextEditableDatePosition = (position) => {
  return DATE_DIGIT_POSITIONS.find((digitPosition) => digitPosition > position) ?? 10;
};

const CaixaIndividualOperador = () => {
  const { user } = useAuth();
  const { clinicId, clinic } = useClinicContext();
  const todayIso = formatDateToIsoLocal(new Date());
  const initialDrawerDate = new URLSearchParams(window.location.search).get('cashDate') || todayIso;

  const [drawer, setDrawer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [paymentMethodSummary, setPaymentMethodSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [operatorName, setOperatorName] = useState('');
  const [activeTab, setActiveTab] = useState('movimentos');
  const [showCashModal, setShowCashModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showAdjustmentRequestModal, setShowAdjustmentRequestModal] = useState(false);
  const [movementToEdit, setMovementToEdit] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState([]);
  const [closingAmount, setClosingAmount] = useState('');
  const [openingAmount, setOpeningAmount] = useState('0');
  const [adjustmentRequestType, setAdjustmentRequestType] = useState('reopen');
  const [adjustmentRequestReason, setAdjustmentRequestReason] = useState('');
  const [pendingAdjustmentRequest, setPendingAdjustmentRequest] = useState(null);
  const [selectedDrawerDate, setSelectedDrawerDate] = useState(initialDrawerDate);
  const [drawerDateText, setDrawerDateText] = useState(formatIsoToDateText(initialDrawerDate));
  const [drawerDateError, setDrawerDateError] = useState('');
  const drawerDateInputRef = useRef(null);
  const loadDrawerRequestRef = useRef(0);

  // Estados dos filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    origin: '',
    professionalId: '',
    payerId: '',
    paymentMethod: '',
    expenseSearch: '',
  });

  const {
    movements,
    loading: movementsLoading,
    fetchMovements,
    fetchMovementsForDrawerIds,
    addMovement,
    updateMovement,
    deleteMovement,
  } = useCashMovements(drawer?.id || '', clinicId || '');
  const {
    patients,
    professionals,
    services,
    payers,
    fetchAllData: fetchFormData,
  } = useCashFormData(clinicId || '');

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Buscar nome do usuário da tabela users
    const fetchOperatorName = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        if (!error && data?.name) {
          setOperatorName(data.name);
        }
      } catch (err) {
        console.error('Erro ao buscar nome do operador:', err);
      }
    };

    fetchOperatorName();
  }, [user?.id]);

  useEffect(() => {
    loadDrawer();
  }, [clinicId, user?.id, selectedDrawerDate]);

  useEffect(() => {
    setDrawerDateText(formatIsoToDateText(selectedDrawerDate));
    setDrawerDateError('');
  }, [selectedDrawerDate]);

  useEffect(() => {
    if (!clinicId) {
      return;
    }

    fetchFormData();
  }, [clinicId, fetchFormData]);

  useEffect(() => {
    const loadMovementsForActiveFilter = async () => {
      if (!clinicId || !user?.id) {
        return;
      }

      if (!filters.startDate && !filters.endDate) {
        if (drawer?.id) {
          await fetchMovements();
        }
        return;
      }

      try {
        const start = parseFilterDate(filters.startDate);
        const end = parseFilterDate(filters.endDate, true);
        let drawerQuery = supabase
          .from('cash_drawers')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('operator_id', user.id);

        if (start) {
          drawerQuery = drawerQuery.gte('date_opened', formatDateToIsoLocal(start));
        }
        if (end) {
          drawerQuery = drawerQuery.lte('date_opened', formatDateToIsoLocal(end));
        }

        const { data, error } = await drawerQuery;
        if (error) {
          throw error;
        }

        await fetchMovementsForDrawerIds((data || []).map((periodDrawer) => periodDrawer.id));
      } catch (err) {
        console.error('Erro ao carregar movimentos do período:', err);
        toastService.error('Erro', 'Não foi possível carregar os movimentos do período filtrado.');
      }
    };

    loadMovementsForActiveFilter();
  }, [clinicId, user?.id, drawer?.id, filters.startDate, filters.endDate, fetchMovements, fetchMovementsForDrawerIds]);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`caixa-operador-filters-${clinicId}`);
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, [clinicId]);

  const loadDrawer = async () => {
    if (!clinicId || !user?.id) {
      return;
    }
    const requestId = loadDrawerRequestRef.current + 1;
    loadDrawerRequestRef.current = requestId;
    setLoading(true);
    setDrawer(null);
    setSummary({
      totalEntrada: 0,
      totalSaida: 0,
      balance: 0,
    });
    setPaymentMethodSummary([]);
    setPendingAdjustmentRequest(null);
    try {
      const d = await cashDrawerApi.getDrawerForDate(clinicId, user.id, selectedDrawerDate);

      if (loadDrawerRequestRef.current !== requestId) {
        return;
      }

      if (!d) {
        return;
      }

      setDrawer(d);

      const pendingRequest = await cashDrawerAdjustmentRequestsApi.getPendingForDrawer({
        clinicId,
        drawerId: d.id,
      });
      if (loadDrawerRequestRef.current !== requestId) {
        return;
      }
      setPendingAdjustmentRequest(pendingRequest);

      const summ = await cashDrawerApi.getMovementSummary(d.id);
      if (loadDrawerRequestRef.current !== requestId) {
        return;
      }
      setSummary(summ);

      // Carrega resumo por forma de pagamento
      const paymentMethodData = await cashConsolidationApi.getPaymentMethodSummary(d.id);
      if (loadDrawerRequestRef.current !== requestId) {
        return;
      }
      setPaymentMethodSummary(paymentMethodData);

    } catch (err) {
      console.error('Erro ao carregar caixa:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovement = async (formData) => {
    if (!drawer?.id || drawer?.status !== 'open' || !clinicId || !user?.id) {
      toastService.error('Erro', 'Dados incompletos para registrar movimento');
      return;
    }

    try {
      const payload = {
        ...formData,
        drawer_id: drawer.id,
        clinic_id: clinicId,
        created_by: user.id,
      };

      await addMovement(payload);

      // Reload drawer summary
      const summ = await cashDrawerApi.getMovementSummary(drawer.id);
      setSummary(summ);

      setShowCashModal(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao adicionar movimento';
      console.error('Erro ao adicionar movimento:', err);
      toastService.error('Erro ao registrar', errorMsg);
    }
  };

  const handleDeleteMovement = async (movementId) => {
    if (!window.confirm('Tem certeza que deseja deletar este movimento?')) {
      return;
    }

    try {
      await deleteMovement(movementId);

      // Reload drawer summary
      if (drawer?.id) {
        const summ = await cashDrawerApi.getMovementSummary(drawer.id);
        setSummary(summ);
      }
    } catch (err) {
      console.error('Erro ao deletar movimento:', err);
    }
  };

  const handleEditMovement = async (movementId, formData) => {
    if (!drawer?.id || drawer?.status !== 'open' || !clinicId || !user?.id) {
      toastService.error('Caixa fechado', 'O caixa precisa estar aberto para editar lançamentos.');
      return;
    }

    try {
      await updateMovement(movementId, {
        ...formData,
        drawer_id: drawer.id,
        clinic_id: clinicId,
        updated_by: user.id,
      });

      const [summ, paymentMethodData] = await Promise.all([
        cashDrawerApi.getMovementSummary(drawer.id),
        cashConsolidationApi.getPaymentMethodSummary(drawer.id),
      ]);
      setSummary(summ);
      setPaymentMethodSummary(paymentMethodData);
      await fetchMovements();
      setMovementToEdit(null);
      toastService.success('Lançamento editado', 'O movimento e os lançamentos financeiros foram atualizados.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao editar lançamento';
      toastService.error('Erro', message);
      throw new Error(message);
    }
  };

  const handleCloseDrawer = async () => {
    if (!summary || !closingAmount) {
      return;
    }

    const expected = Number(summary.balance);
    const actual = Number(closingAmount);
    const difference = actual - expected;

    if (Math.abs(difference) > 0.01) {
      const confirmed = window.confirm(
        `⚠️ ATENÇÃO: Divergência detectada!\n\nEsperado: R$ ${expected.toFixed(2)}\nInformado: R$ ${actual.toFixed(2)}\nDiferença: R$ ${difference.toFixed(2)}\n\nDeseja continuar mesmo assim?`,
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      await cashDrawerApi.closeDrawer(drawer.id, closingAmount, summary.balance, '');
      toastService.success('Sucesso', 'Caixa fechado com sucesso!');
      setShowCloseModal(false);
      setClosingAmount('');
      await loadDrawer();
    } catch (err) {
      toastService.error('Erro', err.message || 'Erro ao fechar caixa');
    }
  };

  const handleOpenDrawer = async () => {
    if (!clinicId || !user?.id) {
      toastService.error('Erro', 'Não foi possível identificar clínica/operador para abrir o caixa.');
      return;
    }

    try {
      await cashDrawerApi.openDrawer(clinicId, user.id, selectedDrawerDate, Number(openingAmount || 0));
      toastService.success('Sucesso', 'Caixa aberto com sucesso!');
      setShowOpenModal(false);
      setOpeningAmount('0');
      await loadDrawer();
    } catch (err) {
      toastService.error('Erro', err.message || 'Erro ao abrir caixa');
    }
  };

  const handleRequestDrawerAdjustment = async () => {
    if (!drawer?.id || !clinicId || !user?.id) {
      toastService.error('Erro', 'Não foi possível identificar o caixa para solicitar liberação.');
      return;
    }

    const reason = adjustmentRequestReason.trim();
    if (!reason) {
      toastService.error('Informe o motivo', 'Descreva o motivo da reabertura ou reajuste do caixa.');
      return;
    }

    try {
      await cashDrawerAdjustmentRequestsApi.createRequest({
        clinicId,
        drawerId: drawer.id,
        requestType: adjustmentRequestType,
        reason,
        requestedBy: user.id,
      });
      toastService.success('Solicitação enviada', 'A liberação ficará pendente no Caixa Gerencial.');
      setShowAdjustmentRequestModal(false);
      setAdjustmentRequestReason('');
      setAdjustmentRequestType('reopen');
      await loadDrawer();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar solicitação';
      toastService.error('Erro', message);
    }
  };

  const handleCancelDrawerAdjustmentRequest = async () => {
    if (!pendingAdjustmentRequest?.id || !user?.id) {
      return;
    }

    const confirmed = window.confirm('Cancelar a solicitação de reabertura/reajuste pendente?');
    if (!confirmed) {
      return;
    }

    try {
      await cashDrawerAdjustmentRequestsApi.cancelRequest(pendingAdjustmentRequest.id, {
        requestedBy: user.id,
      });
      toastService.success('Solicitação cancelada', 'O pedido foi removido das aprovações pendentes.');
      setPendingAdjustmentRequest(null);
      await loadDrawer();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar solicitação';
      toastService.error('Erro', message);
    }
  };

  const handleImportMovements = async (importedData) => {
    if (!drawer?.id || drawer?.status !== 'open' || !clinicId || !user?.id) {
      toastService.error('Erro', 'Caixa deve estar aberto para importar movimentos');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const row of importedData) {
        try {
          // Validar dados obrigatórios
          if (!row['Valor'] || !row['Forma de Pagamento'] || !row['Tipo (entrada/saida)']) {
            errorCount++;
            continue;
          }

          const payload = {
            drawer_id: drawer.id,
            clinic_id: clinicId,
            created_by: user.id,
            amount: Number(row['Valor']),
            payment_method: row['Forma de Pagamento'],
            type: row['Tipo (entrada/saida)'].toLowerCase(),
            description: row['Descrição'] || '',
            patient_id: row['Patient ID (opcional)'] || null,
            professional_id: row['Professional ID (opcional)'] || null,
          };

          await addMovement(payload);
          successCount++;
        } catch (err) {
          console.error('Erro ao importar linha:', err);
          errorCount++;
        }
      }

      // Recarregar resumo
      if (drawer?.id) {
        const summ = await cashDrawerApi.getMovementSummary(drawer.id);
        setSummary(summ);
        const paymentMethodData = await cashConsolidationApi.getPaymentMethodSummary(drawer.id);
        setPaymentMethodSummary(paymentMethodData);
        await fetchMovements();
      }

      if (successCount > 0) {
        toastService.success('Sucesso', `${successCount} movimento(s) importado(s) com sucesso!`);
      }
      if (errorCount > 0) {
        toastService.error('Atenção', `${errorCount} linha(s) não foram importadas. Verifique os dados.`);
      }
    } catch (err) {
      toastService.error('Erro', 'Erro ao processar importação');
      console.error('Erro na importação:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: '',
      origin: '',
      professionalId: '',
      payerId: '',
      paymentMethod: '',
      expenseSearch: '',
    });
  };

  const saveFilterWithName = (nameArg, filtersArg = filters) => {
    const effectiveName = (nameArg || filterName || '').trim();
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
    localStorage.setItem(`caixa-operador-filters-${clinicId}`, JSON.stringify(updated));

    setFilterName('');
    setShowSaveModal(false);
  };

  const loadSavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
  };

  const deleteSavedFilter = (id) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(`caixa-operador-filters-${clinicId}`, JSON.stringify(updated));
  };

  // Funções de Exportação
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDrawerDateLabel = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
      return 'Data inválida';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const shiftDrawerDate = (days) => {
    const [year, month, day] = selectedDrawerDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
      setSelectedDrawerDate(todayIso);
      return;
    }

    date.setDate(date.getDate() + days);
    setSelectedDrawerDate(formatDateToIsoLocal(date));
  };

  const handleDrawerDateTextChange = (event) => {
    setDrawerDateText(event.target.value.replace(/[^\d/]/g, '').slice(0, 10));
    setDrawerDateError('');
  };

  const applyDrawerDateText = () => {
    const nextIso = parseDrawerDateInputToIso(drawerDateText);

    if (nextIso) {
      setDrawerDateText(formatIsoToDateText(nextIso));
      setSelectedDrawerDate(nextIso);
      setDrawerDateError('');
      return;
    }

    setDrawerDateError('Digite uma data válida: dia 01-31, mês 01-12 e ano com 4 dígitos.');
  };

  const handleDrawerDateTextKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyDrawerDateText();
      return;
    }

    if (
      /^\d$/.test(event.key) &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(drawerDateText)
    ) {
      const input = event.currentTarget;
      const selectionStart = input.selectionStart ?? 0;
      const selectionEnd = input.selectionEnd ?? selectionStart;

      if (selectionStart !== selectionEnd) {
        return;
      }

      const editPosition = getEditableDatePosition(selectionStart);

      if (editPosition === null) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      const nextText = `${drawerDateText.slice(0, editPosition)}${event.key}${drawerDateText.slice(editPosition + 1)}`;
      const nextCaretPosition = getNextEditableDatePosition(editPosition);

      setDrawerDateText(nextText);
      setDrawerDateError('');

      window.requestAnimationFrame(() => {
        drawerDateInputRef.current?.setSelectionRange(nextCaretPosition, nextCaretPosition);
      });
    }
  };

  const exportToExcel = () => {
    const data = [
      ['RELATÓRIO CAIXA INDIVIDUAL', '', '', '', '', '', '', '', ''],
      ['Data Geração', new Date().toLocaleDateString('pt-BR'), '', '', '', '', '', '', ''],
      ['Operador', operatorName || 'N/A', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['RESUMO', '', '', '', '', '', '', '', ''],
      ['Saldo Aberto', formatCurrency(drawer?.opening_balance), '', '', '', '', '', '', ''],
      ['Saldo Atual', formatCurrency(summary?.balance), '', '', '', '', '', '', ''],
      ['Total Entrada', formatCurrency(summary?.totalEntrada), '', '', '', '', '', '', ''],
      ['Total Saida', formatCurrency(summary?.totalSaida), '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['MOVIMENTOS FILTRADOS', '', '', '', '', '', '', '', ''],
      [
        'HORA',
        'PACIENTE',
        'SERVICO',
        'CONVENIO',
        'TIPO',
        'PROFISSIONAL',
        'FORMA PGTO',
        'VALOR',
        'STATUS',
      ],
      ...filteredMovements.map((m) => [
        m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        m.patient?.name || 'Particular',
        m.service?.name || 'N/A',
        m.payer_type === 'convenio' && m.payer ? m.payer.name : 'Particular',
        m.type === 'entrada' ? 'Receita' : 'Despesa',
        m.professional?.name || 'N/A',
        m.payment_method || 'N/A',
        formatCurrency(m.amount),
        m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : 'N/A',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Caixa Individual');
    XLSX.writeFile(wb, `Caixa_Individual_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToCSV = () => {
    const lines = [
      'Hora;Paciente;Servico;Convenio;Tipo;Profissional;Forma_Pagamento;Valor;Status',
      ...filteredMovements.map((m) => [
        m.created_at
          ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : 'N/A',
        m.patient?.name || 'Particular',
        m.service?.name || 'N/A',
        m.payer_type === 'convenio' && m.payer ? m.payer.name : 'Particular',
        m.type === 'entrada' ? 'Receita' : 'Despesa',
        m.professional?.name || 'N/A',
        m.payment_method || 'N/A',
        Number(m.amount || 0).toFixed(2),
        m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : 'N/A',
      ].join(';')),
    ];

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Caixa_Individual_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();

      // Adicionar header com logo e nome da clínica
      let startY = 30;
      if (clinic) {
        startY = await addClinicHeaderToPDF(doc, clinic);
        startY += 10;
      }

      doc.setFontSize(16);
      doc.text('RELATÓRIO CAIXA INDIVIDUAL', 14, startY);

      doc.setFontSize(10);
      doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, startY + 10);
      doc.text(`Operador: ${operatorName || 'N/A'}`, 14, startY + 17);

      // Seção de Resumo
      doc.setFontSize(12);
      doc.text('RESUMO DO DIA', 14, startY + 30);
      doc.setFontSize(10);
      doc.text(`Saldo Aberto: ${formatCurrency(drawer?.opening_balance)}`, 14, startY + 40);
      doc.text(`Saldo Atual: ${formatCurrency(summary?.balance)}`, 14, startY + 47);
      doc.text(`Total de Entradas: ${formatCurrency(summary?.totalEntrada)}`, 14, startY + 54);
      doc.text(`Total de Saídas: ${formatCurrency(summary?.totalSaida)}`, 14, startY + 61);

      // Tabela de Movimentos Filtrados
      if (filteredMovements.length > 0) {
        const tableData = filteredMovements.map((m) => [
          m.created_at
            ? new Date(m.created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'N/A',
          m.patient?.name || 'Particular',
          m.service?.name || 'N/A',
          m.payer_type === 'convenio' && m.payer ? m.payer.name : 'Particular',
          m.type === 'entrada' ? 'Entrada' : 'Saida',
          m.professional?.name || 'N/A',
          m.payment_method || 'N/A',
          formatCurrency(m.amount),
          m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : 'N/A',
        ]);

        doc.setFontSize(11);
        doc.text('MOVIMENTOS FILTRADOS', 14, startY + 70);

        autoTable(doc, {
          head: [
            [
              'HORA',
              'PACIENTE',
              'SERVICO',
              'CONVENIO',
              'TIPO',
              'PROFISSIONAL',
              'FORMA PGTO',
              'VALOR',
              'STATUS',
            ],
          ],
          body: tableData,
          startY: startY + 77,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 133, 244], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            7: { halign: 'right' },
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text('Nenhum movimento registrado com os filtros selecionados.', 14, startY + 75);
      }

      doc.save(`Caixa_Individual_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF do caixa individual:', error);
      toastService.error('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  const handlePrint = () => {
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

  const currentDrawerMovements = drawer?.id
    ? movements.filter((mov) => mov.drawer_id === drawer.id)
    : [];
  const movementFilterSource = filters.startDate || filters.endDate
    ? movements
    : currentDrawerMovements;

  // Aplicar filtros aos movimentos do caixa selecionado ou do período solicitado
  const filteredMovements = movementFilterSource.filter((mov) => {
    if (filters.startDate) {
      const movDate = new Date(mov.created_at);
      const filterDate = parseFilterDate(filters.startDate);
      if (filterDate && movDate < filterDate) {
        return false;
      }
    }
    if (filters.endDate) {
      const movDate = new Date(mov.created_at);
      const filterDate = parseFilterDate(filters.endDate, true);
      if (filterDate && movDate > filterDate) {
        return false;
      }
    }
    if (filters.type && mov.type !== filters.type) {
      return false;
    }
    if (filters.origin && mov.origin !== filters.origin) {
      return false;
    }
    if (filters.professionalId && mov.professional_id !== filters.professionalId) {
      return false;
    }
    if (filters.payerId === '__particular__' && mov.payer_type !== 'particular') {
      return false;
    }
    if (filters.payerId && filters.payerId !== '__particular__' && mov.payer_id !== filters.payerId) {
      return false;
    }
    if (filters.paymentMethod && mov.payment_method !== filters.paymentMethod) {
      return false;
    }
    if (filters.expenseSearch) {
      const search = filters.expenseSearch.toLowerCase().trim();
      const searchableText = [
        mov.description,
        mov.reference_document,
        mov.counterparty_name,
        mov.expense_supplier_name,
        mov.expense_provider_name,
        mov.expense_service_description,
        mov.financial_category,
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

  // Extrair opções únicas dos movimentos para filtros
  const uniquePaymentMethods = [...new Set(movementFilterSource.map((m) => m.payment_method).filter(Boolean))];
  const payerFilterOptions = movementFilterSource.reduce((options, movement) => {
    if (movement.payer_type === 'particular') {
      if (!options.some((payer) => payer.id === '__particular__')) {
        options.push({ id: '__particular__', name: 'Particular' });
      }
      return options;
    }

    if (movement.payer_id && movement.payer?.name && !options.some((payer) => payer.id === movement.payer_id)) {
      options.push({ id: movement.payer_id, name: movement.payer.name });
    }

    return options;
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }
  const hasDrawer = !!drawer;
  const hasOpenDrawer = drawer?.status === 'open';
  const statusLabel = hasOpenDrawer ? 'ABERTO' : hasDrawer ? 'FECHADO' : 'NÃO ABERTO';
  const statusTone = hasOpenDrawer
    ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
    : hasDrawer
      ? 'text-slate-700 border-slate-200 bg-slate-50'
      : 'text-rose-700 border-rose-200 bg-rose-50';
  const drawerDatePreviewIso = parseDrawerDateInputToIso(drawerDateText);
  const headerSummaryCards = [
    {
      label: 'Status',
      value: statusLabel,
      helper: hasOpenDrawer ? 'Caixa em operação' : hasDrawer ? 'Caixa encerrado' : 'Abra para iniciar',
      icon: ShieldCheck,
      color: hasOpenDrawer ? 'from-emerald-500 to-emerald-600' : hasDrawer ? 'from-slate-400 to-slate-500' : 'from-rose-500 to-rose-600',
      valueClass: statusTone,
      badge: true,
    },
    {
      label: 'Saldo de Abertura',
      value: `R$ ${Number(drawer?.opening_balance || 0).toFixed(2)}`,
      helper: 'Valor inicial',
      icon: Wallet,
      color: 'from-green-500 to-green-600',
      valueClass: 'text-slate-800',
    },
    {
      label: 'Total de Entradas',
      value: `R$ ${Number(summary?.totalEntrada || 0).toFixed(2)}`,
      helper: `${currentDrawerMovements.filter((m) => m.type === 'entrada').length} transações`,
      icon: ArrowDownCircle,
      color: 'from-emerald-500 to-emerald-600',
      valueClass: 'text-emerald-700',
    },
    {
      label: 'Total de Saídas',
      value: `R$ ${Number(summary?.totalSaida || 0).toFixed(2)}`,
      helper: `${currentDrawerMovements.filter((m) => m.type === 'saida').length} transações`,
      icon: ArrowUpCircle,
      color: 'from-rose-500 to-rose-600',
      valueClass: 'text-rose-700',
    },
    {
      label: 'Saldo Atual',
      value: `R$ ${Number(summary?.balance || 0).toFixed(2)}`,
      helper: 'Atualizado em tempo real',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      valueClass: 'text-slate-800',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="w-full">
        {/* Header */}
        <div className="mb-5">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Caixa Diário / Operador</h1>
              <p className="text-sm text-slate-500 mt-1">
                Abertura e fechamento diário do caixa com rastreabilidade de movimentações.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-end gap-3 shrink-0">
              {hasOpenDrawer ? (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors sm:mt-[34px]"
                >
                  <AlertCircle size={16} />
                  Fechar Caixa
                </button>
              ) : !drawer ? (
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors sm:mt-[34px]"
                >
                  <Wallet size={16} />
                  Abrir Caixa
                </button>
              ) : (
                <div className="flex flex-col gap-2 sm:mt-[28px]">
                  <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold border border-slate-200">
                    <ShieldCheck size={16} />
                    Caixa Fechado
                  </div>
                  {pendingAdjustmentRequest ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 shadow-sm max-w-[280px]">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-blue-700" />
                        <div className="min-w-0">
                          <p className="font-bold">Solicitação aguardando liberação</p>
                          <p className="mt-0.5 text-blue-700">
                            {pendingAdjustmentRequest.request_type === 'adjustment' ? 'Reajuste de caixa' : 'Reabertura de caixa'}
                            {pendingAdjustmentRequest.requested_at ? ` enviada em ${formatSupabaseUtcDateTime(pendingAdjustmentRequest.requested_at)}` : ''}.
                          </p>
                          <button
                            type="button"
                            onClick={handleCancelDrawerAdjustmentRequest}
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 font-bold text-blue-700 hover:bg-blue-100"
                          >
                            <X size={12} />
                            Cancelar pedido
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAdjustmentRequestModal(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 hover:bg-amber-200"
                    >
                      <AlertTriangle size={14} />
                      Solicitar Reabertura/Reajuste
                    </button>
                  )}
                </div>
              )}
              <div className="w-full md:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-blue-600" />
                    <label htmlFor="drawer-date" className="text-xs font-bold text-slate-500 uppercase">
                      Data do caixa
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDrawerDate(todayIso);
                      setDrawerDateText(formatIsoToDateText(todayIso));
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                    disabled={selectedDrawerDate === todayIso}
                  >
                    Hoje
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftDrawerDate(-1)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Dia anterior"
                    title="Dia anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    id="drawer-date"
                    ref={drawerDateInputRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="11072026"
                    value={drawerDateText}
                    onChange={handleDrawerDateTextChange}
                    onKeyDown={handleDrawerDateTextKeyDown}
                    className="w-[122px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    aria-label="Data do caixa no formato dia, mês e ano"
                  />
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={applyDrawerDateText}
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftDrawerDate(1)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Próximo dia"
                    title="Próximo dia"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <p className="mt-2 text-xs font-medium text-slate-500 capitalize">
                  {drawerDatePreviewIso
                    ? formatDrawerDateLabel(drawerDatePreviewIso)
                    : 'Digite a data no formato dd/mm/aaaa'}
                </p>
                {drawerDateError && (
                  <p className="mt-1 text-xs font-semibold text-rose-600">
                    {drawerDateError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-col xl:flex-row xl:items-center gap-3">
            {!drawer && (
              <p className="flex-1 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Para organização e segurança, abra o caixa do dia antes de registrar movimentações.
              </p>
            )}
            <div className="flex flex-wrap gap-2 xl:ml-auto">
              <button
                onClick={exportToExcel}
                disabled={!drawer}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet size={15} />
                Excel
              </button>
              <button
                onClick={exportToCSV}
                disabled={!drawer}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                <FileText size={15} />
                CSV
              </button>
              <button
                onClick={exportToPDF}
                disabled={!drawer}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <FileText size={15} />
                PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                <Printer size={15} />
                Imprimir
              </button>
              <ImportExportPanel
                onImportSuccess={handleImportMovements}
                templateColumns={['Forma de Pagamento', 'Tipo (entrada/saida)', 'Valor', 'Descrição', 'Patient ID (opcional)', 'Professional ID (opcional)']}
                templateFilename="template_movimentos_caixa.xlsx"
                requiredFields={['Forma de Pagamento', 'Tipo (entrada/saida)', 'Valor']}
                title="Importar Movimentos"
              />
            </div>
          </div>
        </div>

        {/* Estado do caixa */}
        <div className="mb-5">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {headerSummaryCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow min-h-[92px]"
                  >
                    <div className={`h-1 bg-gradient-to-r ${card.color}`} />
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs font-medium text-slate-500 leading-tight">{card.label}</p>
                        <div className="p-1.5 rounded-lg bg-slate-50 text-slate-600 shrink-0">
                          <Icon size={15} />
                        </div>
                      </div>
                      {card.badge ? (
                        <div className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${card.valueClass}`}>
                          {card.value}
                        </div>
                      ) : (
                        <h3 className={`text-base font-bold leading-tight ${card.valueClass}`}>{card.value}</h3>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1 leading-tight">{card.helper}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <FiltersPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onApplyFilters={setFilters}
            onClearFilters={clearFilters}
            onSaveFilter={saveFilterWithName}
            savedFilters={savedFilters}
            onLoadFilter={loadSavedFilter}
            onDeleteFilter={deleteSavedFilter}
            paymentMethods={uniquePaymentMethods}
            professionals={professionals}
            payers={payerFilterOptions}
          />
        </div>

        {/* 🎯 Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 mb-5 overflow-hidden">
          <div className="border-b border-slate-100">
            <div className="flex p-2 gap-2">
              {['movimentos', 'resumo'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-blue-50 text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'resumo' && '📊 Resumo'}
                  {tab === 'movimentos' && `📝 Movimentos (${filteredMovements.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Resumo Tab */}
            {activeTab === 'resumo' && summary && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" /> Resumo Detalhado do Caixa
                </h3>

                {/* Breakdown Detalhado por Forma de Pagamento */}
                {paymentMethodSummary && paymentMethodSummary.length > 0 ? (
                  <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase">Detalhes Completos por Forma de Pagamento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {paymentMethodSummary.map((method) => (
                        <div
                          key={method.method}
                          className="p-4 bg-white rounded-lg border-2 border-slate-100 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-700 uppercase">{method.method}</p>
                            <div className={`w-3 h-3 rounded-full ${method.saldo >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-600">📥 Entrada:</span>
                              <span className="font-bold text-green-700">R$ {method.entrada.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">📤 Saída:</span>
                              <span className="font-bold text-red-700">R$ {method.saida.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                              <span className="font-semibold text-slate-700">Saldo:</span>
                              <span className={`font-bold ${method.saldo >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                R$ {method.saldo.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>Nenhum movimento registrado ainda</p>
                  </div>
                )}
              </div>
            )}

            {/* Movimentos Tab */}
            {activeTab === 'movimentos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-slate-600">
                    Exibindo <span className="font-semibold">{filteredMovements.length}</span> de{' '}
                    <span className="font-semibold">{movementFilterSource.length}</span> movimentos
                  </p>
                  <button
                    onClick={() => {
                      if (!hasOpenDrawer) {
                        toastService.error('Caixa fechado', 'Abra o caixa do dia para registrar movimentos.');
                        return;
                      }
                      setShowCashModal(true);
                    }}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!hasOpenDrawer}
                  >
                    <span>➕</span> Novo Movimento
                  </button>
                </div>
                <CashTable
                  movements={filteredMovements}
                  loading={movementsLoading}
                  onEdit={hasOpenDrawer ? setMovementToEdit : undefined}
                  onDelete={handleDeleteMovement}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal de Fechamento de Caixa */}
        {showCloseModal && drawer && summary && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Fechar Caixa</h2>
                <button
                  onClick={() => {
                    setShowCloseModal(false);
                    setClosingAmount('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-blue-700 font-semibold">Saldo Esperado (Sistema)</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    R$ {summary.balance.toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Saldo Real (Digite o valor que você conferiu)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border-2 border-slate-300 rounded-lg p-3 text-lg font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="0.00"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    autoFocus
                  />
                </div>

                {closingAmount && (
                  <div className="p-4 rounded-lg border-2" >
                    {Math.abs(Number(closingAmount) - summary.balance) < 0.01 ? (
                      <div className="bg-green-50 border-green-200">
                        <p className="text-sm text-green-700 font-semibold">✓ Conferência OK</p>
                        <p className="text-xs text-green-600 mt-1">Saldo bate perfeitamente com o sistema!</p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border-red-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                          <div>
                            <p className="text-sm text-red-700 font-semibold">⚠️ Divergência Detectada</p>
                            <p className="text-xs text-red-600 mt-1">
                              Diferença: R${' '}
                              {Math.abs(Number(closingAmount) - summary.balance).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setShowCloseModal(false);
                      setClosingAmount('');
                    }}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCloseDrawer}
                    disabled={!closingAmount}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Fechamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Abertura de Caixa */}
        {showOpenModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Abrir Caixa do Dia</h2>
                <button
                  onClick={() => {
                    setShowOpenModal(false);
                    setOpeningAmount('0');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-blue-700 font-semibold">Data do Caixa</p>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Saldo Inicial
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border-2 border-slate-300 rounded-lg p-3 text-lg font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="0.00"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Use o valor em caixa no início do expediente.
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setShowOpenModal(false);
                      setOpeningAmount('0');
                    }}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleOpenDrawer}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
                  >
                    Confirmar Abertura
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAdjustmentRequestModal && drawer && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Solicitar Liberação do Caixa</h2>
                <button
                  onClick={() => setShowAdjustmentRequestModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de solicitação</label>
                  <select
                    value={adjustmentRequestType}
                    onChange={(event) => setAdjustmentRequestType(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="reopen">Reabrir caixa fechado</option>
                    <option value="adjustment">Reajustar movimentos/valores</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Motivo</label>
                  <textarea
                    value={adjustmentRequestReason}
                    onChange={(event) => setAdjustmentRequestReason(event.target.value)}
                    placeholder="Ex: lançamento esquecido, valor informado incorreto, necessidade de conferir saída manual..."
                    className="min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  A solicitação será enviada para o Caixa Gerencial e só terá efeito após aprovação.
                </div>
              </div>
              <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-6">
                <button
                  onClick={() => setShowAdjustmentRequestModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestDrawerAdjustment}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-bold text-white hover:bg-amber-700"
                >
                  Enviar Solicitação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cash Modal */}
      <CashModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        onSubmit={handleAddMovement}
        onSuccess={() => {
          fetchMovements();
          if (drawer?.id) {
            cashDrawerApi.getMovementSummary(drawer.id).then(setSummary);
          }
        }}
        onError={(error) => {
          toastService.error('Erro', error);
        }}
        patients={patients}
        professionals={professionals}
        services={services}
        payers={payers}
        clinicId={clinicId || ''}
      />

      <EditCashMovementModal
        isOpen={!!movementToEdit}
        movement={movementToEdit}
        onClose={() => setMovementToEdit(null)}
        onSubmit={handleEditMovement}
      />

      {/* Modal para Salvar Filtro */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Salvar Filtro</h2>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setFilterName('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome do Filtro
                </label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Ex: Última Semana - Entradas"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && saveFilterWithName()}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setFilterName('');
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveFilterWithName}
                  disabled={!filterName.trim()}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default CaixaIndividualOperador;
