/**
 * DRE Comparison Component
 * Month-over-month and Year-over-year comparison
 */

import React from 'react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

const formatPercent = (value) => {
  return `${(value || 0).toFixed(2)}%`;
};

const TrendBadge = ({ trend, value }) => {
  const isPositive = trend === 'UP';
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
      isPositive ? 'bg-green-100' : 'bg-red-100'
    }`}>
      <span className={isPositive ? 'text-green-700' : 'text-red-700'}>
        {isPositive ? '↑' : '↓'}
      </span>
      <span className={`font-semibold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
        {formatPercent(Math.abs(value))}
      </span>
    </div>
  );
};

export default function DREComparison({ currentMonth, previousMonth }) {
  if (!currentMonth || !previousMonth) {
    return (
      <div className="text-center py-8 text-gray-500">
        Not enough data for comparison
      </div>
    );
  }

  const revenueVariance = (currentMonth.gross_revenue - previousMonth.gross_revenue);
  const revenueTrend = revenueVariance >= 0 ? 'UP' : 'DOWN';
  const revenuePercent = previousMonth.gross_revenue
    ? ((revenueVariance / previousMonth.gross_revenue) * 100)
    : 0;

  const expenseVariance = (currentMonth.total_operating_expenses - previousMonth.total_operating_expenses);
  const expenseTrend = expenseVariance >= 0 ? 'UP' : 'DOWN';
  const expensePercent = previousMonth.total_operating_expenses
    ? ((expenseVariance / previousMonth.total_operating_expenses) * 100)
    : 0;

  const incomeVariance = (currentMonth.net_income - previousMonth.net_income);
  const incomeTrend = incomeVariance >= 0 ? 'UP' : 'DOWN';
  const incomePercent = previousMonth.net_income
    ? ((incomeVariance / previousMonth.net_income) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Revenue Comparison */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">REVENUE COMPARISON</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Month</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentMonth.gross_revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Previous Month</p>
            <p className="text-lg font-semibold text-gray-600">
              {formatCurrency(previousMonth.gross_revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Variance</p>
            <div className="flex items-center gap-3">
              <TrendBadge trend={revenueTrend} value={revenuePercent} />
              <span className="text-gray-600">{formatCurrency(revenueVariance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Comparison */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">EXPENSE COMPARISON</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Month</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(currentMonth.total_operating_expenses)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Previous Month</p>
            <p className="text-lg font-semibold text-gray-600">
              {formatCurrency(previousMonth.total_operating_expenses)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Variance</p>
            <div className="flex items-center gap-3">
              {/* For expenses, DOWN trend is good */}
              <TrendBadge
                trend={expenseVariance >= 0 ? 'UP' : 'DOWN'}
                value={expensePercent}
              />
              <span className="text-gray-600">{formatCurrency(expenseVariance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Income Comparison */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">NET INCOME COMPARISON</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Month</p>
            <p className={`text-2xl font-bold ${
              currentMonth.net_income >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatCurrency(currentMonth.net_income)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Previous Month</p>
            <p className={`text-lg font-semibold ${
              previousMonth.net_income >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatCurrency(previousMonth.net_income)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Variance</p>
            <div className="flex items-center gap-3">
              <TrendBadge trend={incomeTrend} value={incomePercent} />
              <span className={incomeVariance >= 0 ? 'text-green-700' : 'text-red-700'}>
                {formatCurrency(incomeVariance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
