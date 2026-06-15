import React, { useEffect, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useClinicContext } from '@/contexts/useClinicContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';

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

// Phase 2 Components
import GesclinicInsights from '@/components/financeiro/GesclinicInsights';
import ClinicCockpit from '@/components/financeiro/ClinicCockpit';
import CovenantRadar from '@/components/financeiro/CovenantRadar';
import ProfitMap from '@/components/financeiro/ProfitMap';
import PerformanceRanking from '@/components/financeiro/PerformanceRanking';

// Phase 3: Period Filter
import { PeriodFilter } from '@/components/financeiro/PeriodFilter';

// Phase 3: Export & Reporting
import ExportReportingPanel from '@/components/financeiro/ExportReportingPanel';

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
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Fluxo de Caixa' },
  ]);

  const { clinic, clinicId, loadingClinic } = useClinicContext();

  // ========================
  // STATES - Phase 3 Updated
  // ========================

  const [period, setPeriod] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState(null);

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

      // Calcular métricas derivadas (para Phase 2 components)
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
        subtitle="Acompanhe sua saúde financeira em tempo real"
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
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📅 Selecione o Período</h3>
          <PeriodFilter onPeriodChange={handlePeriodChange} currentPeriod={period} />
        </div>

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
            {/* 1. KPI Cards */}
            <ErrorBoundary>
              <FinancialKpiCards
                summary={summary}
                previousSummary={previousSummary}
                projectedBalance={projectedBalance}
                receivable30d={receivable30d}
                payable30d={payable30d}
                loading={loading}
              />
            </ErrorBoundary>

            {/* 2. Contas a Receber */}
            <ErrorBoundary>
              <ReceivableSummary receivables={receivables} loading={loading} />
            </ErrorBoundary>

            {/* 3. Contas a Pagar */}
            <ErrorBoundary>
              <PayableSummary payables={payables} loading={loading} />
            </ErrorBoundary>

            {/* 4. Gráfico de Fluxo */}
            <ErrorBoundary>
              <CashFlowChartPanel dailyData={dailyData} projection={projection} loading={loading} />
            </ErrorBoundary>

            {/* 5. Alertas Inteligentes */}
            <ErrorBoundary>
              <FinancialAlertsPanel
                summary={summary}
                receivables={receivables}
                payables={payables}
                previousSummary={previousSummary}
                loading={loading}
              />
            </ErrorBoundary>

            {/* 6. Resumo Executivo */}
            <ErrorBoundary>
              <ExecutiveSummary
                summary={summary}
                receivable30d={receivable30d}
                payable30d={payable30d}
                projectedBalance={projectedBalance}
                receivables={receivables}
                loading={loading}
              />
            </ErrorBoundary>

            {/* 7. Modal de Ajuda */}
            <HelpTermsModal />

            {/* ============================================ */}
            {/* PHASE 2 COMPONENTS - ADVANCED ANALYTICS */}
            {/* ============================================ */}

            <div className="space-y-6 mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                🚀 Análises Avançadas (Phase 2)
              </h1>

              {/* 1. Gesclinic Insights */}
              <ErrorBoundary>
                <GesclinicInsights
                  summary={summary}
                  receivables={receivables}
                  payables={payables}
                  previousSummary={previousSummary}
                  loading={loading}
                />
              </ErrorBoundary>

              {/* 2. Clinic Cockpit */}
              <ErrorBoundary>
                <ClinicCockpit
                  summary={summary}
                  receivables={receivables}
                  payables={payables}
                  healthScores={healthScores}
                  loading={loading}
                />
              </ErrorBoundary>

              {/* 3. Covenant Radar */}
              <ErrorBoundary>
                <CovenantRadar receivables={receivables} loading={loading} />
              </ErrorBoundary>

              {/* 4. Profit Map */}
              <ErrorBoundary>
                <ProfitMap dailyData={dailyData} loading={loading} />
              </ErrorBoundary>

              {/* 5. Performance Ranking */}
              <ErrorBoundary>
                <PerformanceRanking
                  receivables={receivables}
                  payables={payables}
                  dailyData={dailyData}
                  loading={loading}
                />
              </ErrorBoundary>
            </div>
          </>
        )}
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
