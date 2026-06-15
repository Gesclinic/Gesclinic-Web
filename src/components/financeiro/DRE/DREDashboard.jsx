/**
 * DRE Dashboard - Componente Principal (v2)
 * Demonstra receita, despesas e métricas de lucratividade
 */

import React, { useState, useEffect } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { getDREDashboard, getMonthlyDRESummary } from '@/lib/dreMotorApi';
import DREKPICards from './DREKPICards';
import DREMonthlyChart from './DREMonthlyChart';
import DREProfitabilityTable from './DREProfitabilityTable';
import DREComparison from './DREComparison';
import DREAlert from './DREAlert';

export default function DREDashboard() {
  const { clinicId, loadingClinic } = useClinicContext();
  const [dashboard, setDashboard] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (clinicId && !loadingClinic) {
      fetchDashboardData();
    }
  }, [clinicId, loadingClinic]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardResult, monthlyResult] = await Promise.all([
        getDREDashboard(clinicId),
        getMonthlyDRESummary(clinicId, 12)
      ]);

      if (!dashboardResult.success) {
        throw new Error(dashboardResult.error || 'Failed to load DRE dashboard');
      }

      setDashboard(dashboardResult.data);
      setMonthlyData(monthlyResult.data || []);
    } catch (err) {
      console.error('[DREDashboard] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  if (loadingClinic || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Carregando DRE Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-semibold mb-2">Erro ao Carregar Dashboard</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum dado DRE disponível ainda. Os dados de receita aparecerão aqui.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">DRE - Resultado do Exercício</h1>
          <p className="text-gray-600 mt-1">Análise de Performance Financeira e Lucratividade</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Atualizando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </>
          )}
        </button>
      </div>

      {/* Alerts */}
      {dashboard.current_month && <DREAlert currentMonth={dashboard.current_month} />}

      {/* KPI Cards */}
      <DREKPICards
        currentMonth={dashboard.current_month}
        ytd={dashboard.ytd}
      />

      {/* Monthly Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tendência de Receita (Últimos 12 Meses)</h2>
        <DREMonthlyChart data={monthlyData} />
      </div>

      {/* Profitability Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Métricas de Lucratividade</h2>
        <DREProfitabilityTable data={dashboard.profitability} />
      </div>

      {/* Comparison */}
      {monthlyData.length >= 2 && (
        <DREComparison
          currentMonth={monthlyData[0]}
          previousMonth={monthlyData[1]}
        />
      )}
    </div>
  );
}
