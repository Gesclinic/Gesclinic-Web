import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
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
import type { DRESummary } from '@/lib/dreEnterpriseEngine';
import { useClinicContext } from '@/contexts/useClinicContext';
import { buildMonthlyMetrics, buildSegmentMetrics, loadDreActualData, type DrePeriod } from '@/modules/financeiro/dre/utils/dreActualData';

type Props = {
  summary: DRESummary | null;
  variant: string;
  loading?: boolean;
  period?: DrePeriod;
};

/**
 * ETAPA 17: Gráficos Premium
 * Suite completa de visualizações com Recharts para análise financeira
 */
export default function DRECharts({ summary, variant, loading = false, period }: Props) {
  const { clinicId } = useClinicContext();
  const [actualData, setActualData] = useState({
    loading: false,
    timeSeries: [] as Array<{ month: string; receita: number; custos: number; ebitda: number; lucro: number }>,
    convenio: [] as Array<{ name: string; value: number; percent: number }>,
    especialidade: [] as Array<{ name: string; receita: number; margem: number }>,
    centro: [] as Array<{ centro: string; ebitda: number; margem: number; receita: number }>,
    medico: [] as Array<{ nome: string; receita: number; margem: number }>,
  });

  useEffect(() => {
    if (!clinicId || !period) return;
    let active = true;

    const load = async () => {
      setActualData((current) => ({ ...current, loading: true }));
      try {
        const consolidation = await loadDreActualData(clinicId, period);
        const timeSeries = buildMonthlyMetrics(consolidation);
        const convenioRows = buildSegmentMetrics(consolidation, 'convenios').sort((a, b) => b.receita - a.receita).slice(0, 5);
        const especialidadeRows = buildSegmentMetrics(consolidation, 'especialidades').sort((a, b) => b.receita - a.receita).slice(0, 5);
        const centroRows = buildSegmentMetrics(consolidation, 'centros').sort((a, b) => b.ebitda - a.ebitda).slice(0, 5);
        const medicoRows = buildSegmentMetrics(consolidation, 'medicos').sort((a, b) => b.receita - a.receita).slice(0, 5);
        const totalConvenios = convenioRows.reduce((sum, item) => sum + item.receita, 0);

        if (active) {
          setActualData({
            loading: false,
            timeSeries,
            convenio: convenioRows.map((item) => ({
              name: item.name,
              value: item.receita,
              percent: totalConvenios > 0 ? Number(((item.receita / totalConvenios) * 100).toFixed(1)) : 0,
            })),
            especialidade: especialidadeRows.map((item) => ({ name: item.name, receita: item.receita, margem: item.margem })),
            centro: centroRows.map((item) => ({ centro: item.name, ebitda: item.ebitda, margem: item.margem, receita: item.receita })),
            medico: medicoRows.map((item) => ({ nome: item.name, receita: item.receita, margem: item.margem })),
          });
        }
      } catch (error) {
        console.warn('[DRECharts] Erro ao carregar dados reais:', error);
        if (active) setActualData((current) => ({ ...current, loading: false }));
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [clinicId, period?.end, period?.start]);

  const showCharts = variant !== 'projetada' && variant !== 'especialidade';

  if (!showCharts) return null;
  if (loading || actualData.loading) return <Card className="p-6 animate-pulse h-96 bg-gray-100" />;
  if (!summary) return null;

  const timeSeriesData = actualData.timeSeries.length > 0
    ? actualData.timeSeries
    : [{ month: 'Período', receita: summary.receitaBruta, custos: summary.custosFixos + summary.custosVariaveis + summary.despesasOperacionais, ebitda: summary.ebitda, lucro: summary.lucroLiquido }];
  const convenioData = actualData.convenio;
  const especialidadeData = actualData.especialidade;
  const centroData = actualData.centro;
  const medicoData = actualData.medico;

  const contabilData = useMemo(() => {
    return [
      { label: 'Receita Bruta', value: summary.receitaBruta, tone: '#3b82f6' },
      { label: 'Deduções', value: summary.deducoes, tone: '#ef4444' },
      { label: 'Receita Líquida', value: summary.receitaLiquida, tone: '#10b981' },
      { label: 'Despesas Operacionais', value: summary.despesasOperacionais, tone: '#f59e0b' },
      { label: 'EBITDA', value: summary.ebitda, tone: '#8b5cf6' },
      { label: 'Lucro Líquido', value: summary.lucroLiquido, tone: '#14b8a6' },
    ];
  }, [summary]);

  const contabilPieData = useMemo(() => {
    return [
      { name: 'Receita Líquida', value: Math.max(summary.receitaLiquida, 0) },
      { name: 'Deduções', value: Math.max(summary.deducoes, 0) },
      { name: 'Custos Fixos', value: Math.max(summary.custosFixos, 0) },
      { name: 'Custos Variáveis', value: Math.max(summary.custosVariaveis, 0) },
      { name: 'Despesas Operacionais', value: Math.max(summary.despesasOperacionais, 0) },
      { name: 'Lucro', value: Math.max(summary.lucroLiquido, 0) },
    ].filter((item) => item.value > 0);
  }, [summary]);

  const variantTitle = {
    gerencial: 'Análise Gráfica Premium - Gerencial',
    contabil: 'Análise Gráfica Premium - Contábil',
    centro: 'Análise Gráfica Premium - Centro de Custo',
    medico: 'Análise Gráfica Premium - Médico',
    convenio: 'Análise Gráfica Premium - Convênio',
    unidade: 'Análise Gráfica Premium - Unidade',
    especialidade: 'Análise Gráfica Premium - Especialidade',
    projetada: 'Análise Gráfica Premium - Projetada',
  }[variant] || 'Análise Gráfica Premium';

  const variantDescription = {
    gerencial: 'Visão consolidada com os principais cortes da operação.',
    contabil: 'Foco em classificação, resultado e composição de custos.',
    centro: 'Leitura por centro de custo e eficiência operacional.',
    medico: 'Ênfase em produtividade e rentabilidade por profissional.',
    convenio: 'Ênfase em glosa, recebimento e performance por pagador.',
    unidade: 'Comparativo entre unidades e eficiência por operação.',
    especialidade: 'Leitura por linha assistencial e margem por especialidade.',
    projetada: 'Cenários projetados e sensibilidade de caixa.',
  }[variant] || 'Suite completa de visualizações financeiras';

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 rounded border border-gray-300 text-sm">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className="text-gray-700">
              {entry.name}: R$ {(entry.value / 1000).toFixed(1)}k
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* TÍTULO */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          📊 Análise Gráfica Premium
        </h2>
        <p className="text-sm text-gray-600 mt-1">{variantDescription}</p>
      </div>

      <Card className="p-4 border-slate-200 bg-slate-50">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{variantTitle}</p>
        <p className="text-sm text-slate-700 mt-1">
          Os gráficos abaixo mudam de composição conforme a aba ativa para evitar repetição visual entre visões.
        </p>
      </Card>

      {variant === 'gerencial' && (
        <>
          {/* FILA 1: Evolução Receita + Custos + EBITDA + Lucro */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Receita */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">📈 Evolução da Receita</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
              <Area
                type="monotone"
                dataKey="receita"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorReceita)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Evolução Custos vs EBITDA */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">💰 Custos vs EBITDA</h3>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
              <Legend />
              <Bar dataKey="custos" fill="#ef4444" name="Custos" />
              <Line type="monotone" dataKey="ebitda" stroke="#10b981" name="EBITDA" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
          </div>

          {/* FILA 2: Receita por Convênio + Receita por Especialidade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita por Convênio (Pizza) */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🏥 Receita por Convênio</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={convenioData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${percent}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {convenioData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Receita vs Margem por Especialidade */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🏥 Receita x Margem por Especialidade</h3>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={especialidadeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => (typeof value === 'number' && value > 100 ? `R$ ${(value / 1000).toFixed(1)}k` : `${value}%`)} />
              <Legend />
              <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
              <Line type="monotone" dataKey="margem" stroke="#10b981" name="Margem %" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
          </div>

          {/* FILA 3: Evolução Lucro + Centros de Custo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Lucro */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">💸 Evolução do Lucro Líquido</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
              <Line
                type="monotone"
                dataKey="lucro"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
                name="Lucro Líquido"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* EBITDA por Centro de Custo */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🏢 EBITDA por Centro de Custo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={centroData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="centro" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
              <Bar dataKey="ebitda" fill="#3b82f6" name="EBITDA" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
          </div>

          {/* FILA 4: Comparativo Mensal Completo */}
          <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📊 Comparativo Mensal - Receita, Custos, EBITDA e Lucro</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
            <Legend />
            <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
            <Bar dataKey="custos" fill="#ef4444" name="Custos" />
            <Bar dataKey="ebitda" fill="#10b981" name="EBITDA" />
            <Bar dataKey="lucro" fill="#f59e0b" name="Lucro" />
          </BarChart>
        </ResponsiveContainer>
          </Card>
        </>
      )}

      {variant === 'contabil' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📒 Composição Contábil do Resultado</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={contabilData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${(Number(value) / 1000).toFixed(1)}k`} />
                  <Bar dataKey="value" fill="#2563eb" name="Valor" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">🧾 Peso dos Componentes Contábeis</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={contabilPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${percent}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {contabilPieData.map((entry, index) => (
                      <Cell key={`contabil-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${(Number(value) / 1000).toFixed(1)}k`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">📈 Evolução Contábil do Período</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(Number(value) / 1000).toFixed(1)}k`} />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={2} name="Receita" />
                <Line type="monotone" dataKey="custos" stroke="#ef4444" strokeWidth={2} name="Custos" />
                <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {variant === 'centro' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">🏢 EBITDA por Centro de Custo</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={centroData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="centro" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `R$ ${(Number(value) / 1000).toFixed(1)}k`} />
                  <Bar dataKey="ebitda" fill="#8b5cf6" name="EBITDA" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">⚙️ Eficiência Operacional por Centro</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={centroData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="centro" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="margem" fill="#10b981" name="Margem %" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">📊 Comparativo Receita x EBITDA x Lucro</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(Number(value) / 1000).toFixed(1)}k`} />
                <Legend />
                <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
                <Bar dataKey="ebitda" fill="#8b5cf6" name="EBITDA" />
                <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} name="Lucro" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {variant === 'medico' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">👨‍⚕️ Receita por Profissional</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={medicoData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                  <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📈 Margem por Profissional</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={medicoData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="margem" fill="#10b981" name="Margem %" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">📊 Série Temporal da Produção</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={2} name="Receita" />
                <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {variant === 'convenio' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">🏥 Receita por Convênio</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={convenioData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${percent}%`}
                    outerRadius={85}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {convenioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">💸 Recebimento e Glosa</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                  <Legend />
                  <Bar dataKey="custos" fill="#f59e0b" name="Glosa/Pressão" />
                  <Line type="monotone" dataKey="receita" stroke="#3b82f6" name="Receita" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">📊 Evolução de Receita e Lucro por Convênio</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                <Legend />
                <Area type="monotone" dataKey="receita" stroke="#3b82f6" fill="#bfdbfe" name="Receita" />
                <Area type="monotone" dataKey="lucro" stroke="#10b981" fill="#bbf7d0" name="Lucro" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {variant === 'unidade' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">🏢 EBITDA por Unidade</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={centroData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="centro" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                  <Bar dataKey="ebitda" fill="#8b5cf6" name="EBITDA" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📈 Comparativo Receita x Lucro</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                  <Legend />
                  <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
                  <Line type="monotone" dataKey="lucro" stroke="#f59e0b" name="Lucro" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">📊 Eficiência Operacional</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                <Legend />
                <Line type="monotone" dataKey="ebitda" stroke="#8b5cf6" strokeWidth={2} name="EBITDA" />
                <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {variant === 'especialidade' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">🏥 Receita x Margem por Especialidade</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={especialidadeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => (typeof value === 'number' && value > 100 ? `R$ ${(value / 1000).toFixed(1)}k` : `${value}%`)} />
                  <Legend />
                  <Bar dataKey="receita" fill="#3b82f6" name="Receita" />
                  <Line type="monotone" dataKey="margem" stroke="#10b981" name="Margem %" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📈 Evolução do Lucro Líquido</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                  <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} name="Lucro Líquido" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">📊 Receita por Especialidade</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={especialidadeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`} />
                <Bar dataKey="receita" fill="#06b6d4" name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* RESUMO EXECUTIVO */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-4">📌 Resumo da Análise Gráfica</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600 font-semibold">Receita Média Mensal</p>
            <p className="text-lg font-bold text-blue-900 mt-1">
              R$ {(timeSeriesData.reduce((sum, d) => sum + d.receita, 0) / timeSeriesData.length / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">EBITDA Médio Mensal</p>
            <p className="text-lg font-bold text-green-900 mt-1">
              R$ {(timeSeriesData.reduce((sum, d) => sum + d.ebitda, 0) / timeSeriesData.length / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-semibold">Margem Média</p>
            <p className="text-lg font-bold text-indigo-900 mt-1">
              {(
                (timeSeriesData.reduce((sum, d) => sum + d.lucro, 0) /
                  timeSeriesData.reduce((sum, d) => sum + d.receita, 0)) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
