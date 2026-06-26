import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/useClinicContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Download, BarChart3, Activity, Table2, Sparkles } from 'lucide-react';

// UI Components
import { DashboardGridSkeleton, CardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Novos componentes Phase 1
import FinancialKpiCards from '@/components/financeiro/FinancialKpiCards';
import ReceivableSummary from '@/components/financeiro/ReceivableSummary';
import PayableSummary from '@/components/financeiro/PayableSummary';
import CashFlowChartPanel from '@/components/financeiro/CashFlowChartPanel';
import FinancialAlertsPanel from '@/components/financeiro/FinancialAlertsPanel';
import ExecutiveSummary from '@/components/financeiro/ExecutiveSummary';
import HelpTermsModal from '@/components/financeiro/HelpTermsModal';
import OperationalCashFlowModel from '@/components/financeiro/OperationalCashFlowModel';

// Componentes de análises avançadas
import GesclinicInsights from '@/components/financeiro/GesclinicInsights';
import ClinicCockpit from '@/components/financeiro/ClinicCockpit';
import CovenantRadar from '@/components/financeiro/CovenantRadar';
import ProfitMap from '@/components/financeiro/ProfitMap';
import PerformanceRanking from '@/components/financeiro/PerformanceRanking';

// Phase 3: Period Filter
import { PeriodFilter } from '@/components/financeiro/PeriodFilter';

// Phase 3: Export & Reporting
import ExportReportingPanel from '@/components/financeiro/ExportReportingPanel';
import ProjectedCashFlow from '@/modules/financeiro/fluxo-caixa/components/ProjectedCashFlow';
import { buildDerivedFinancialTransactions } from '@/lib/financialConsolidationApi';

// Data Service (Phase 3 Integration)
import {
  loadDashboardDataWithCache,
  calculateDashboardMetrics,
  getOpenPayableBalance,
} from '@/services/dashboardDataService';

// Legacy APIs (fallback - kept for reference)
// import {
//   getCashFlowSummary,
//   getDailyCashFlow,
//   getCashFlowProjection,
// } from '@/lib/cashflowApi';
// import { listReceivables } from '@/lib/receivablesApi';
// import { listAPQuery } from '@/lib/financeApi';

// Utilitários (legacy - não mais necessários)
// import {
//   calculateProjectedBalance,
//   calculateReceivableByPeriod,
//   calculatePayableByPeriod,
// } from '@/lib/financialCalculations';

/**
 * 💰 FLUXO DE CAIXA - Dashboard Executivo Consolidado (PHASE 1)
 *
 * Painel inteligente de gestão financeira para clínicas
 * Integra 7 componentes principais + utilitários de cálculo
 */
export default function FluxoCaixaPage() {
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Fluxo de Caixa' },
  ]);

  const { clinic, clinicId, loadingClinic } = useClinicContext();

  // ========================
  // STATES - Phase 3 Updated
  // ========================

  const [period, setPeriod] = useState('30d');
  const [accountingMode, setAccountingMode] = useState('accrual');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [flowPreviewMode, setFlowPreviewMode] = useState('executive');
  const [activeSection, setActiveSection] = useState(['overview', 'operational', 'model', 'analytics'].includes(sectionParam) ? sectionParam : 'overview');
  const [modelExpanded, setModelExpanded] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const sectionActiveStyles = {
    overview: 'border-blue-700 bg-blue-700 text-white shadow-md ring-2 ring-blue-200',
    operational: 'border-emerald-700 bg-emerald-700 text-white shadow-md ring-2 ring-emerald-200',
    model: 'border-amber-700 bg-amber-600 text-white shadow-md ring-2 ring-amber-200',
    analytics: 'border-violet-700 bg-violet-700 text-white shadow-md ring-2 ring-violet-200',
  };

  const sectionInactiveStyle = 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';

  const getSectionButtonClass = (section) => `inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-all ${activeSection === section ? sectionActiveStyles[section] : sectionInactiveStyle}`;

  const sectionPanelStyles = {
    overview: 'border-blue-200 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/10',
    operational: 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10',
    model: 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10',
    analytics: 'border-violet-200 bg-violet-50/30 dark:border-violet-900/40 dark:bg-violet-950/10',
  };

  const getSectionPanelClass = (section) => `rounded-xl border p-4 md:p-5 ${sectionPanelStyles[section]}`;

  // Consolidated dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [metrics, setMetrics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showExportPanel, setShowExportPanel] = useState(false);

  // ========================
  // CÁLCULOS DERIVADOS (Mapeamento para componentes)
  // ========================

  // Mapeamento de dados consolidados para props de componentes
  const summary = dashboardData?.cashflow || null;
  const previousSummary = null; // Será calculado se necessário
  const dailyData = dashboardData?.dailyData || [];
  const projection = Array.isArray(dashboardData?.projection) ? dashboardData?.projection : [];
  const receivables = dashboardData?.receivables?.items || [];
  const payables = dashboardData?.apBills || [];

  const consolidation = dashboardData?.financialConsolidation || null;

  const isRealizedStatus = React.useCallback((status) => (
    ['paid', 'received', 'processed', 'pago', 'paga', 'recebido', 'quitado'].includes(String(status || '').toLowerCase())
  ), []);

  const modeReceivables = React.useMemo(() => {
    if (accountingMode === 'accrual') return receivables;
    return receivables.filter((item) => isRealizedStatus(item.status));
  }, [accountingMode, receivables, isRealizedStatus]);

  const modePayables = React.useMemo(() => {
    if (accountingMode === 'accrual') return payables;
    return payables.filter((item) => isRealizedStatus(item.status));
  }, [accountingMode, payables, isRealizedStatus]);

  const projectedPeriod = React.useMemo(() => {
    const toIso = (value) => {
      if (!value) return null;
      if (typeof value === 'string') return value.split('T')[0];
      return value.toISOString().split('T')[0];
    };

    if (customDateRange?.start && customDateRange?.end) {
      const start = toIso(customDateRange.start);
      const end = toIso(customDateRange.end);
      const days = Math.max(1, Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1);
      return { start, end, days: Math.min(365, days) };
    }

    const daysByPeriod = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
    const days = daysByPeriod[period] || 30;
    const start = new Date();
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      days,
    };
  }, [period, customDateRange]);

  const accrualComputed = React.useMemo(() => {
    if (accountingMode !== 'accrual' || !consolidation) {
      return null;
    }

    const map = new Map();
    buildDerivedFinancialTransactions(consolidation).forEach((item) => {
      const date = String(item.competency_date || item.due_date || item.transaction_date || item.created_at || '').split('T')[0];
      if (!date) return;
      if (!map.has(date)) map.set(date, { inflow: 0, outflow: 0 });
      const bucket = map.get(date);
      if (item.type === 'revenue') bucket.inflow += Number(item.amount || 0);
      else bucket.outflow += Number(item.amount || 0);
    });

    let cumulative = 0;
    let totalInflows = 0;
    let totalOutflows = 0;

    const daily = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => {
        const inflow = Number(values.inflow || 0);
        const outflow = Number(values.outflow || 0);
        const delta = inflow - outflow;
        cumulative += delta;
        totalInflows += inflow;
        totalOutflows += outflow;

        return {
          date,
          inflow: Number(inflow.toFixed(2)),
          outflow: Number(outflow.toFixed(2)),
          balance_change: Number(delta.toFixed(2)),
          balance: Number(cumulative.toFixed(2)),
          cumulative_balance: Number(cumulative.toFixed(2)),
        };
      });

    const net = totalInflows - totalOutflows;
    return {
      daily,
      totalInflows: Number(totalInflows.toFixed(2)),
      totalOutflows: Number(totalOutflows.toFixed(2)),
      net: Number(net.toFixed(2)),
    };
  }, [accountingMode, consolidation]);

  const modeSummary = React.useMemo(() => {
    if (!summary) return null;
    if (!accrualComputed) return summary;

    const outflows = Number(accrualComputed.totalOutflows || 0);
    const inflows = Number(accrualComputed.totalInflows || 0);
    const net = Number(accrualComputed.net || 0);
    const liquidity = outflows > 0 ? inflows / outflows : inflows > 0 ? 999 : 0;
    const periodDays = Math.max(1, Number(summary?.period?.days || 30));
    const dailyOutflow = outflows / periodDays;
    const coverageDays = dailyOutflow > 0 ? Math.max(0, Math.round(net / dailyOutflow)) : 0;

    return {
      ...summary,
      total_inflows: Number(inflows.toFixed(2)),
      total_outflows: Number(outflows.toFixed(2)),
      net_balance: Number(net.toFixed(2)),
      liquidity_ratio: Number(liquidity.toFixed(2)),
      coverage_days: Number(coverageDays),
      period: summary.period,
    };
  }, [summary, accrualComputed]);

  const modeDailyData = React.useMemo(() => {
    if (!accrualComputed) return dailyData;
    return accrualComputed.daily;
  }, [dailyData, accrualComputed]);

  const reconciliation = React.useMemo(() => {
    if (!consolidation || !summary) return null;
    const round2 = (value) => Number(Number(value || 0).toFixed(2));

    const consolidatedReceivablesCount = Array.isArray(consolidation.receivables) ? consolidation.receivables.length : 0;
    const consolidatedPayablesCount = Array.isArray(consolidation.payables) ? consolidation.payables.length : 0;

    const derivedRows = buildDerivedFinancialTransactions(consolidation);
    const realizedStatuses = new Set(['paid', 'received', 'processed', 'pago', 'recebido', 'quitado']);
    const realizedRows = derivedRows.filter((item) => realizedStatuses.has(String(item.status || '').toLowerCase()));
    const realizedInflows = round2(realizedRows.filter((item) => item.type === 'revenue').reduce((sum, item) => sum + Number(item.amount || 0), 0));
    const realizedOutflows = round2(realizedRows.filter((item) => item.type !== 'revenue').reduce((sum, item) => sum + Number(item.amount || 0), 0));

    const dreLike = {
      receitaTotal: round2(consolidation.revenue?.grossRevenue || 0),
      receitaLiquida: round2(consolidation.revenue?.netRevenue || 0),
      ebitda: round2(consolidation.result?.ebitda || 0),
      liquido: round2(consolidation.result?.netIncome || 0),
    };

    const fluxoLike = {
      inflows: round2(summary.total_inflows || 0),
      outflows: round2(summary.total_outflows || 0),
      net: round2(summary.net_balance || 0),
    };

    return {
      counts: {
        receivablesDashboard: Array.isArray(receivables) ? receivables.length : 0,
        receivablesConsolidated: consolidatedReceivablesCount,
        payablesDashboard: Array.isArray(payables) ? payables.length : 0,
        payablesConsolidated: consolidatedPayablesCount,
      },
      dreLike,
      fluxoLike,
      realizedFromLancamentos: {
        inflows: realizedInflows,
        outflows: realizedOutflows,
        net: round2(realizedInflows - realizedOutflows),
      },
      deltas: {
        receivablesCount: (Array.isArray(receivables) ? receivables.length : 0) - consolidatedReceivablesCount,
        payablesCount: (Array.isArray(payables) ? payables.length : 0) - consolidatedPayablesCount,
        fluxoVsLancamentosInflows: round2((summary.total_inflows || 0) - realizedInflows),
        fluxoVsLancamentosOutflows: round2((summary.total_outflows || 0) - realizedOutflows),
        fluxoVsLancamentosNet: round2((summary.net_balance || 0) - (realizedInflows - realizedOutflows)),
      },
    };
  }, [consolidation, summary, receivables, payables]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

  // Dados a vencer nos próximos 30 dias, sem misturar valores já vencidos.
  const receivableWindows = dashboardData?.receivables?.windows || {};
  const receivable30d = Number(receivableWindows.today?.value || 0)
    + Number(receivableWindows['7d']?.value || 0)
    + Number(receivableWindows['30d']?.value || 0);
  const payable30d = payables.reduce((sum, bill) => sum + getOpenPayableBalance(bill), 0);
  const projectedBalance = projection?.[0]?.saldo_projetado || 0;

  // Health scores (calculados do dashboardDataService)
  const healthScores = metrics ? {
    liquidity: metrics.liquidity?.score || 50,
    balance: metrics.balance?.score || 50,
    flow: metrics.flow?.score || 50,
    receivables: metrics.receivablesMetric?.score || 50,
    efficiency: metrics.efficiency?.score || 50,
    overall: metrics.overallHealth || 60,
  } : null;

  const modeHealthScores = React.useMemo(() => {
    if (!modeSummary) return healthScores;

    const totalInflows = Number(modeSummary.total_inflows || 0);
    const totalOutflows = Number(modeSummary.total_outflows || 0);
    const liquidity = Number(modeSummary.liquidity_ratio || 0);
    const coverage = Number(modeSummary.coverage_days || 0);
    const overdueReceivables = modeReceivables.filter((item) => {
      if (isRealizedStatus(item.status) || ['canceled', 'cancelado', 'cancelada', 'reversed', 'estornado'].includes(String(item.status || '').toLowerCase()) || !item.due_date) return false;
      return new Date(`${String(item.due_date).split('T')[0]}T00:00:00`) < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
    }).length;

    const liquidityScore = Math.min(100, Math.max(0, liquidity * 50));
    const balanceScore = Math.min(100, Math.max(0, coverage * 3.33));
    const flowScore = totalOutflows > 0 ? Math.min(100, Math.max(0, (totalInflows / totalOutflows) * 50)) : 80;
    const receivablesScore = modeReceivables.length > 0 ? Math.max(0, 100 - (overdueReceivables / modeReceivables.length) * 100) : 100;
    const efficiencyScore = totalInflows > 0 ? Math.min(100, Math.max(0, (Number(modeSummary.net_balance || 0) / totalInflows) * 100 + 50)) : 50;

    return {
      liquidity: liquidityScore,
      balance: balanceScore,
      flow: flowScore,
      receivables: receivablesScore,
      efficiency: efficiencyScore,
      overall: Math.round((liquidityScore + balanceScore + flowScore + receivablesScore + efficiencyScore) / 5),
    };
  }, [modeSummary, modeReceivables, healthScores, isRealizedStatus]);

  // ========================
  // FUNÇÕES - Phase 3 Updated
  // ========================

  async function loadData() {
    if (loadingClinic) {
      return;
    }

    if (!clinicId) {
      setError('Clínica não identificada');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      console.log('[FluxoCaixa] Carregando dados consolidados...');
      console.log('  - Period:', period);
      console.log('  - Custom Range:', customDateRange);

      // Carregar dados consolidados via data service
      const data = await loadDashboardDataWithCache(
        clinicId,
        period,
        customDateRange?.start || null,
        customDateRange?.end || null
      );

      console.log('[FluxoCaixa] Dados carregados:', data);

      setDashboardData(data);
      setLastUpdatedAt(new Date().toISOString());

      // Calcular métricas derivadas para os módulos de análise
      const calculatedMetrics = calculateDashboardMetrics(data);
      console.log('[FluxoCaixa] Métricas calculadas:', calculatedMetrics);

      setMetrics(calculatedMetrics);
    } catch (err) {
      console.error('[FluxoCaixa] Erro ao carregar dados:', err);
      setError('Erro ao carregar dados do fluxo de caixa. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handlePeriodChange(newPeriod, customStart, customEnd) {
    setPeriod(newPeriod);
    if (customStart && customEnd) {
      setCustomDateRange({ start: customStart, end: customEnd });
    } else {
      setCustomDateRange(null);
    }
    setLoading(true);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  // ========================
  // EFFECTS - Phase 3 Updated
  // ========================

  useEffect(() => {
    if (loadingClinic) {
      return;
    }

    setLoading(true);
    loadData();
  }, [clinicId, loadingClinic, period, customDateRange]);

  useEffect(() => {
    const nextSection = searchParams.get('section');
    if (['overview', 'operational', 'model', 'analytics'].includes(nextSection)) {
      setActiveSection(nextSection);
    }
  }, [searchParams]);

  // ========================
  // RENDER
  // ========================

  if (error) {
    return (
      <PageLayout
        title="Fluxo de Caixa"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </Button>
        }
      >
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Erro ao Carregar</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      </PageLayout>
    );
  }

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <PageLayout
        title="💰 Fluxo de Caixa"
        subtitle="Acompanhe sua saúde financeira em tempo real (regime de caixa)"
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button onClick={() => setShowExportPanel(true)} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        }
      >
        {/* Phase 3: Advanced Period Filter */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">📅 Selecione o Período</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {lastUpdatedAt ? `Atualizado em ${new Date(lastUpdatedAt).toLocaleString('pt-BR')}` : 'Aguardando atualização'}
            </span>
          </div>
          <PeriodFilter onPeriodChange={handlePeriodChange} currentPeriod={period} />

          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Regime</span>
              <button
                type="button"
                onClick={() => setAccountingMode('realized')}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${accountingMode === 'realized'
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                Caixa (Realizado)
              </button>
              <button
                type="button"
                onClick={() => setAccountingMode('accrual')}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${accountingMode === 'accrual'
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                Competência
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Competência inclui previstos/importados; Caixa mostra apenas realizados.
              </span>
            </div>
          </div>
        </div>

        {/* Navegação entre seções do fluxo */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={getSectionButtonClass('overview')}
              onClick={() => setActiveSection('overview')}
            >
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </button>
            <button
              type="button"
              className={getSectionButtonClass('operational')}
              onClick={() => setActiveSection('operational')}
            >
              <Activity className="h-4 w-4" />
              Operacional
            </button>
            <button
              type="button"
              className={getSectionButtonClass('model')}
              onClick={() => setActiveSection('model')}
            >
              <Table2 className="h-4 w-4" />
              Fluxo Projetado
            </button>
            <button
              type="button"
              className={getSectionButtonClass('analytics')}
              onClick={() => setActiveSection('analytics')}
            >
              <Sparkles className="h-4 w-4" />
              Análises Avançadas
            </button>
          </div>
        </div>

        <div className={getSectionPanelClass(activeSection)}>
        {/* 💹 FLUXO PROJETADO ENTERPRISE */}
        {activeSection === 'model' && (
          <ErrorBoundary>
            <ProjectedCashFlow
              externalStartDate={projectedPeriod.start}
              externalEndDate={projectedPeriod.end}
              externalForecastHorizon={projectedPeriod.days}
            />
          </ErrorBoundary>
        )}

        {/* PHASE 1 COMPONENTS */}
        {loading && !dashboardData ? (
          <>
            <div className="mb-6">
              <DashboardGridSkeleton count={8} />
            </div>
            <ChartSkeleton />
            <div className="mt-6">
              <CardSkeleton />
            </div>
          </>
        ) : (
          <>
            {/* 1. Visão geral */}
            {activeSection === 'overview' && (
              <ErrorBoundary>
                <FinancialKpiCards
                  summary={modeSummary}
                  previousSummary={previousSummary}
                  projectedBalance={projectedBalance}
                  receivable30d={receivable30d}
                  payable30d={payable30d}
                  loading={loading}
                />
              </ErrorBoundary>
            )}

            {activeSection === 'overview' && (
              <ErrorBoundary>
                <CashFlowChartPanel dailyData={modeDailyData} projection={projection} loading={loading} />
              </ErrorBoundary>
            )}

            {activeSection === 'overview' && (
              <ErrorBoundary>
                <ExecutiveSummary
                  summary={modeSummary}
                  receivable30d={receivable30d}
                  payable30d={payable30d}
                  projectedBalance={projectedBalance}
                  receivables={receivables}
                  loading={loading}
                />
              </ErrorBoundary>
            )}

            {activeSection === 'overview' && reconciliation && (
              <Card className="mb-6 border-slate-300 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Painel de Reconciliação entre Módulos</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Base: {accountingMode === 'accrual' ? 'Competência selecionada' : 'Realizado selecionado'}</span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/20">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">DRE (Competência)</p>
                    <p className="text-blue-800 dark:text-blue-200">Receita líquida: {formatCurrency(reconciliation.dreLike.receitaLiquida)}</p>
                    <p className="text-blue-800 dark:text-blue-200">Resultado líquido: {formatCurrency(reconciliation.dreLike.liquido)}</p>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">Fluxo (Caixa)</p>
                    <p className="text-emerald-800 dark:text-emerald-200">Entradas realizadas: {formatCurrency(reconciliation.fluxoLike.inflows)}</p>
                    <p className="text-emerald-800 dark:text-emerald-200">Saídas realizadas: {formatCurrency(reconciliation.fluxoLike.outflows)}</p>
                  </div>
                  <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-900/40 dark:bg-violet-950/20">
                    <p className="font-semibold text-violet-900 dark:text-violet-100">Lançamentos Realizados</p>
                    <p className="text-violet-800 dark:text-violet-200">Entradas: {formatCurrency(reconciliation.realizedFromLancamentos.inflows)}</p>
                    <p className="text-violet-800 dark:text-violet-200">Saídas: {formatCurrency(reconciliation.realizedFromLancamentos.outflows)}</p>
                  </div>
                </div>

                <div className="overflow-auto rounded-md border border-slate-200 dark:border-gray-700">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-slate-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-gray-200">Métrica</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-gray-200">Delta</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-gray-200">Leitura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          key: 'receivablesCount',
                          label: 'Contas a Receber (dashboard vs consolidação)',
                          value: reconciliation.deltas.receivablesCount,
                          note: 'Deve ser 0 quando as fontes estão alinhadas.',
                        },
                        {
                          key: 'payablesCount',
                          label: 'Contas a Pagar (dashboard vs consolidação)',
                          value: reconciliation.deltas.payablesCount,
                          note: 'Deve ser 0 quando as fontes estão alinhadas.',
                        },
                        {
                          key: 'fluxoVsLancamentosInflows',
                          label: 'Entradas realizadas (fluxo vs lançamentos)',
                          value: reconciliation.deltas.fluxoVsLancamentosInflows,
                          note: 'Idealmente 0 para mesma janela e regra de status.',
                        },
                        {
                          key: 'fluxoVsLancamentosOutflows',
                          label: 'Saídas realizadas (fluxo vs lançamentos)',
                          value: reconciliation.deltas.fluxoVsLancamentosOutflows,
                          note: 'Idealmente 0 para mesma janela e regra de status.',
                        },
                        {
                          key: 'fluxoVsLancamentosNet',
                          label: 'Saldo realizado (fluxo vs lançamentos)',
                          value: reconciliation.deltas.fluxoVsLancamentosNet,
                          note: 'Idealmente 0 para mesma janela e regra de status.',
                        },
                      ].map((row) => (
                        <tr key={row.key} className="border-t border-slate-100 dark:border-gray-800">
                          <td className="px-3 py-2 text-slate-700 dark:text-gray-200">{row.label}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${Number(row.value || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {Number(row.value || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500 dark:text-gray-400">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* 2. Operacional */}
            {activeSection === 'operational' && (
              <>
                <ErrorBoundary>
                  <OperationalCashFlowModel consolidation={consolidation} clinicId={clinicId} loading={loading} accountingMode={accountingMode} />
                </ErrorBoundary>

                <ErrorBoundary>
                  <ReceivableSummary receivables={modeReceivables} loading={loading} />
                </ErrorBoundary>

                <ErrorBoundary>
                  <PayableSummary payables={modePayables} loading={loading} />
                </ErrorBoundary>

                <ErrorBoundary>
                  <FinancialAlertsPanel
                    summary={modeSummary}
                    receivables={modeReceivables}
                    payables={modePayables}
                    previousSummary={previousSummary}
                    loading={loading}
                  />
                </ErrorBoundary>
              </>
            )}

            {/* 3. Análises avançadas */}
            {activeSection === 'analytics' && (
              <div className="space-y-6 mt-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-violet-600" />
                    Análises Avançadas
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
                    Inteligência financeira com indicadores de saúde, desempenho, risco e rentabilidade.
                  </p>
                </div>

                <ErrorBoundary>
                  <GesclinicInsights
                    summary={modeSummary}
                    receivables={modeReceivables}
                    payables={modePayables}
                    previousSummary={previousSummary}
                    loading={loading}
                  />
                </ErrorBoundary>

                <ErrorBoundary>
                  <ClinicCockpit
                    summary={modeSummary}
                    receivables={modeReceivables}
                    payables={modePayables}
                    healthScores={modeHealthScores}
                    loading={loading}
                  />
                </ErrorBoundary>

                <ErrorBoundary>
                  <CovenantRadar receivables={modeReceivables} loading={loading} />
                </ErrorBoundary>

                <ErrorBoundary>
                  <ProfitMap dailyData={modeDailyData} payables={modePayables} loading={loading} />
                </ErrorBoundary>

                <ErrorBoundary>
                  <PerformanceRanking
                    receivables={modeReceivables}
                    payables={modePayables}
                    dailyData={modeDailyData}
                    loading={loading}
                  />
                </ErrorBoundary>
              </div>
            )}

            {/* Ajuda disponível em todas as seções */}
            <HelpTermsModal />
          </>
        )}
        </div>
      </PageLayout>

      {/* Export & Reporting Panel */}
      {showExportPanel && (
        <ExportReportingPanel
          dashboardData={dashboardData}
          clinicId={clinicId}
          clinicName={clinic?.name || clinic?.brand_name || 'Clínica'}
          onClose={() => setShowExportPanel(false)}
        />
      )}
    </ErrorBoundary>
  );
}
