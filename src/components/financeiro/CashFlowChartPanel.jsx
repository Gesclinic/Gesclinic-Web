import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/financialCalculations';

/**
 * 📈 Gráfico de Fluxo de Caixa
 * 
 * Exibe:
 * - Linha: Saldo Realizado (azul)
 * - Linha: Saldo Projetado (verde tracejado)
 * - Barras: Entradas (verde claro)
 * - Barras: Saídas (vermelho claro)
 * - Tooltip customizado
 */
export default function CashFlowChartPanel(props) {
  const { dailyData = [], projection = [], loading = false } = props;

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    if (!Array.isArray(dailyData) || dailyData.length === 0) return [];

    return dailyData.map((day) => {
      // Encontrar dados de projeção correspondente
      const projData = projection?.find((p) => p.date === day.date);

      return {
        date: formatDate(day.date),
        inflow: day.inflow || 0,
        outflow: day.outflow || 0,
        realBalance: day.balance || 0,
        projectedBalance: projData?.projected_balance || day.balance || 0,
      };
    });
  }, [dailyData, projection]);

  if (loading) {
    return (
      <Card className="p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6 mb-6 text-center text-gray-500 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700 h-80 flex items-center justify-center">
        <div>
          <p className="text-lg font-medium">Sem dados de fluxo de caixa</p>
          <p className="text-sm mt-2">Configure o período e tente novamente</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6 dark:bg-gray-800 dark:border-gray-700 animate-slide-up">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Fluxo de Caixa - Real vs Previsto
      </h2>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            verticalAlign="top"
            height={36}
          />

          {/* Barras de Entradas */}
          <Bar dataKey="inflow" fill="#86efac" name="Entradas" opacity={0.7} />

          {/* Barras de Saídas */}
          <Bar dataKey="outflow" fill="#fca5a5" name="Saídas" opacity={0.7} />

          {/* Linha de Saldo Realizado */}
          <Line
            type="monotone"
            dataKey="realBalance"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Saldo Realizado"
          />

          {/* Linha de Saldo Projetado */}
          <Line
            type="monotone"
            dataKey="projectedBalance"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Saldo Projetado"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legenda Customizada */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <LegendItem color="bg-green-200 dark:bg-green-800" label="Entradas" />
        <LegendItem color="bg-red-200 dark:bg-red-800" label="Saídas" />
        <LegendItem color="bg-blue-400 dark:bg-blue-700" label="Saldo Realizado" />
        <LegendItem color="bg-green-400 dark:bg-green-700" label="Saldo Projetado" dashed />
      </div>
    </Card>
  );
}

/**
 * Tooltip customizado para o gráfico
 */
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white">{data.date}</p>
        <p className="text-sm text-green-600 dark:text-green-400">
          📥 Entradas: {formatCurrency(data.inflow)}
        </p>
        <p className="text-sm text-red-600 dark:text-red-400">
          📤 Saídas: {formatCurrency(data.outflow)}
        </p>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2">
          Saldo Real: {formatCurrency(data.realBalance)}
        </p>
        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
          Saldo Proj: {formatCurrency(data.projectedBalance)}
        </p>
      </div>
    );
  }
  return null;
}

/**
 * Item de legenda customizado
 */
function LegendItem({
  color,
  label,
  dashed = false,
}) {
  return (
    <div className="flex items-center gap-2">
      {dashed ? (
        <div className={`w-4 h-0.5 ${color} border-b-2 border-dashed`} />
      ) : (
        <div className={`w-4 h-3 ${color} rounded`} />
      )}
      <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
    </div>
  );
}

/**
 * Formata data para exibição
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}
