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
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import cashDrawerApi from '@/lib/cashDrawerApi';
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
  const [loading, setLoading] = useState(true);
  const [operatorName, setOperatorName] = useState('');
  const [activeTab, setActiveTab] = useState('resumo');
  const [showCashModal, setShowCashModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [savedFilters, setSavedFilters] = useState([]);

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
      const d = await cashDrawerApi.getOrCreateDrawer(clinicId, user.id);
      setDrawer(d);

      const summ = await cashDrawerApi.getMovementSummary(d.id);
      setSummary(summ);

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
    if (!drawer?.id || !clinicId || !user?.id) {
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
    if (!summary) {
      return;
    }
    const closingBalance = prompt('Saldo final do caixa:', summary.balance.toFixed(2));
    if (closingBalance === null) {
      return;
    }
    try {
      await cashDrawerApi.closeDrawer(drawer.id, closingBalance, summary.balance, '');
      await loadDrawer();
    } catch (err) {
      alert(`Erro: ${err.message}`);
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
  if (!drawer) {
    return <div className="p-6 text-center text-red-600">Erro ao carregar caixa</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">💳 Caixa Individual</h1>
            <p className="text-slate-500">
              Gerenciamento integrado de movimentações e atendimento clínico
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button
              onClick={exportToPDF}
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

        {/* ⚡ Status Card Premium */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-lg p-6 mb-8 border border-blue-500">
          <div className="grid grid-cols-4 gap-6">
            <div className="flex flex-col">
              <span className="text-blue-200 text-xs uppercase tracking-wide font-semibold mb-2">
                Saldo Aberto
              </span>
              <span className="text-lg font-bold">R$ {drawer.opening_balance.toFixed(2)}</span>
            </div>
            <div className="flex flex-col border-l border-blue-400 pl-6">
              <span className="text-blue-200 text-xs uppercase tracking-wide font-semibold mb-2">
                Saldo Atual
              </span>
              <span className="text-lg font-bold">R$ {summary?.balance.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex flex-col border-l border-blue-400 pl-6">
              <span className="text-blue-200 text-xs uppercase tracking-wide font-semibold mb-2">
                Status
              </span>
              <span
                className={`text-sm font-bold uppercase ${drawer.status === 'open' ? 'text-green-300' : 'text-yellow-300'}`}
              >
                {drawer.status === 'open' ? '🟢 ABERTO' : '🔴 FECHADO'}
              </span>
            </div>
            <div className="flex flex-col border-l border-blue-400 pl-6">
              <span className="text-blue-200 text-xs uppercase tracking-wide font-semibold mb-2">
                Operador
              </span>
              <span className="text-sm font-semibold truncate">
                {operatorName || user?.email || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* 📈 Summary Cards */}
        {summary && (
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

            {Object.entries(summary.byMethod)
              .slice(0, 3)
              .map(([method, data]) => (
                <div
                  key={method}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition"
                >
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                  <div className="p-5">
                    <p className="text-sm font-medium text-slate-500 mb-2">{method}</p>
                    <p className="text-lg font-bold text-slate-800">
                      R$ {(data.entrada - data.saida).toFixed(2)}
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
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Resumo do Dia
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 font-semibold mb-2">Total de Entradas</p>
                    <p className="text-xl font-bold text-green-800">
                      R$ {summary.totalEntrada.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      +{movements.filter((m) => m.type === 'entrada').length} transações
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 font-semibold mb-2">Total de Saídas</p>
                    <p className="text-xl font-bold text-red-800">
                      R$ {summary.totalSaida.toFixed(2)}
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      -{movements.filter((m) => m.type === 'saida').length} transações
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
                    onClick={() => setShowCashModal(true)}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
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
          {drawer.status === 'open' && (
            <button
              onClick={handleCloseDrawer}
              className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all shadow-sm"
            >
              🔴 Fechar Caixa
            </button>
          )}
        </div>
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
