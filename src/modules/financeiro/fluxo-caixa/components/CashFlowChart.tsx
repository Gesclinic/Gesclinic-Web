/**
 * 💰 CashFlowChart Component
 * Gráficos com Recharts
 */

import React, { memo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

interface CashFlowChartProps {
  data: any[];
  type: 'line' | 'bar' | 'pie';
  title?: string;
  dataKey?: string;
  className?: string;
}

const COLORS = [
  '#10b981', // green
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // amber
];

const CashFlowChart = memo(({
  data,
  type,
  title,
  dataKey = 'value',
  className = '',
}: CashFlowChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const ChartTooltip = (props: any) => {
    const { active, payload } = props;

    if (!active || !payload) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300} className={className}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={value => formatCurrency(value)} tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#3b82f6"
            dot={false}
            name="Saldo Projetado"
            strokeWidth={2}
          />
          {data[0]?.realized_balance !== undefined && (
            <Line
              type="monotone"
              dataKey="realized_balance"
              stroke="#10b981"
              dot={false}
              name="Saldo Realizado"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300} className={className}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={value => formatCurrency(value)} tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Entradas" />
          <Bar dataKey="expense" fill="#ef4444" name="Saídas" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'pie') {
    const pieData = data.slice(0, 6).map((item, index) => ({
      ...item,
      value: item[dataKey] || 0,
    }));

    return (
      <ResponsiveContainer width="100%" height={300} className={className}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
});

CashFlowChart.displayName = 'CashFlowChart';

export default CashFlowChart;
