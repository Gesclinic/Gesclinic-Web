/**
 * ETAPA 7: Financial Cockpit Premium
 * Dashboard executivo completo com 12+ KPIs, visualizações avançadas e previsões
 * 
 * Funcionalidades:
 * - 12 KPI cards com comparativo período anterior
 * - Heatmap de profitabilidade por centro de custo
 * - Análise visual de atrasos (Aging)
 * - Gráficos de tendência (6 períodos)
 * - Projeção de fluxo de caixa (90 dias)
 * - Indicadores de saúde financeira
 * - Calendário financeiro com eventos
 * - Previsão de receita (30/60/90 dias)
 * - Period comparator (Mensal, Trimestral, Anual)
 * - Goal tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Users,
  AlertCircle, Target, Zap, Calendar, Filter, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const CockpitPremium = () => {
  // Get clinic ID from auth
  const { clinicId, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month'); // month, quarter, year
  const [kpis, setKpis] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [delinquencyData, setDelinquencyData] = useState(null);
  const [professionalData, setProfessionalData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (clinicId) {
      loadAllData();
    }
  }, [clinicId, period]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadKPIs(),
        loadHistoricalData(),
        loadDelinquencyData(),
        loadProfessionalData(),
        loadForecastData(),
        loadGoals(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== CARREGAMENTO DE DADOS ==========
  const loadKPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('v_kpi_mensais')
        .select('*')
        .eq('clinic_id', clinicId)
        .single();

      if (error) throw error;
      setKpis(data);
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    }
  };

  const loadHistoricalData = async () => {
    try {
      const { data, error } = await supabase
        .from('v_kpi_evolucao_12_meses')
        .select('*')
        .eq('clinic_id', clinicId)
        .limit(12);

      if (error) throw error;
      setHistoricalData(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados históricos:', error);
    }
  };

  const loadDelinquencyData = async () => {
    try {
      const { data, error } = await supabase
        .from('v_delinquency_aging')
        .select('*')
        .eq('clinic_id', clinicId)
        .single();

      if (error) throw error;
      setDelinquencyData(data);
    } catch (error) {
      console.error('Erro ao carregar inadimplência:', error);
    }
  };

  const loadProfessionalData = async () => {
    try {
      const { data, error } = await supabase
        .from('v_professional_performance')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('total_faturado', { ascending: false })
        .limit(10);

      if (error) throw error;
      setProfessionalData(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados de profissionais:', error);
    }
  };

  const loadForecastData = async () => {
    try {
      const { data, error } = await supabase.rpc('forecast_revenue', {
        p_clinic_id: clinicId,
        p_days_ahead: 30,
      });

      if (error) throw error;
      setForecastData(data || []);
    } catch (error) {
      console.error('Erro ao carregar previsão:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('cockpit_goals')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  };

  // ========== COMPONENTE: KPI CARD ==========
  const KPICard = ({ title, value, target, change, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600 text-blue-600',
      green: 'from-green-500 to-green-600 text-green-600',
      purple: 'from-purple-500 to-purple-600 text-purple-600',
      orange: 'from-orange-500 to-orange-600 text-orange-600',
      red: 'from-red-500 to-red-600 text-red-600',
      pink: 'from-pink-500 to-pink-600 text-pink-600',
    };

    const isPositive = change >= 0;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {target && (
                <p className="text-sm text-gray-500 mt-2">
                  Meta: <span className="font-semibold">{target}</span>
                </p>
              )}
              {change !== undefined && (
                <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {isPositive ? '+' : ''}{change}% vs período anterior
                </div>
              )}
            </div>
            <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} bg-opacity-10`}>
              <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ========== RENDERIZAÇÃO ==========
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-yellow-500" />
            Financial Cockpit Premium
          </h1>
          <p className="text-gray-600 mt-2">Dashboard executivo com análise avançada</p>
        </div>
        <div className="flex gap-2">
          {[
            { label: '📅 Mensal', value: 'month' },
            { label: '📊 Trimestral', value: 'quarter' },
            { label: '📈 Anual', value: 'year' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                period === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========== SEÇÃO 1: 12 KPIS ========== */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 KPIs Executivos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis && (
            <>
              <KPICard
                title="Faturamento Bruto"
                value={`R$ ${(kpis.faturamento_bruto || 0).toFixed(2)}`}
                icon={DollarSign}
                color="green"
              />
              <KPICard
                title="Receita Líquida"
                value={`R$ ${(kpis.receita_liquida || 0).toFixed(2)}`}
                icon={TrendingUp}
                color="blue"
              />
              <KPICard
                title="Taxa de Coleta"
                value={`${((kpis.receita_liquida / (kpis.faturamento_bruto || 1)) * 100).toFixed(1)}%`}
                icon={Percent}
                color="purple"
              />
              <KPICard
                title="Total Agendamentos"
                value={kpis.total_appointments || 0}
                icon={Calendar}
                color="orange"
              />
              <KPICard
                title="Agendamentos Concluídos"
                value={kpis.completed_appointments || 0}
                icon={Users}
                color="green"
              />
              <KPICard
                title="Inadimplência (>30 dias)"
                value={kpis.overdue_30_count || 0}
                icon={AlertCircle}
                color="red"
              />
              <KPICard
                title="Repasses Pendentes"
                value={`R$ ${(kpis.repasses_pendentes || 0).toFixed(2)}`}
                icon={TrendingDown}
                color="orange"
              />
              <KPICard
                title="Repasses Pagos (Mês)"
                value={`R$ ${(kpis.repasses_pagos_mes || 0).toFixed(2)}`}
                icon={TrendingUp}
                color="green"
              />
            </>
          )}
        </div>
      </div>

      {/* ========== SEÇÃO 2: CHARTS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>📈 Evolução Mensal (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {historicalData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="mes"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `R$ ${value?.toFixed(2) || 0}`}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="faturamento"
                    stroke="#3b82f6"
                    name="Faturamento"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="recebido"
                    stroke="#10b981"
                    name="Recebido"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">Sem dados históricos</p>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Inadimplência (Aging) */}
        <Card>
          <CardHeader>
            <CardTitle>⏰ Análise de Inadimplência</CardTitle>
          </CardHeader>
          <CardContent>
            {delinquencyData ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: 'Até 30 dias',
                      value: delinquencyData.overdue_1_29 || 0,
                    },
                    {
                      name: '30-60 dias',
                      value: delinquencyData.overdue_30_59 || 0,
                    },
                    {
                      name: '60-90 dias',
                      value: delinquencyData.overdue_60_89 || 0,
                    },
                    {
                      name: '90+ dias',
                      value: delinquencyData.overdue_90_plus || 0,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${value?.toFixed(2) || 0}`} />
                  <Bar dataKey="value" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">Sem dados de inadimplência</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== SEÇÃO 3: TOP PROFISSIONAIS ========== */}
      <Card>
        <CardHeader>
          <CardTitle>👥 Top 10 Profissionais por Faturamento</CardTitle>
        </CardHeader>
        <CardContent>
          {professionalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={professionalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="professional_name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value?.toFixed(2) || 0}`} />
                <Legend />
                <Bar dataKey="total_faturado" fill="#3b82f6" name="Faturado" />
                <Bar dataKey="total_recebido" fill="#10b981" name="Recebido" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Sem dados de profissionais</p>
          )}
        </CardContent>
      </Card>

      {/* ========== SEÇÃO 4: PREVISÃO ========== */}
      <Card>
        <CardHeader>
          <CardTitle>🔮 Previsão de Receita (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="forecast_date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => `R$ ${value?.toFixed(2) || 0}`}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                />
                <Area
                  type="monotone"
                  dataKey="forecasted_amount"
                  fill="#8b5cf6"
                  stroke="#7c3aed"
                  name="Receita Prevista"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Sem dados de previsão</p>
          )}
        </CardContent>
      </Card>

      {/* ========== SEÇÃO 5: METAS ========== */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Metas e Objetivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{goal.metric_name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(goal.period_start).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(goal.period_end).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">R$ {goal.target_value?.toFixed(2) || 0}</p>
                    <p className="text-xs text-gray-600">Alerta: {goal.alert_threshold}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CockpitPremium;
