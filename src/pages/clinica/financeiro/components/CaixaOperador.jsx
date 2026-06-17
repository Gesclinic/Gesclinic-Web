import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  X,
  FileText,
  FileSpreadsheet,
  Printer,
  AlertTriangle,
  AlertCircle,
  Wallet,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import cashDrawerApi from '@/lib/cashDrawerApi';
import cashConsolidationApi from '@/lib/cashConsolidationApi';
import { CashTable } from './CashTable';
import { CashModal } from './CashModal';
import { ToastContainer } from './ToastContainer';
import { useCashMovements } from '../hooks/useCashMovements';
import { useCashFormData } from '../hooks/useCashFormData';
import { useRepasseCalculation } from '../hooks/useRepasseCalculation';
import { toastService } from '../hooks/useToastManager';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const CaixaIndividualOperador = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();

  const [drawer, setDrawer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [paymentMethodSummary, setPaymentMethodSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [operatorName, setOperatorName] = useState('');
  const [activeTab, setActiveTab] = useState('resumo');
  const [showCashModal, setShowCashModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState([]);
  const [closingAmount, setClosingAmount] = useState('');
  const [openingAmount, setOpeningAmount] = useState('0');

  // Estados dos filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    origin: '',
    professionalId: '',
    payerId: '',
    paymentMethod: '',
  });

  const {
    movements,
    loading: movementsLoading,
    fetchMovements,
    addMovement,
    deleteMovement,
  } = useCashMovements(drawer?.id || '', clinicId || '');
  const {
    patients,
    professionals,
    services,
    payers,
    fetchAllData: fetchFormData,
  } = useCashFormData(clinicId || '');
  const { fetchProfessionalReprises } = useRepasseCalculation();

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
  }, [clinicId, user?.id]);

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
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const d = await cashDrawerApi.getDrawerForDate(clinicId, user.id, today);

      if (!d) {
        setDrawer(null);
        setSummary({
          totalEntrada: 0,
          totalSaida: 0,
          balance: 0,
        });
        setPaymentMethodSummary([]);
        return;
      }

      setDrawer(d);

      const summ = await cashDrawerApi.getMovementSummary(d.id);
      setSummary(summ);

      // Carrega resumo por forma de pagamento
      const paymentMethodData = await cashConsolidationApi.getPaymentMethodSummary(d.id);
      setPaymentMethodSummary(paymentMethodData);

      // Fetch from new hook
      if (d.id) {
        await fetchMovements();
        await fetchFormData();
      }
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
      console.log('Movimento registrado com sucesso');
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
      const today = new Date().toISOString().split('T')[0];
      await cashDrawerApi.openDrawer(clinicId, user.id, today, Number(openingAmount || 0));
      toastService.success('Sucesso', 'Caixa aberto com sucesso!');
      setShowOpenModal(false);
      setOpeningAmount('0');
      await loadDrawer();
    } catch (err) {
      toastService.error('Erro', err.message || 'Erro ao abrir caixa');
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
    });
  };

  const saveFilterWithName = () => {
    if (!filterName.trim()) {
      return;
    }

    const newFilter = {
      id: Date.now(),
      name: filterName,
      filters: { ...filters },
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
        m.type === 'entrada' ? 'Entrada' : 'Saida',
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('RELATÓRIO CAIXA INDIVIDUAL', 14, 15);

    doc.setFontSize(10);
    doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);
    doc.text(`Operador: ${operatorName || 'N/A'}`, 14, 32);

    // Seção de Resumo
    doc.setFontSize(12);
    doc.text('RESUMO DO DIA', 14, 45);
    doc.setFontSize(10);
    doc.text(`Saldo Aberto: ${formatCurrency(drawer?.opening_balance)}`, 14, 55);
    doc.text(`Saldo Atual: ${formatCurrency(summary?.balance)}`, 14, 62);
    doc.text(`Total de Entradas: ${formatCurrency(summary?.totalEntrada)}`, 14, 69);
    doc.text(`Total de Saídas: ${formatCurrency(summary?.totalSaida)}`, 14, 76);

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
      doc.text('MOVIMENTOS FILTRADOS', 14, 85);

      doc.autoTable({
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
        startY: 92,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 133, 244], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          7: { halign: 'right' }, // Align valor to right
        },
      });
    } else {
      doc.setFontSize(10);
      doc.text('Nenhum movimento registrado com os filtros selecionados.', 14, 90);
    }

    doc.save(`Caixa_Individual_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Aplicar filtros aos movimentos
  const filteredMovements = movements.filter((mov) => {
    if (filters.startDate) {
      const movDate = new Date(mov.created_at).toDateString();
      const filterDate = new Date(filters.startDate).toDateString();
      if (movDate < filterDate) {
        return false;
      }
    }
    if (filters.endDate) {
      const movDate = new Date(mov.created_at).toDateString();
      const filterDate = new Date(filters.endDate).toDateString();
      if (movDate > filterDate) {
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
    if (filters.payerId && mov.payer_id !== filters.payerId) {
      return false;
    }
    if (filters.paymentMethod && mov.payment_method !== filters.paymentMethod) {
      return false;
    }
    return true;
  });

  // Extrair opções únicas dos movimentos para filtros
  const uniqueProfessionals = [...new Set(movements.map((m) => m.professional_id).filter(Boolean))];
  const uniquePayers = [...new Set(movements.map((m) => m.payer_id).filter(Boolean))];
  const uniquePaymentMethods = [...new Set(movements.map((m) => m.payment_method).filter(Boolean))];

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }
  const hasOpenDrawer = drawer?.status === 'open';
  const statusLabel = hasOpenDrawer ? 'ABERTO' : 'FECHADO';
  const statusTone = hasOpenDrawer
    ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
    : 'text-rose-700 border-rose-200 bg-rose-50';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Caixa Individual / Controle Diário</h1>
            <p className="text-slate-500 mt-2">
              Abertura e fechamento diário do caixa com rastreabilidade de movimentações.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {hasOpenDrawer ? (
              <button
                onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <AlertCircle size={16} />
                Fechar Caixa do Dia
              </button>
            ) : (
              <button
                onClick={() => setShowOpenModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Wallet size={16} />
                Abrir Caixa do Dia
              </button>
            )}
            <button
              onClick={exportToExcel}
              disabled={!drawer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button
              onClick={exportToPDF}
              disabled={!drawer}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <FileText size={16} />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>

        {/* Cards de Status no estilo do Caixa Geral */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
            <div className="p-4">
              <div className="p-2 w-fit rounded-lg bg-slate-50 text-slate-600 mb-3">
                <Wallet size={20} />
              </div>
              <p className="text-xs font-medium text-slate-500">Saldo de Abertura</p>
              <h3 className="text-lg font-bold text-slate-800 mt-1">
                R$ {Number(drawer?.opening_balance || 0).toFixed(2)}
              </h3>
              <p className="text-xs text-slate-400 mt-2">Caixa do dia</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
            <div className="p-4">
              <div className="p-2 w-fit rounded-lg bg-slate-50 text-slate-600 mb-3">
                <TrendingUp size={20} />
              </div>
              <p className="text-xs font-medium text-slate-500">Saldo Atual</p>
              <h3 className="text-lg font-bold text-slate-800 mt-1">
                R$ {Number(summary?.balance || 0).toFixed(2)}
              </h3>
              <p className="text-xs text-slate-400 mt-2">Atualizado em tempo real</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className={`h-1 bg-gradient-to-r ${hasOpenDrawer ? 'from-emerald-500 to-emerald-600' : 'from-rose-500 to-rose-600'}`} />
            <div className="p-4">
              <div className="p-2 w-fit rounded-lg bg-slate-50 text-slate-600 mb-3">
                <ShieldCheck size={20} />
              </div>
              <p className="text-xs font-medium text-slate-500">Status Diário</p>
              <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border mt-2 ${statusTone}`}>
                {statusLabel}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {hasOpenDrawer ? 'Pronto para registrar movimentações' : 'Abra o caixa para iniciar o dia'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
            <div className="p-4">
              <div className="p-2 w-fit rounded-lg bg-slate-50 text-slate-600 mb-3">
                <User size={20} />
              </div>
              <p className="text-xs font-medium text-slate-500">Operador</p>
              <h3 className="text-sm font-bold text-slate-800 mt-1 truncate">
                {operatorName || user?.email || 'N/A'}
              </h3>
              <p className="text-xs text-slate-400 mt-2">Responsável pelo caixa</p>
            </div>
          </div>
        </div>

        {!drawer && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-blue-900">Caixa diário ainda não aberto</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Para organização e segurança, abra o caixa do dia antes de registrar movimentações.
                </p>
              </div>
              <button
                onClick={() => setShowOpenModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Abrir Caixa
              </button>
            </div>
          </div>
        )}

        {/* 📈 Summary Cards */}
        {drawer && summary && (
          <div className="grid grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
              <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500 mb-2">Entradas</p>
                <p className="text-lg font-bold text-slate-800">
                  R$ {summary.totalEntrada.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
              <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500 mb-2">Saídas</p>
                <p className="text-lg font-bold text-slate-800">
                  R$ {summary.totalSaida.toFixed(2)}
                </p>
              </div>
            </div>

            {paymentMethodSummary.slice(0, 3).map((method) => (
              <div
                key={method.method}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition"
              >
                <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                <div className="p-5">
                  <p className="text-sm font-medium text-slate-500 mb-2">{method.method}</p>
                  <p className="text-lg font-bold text-slate-800">
                    R$ {method.saldo.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🎯 Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
          <div className="border-b border-slate-100">
            <div className="flex p-2 gap-2">
              {['resumo', 'movimentos'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-blue-50 text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'resumo' && '📊 Resumo'}
                  {tab === 'movimentos' && `📝 Movimentos (${movements.length})`}
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

                {/* 💰 Entradas por Forma de Pagamento */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6 mb-6">
                  <h4 className="text-sm font-bold text-green-800 mb-4 uppercase flex items-center gap-2">
                    💰 Entradas por Forma de Pagamento
                  </h4>
                  {paymentMethodSummary && paymentMethodSummary.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {paymentMethodSummary.map((method) => {
                        // Cores por forma de pagamento
                        const colorMap = {
                          'DINHEIRO': 'from-green-500 to-emerald-600',
                          'DINHEIRO FÍSICO': 'from-green-500 to-emerald-600',
                          'DINHEIRO em ESPECIE': 'from-green-500 to-emerald-600',
                          'CARTÃO CRÉDITO': 'from-blue-500 to-indigo-600',
                          'CREDITO': 'from-blue-500 to-indigo-600',
                          'CARTÃO DÉBITO': 'from-cyan-500 to-sky-600',
                          'DEBITO': 'from-cyan-500 to-sky-600',
                          'PIX': 'from-purple-500 to-violet-600',
                          'BOLETO': 'from-yellow-500 to-amber-600',
                          'CHEQUE': 'from-slate-500 to-slate-600',
                          'TED': 'from-orange-500 to-red-600',
                          'TRANSFERÊNCIA': 'from-orange-500 to-red-600',
                        };
                        const bgColor = Object.entries(colorMap).find(([key]) => method.method.toUpperCase().includes(key))?.[1] || 'from-slate-500 to-slate-600';
                        
                        return (
                          <div key={method.method} className="p-4 bg-white rounded-lg border-2 border-green-100 hover:shadow-lg transition-shadow">
                            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gradient-to-r ${bgColor} text-white text-xs font-bold mb-3`}>
                              {method.method}
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-baseline">
                                <span className="text-xs text-slate-600">Entrada:</span>
                                <span className="text-lg font-bold text-green-700">R$ {Number(method.entrada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              {Number(method.saida || 0) > 0 && (
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-slate-600">Saída:</span>
                                  <span className="text-sm font-semibold text-red-700">R$ {Number(method.saida || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500">
                      <p className="text-sm">Nenhuma entrada registrada ainda</p>
                    </div>
                  )}
                </div>

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

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200">
                    <p className="text-sm text-green-700 font-bold mb-3 uppercase">Total de Entradas</p>
                    <p className="text-3xl font-bold text-green-900">
                      R$ {summary.totalEntrada.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-700 mt-3 font-semibold">
                      {movements.filter((m) => m.type === 'entrada').length} transações
                    </p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border-2 border-red-200">
                    <p className="text-sm text-red-700 font-bold mb-3 uppercase">Total de Saídas</p>
                    <p className="text-3xl font-bold text-red-900">
                      R$ {summary.totalSaida.toFixed(2)}
                    </p>
                    <p className="text-xs text-red-700 mt-3 font-semibold">
                      {movements.filter((m) => m.type === 'saida').length} transações
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Movimentos Tab */}
            {activeTab === 'movimentos' && (
              <div className="space-y-4">
                {/* Botão para Mostrar/Ocultar Filtros */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors mb-2"
                >
                  {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                </button>

                {/* Filtros Avançados */}
                {showFilters && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Data Inicial
                        </label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => handleFilterChange('startDate', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Data Final
                        </label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => handleFilterChange('endDate', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Tipo
                        </label>
                        <select
                          value={filters.type}
                          onChange={(e) => handleFilterChange('type', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Origem
                        </label>
                        <select
                          value={filters.origin}
                          onChange={(e) => handleFilterChange('origin', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          <option value="agenda">Agenda</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Profissional
                        </label>
                        <select
                          value={filters.professionalId}
                          onChange={(e) => handleFilterChange('professionalId', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          {uniqueProfessionals.map((prof) => (
                            <option key={prof} value={prof}>
                              {prof}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Convênio
                        </label>
                        <select
                          value={filters.payerId}
                          onChange={(e) => handleFilterChange('payerId', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          {uniquePayers.map((payer) => (
                            <option key={payer} value={payer}>
                              {payer}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Forma Pgto
                        </label>
                        <select
                          value={filters.paymentMethod}
                          onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          {uniquePaymentMethods.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={clearFilters}
                          className="w-full px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>

                    {/* Botões de Ação de Filtros */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <button
                        onClick={() => setShowSaveModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        <Save size={16} />
                        Salvar Filtro
                      </button>
                      {savedFilters.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            onChange={(e) => {
                              const filter = savedFilters.find(
                                (f) => f.id.toString() === e.target.value,
                              );
                              if (filter) {
                                loadSavedFilter(filter);
                              }
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Carregar filtro salvo...</option>
                            {savedFilters.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            {savedFilters.map((f) => (
                              <button
                                key={f.id}
                                onClick={() => deleteSavedFilter(f.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title={`Deletar "${f.name}"`}
                              >
                                <Trash2 size={16} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-slate-600">
                    Exibindo <span className="font-semibold">{filteredMovements.length}</span> de{' '}
                    <span className="font-semibold">{movements.length}</span> movimentos
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
                  onDelete={handleDeleteMovement}
                />
              </div>
            )}
          </div>
        </div>

        {/* 🎯 Action Buttons */}
        <div className="flex gap-3 mt-8">
          {hasOpenDrawer && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all shadow-sm"
            >
              🔴 Fechar Caixa
            </button>
          )}

          {!hasOpenDrawer && (
            <button
              onClick={() => setShowOpenModal(true)}
              className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              🔵 Abrir Caixa do Dia
            </button>
          )}
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
