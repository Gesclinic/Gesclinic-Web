import React, { useEffect, useState } from 'react';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { financialAccountsApi, getAccountTypeIcon, formatBRL } from '@/lib/financialAccountsApi';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from 'lucide-react';

export default function DashboardDRE() {
  const { clinic } = useClinicContext();
  const { toast } = useToast();
  const clinicId = clinic?.id;

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dre, setDre] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  useEffect(() => {
    if (clinicId) {
      loadData();
    }
  }, [clinicId, selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Calcular período
      const today = new Date();
      let startDate, endDate;

      if (selectedPeriod === 'current') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
      } else {
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        startDate = prevMonth.toISOString();
        endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString();
      }

      // Carregar dados reais
      const dreData = await financialAccountsApi.calculateDREForPeriod(
        clinicId,
        startDate,
        endDate,
      );
      setDre(dreData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Usar dados mock se houver erro
      setDre(getMockDRE());
      toast({
        title: 'Aviso',
        description: 'Usando dados de exemplo. Configure transações financeiras.',
        variant: 'default',
      });
    } finally {
      setLoading(false);
    }
  };

  // 🚀 BLOCKER 3 FIX: Replace mock data with real queries
  const getMockDRE = () => ({
    receita: 0,
    deducao: 0,
    receitaLiquida: 0,
    custos: 0,
    margemBruta: 0,
    margemBrutaPct: 0,
    despesasAdmin: 0,
    despesasClinica: 0,
    despesasComercial: 0,
    despesasFinanceira: 0,
    totalDespesas: 0,
    ebitda: 0,
    ebitdaPct: 0,
    depreciacao: 0,
    lucroOperacional: 0,
    lucroOperacionalPct: 0,
    lucroLiquido: 0,
    lucroLiquidoPct: 0,
  });

  const calculateMetrics = () => {
    if (!dre) {
      return {};
    }
    return {
      margemBruta: dre.margemBrutaPct,
      margemOperacional: dre.ebitdaPct,
      margemLiquida: dre.lucroLiquidoPct,
      roa: ((dre.lucroLiquido / 500000) * 100).toFixed(2),
    };
  };

  const metrics = calculateMetrics();

  const chartData = [
    { name: 'Receita Bruta', value: Math.abs(dre?.receita || 0), fill: '#10b981' },
    { name: 'Deduções', value: Math.abs(dre?.deducao || 0), fill: '#ef4444' },
    { name: 'Custos Diretos', value: Math.abs(dre?.custos || 0), fill: '#f97316' },
    { name: 'Despesas Op.', value: Math.abs(dre?.totalDespesas || 0), fill: '#3b82f6' },
    { name: 'Lucro Líquido', value: Math.abs(dre?.lucroLiquido || 0), fill: '#8b5cf6' },
  ];

  const dreLineData = [
    { stage: 'Receita\nBruta', value: dre?.receita || 0, formatted: formatBRL(dre?.receita || 0) },
    {
      stage: 'Receita\nLíquida',
      value: dre?.receitaLiquida || 0,
      formatted: formatBRL(dre?.receitaLiquida || 0),
    },
    {
      stage: 'Margem\nBruta',
      value: dre?.margemBruta || 0,
      formatted: formatBRL(dre?.margemBruta || 0),
    },
    { stage: 'EBITDA', value: dre?.ebitda || 0, formatted: formatBRL(dre?.ebitda || 0) },
    {
      stage: 'Lucro\nOperacional',
      value: dre?.lucroOperacional || 0,
      formatted: formatBRL(dre?.lucroOperacional || 0),
    },
    {
      stage: 'Lucro\nLíquido',
      value: dre?.lucroLiquido || 0,
      formatted: formatBRL(dre?.lucroLiquido || 0),
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center p-12">Carregando...</div>;
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            📊 Demonstração de Resultado Exercício
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Análise de lucratividade, margens e indicadores estratégicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === 'current' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('current')}
          >
            Este Mês
          </Button>
          <Button
            variant={selectedPeriod === 'previous' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('previous')}
          >
            Mês Anterior
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Margem Bruta', value: `${metrics.margemBruta}%`, icon: '📈', color: 'green' },
          {
            label: 'Margem Operacional',
            value: `${metrics.margemOperacional}%`,
            icon: '📊',
            color: 'blue',
          },
          {
            label: 'Margem Líquida',
            value: `${metrics.margemLiquida}%`,
            icon: '💰',
            color: 'purple',
          },
          { label: 'ROA', value: `${metrics.roa}%`, icon: '🎯', color: 'yellow' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} className="border-0 shadow-md hover:shadow-lg transition">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {value}
                  </p>
                </div>
                <div className="text-3xl opacity-50">{icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DRE Statement */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📋</span>
            Demonstração de Resultado (Fluxo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Receita Bruta */}
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border-l-4 border-green-500">
              <span className="font-semibold text-green-900 dark:text-green-100">
                Receita Bruta
              </span>
              <span className="text-lg font-bold text-green-700 dark:text-green-300">
                {formatBRL(dre?.receita || 0)}
              </span>
            </div>

            {/* Deduções */}
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border-l-4 border-red-500 ml-6">
              <span className="text-slate-600 dark:text-slate-400">
                (-) Deduções (Impostos/Glosas)
              </span>
              <span className="text-red-700 dark:text-red-300 font-semibold">
                -{formatBRL(dre?.deducao || 0)}
              </span>
            </div>

            {/* Receita Líquida */}
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500 font-bold my-2">
              <span className="text-blue-900 dark:text-blue-100">= Receita Líquida</span>
              <span className="text-xl text-blue-700 dark:text-blue-300">
                {formatBRL(dre?.receitaLiquida || 0)}
              </span>
            </div>

            {/* Custos Diretos */}
            <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border-l-4 border-orange-500 ml-6">
              <span className="text-slate-600 dark:text-slate-400">
                (-) Custos Diretos (Repasse/Materiais)
              </span>
              <span className="text-orange-700 dark:text-orange-300 font-semibold">
                -{formatBRL(dre?.custos || 0)}
              </span>
            </div>

            {/* Margem Bruta */}
            <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-l-4 border-emerald-500 font-bold my-2">
              <span className="text-emerald-900 dark:text-emerald-100">
                = Margem Bruta ({(dre?.margemBrutaPct || 0).toFixed(1)}%)
              </span>
              <span className="text-xl text-emerald-700 dark:text-emerald-300">
                {formatBRL(dre?.margemBruta || 0)}
              </span>
            </div>

            {/* Despesas Operacionais */}
            <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-l-4 border-slate-400 ml-6">
              <span className="text-slate-600 dark:text-slate-400">
                (-) Despesas Administrativas
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                -{formatBRL(dre?.despesasAdmin || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-l-4 border-slate-400 ml-6">
              <span className="text-slate-600 dark:text-slate-400">(-) Despesas da Clínica</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                -{formatBRL(dre?.despesasClinica || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-l-4 border-slate-400 ml-6">
              <span className="text-slate-600 dark:text-slate-400">(-) Despesas Comerciais</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                -{formatBRL(dre?.despesasComercial || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-l-4 border-slate-400 ml-6">
              <span className="text-slate-600 dark:text-slate-400">(-) Despesas Financeiras</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                -{formatBRL(dre?.despesasFinanceira || 0)}
              </span>
            </div>

            {/* EBITDA */}
            <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border-l-4 border-indigo-500 font-bold my-2">
              <span className="text-indigo-900 dark:text-indigo-100">
                = EBITDA ({(dre?.ebitdaPct || 0).toFixed(1)}%)
              </span>
              <span className="text-xl text-indigo-700 dark:text-indigo-300">
                {formatBRL(dre?.ebitda || 0)}
              </span>
            </div>

            {/* Depreciação */}
            <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-l-4 border-slate-400 ml-6">
              <span className="text-slate-600 dark:text-slate-400">(-) Depreciação</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                -{formatBRL(dre?.depreciacao || 0)}
              </span>
            </div>

            {/* Lucro Operacional */}
            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border-l-4 border-purple-500 font-bold my-2">
              <span className="text-purple-900 dark:text-purple-100">
                = Lucro Operacional ({(dre?.lucroOperacionalPct || 0).toFixed(1)}%)
              </span>
              <span className="text-xl text-purple-700 dark:text-purple-300">
                {formatBRL(dre?.lucroOperacional || 0)}
              </span>
            </div>

            {/* Lucro Líquido */}
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-lg border-l-4 border-green-600 font-bold my-3">
              <span className="text-green-900 dark:text-green-100 text-lg">
                = Lucro Líquido ({(dre?.lucroLiquidoPct || 0).toFixed(1)}%)
              </span>
              <span className="text-2xl text-green-700 dark:text-green-300 font-extrabold">
                {formatBRL(dre?.lucroLiquido || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Composição */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📊</span>
              Composição do Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Fluxo DRE */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📈</span>
              Fluxo da DRE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dreLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Fluxo DRE"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Pontos Positivos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✓ Margem bruta saudável (66,7%)</p>
            <p>✓ Lucro operacional acima de 30%</p>
            <p>✓ ROA positivo (8%)</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-orange-600" />
              Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Reduzir custos de repasse (30% da receita)</p>
            <p>• Otimizar despesas comerciais</p>
            <p>• Aumentar ticket médio</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Metas Recomendadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>🎯 Margem líquida: 30%+</p>
            <p>🎯 EBITDA: 35%+</p>
            <p>🎯 Reduzir custos em 5-10%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
