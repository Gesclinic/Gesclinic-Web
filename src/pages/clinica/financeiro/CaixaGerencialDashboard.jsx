import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Percent,
  RefreshCw,
  Download,
  Calendar,
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  X,
  FileText,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function CaixaGerencialDashboard() {
  const { clinicId } = useClinicContext();
  const [summary, setSummary] = useState({
    receita: 0,
    despesas: 0,
    resultado: 0,
    receitaParticular: 0,
    receitaConvenio: 0,
    repasse: 0,
  });
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumo');
  const [dateRange, setDateRange] = useState('mes');
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

  useEffect(() => {
    if (clinicId) {
      loadData();
    }
  }, [clinicId, dateRange, filters]);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`caixa-gerencial-filters-${clinicId}`);
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  }, [clinicId]);

  const getDaysRange = () => {
    switch (dateRange) {
    case 'semana':
      return 7;
    case 'mes':
      return 30;
    case 'trimestre':
      return 90;
    default:
      return 30;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('cash_movements').select('*').eq('clinic_id', clinicId);

      // Se não há filtro de data customizado, usar dateRange
      if (!filters.startDate && !filters.endDate) {
        const days = getDaysRange();
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', startDate);
      } else {
        // Se há filtro customizado
        if (filters.startDate) {
          const start = new Date(filters.startDate).toISOString();
          query = query.gte('created_at', start);
        }
        if (filters.endDate) {
          const end = new Date(
            new Date(filters.endDate).getTime() + 24 * 60 * 60 * 1000,
          ).toISOString();
          query = query.lt('created_at', end);
        }
      }

      // Aplicar outros filtros
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.origin) {
        query = query.eq('origin', filters.origin);
      }
      if (filters.professionalId) {
        query = query.eq('professional_id', filters.professionalId);
      }
      if (filters.payerId) {
        query = query.eq('payer_id', filters.payerId);
      }
      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        setMovements(data);

        const receita = data
          .filter((m) => m.type === 'entrada')
          .reduce((acc, m) => acc + (m.amount || 0), 0);

        const despesas = data
          .filter((m) => m.type === 'saida')
          .reduce((acc, m) => acc + (m.amount || 0), 0);

        setSummary({
          receita,
          despesas,
          resultado: receita - despesas,
          receitaParticular: receita * 0.6,
          receitaConvenio: receita * 0.4,
          repasse: receita * 0.3,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pt-BR');

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
    setDateRange('mes');
  };

  // Extrair opções únicas dos movimentos para filtros
  const uniqueProfessionals = [...new Set(movements.map((m) => m.professional_id).filter(Boolean))];
  const uniquePayers = [...new Set(movements.map((m) => m.payer_id).filter(Boolean))];
  const uniquePaymentMethods = [...new Set(movements.map((m) => m.payment_method).filter(Boolean))];

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
    localStorage.setItem(`caixa-gerencial-filters-${clinicId}`, JSON.stringify(updated));

    setFilterName('');
    setShowSaveModal(false);
  };

  const loadSavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
  };

  const deleteSavedFilter = (id) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(`caixa-gerencial-filters-${clinicId}`, JSON.stringify(updated));
  };

  // Funções de Exportação
  const exportToExcel = () => {
    const data = [
      ['RELATÓRIO CAIXA GERENCIAL', '', '', '', '', '', '', '', ''],
      ['Data Geração', new Date().toLocaleDateString('pt-BR'), '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['RESUMO', '', '', '', '', '', '', '', ''],
      ['Receita Total', formatCurrency(summary.receita), '', '', '', '', '', '', ''],
      ['Despesas', formatCurrency(summary.despesas), '', '', '', '', '', '', ''],
      ['Resultado', formatCurrency(summary.resultado), '', '', '', '', '', '', ''],
      ['Receita Particular', formatCurrency(summary.receitaParticular), '', '', '', '', '', '', ''],
      ['Receita Convênio', formatCurrency(summary.receitaConvenio), '', '', '', '', '', '', ''],
      ['Repasse', formatCurrency(summary.repasse), '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', ''],
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
      ...movements.map((m) => [
        m.created_at
          ? new Date(m.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })
          : 'N/A',
        m.payer_id || 'N/A',
        m.description || 'N/A',
        m.origin || 'Particular',
        m.type === 'entrada' ? 'RECEITA' : 'DESPESA',
        m.professional_id || 'N/A',
        m.payment_method || 'N/A',
        m.amount || 0,
        m.status || 'Finalizado',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Caixa Gerencial');
    XLSX.writeFile(wb, `Caixa_Gerencial_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('RELATÓRIO CAIXA GERENCIAL', 14, 15);

    doc.setFontSize(10);
    doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 25);

    // Se��o de Resumo
    doc.setFontSize(12);
    doc.text('RESUMO FINANCEIRO', 14, 40);
    doc.setFontSize(10);
    doc.text(`Receita Total: ${formatCurrency(summary.receita)}`, 14, 50);
    doc.text(`Despesas: ${formatCurrency(summary.despesas)}`, 14, 57);
    doc.text(`Resultado: ${formatCurrency(summary.resultado)}`, 14, 64);
    doc.text(`Receita Particular: ${formatCurrency(summary.receitaParticular)}`, 14, 71);
    doc.text(`Receita Convênio: ${formatCurrency(summary.receitaConvenio)}`, 14, 78);
    doc.text(`Repasse: ${formatCurrency(summary.repasse)}`, 14, 85);

    // Tabela de Movimentos
    if (movements.length > 0) {
      const tableData = movements.map((m) => [
        m.created_at
          ? new Date(m.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })
          : 'N/A',
        m.payer_id || 'N/A',
        m.description || 'N/A',
        m.origin || 'Particular',
        m.type === 'entrada' ? 'RECEITA' : 'DESPESA',
        m.professional_id || 'N/A',
        m.payment_method || 'N/A',
        formatCurrency(m.amount),
        m.status || 'Finalizado',
      ]);

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
        startY: 95,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 133, 244], textColor: [255, 255, 255] },
      });
    }

    doc.save(`Caixa_Gerencial_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const Card = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
      <div className={`h-1 bg-gradient-to-r ${color} rounded-t-lg -m-6 mb-4`} />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(value)}</h3>
        </div>
        <Icon className="w-8 h-8 text-slate-200 flex-shrink-0" />
      </div>
    </div>
  );

  const tabs = [
    { id: 'resumo', label: '📊 Resumo' },
    { id: 'movimentos', label: '📝 Movimentos' },
    { id: 'profissionais', label: '👨‍⚕️ Profissionais' },
    { id: 'convenios', label: '🏥 Convênios' },
  ];

  const professionals = [
    ...new Set(
      movements
        .filter((m) => m.professional_id)
        .map((m) => ({ id: m.professional_id, name: m.professional_id })),
    ),
  ].slice(0, 5);

  const payers = [
    ...new Set(
      movements.filter((m) => m.payer_id).map((m) => ({ id: m.payer_id, name: m.payer_id })),
    ),
  ].slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Caixa Gerencial</h1>
            <p className="text-slate-600 mt-2">
              Dashboard com análise consolidada de movimentos e fluxo de caixa
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="semana">Última Semana</option>
              <option value="mes">Último Mês</option>
              <option value="trimestre">Último Trimestre</option>
            </select>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 mb-8">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors mb-4 w-full md:w-auto"
          >
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>

          {showFilters && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo</label>
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
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Origem</label>
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
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Forma Pagto
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
                    className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

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
                        const filter = savedFilters.find((f) => f.id.toString() === e.target.value);
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
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card
            title="Receita Total"
            value={summary.receita}
            icon={TrendingUp}
            color="from-green-500 to-emerald-600"
          />
          <Card
            title="Despesas"
            value={summary.despesas}
            icon={TrendingDown}
            color="from-red-500 to-rose-600"
          />
          <Card
            title="Resultado Líquido"
            value={summary.resultado}
            icon={DollarSign}
            color={
              summary.resultado >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-red-600'
            }
          />
          <Card
            title="Receita Particular"
            value={summary.receitaParticular}
            icon={Users}
            color="from-violet-500 to-purple-600"
          />
          <Card
            title="Receita Convênios"
            value={summary.receitaConvenio}
            icon={Building2}
            color="from-cyan-500 to-blue-600"
          />
          <Card
            title="Repasse Profissional"
            value={summary.repasse}
            icon={Percent}
            color="from-amber-500 to-orange-600"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 flex flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-blue-600'
                    : 'text-slate-600 border-b-transparent hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Resumo Tab */}
                {activeTab === 'resumo' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">Margem de Lucro</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        {summary.receita > 0
                          ? ((summary.resultado / summary.receita) * 100).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">Total de Movimentos</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">{movements.length}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">Ticket Médio</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        {formatCurrency(
                          movements.length > 0 ? summary.receita / movements.length : 0,
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Movimentos Tab */}
                {activeTab === 'movimentos' && (
                  <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
                    {movements.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">Nenhum movimento encontrado</p>
                    ) : (
                      <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 z-20 bg-slate-50">
                          <tr className="border-b border-slate-200">
                            <th
                              className="px-2 py-3 text-left font-semibold text-slate-700 sticky bg-slate-50 z-30 border-r border-slate-200"
                              style={{ left: '0px' }}
                            >
                              ⏰ Hora
                            </th>
                            <th
                              className="px-2 py-3 text-left font-semibold text-slate-700 sticky bg-slate-50 z-30 border-r border-slate-200"
                              style={{ left: '80px' }}
                            >
                              👤 Paciente
                            </th>
                            <th className="px-2 py-3 text-left font-semibold text-slate-700">
                              🔧 Serviço
                            </th>
                            <th className="px-2 py-3 text-left font-semibold text-slate-700">
                              🏥 Convênio
                            </th>
                            <th className="px-2 py-3 text-left font-semibold text-slate-700">
                              📌 Tipo
                            </th>
                            <th className="px-2 py-3 text-left font-semibold text-slate-700">
                              🩺 Profissional
                            </th>
                            <th className="px-2 py-3 text-left font-semibold text-slate-700">
                              💳 Forma Pgto
                            </th>
                            <th className="px-2 py-3 text-right font-semibold text-slate-700">
                              💰 Valor
                            </th>
                            <th className="px-2 py-3 text-left font-semibold text-slate-700">
                              ✓ Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {movements.slice(0, 50).map((mov) => (
                            <tr key={mov.id} className="hover:bg-slate-50">
                              <td
                                className="px-2 py-3 text-slate-600 sticky bg-white z-10 border-r border-slate-100"
                                style={{ left: '0px' }}
                              >
                                {new Date(mov.created_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td
                                className="px-2 py-3 text-slate-700 sticky bg-white z-10 border-r border-slate-100"
                                style={{ left: '80px' }}
                              >
                                {mov.patient_name || mov.patient_id || '-'}
                              </td>
                              <td className="px-2 py-3 text-slate-700">
                                {mov.service_name || mov.service_id || '-'}
                              </td>
                              <td className="px-2 py-3 text-slate-700">
                                {mov.payer_name || mov.payer_id || 'Particular'}
                              </td>
                              <td className="px-2 py-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                    mov.type === 'entrada'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {mov.type === 'entrada' ? 'Entrada' : 'Saida'}
                                </span>
                              </td>
                              <td className="px-2 py-3 text-slate-700">
                                {mov.professional_name || mov.professional_id || '-'}
                              </td>
                              <td className="px-2 py-3 text-slate-700">
                                {mov.payment_method || mov.payment_type || '-'}
                              </td>
                              <td className="px-2 py-3 text-right font-bold text-slate-900">
                                {formatCurrency(mov.amount || 0)}
                              </td>
                              <td className="px-2 py-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                    mov.status === 'paid' || mov.status === 'concluído'
                                      ? 'bg-green-100 text-green-700'
                                      : mov.status === 'pending' || mov.status === 'pendente'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {mov.status || 'Concluído'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Profissionais Tab */}
                {activeTab === 'profissionais' && (
                  <div>
                    {professionals.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">
                        Nenhum profissional encontrado
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {professionals.map((prof, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                                {idx + 1}
                              </div>
                              <h3 className="font-medium text-slate-900">{prof.name}</h3>
                            </div>
                            <p className="text-xs text-slate-600">
                              Movimentos:{' '}
                              {movements.filter((m) => m.professional_id === prof.id).length}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Convênios Tab */}
                {activeTab === 'convenios' && (
                  <div>
                    {payers.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">Nenhum convênio encontrado</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {payers.map((payer, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                                {idx + 1}
                              </div>
                              <h3 className="font-medium text-slate-900">{payer.name}</h3>
                            </div>
                            <p className="text-xs text-slate-600">
                              Movimentos: {movements.filter((m) => m.payer_id === payer.id).length}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
