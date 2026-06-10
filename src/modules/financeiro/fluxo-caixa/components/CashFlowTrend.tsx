/**
 * 📈 CashFlowTrend Component
 * 
 * Displays a line chart with 30-day trend analysis and comparison
 * Shows income vs expense trends over time
 */

import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export interface TrendPoint {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CashFlowTrendProps {
  data: TrendPoint[];
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  className?: string;
  onPointClick?: (point: TrendPoint) => void;
}

/**
 * Simple SVG Line Chart
 */
const LineChart = memo(({
  data,
  height = 300,
  dataKey = 'balance',
}: {
  data: TrendPoint[];
  height?: number;
  dataKey: 'income' | 'expense' | 'balance';
}) => {
  const margin = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = 600;
  const width = chartWidth - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Find min/max values
  const values = data.map(d => d[dataKey]);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const range = maxValue - minValue || 1;

  // Calculate scale
  const xScale = width / Math.max(data.length - 1, 1);
  const yScale = chartHeight / range;

  // Create path for line
  const points = data
    .map((point, idx) => {
      const x = margin.left + idx * xScale;
      const y = margin.top + chartHeight - (point[dataKey] - minValue) * yScale;
      return `${x},${y}`;
    })
    .join(' ');

  // Create fill area
  const areaPoints = [
    `${margin.left},${margin.top + chartHeight}`,
    ...data.map((point, idx) => {
      const x = margin.left + idx * xScale;
      const y = margin.top + chartHeight - (point[dataKey] - minValue) * yScale;
      return `${x},${y}`;
    }),
    `${margin.left + width},${margin.top + chartHeight}`,
  ].join(' ');

  const getColor = (key: string) => {
    switch (key) {
      case 'income': return '#10b981';
      case 'expense': return '#ef4444';
      case 'balance': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <svg width={chartWidth} height={height} className="w-full">
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <line
          key={`grid-${i}`}
          x1={margin.left}
          y1={margin.top + (chartHeight / 4) * i}
          x2={chartWidth - margin.right}
          y2={margin.top + (chartHeight / 4) * i}
          stroke="#e5e7eb"
          strokeDasharray="5,5"
        />
      ))}

      {/* Y-axis */}
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={margin.top + chartHeight}
        stroke="#d1d5db"
        strokeWidth="2"
      />

      {/* X-axis */}
      <line
        x1={margin.left}
        y1={margin.top + chartHeight}
        x2={chartWidth - margin.right}
        y2={margin.top + chartHeight}
        stroke="#d1d5db"
        strokeWidth="2"
      />

      {/* Fill area */}
      <polyline
        points={areaPoints}
        fill={getColor(dataKey)}
        fillOpacity="0.1"
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={getColor(dataKey)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {data.map((point, idx) => {
        const x = margin.left + idx * xScale;
        const y = margin.top + chartHeight - (point[dataKey] - minValue) * yScale;
        return (
          <circle
            key={`point-${idx}`}
            cx={x}
            cy={y}
            r="4"
            fill={getColor(dataKey)}
            stroke="white"
            strokeWidth="2"
          />
        );
      })}

      {/* X-axis labels */}
      {data
        .filter((_, idx) => idx % Math.ceil(data.length / 4) === 0 || idx === data.length - 1)
        .map((point, idx, filtered) => {
          const actualIdx = data.findIndex(d => d.date === point.date);
          const x = margin.left + actualIdx * xScale;
          return (
            <text
              key={`label-${actualIdx}`}
              x={x}
              y={margin.top + chartHeight + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
            >
              {point.date.substring(5)}
            </text>
          );
        })}
    </svg>
  );
});

const CashFlowTrend = memo(({
  data,
  title = 'Tendência 30 Dias',
  description = 'Evolução do fluxo de caixa ao longo do período',
  isLoading = false,
  error,
  className = '',
  onPointClick,
}: CashFlowTrendProps) => {
  const statistics = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const incomeValues = data.map(d => d.income);
    const expenseValues = data.map(d => d.expense);
    const balanceValues = data.map(d => d.balance);

    return {
      avgIncome: incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length,
      avgExpense: expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length,
      avgBalance: balanceValues.reduce((a, b) => a + b, 0) / balanceValues.length,
      maxBalance: Math.max(...balanceValues),
      minBalance: Math.min(...balanceValues),
      trend: balanceValues.length > 1
        ? balanceValues[balanceValues.length - 1] - balanceValues[0]
        : 0,
    };
  }, [data]);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            Nenhum dado disponível para este período
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Chart */}
          <div className="overflow-x-auto">
            <LineChart data={data} dataKey="balance" height={300} />
          </div>

          {/* Statistics Grid */}
          {statistics && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {/* Average Balance */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-gray-600 font-medium">Saldo Médio</p>
                <p className="text-lg font-bold text-blue-600 mt-1">
                  {formatCurrency(statistics.avgBalance)}
                </p>
              </div>

              {/* Max Balance */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-xs text-gray-600 font-medium">Saldo Máximo</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  {formatCurrency(statistics.maxBalance)}
                </p>
              </div>

              {/* Min Balance */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-xs text-gray-600 font-medium">Saldo Mínimo</p>
                <p className="text-lg font-bold text-red-600 mt-1">
                  {formatCurrency(statistics.minBalance)}
                </p>
              </div>

              {/* Trend */}
              <div className={`${
                statistics.trend >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              } rounded-lg p-4 border`}>
                <p className="text-xs text-gray-600 font-medium">Tendência</p>
                <div className="flex items-center gap-2 mt-1">
                  {statistics.trend >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <p className={`text-lg font-bold ${
                    statistics.trend >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(Math.abs(statistics.trend))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-4 text-gray-500">
              Carregando gráfico de tendência...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

CashFlowTrend.displayName = 'CashFlowTrend';

export default CashFlowTrend;
