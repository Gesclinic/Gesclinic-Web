/**
 * 🔮 CashFlowForecast Component
 * 
 * Displays linear projection with confidence interval
 * Uses historical data to forecast future cash flow
 */

import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { formatCurrency, linearProjection } from '../utils/calculations';

export interface ForecastData {
  date: string;
  actual: number;
  projected: number;
  upper: number;
  lower: number;
}

export interface CashFlowForecastProps {
  historicalData: Array<{ date: string; balance: number }>;
  days?: number;
  confidence?: number;
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

/**
 * Simple linear regression forecast
 */
const generateForecast = (
  data: Array<{ date: string; balance: number }>,
  daysAhead: number = 30,
  confidence: number = 0.95,
): ForecastData[] => {
  if (data.length < 2) return [];

  // Calculate linear regression
  const n = data.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const ys = data.map(d => d.balance);

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  const numerator = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate standard error
  const residuals = ys.map((y, i) => y - (slope * xs[i] + intercept));
  const mse = residuals.reduce((sum, r) => sum + r ** 2, 0) / (n - 2);
  const se = Math.sqrt(mse);

  // Generate forecast
  const forecast: ForecastData[] = [];
  const lastDate = new Date(data[data.length - 1].date);

  // Include historical data
  data.forEach((d, i) => {
    const predicted = slope * i + intercept;
    forecast.push({
      date: d.date,
      actual: d.balance,
      projected: predicted,
      upper: predicted + se * 1.96,
      lower: predicted - se * 1.96,
    });
  });

  // Add future forecast
  for (let i = 1; i <= daysAhead; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    const dateStr = futureDate.toISOString().split('T')[0];

    const x = n + i - 1;
    const predicted = slope * x + intercept;
    forecast.push({
      date: dateStr,
      actual: 0,
      projected: predicted,
      upper: predicted + se * 1.96,
      lower: predicted - se * 1.96,
    });
  }

  return forecast;
};

/**
 * SVG Line Chart with confidence interval
 */
const ForecastChart = memo(({
  data,
  height = 300,
}: {
  data: ForecastData[];
  height?: number;
}) => {
  if (!data || data.length === 0) return null;

  const margin = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = 600;
  const width = chartWidth - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Find min/max values including confidence interval
  const allValues = data.flatMap(d => [d.upper, d.lower, d.projected, d.actual]);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const range = maxValue - minValue || 1;

  const xScale = width / Math.max(data.length - 1, 1);
  const yScale = chartHeight / range;

  // Create confidence interval fill
  const areaPoints = [
    ...data.map((point, idx) => {
      const x = margin.left + idx * xScale;
      const y = margin.top + chartHeight - (point.lower - minValue) * yScale;
      return `${x},${y}`;
    }),
    ...data
      .slice()
      .reverse()
      .map((point, idx) => {
        const actualIdx = data.length - 1 - idx;
        const x = margin.left + actualIdx * xScale;
        const y = margin.top + chartHeight - (point.upper - minValue) * yScale;
        return `${x},${y}`;
      }),
  ].join(' ');

  // Create projected line points
  const projectedPoints = data
    .map((point, idx) => {
      const x = margin.left + idx * xScale;
      const y = margin.top + chartHeight - (point.projected - minValue) * yScale;
      return `${x},${y}`;
    })
    .join(' ');

  // Create actual line points
  const actualPoints = data
    .filter(d => d.actual !== 0)
    .map((point, _, allActual) => {
      const idx = data.findIndex(d => d.date === point.date);
      const x = margin.left + idx * xScale;
      const y = margin.top + chartHeight - (point.actual - minValue) * yScale;
      return `${x},${y}`;
    })
    .join(' ');

  const splitPoint = data.findIndex(d => d.actual === 0);

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

      {/* Confidence interval fill */}
      {areaPoints && (
        <polyline
          points={areaPoints}
          fill="#93c5fd"
          fillOpacity="0.2"
        />
      )}

      {/* Axes */}
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={margin.top + chartHeight}
        stroke="#d1d5db"
        strokeWidth="2"
      />
      <line
        x1={margin.left}
        y1={margin.top + chartHeight}
        x2={chartWidth - margin.right}
        y2={margin.top + chartHeight}
        stroke="#d1d5db"
        strokeWidth="2"
      />

      {/* Vertical line separating actual and forecast */}
      {splitPoint > 0 && (
        <line
          x1={margin.left + splitPoint * xScale}
          y1={margin.top}
          x2={margin.left + splitPoint * xScale}
          y2={margin.top + chartHeight}
          stroke="#d1d5db"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
      )}

      {/* Projected line */}
      <polyline
        points={projectedPoints}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Actual line */}
      {actualPoints && (
        <polyline
          points={actualPoints}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {/* Data points - actual */}
      {data
        .filter((d, i) => i < splitPoint)
        .map((point, _, actualData) => {
          const idx = data.findIndex(d => d.date === point.date);
          const x = margin.left + idx * xScale;
          const y = margin.top + chartHeight - (point.actual - minValue) * yScale;
          return (
            <circle
              key={`actual-${idx}`}
              cx={x}
              cy={y}
              r="4"
              fill="#10b981"
              stroke="white"
              strokeWidth="2"
            />
          );
        })}

      {/* Data points - projected */}
      {data
        .filter((_, i) => i >= splitPoint)
        .map((point, _, projectedData) => {
          const idx = data.findIndex(d => d.date === point.date);
          const x = margin.left + idx * xScale;
          const y = margin.top + chartHeight - (point.projected - minValue) * yScale;
          return (
            <circle
              key={`projected-${idx}`}
              cx={x}
              cy={y}
              r="3"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.6"
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

      {/* Legend background */}
      <text
        x={margin.left + 10}
        y={margin.top + 20}
        fontSize="12"
        fill="#6b7280"
        fontWeight="bold"
      >
        ―
      </text>
      <text
        x={margin.left + 25}
        y={margin.top + 20}
        fontSize="12"
        fill="#10b981"
      >
        Real
      </text>

      <text
        x={margin.left + 80}
        y={margin.top + 20}
        fontSize="12"
        fill="#6b7280"
        fontWeight="bold"
      >
        ―
      </text>
      <text
        x={margin.left + 95}
        y={margin.top + 20}
        fontSize="12"
        fill="#3b82f6"
      >
        Projeção
      </text>
    </svg>
  );
});

const CashFlowForecast = memo(({
  historicalData,
  days = 30,
  confidence = 0.95,
  title = 'Projeção 30 Dias',
  description = 'Previsão baseada em tendência linear com intervalo de confiança',
  isLoading = false,
  error,
  className = '',
}: CashFlowForecastProps) => {
  const forecastData = useMemo(() => {
    return generateForecast(historicalData, days, confidence);
  }, [historicalData, days, confidence]);

  const stats = useMemo(() => {
    if (forecastData.length === 0) return null;

    const lastActual = forecastData
      .filter(d => d.actual !== 0)
      .pop();
    const lastForecast = forecastData[forecastData.length - 1];

    return {
      currentBalance: lastActual?.actual || 0,
      projectedBalance: lastForecast.projected,
      change: lastForecast.projected - (lastActual?.actual || 0),
      upper: lastForecast.upper,
      lower: lastForecast.lower,
    };
  }, [forecastData]);

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

  if (!historicalData || historicalData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            Necessário pelo menos 2 pontos de dados para gerar projeção
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Chart */}
          <div className="overflow-x-auto">
            <ForecastChart data={forecastData} height={300} />
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {/* Current Balance */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-gray-600 font-medium">Saldo Atual</p>
                <p className="text-lg font-bold text-blue-600 mt-1">
                  {formatCurrency(stats.currentBalance)}
                </p>
              </div>

              {/* Projected Balance */}
              <div className={`rounded-lg p-4 border ${
                stats.change >= 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs text-gray-600 font-medium">Projeção (+30d)</p>
                <p className={`text-lg font-bold mt-1 ${
                  stats.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(stats.projectedBalance)}
                </p>
              </div>

              {/* Variance */}
              <div className={`rounded-lg p-4 border ${
                stats.change >= 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs text-gray-600 font-medium">Variação</p>
                <p className={`text-lg font-bold mt-1 ${
                  stats.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.change >= 0 ? '+' : '-'}{formatCurrency(Math.abs(stats.change))}
                </p>
              </div>

              {/* Confidence Interval */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-xs text-gray-600 font-medium">Intervalo 95%</p>
                <p className="text-xs text-purple-600 mt-1 font-mono">
                  [{formatCurrency(stats.lower)} ... {formatCurrency(stats.upper)}]
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-600" />
              <span>Dados Reais</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-600" />
              <span>Projeção Linear</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-2 bg-blue-200 opacity-50 rounded" />
              <span>Intervalo de Confiança (95%)</span>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-4 text-gray-500">
              Gerando projeção...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

CashFlowForecast.displayName = 'CashFlowForecast';

export default CashFlowForecast;
