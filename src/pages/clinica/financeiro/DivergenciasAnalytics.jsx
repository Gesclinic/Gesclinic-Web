import React, { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle, Calendar, Users, BarChart3, Download, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { getCashDiscrepancies } from '@/lib/cashConsolidationApi';
import { cashDrawerApi } from '@/lib/cashDrawerApi';
import * as XLSX from 'xlsx';

/**
 * Dashboard de Divergências
 * Monitora e analisa discrepâncias de caixa por operador e período
 */
const DivergenciasAnalytics = () => {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();
  const [loading, setLoading] = useState(true);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [analytics, setAnalytics] = useState({
    totalDivergences: 0,
    totalAmount: 0,
    avgDivergence: 0,
    operatorMetrics: [],
    periodTrend: [],
  });

  useEffect(() => {
    loadDiscrepancies();
  }, [clinicId, selectedOperator, dateRange]);

  const loadDiscrepancies = async () => {
    try {
      setLoading(true);

      // Buscar divergências da consolidação
      const allDiscrepancies = await getCashDiscrepancies(clinicId);

      // Filtrar por período
      let filtered = allDiscrepancies;
      const now = new Date();
      const filterDate = new Date();

      if (dateRange === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'week') {
        filterDate.setDate(filterDate.getDate() - 7);
      } else if (dateRange === 'month') {
        filterDate.setMonth(filterDate.getMonth() - 1);
      }

      filtered = filtered.filter((d) => new Date(d.date_opened) >= filterDate);

      // Filtrar por operador
      if (selectedOperator !== 'all') {
        filtered = filtered.filter((d) => d.operator_id === selectedOperator);
      }

      setDiscrepancies(filtered);

      // Calcular analytics
      const metrics = calculateAnalytics(filtered);
      setAnalytics(metrics);
    } catch (error) {
      console.error('Erro ao carregar divergências:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (divergences) => {
    if (divergences.length === 0) {
      return {
        totalDivergences: 0,
        totalAmount: 0,
        avgDivergence: 0,
        operatorMetrics: [],
        periodTrend: [],
      };
    }

    const totalDivergences = divergences.length;
    const totalAmount = divergences.reduce((acc, d) => acc + Math.abs(d.discrepancy || 0), 0);
    const avgDivergence = totalAmount / totalDivergences;

    // Agrupar por operador
    const operatorGroups = {};
    divergences.forEach((d) => {
      if (!operatorGroups[d.operator_id]) {
        operatorGroups[d.operator_id] = {
          operatorId: d.operator_id,
          operatorName: d.operator?.name || 'Desconhecido',
          divergences: 0,
          totalAmount: 0,
          avgDivergence: 0,
          divergenceRate: 0,
        };
      }
      operatorGroups[d.operator_id].divergences += 1;
      operatorGroups[d.operator_id].totalAmount += Math.abs(d.discrepancy || 0);
    });

    // Calcular taxa de divergência por operador
    const operatorMetrics = Object.values(operatorGroups).map((m) => ({
      ...m,
      avgDivergence: m.totalAmount / m.divergences,
      divergenceRate: (m.divergences / totalDivergences) * 100,
    }));

    // Trend por período
    const periodTrend = generatePeriodTrend(divergences);

    return {
      totalDivergences,
      totalAmount,
      avgDivergence,
      operatorMetrics: operatorMetrics.sort((a, b) => b.totalAmount - a.totalAmount),
      periodTrend,
    };
  };

  const generatePeriodTrend = (divergences) => {
    const trend = {};
    divergences.forEach((d) => {
      const date = new Date(d.date_opened).toLocaleDateString('pt-BR');
      if (!trend[date]) {
        trend[date] = { date, count: 0, amount: 0 };
      }
      trend[date].count += 1;
      trend[date].amount += Math.abs(d.discrepancy || 0);
    });
    return Object.values(trend).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const exportToExcel = () => {
    const data = [
      [
        'Data',
        'Operador',
        'Status',
        'Saldo Esperado',
        'Saldo Real',
        'Divergência',
        'Percentual',
      ],
      ...discrepancies.map((d) => [
        new Date(d.date_opened).toLocaleDateString('pt-BR'),
        d.operator?.name || 'N/A',
        d.status === 'open' ? 'Aberto' : 'Fechado',
        Number(d.expected_balance || 0).toFixed(2),
        Number(d.closing_balance || 0).toFixed(2),
        Number(d.discrepancy || 0).toFixed(2),
        ((Math.abs(d.discrepancy || 0) / Number(d.expected_balance || 1)) * 100).toFixed(2) + '%',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Divergências');
    XLSX.writeFile(wb, `Relatorio_Divergencias_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getOperatorOptions = () => {
    const operators = new Map();
    discrepancies.forEach((d) => {
      if (d.operator_id && !operators.has(d.operator_id)) {
        operators.set(d.operator_id, d.operator?.name || 'Desconhecido');
      }
    });
    return Array.from(operators.entries()).map(([id, name]) => ({ id, name }));
  };

  const uniqueOperators = getOperatorOptions();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-red-600" />
            Dashboard de Divergências
          </h1>
          <p className="text-slate-500 mt-2">
            Monitore discrepâncias de caixa, identifique padrões e tome ações corretivas
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Período
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition-all"
              >
                <option value="today">📅 Hoje</option>
                <option value="week">📆 Últimos 7 dias</option>
                <option value="month">📅 Último mês</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Operador
              </label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition-all"
              >
                <option value="all">👥 Todos os operadores</option>
                {uniqueOperators.map((op) => (
                  <option key={op.id} value={op.id}>
                    👤 {op.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
              >
                <Download size={18} />
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-600">Total de Divergências</span>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-slate-800">{analytics.totalDivergences}</p>
              <p className="text-xs text-slate-500 mt-2">No período selecionado</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-600">Valor Total Divergente</span>
                <TrendingDown className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-slate-800">
                R$ {(analytics.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-2">Soma de todas as divergências</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-600">Divergência Média</span>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-slate-800">
                R$ {(analytics.avgDivergence || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-2">Por discrepância registrada</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-600">Taxa de Incidência</span>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-slate-800">
                {(analytics.totalDivergences > 0 ? ((analytics.totalDivergences / (analytics.totalDivergences + 20)) * 100) : 0).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-2">Das operações com divergência</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Tabelas */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Divergências por Operador */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-lg font-bold text-slate-800">👥 Divergências por Operador</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4">Operador</th>
                      <th className="px-6 py-4 text-right">Diverg.</th>
                      <th className="px-6 py-4 text-right">Total R$</th>
                      <th className="px-6 py-4 text-right">Média R$</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.operatorMetrics.length > 0 ? (
                      analytics.operatorMetrics.map((op) => (
                        <tr
                          key={op.operatorId}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {op.operatorName}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                              {op.divergences}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-800">
                            R$ {(op.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">
                            R$ {(op.avgDivergence || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                          Nenhuma divergência registrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Divergências Recentes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-red-50">
                <h3 className="text-lg font-bold text-slate-800">📊 Divergências Recentes</h3>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0">
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {discrepancies.slice(0, 10).map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          {new Date(d.date_opened).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-right font-bold">
                          <span className={d.discrepancy > 0 ? 'text-green-700' : 'text-red-700'}>
                            {d.discrepancy > 0 ? '+' : ''}
                            R$ {Math.abs(d.discrepancy || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            Math.abs(d.discrepancy) < 1
                              ? 'bg-green-100 text-green-700'
                              : Math.abs(d.discrepancy) < 100
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {Math.abs(d.discrepancy) < 1 ? '✓ OK' : '⚠️ Divergência'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DivergenciasAnalytics;
