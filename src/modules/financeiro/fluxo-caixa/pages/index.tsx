/**
 * 💰 Página: Fluxo de Caixa
 */

'use client';

import React, { useState } from 'react';
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

export default function FluxoCaixaPage() {
  const { clinic, loadingClinic } = useClinicContext();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'summary' | 'trend' | 'forecast' | 'report'>('dashboard');

  // Load data for all new components
  const summary = useCashFlowSummaryData();
  const trend = useCashFlowTrendData();
  const forecast = useCashFlowForecastData(30);
  const report = useCashFlowReportData();

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
            <CashFlowDashboard />
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <CashFlowSummary
              metrics={summary.data}
              onMetricClick={(metric) => console.log('Métrica clicada:', metric)}
            />
          </div>
        )}

        {/* Trend Tab */}
        {activeTab === 'trend' && (
          <div className="space-y-6">
            <CashFlowTrend
              data={trend.trendData}
              isLoading={trend.isLoading}
              error={trend.error}
            />
          </div>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <CashFlowForecast
              historicalData={forecast.historicalData}
              isLoading={forecast.isLoading}
              error={forecast.error}
            />
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {report.reportData ? (
              <CashFlowReport
                data={report.reportData}
                isLoading={report.isLoading}
                error={report.error}
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
