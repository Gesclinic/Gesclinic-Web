/**
 * DRE Monthly Chart Component
 * Line chart showing revenue, expenses, and net income over time
 */

import React from 'react';

export default function DREMonthlyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        Nenhum dado disponível ainda
      </div>
    );
  }

  // Reverse to show chronological order (oldest to newest)
  const sortedData = [...data].reverse();

  // Find min and max for scaling
  const values = sortedData.flatMap(d => [
    d.gross_revenue || 0,
    d.total_operating_expenses || 0,
    d.net_income || 0
  ]);
  const maxValue = Math.max(...values, 1);
  const minValue = 0;
  const range = maxValue - minValue;

  // SVG dimensions
  const width = 1000;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 50, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Calculate positions
  const pointSpacing = graphWidth / Math.max(sortedData.length - 1, 1);

  const getY = (value) => {
    return padding.top + graphHeight - (((value - minValue) / range) * graphHeight);
  };

  const getX = (index) => {
    return padding.left + index * pointSpacing;
  };

  // Create path strings
  const revenuePoints = sortedData.map((d, i) => `${getX(i)},${getY(d.gross_revenue || 0)}`).join(' L ');
  const expensePoints = sortedData.map((d, i) => `${getX(i)},${getY(d.total_operating_expenses || 0)}`).join(' L ');
  const incomePoints = sortedData.map((d, i) => `${getX(i)},${getY(d.net_income || 0)}`).join(' L ');

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
          const y = padding.top + graphHeight * (1 - factor);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fontSize="12"
                fill="#6b7280"
                textAnchor="end"
              >
                {`R$ ${((maxValue * factor) / 1000).toFixed(0)}k`}
              </text>
            </g>
          );
        })}

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#000"
          strokeWidth="2"
        />

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#000"
          strokeWidth="2"
        />

        {/* Revenue line (blue) */}
        <polyline
          points={revenuePoints}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Expense line (red) */}
        <polyline
          points={expensePoints}
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Income line (green) */}
        <polyline
          points={incomePoints}
          fill="none"
          stroke="#16a34a"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {sortedData.map((d, i) => (
          <g key={`points-${i}`}>
            {/* Revenue point */}
            <circle
              cx={getX(i)}
              cy={getY(d.gross_revenue || 0)}
              r="4"
              fill="#2563eb"
              className="hover:r-6 transition-all"
            />
            {/* Expense point */}
            <circle
              cx={getX(i)}
              cy={getY(d.total_operating_expenses || 0)}
              r="4"
              fill="#dc2626"
              className="hover:r-6 transition-all"
            />
            {/* Income point */}
            <circle
              cx={getX(i)}
              cy={getY(d.net_income || 0)}
              r="4"
              fill="#16a34a"
              className="hover:r-6 transition-all"
            />
            {/* Month label */}
            <text
              x={getX(i)}
              y={height - padding.bottom + 20}
              fontSize="11"
              fill="#6b7280"
              textAnchor="middle"
            >
              {new Date(d.period_start_date).toLocaleDateString('pt-BR', {
                month: 'short',
                year: '2-digit'
              })}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded" />
          <span className="text-sm text-gray-700">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded" />
          <span className="text-sm text-gray-700">Expenses</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span className="text-sm text-gray-700">Net Income</span>
        </div>
      </div>
    </div>
  );
}
