/**
 * 💰 Página: Fluxo de Caixa
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useClinicContext } from '@/contexts/useClinicContext';
import { CashFlowDashboard } from '../components';
import CashFlowSummary from '../components/CashFlowSummary';
import CashFlowTrend from '../components/CashFlowTrend';
import CashFlowForecast from '../components/CashFlowForecast';
import CashFlowReport from '../components/CashFlowReport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, BarChart3, TrendingUp, Zap, FileText } from 'lucide-react';
import {
  useCashFlowSummaryData,
  useCashFlowTrendData,
  useCashFlowForecastData,
  useCashFlowReportData,
} from '../hooks/useCashFlowIntegration';
import CashFlowWorkbookModel from '../components/CashFlowWorkbookModel';

const STANDARD_FLOW_BASE_DATE = '2026-02-01';

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function buildStandardFlowTrendData() {
  const rows = [];
  let balance = 126500;

  for (let i = 0; i < 30; i += 1) {
    const income = i % 5 === 0 ? 13200 : i % 3 === 0 ? 8600 : 5400;
    const expense = i % 4 === 0 ? 9800 : i % 2 === 0 ? 6200 : 4300;
    balance += income - expense;

    rows.push({
      date: addDays(STANDARD_FLOW_BASE_DATE, i),
      income,
      expense,
      balance,
    });
  }

  return rows;
}

function buildStandardFlowReportData(trendData) {
  const totalIncome = trendData.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = trendData.reduce((sum, item) => sum + item.expense, 0);
  const netBalance = totalIncome - totalExpense;

  return {
    title: 'Relatório de Fluxo de Caixa - Modelo Padrão',
    period: {
      start: trendData[0]?.date || STANDARD_FLOW_BASE_DATE,
      end: trendData[trendData.length - 1]?.date || '2026-03-02',
    },
    summary: {
      totalIncome,
      totalExpense: -Math.abs(totalExpense),
      netBalance,
      variation: 17.4,
    },
    details: [
      { date: '2026-02-03', description: 'Recebimento Convênio Unimed', amount: 24324.54, type: 'income' },
      { date: '2026-02-05', description: 'Recebimentos Clínica CNPJ', amount: 20000, type: 'income' },
      { date: '2026-02-08', description: 'IR Trimestral', amount: 16016.28, type: 'expense' },
      { date: '2026-02-10', description: 'Glosas Convênio', amount: 12152.77, type: 'expense' },
      { date: '2026-02-14', description: 'Marketing e Mídias', amount: 1091.5, type: 'expense' },
      { date: '2026-02-20', description: 'Receita Particular NF', amount: 47295, type: 'income' },
      { date: '2026-02-24', description: 'Receita CEONC-SUS', amount: 38315.25, type: 'income' },
      { date: '2026-02-27', description: 'Investimento Equipamentos', amount: 8755.17, type: 'expense' },
    ],
  };
}

export default function FluxoCaixaPage() {
  const { clinic, loadingClinic } = useClinicContext();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'summary' | 'trend' | 'forecast' | 'report'>('dashboard');
  const [useWorkbookPreview, setUseWorkbookPreview] = useState(true);

  // Load data for all new components
  const summary = useCashFlowSummaryData();
  const trend = useCashFlowTrendData();
  const forecast = useCashFlowForecastData(30);
  const report = useCashFlowReportData();

  const standardFlowTrendData = useMemo(() => buildStandardFlowTrendData(), []);
  const standardFlowSummaryData = useMemo(() => {
    const totalIncome = standardFlowTrendData.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = standardFlowTrendData.reduce((sum, item) => sum + item.expense, 0);

    return {
      totalIncome,
      totalExpense: -Math.abs(totalExpense),
      netBalance: totalIncome - totalExpense,
      previousNetBalance: 81220.4,
      period: 'Modelo padrão do sistema - Pré-visualização',
      isLoading: false,
    };
  }, [standardFlowTrendData]);
  const drMilitaoForecastData = useMemo(
    () => standardFlowTrendData.map((item) => ({ date: item.date, balance: item.balance })),
    [standardFlowTrendData],
  );
  const standardFlowReportData = useMemo(() => buildStandardFlowReportData(standardFlowTrendData), [standardFlowTrendData]);

  const summaryMetrics = useWorkbookPreview ? standardFlowSummaryData : summary.data;
  const trendData = useWorkbookPreview ? standardFlowTrendData : trend.trendData;
  const trendLoading = useWorkbookPreview ? false : trend.isLoading;
  const trendError = useWorkbookPreview ? undefined : trend.error;
  const forecastData = useWorkbookPreview ? drMilitaoForecastData : forecast.historicalData;
  const forecastLoading = useWorkbookPreview ? false : forecast.isLoading;
  const forecastError = useWorkbookPreview ? undefined : forecast.error;
  const reportData = useWorkbookPreview ? standardFlowReportData : report.reportData;
  const reportLoading = useWorkbookPreview ? false : report.isLoading;
  const reportError = useWorkbookPreview ? undefined : report.error;

  if (loadingClinic) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>Clínica não encontrada</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Helmet>
        <title>Fluxo de Caixa - {clinic.clinic_name || clinic.name} | Gesclinic</title>
        <meta
          name="description"
          content="Gerenciamento de fluxo de caixa realizado, previsto e projetado"
        />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fluxo de Caixa</h1>
          <p className="text-gray-600 mt-2">
            Visão completa do fluxo de caixa realizado, previsto e projetado
          </p>
        </div>

        <Card className="border-slate-200 bg-slate-50/80">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Modelo padrão do fluxo</p>
                <p className="text-sm text-slate-600">
                  Use a pré-visualização padrão do sistema para validar a apresentação antes da integração definitiva.
                </p>
              </div>
              <button
                onClick={() => setUseWorkbookPreview((value) => !value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  useWorkbookPreview
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {useWorkbookPreview ? 'Prévia padrão: ON' : 'Prévia padrão: OFF'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            Resumo
          </button>
          <button
            onClick={() => setActiveTab('trend')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'trend'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Tendência
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'forecast'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Projeção
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'report'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            Relatório
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">💡 Dica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700">
                  Use os filtros para análise por período, conta financeira ou centro de custo.
                  O sistema calcula automaticamente o saldo realizado e previsto com base nas transações.
                </p>
              </CardContent>
            </Card>
            {useWorkbookPreview && <CashFlowWorkbookModel />}
            <CashFlowDashboard />
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <CashFlowSummary
              metrics={summaryMetrics}
              onMetricClick={(metric) => console.log('Métrica clicada:', metric)}
            />
          </div>
        )}

        {/* Trend Tab */}
        {activeTab === 'trend' && (
          <div className="space-y-6">
            <CashFlowTrend
              data={trendData}
              isLoading={trendLoading}
              error={trendError}
            />
          </div>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <CashFlowForecast
              historicalData={forecastData}
              isLoading={forecastLoading}
              error={forecastError}
            />
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {reportData ? (
              <CashFlowReport
                data={reportData}
                isLoading={reportLoading}
                error={reportError}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-500">Nenhum dado disponível para relatório</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
