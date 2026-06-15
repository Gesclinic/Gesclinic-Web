/**
 * Financial Cockpit Premium
 * Dashboard visual com heatmap, aging, trends, forecast e indicadores
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { dreMotorApi } from '@/lib/dreMotorApi';
import { getAgingAnalysis } from '@/lib/agingAnalysisApi';
import ProfitabilityHeatmap from '../components/ProfitabilityHeatmap';
import AgingAnalysis from '../components/AgingAnalysis';
import TrendsChart from '../components/TrendsChart';
import ForecastChart from '../components/ForecastChart';
import FinancialCalendar from '../components/FinancialCalendar';
import HealthIndicators from '../components/HealthIndicators';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6B6B'];

export const FinancialCockpit: React.FC = () => {
  const { user } = useAuth();
  const clinicContext = useClinicContext();
  const { clinicId } = clinicContext || {};

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // month, quarter, year
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)),
    end: new Date()
  });

  // DRE Data
  const [dreData, setDREData] = useState<any>(null);
  
  // Receivables Aging
  const [agingData, setAgingData] = useState<any>(null);
  
  // Trends
  const [trendsData, setTrendsData] = useState<any[]>([]);
  
  // Forecast
  const [forecastData, setForecastData] = useState<any[]>([]);
  
  // Health Metrics
  const [healthMetrics, setHealthMetrics] = useState<any>(null);

  // Fetch all data
  useEffect(() => {
    if (!clinicId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch DRE
        const dre = await dreMotorApi.getDREDashboard(clinicId, {
          startDate: dateRange.start,
          endDate: dateRange.end,
          includeForecasts: true
        });
        setDREData(dre);

        // 2. Fetch Receivables Aging
        const aging = await getAgingAnalysis(clinicId);
        setAgingData(aging);

        // 3. Fetch Trends (últimos 6 períodos)
        const trends = await dreMotorApi.getRevenuesTrends(clinicId, 6);
        setTrendsData(trends);

        // 4. Fetch Forecast (próximos 90 dias)
        const forecast = await dreMotorApi.getCashFlowForecast(clinicId, 90);
        setForecastData(forecast);

        // 5. Fetch Health Metrics
        const health = await dreMotorApi.getFinancialHealthStatus(clinicId);
        setHealthMetrics(health);

      } catch (error) {
        console.error('Error loading cockpit data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicId, dateRange, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Carregando Financial Cockpit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Financial Cockpit</h1>
          <p className="text-gray-600 mt-1">Dashboard executivo com métricas financeiras em tempo real</p>
        </div>
        <div className="flex gap-2">
          {['month', 'quarter', 'year'].map((p) => (
            <Button
              key={p}
              onClick={() => setPeriod(p)}
              variant={period === p ? 'default' : 'outline'}
              className="capitalize"
            >
              {p === 'month' ? 'Mês' : p === 'quarter' ? 'Trimestre' : 'Ano'}
            </Button>
          ))}
        </div>
      </div>

      {/* Health Indicators - Top KPIs */}
      {healthMetrics && <HealthIndicators data={healthMetrics} />}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: DRE Overview + Heatmap */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profitability Heatmap */}
          {dreData && <ProfitabilityHeatmap data={dreData} />}

          {/* Revenue Trends */}
          {trendsData.length > 0 && <TrendsChart data={trendsData} />}
        </div>

        {/* Right Column: Aging + Indicators */}
        <div className="space-y-6">
          {/* Aging Analysis */}
          {agingData && <AgingAnalysis data={agingData} />}

          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Status Saúde
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthMetrics?.status === 'healthy' && (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Saúde Financeira: Excelente</span>
                </div>
              )}
              {healthMetrics?.status === 'warning' && (
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Saúde Financeira: Atenção</span>
                </div>
              )}
              {healthMetrics?.status === 'critical' && (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Saúde Financeira: Crítica</span>
                </div>
              )}
              
              <div className="pt-3 border-t border-blue-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Margem Operacional:</span>
                  <span className="font-semibold text-blue-900">
                    {healthMetrics?.operatingMargin?.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Liquidez Corrente:</span>
                  <span className="font-semibold text-blue-900">
                    {healthMetrics?.currentRatio?.toFixed(2)}x
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dias de Caixa:</span>
                  <span className="font-semibold text-blue-900">
                    {healthMetrics?.cashDaysAvailable} dias
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forecast */}
      {forecastData.length > 0 && (
        <ForecastChart data={forecastData} />
      )}

      {/* Financial Calendar */}
      <FinancialCalendar clinicId={clinicId} />

      {/* DRE Detailed Breakdown */}
      {dreData && (
        <Card>
          <CardHeader>
            <CardTitle>Demonstração de Resultado - Detalhado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Receita Bruta</span>
                <span className="font-bold">R$ {(dreData.grossRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-b text-red-600">
                <span>(-) Deduções</span>
                <span>-R$ {(dreData.deductions || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-b font-semibold bg-green-50">
                <span>Receita Líquida</span>
                <span className="text-green-700">R$ {(dreData.netRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-b text-red-600">
                <span>(-) Custos</span>
                <span>-R$ {(dreData.costs || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-b text-red-600">
                <span>(-) Despesas</span>
                <span>-R$ {(dreData.expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 font-bold bg-blue-50">
                <span>EBITDA</span>
                <span className="text-blue-700">R$ {(dreData.ebitda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 font-bold bg-yellow-50">
                <span>Resultado Líquido</span>
                <span className={dreData.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>
                  R$ {(dreData.netIncome || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialCockpit;
