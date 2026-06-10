import React, { useState, useEffect } from 'react';
import { useClinicContext } from '../../contexts/useClinicContext';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { supabase } from '../../lib/customSupabaseClient';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, Users, Clock } from 'lucide-react';

export function DashboardDRE() {
  const { clinicId } = useClinicContext();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [delinquency, setDelinquency] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [repayments, setRepayments] = useState(null);
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    if (clinicId) {
      loadDashboardData();
    }
  }, [clinicId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // 1. KPIs Executivos
      const { data: kpiData, error: kpiError } = await supabase
        .from('v_executive_kpis')
        .select('*')
        .eq('clinic_id', clinicId);

      if (!kpiError) {
        const kpiMap = {};
        kpiData?.forEach(item => {
          kpiMap[item.metric_name] = {
            value: item.value,
            label: item.label
          };
        });
        setKpis(kpiMap);
      }

      // 2. Resumo Diário
      const { data: dailyData, error: dailyError } = await supabase
        .from('v_daily_financial_summary')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('data_sumario', { ascending: false })
        .limit(30);

      if (!dailyError) {
        setDailyData(dailyData?.reverse() || []);
      }

      // 3. Resumo Mensal
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('v_monthly_financial_summary')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('mes', { ascending: false })
        .limit(12);

      if (!monthlyError) {
        setMonthlyData(monthlyData?.reverse() || []);
      }

      // 4. Análise de Inadimplência
      const { data: delinquencyData, error: delinquencyError } = await supabase
        .from('v_delinquency_analysis')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('dias_atrasado', { ascending: false })
        .limit(10);

      if (!delinquencyError) {
        setDelinquency(delinquencyData || []);
      }

      // 5. Contribuição dos Profissionais
      const { data: proData, error: proError } = await supabase
        .from('v_professional_contribution')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('total_faturado', { ascending: false });

      if (!proError) {
        setProfessionals(proData || []);
      }

      // 6. Resumo de Repasses
      const { data: repaymentData, error: repaymentError } = await supabase
        .from('v_professional_repayment_summary')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('total_repayment_amount', { ascending: false });

      if (!repaymentError && repaymentData?.length > 0) {
        const summary = {
          total_repayments: repaymentData.reduce((sum, r) => sum + (r.total_repayments || 0), 0),
          total_amount: repaymentData.reduce((sum, r) => sum + (r.total_repayment_amount || 0), 0),
          paid_amount: repaymentData.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
          pending_amount: repaymentData.reduce((sum, r) => sum + ((r.total_repayment_amount || 0) - (r.paid_amount || 0)), 0)
        };
        setRepayments(summary);
      }

      // 7. Alertas
      const { data: alertData, error: alertError } = await supabase
        .from('v_alerts_summary_by_clinic')
        .select('*')
        .eq('clinic_id', clinicId)
        .single();

      if (!alertError) {
        setAlerts(alertData);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900">📊 DRE Dinâmica</h1>
        <p className="text-slate-600 mt-2">Dashboard financeiro em tempo real</p>
      </div>

      {/* ALERTAS */}
      {alerts && (alerts.total_alerts > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              ⚠️ Alertas Financeiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-red-700 font-medium">Total</p>
                <p className="text-2xl font-bold text-red-900">{alerts.total_alerts}</p>
              </div>
              <div>
                <p className="text-sm text-red-700 font-medium">🔴 Crítico</p>
                <p className="text-2xl font-bold text-red-900">{alerts.high_priority}</p>
              </div>
              <div>
                <p className="text-sm text-yellow-700 font-medium">🟡 Médio</p>
                <p className="text-2xl font-bold text-yellow-900">{alerts.medium_priority}</p>
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">🔵 Baixo</p>
                <p className="text-2xl font-bold text-blue-900">{alerts.low_priority}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Contas a Receber */}
        <Card className="bg-white border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              R$ {kpis?.['Contas a Receber']?.value?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-2">Valor total pendente</p>
          </CardContent>
        </Card>

        {/* Contas Pagas */}
        <Card className="bg-white border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Contas Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              R$ {kpis?.['Contas Pagas']?.value?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-2">Valor recebido</p>
          </CardContent>
        </Card>

        {/* Taxa de Recebimento */}
        <Card className="bg-white border-l-4 border-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Taxa de Recebimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {kpis?.['Taxa de Recebimento %']?.value?.toFixed(1) || '0'}%
            </p>
            <p className="text-xs text-slate-500 mt-2">Percentual recebido</p>
          </CardContent>
        </Card>

        {/* Repasses Pendentes */}
        <Card className="bg-white border-l-4 border-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Repasses Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              R$ {kpis?.['Repasses Pendentes']?.value?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-2">Aguardando pagamento</p>
          </CardContent>
        </Card>

        {/* Repasses Pagos */}
        <Card className="bg-white border-l-4 border-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Repasses Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              R$ {kpis?.['Repasses Pagos']?.value?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500 mt-2">Já repassado</p>
          </CardContent>
        </Card>

        {/* Total Repasses */}
        {repayments && (
          <Card className="bg-white border-l-4 border-indigo-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Total em Repasses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                R$ {repayments.total_amount?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {repayments.total_repayments} repasses
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo Diário */}
        {dailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📈 Fluxo de Caixa - Últimos 30 dias</CardTitle>
              <CardDescription>Movimento diário de receitas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="data_sumario"
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_amount"
                    stroke="#3b82f6"
                    name="Total Faturado"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_received"
                    stroke="#10b981"
                    name="Total Recebido"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Fluxo Mensal */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📅 Fluxo de Caixa - Últimos 12 meses</CardTitle>
              <CardDescription>Movimento mensal de receitas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="mes"
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="total_amount" fill="#3b82f6" name="Faturado" />
                  <Bar dataKey="total_received" fill="#10b981" name="Recebido" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* INADIMPLÊNCIA */}
      {delinquency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚠️ Análise de Inadimplência
            </CardTitle>
            <CardDescription>Contas vencidas por tempo de atraso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Paciente</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Dias Atrasado</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Classificação</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {delinquency.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">{item.patient_name}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-900">{item.dias_atrasado}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.dias_atrasado > 90 ? 'bg-red-100 text-red-800' :
                          item.dias_atrasado > 60 ? 'bg-orange-100 text-orange-800' :
                          item.dias_atrasado > 30 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {item.faixa_atraso}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        R$ {item.saldo_devedor?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PROFISSIONAIS */}
      {professionals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              👥 Contribuição dos Profissionais
            </CardTitle>
            <CardDescription>Faturamento e recebimento por profissional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Profissional</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Faturado</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Recebido</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">Taxa %</th>
                  </tr>
                </thead>
                <tbody>
                  {professionals.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{item.name}</td>
                      <td className="py-3 px-4 text-right font-mono text-blue-600">
                        R$ {item.total_faturado?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-green-600">
                        R$ {item.total_recebido?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          {item.taxa_recebimento_prof?.toFixed(1) || '0'}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RODAPÉ */}
      <div className="text-center py-6 text-sm text-slate-500">
        <p>Dashboard atualizado em tempo real • Últimas 24 horas • Clínica: {clinicId}</p>
      </div>
    </div>
  );
}

export default DashboardDRE;
