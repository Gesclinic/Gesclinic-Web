/**
 * FinancialDashboard Component
 * Dashboard com métricas e resumo financeiro
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { FinancialMetrics } from '../types';

interface FinancialDashboardProps {
  metrics: FinancialMetrics | null;
  loading?: boolean;
}

export const FinancialDashboard = React.memo<FinancialDashboardProps>(({
  metrics,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const cards = [
    {
      title: 'Receitas Realizadas',
      value: metrics.total_income,
      icon: TrendingUp,
      color: 'green',
      subtext: `${metrics.income_paid_count ?? metrics.paid_count} pagos`,
    },
    {
      title: 'Despesas Realizadas',
      value: metrics.total_expense,
      icon: TrendingDown,
      color: 'red',
      subtext: `${metrics.expense_paid_count ?? metrics.paid_count} pagos`,
    },
    {
      title: 'Saldo Realizado',
      value: metrics.total_realized,
      icon: DollarSign,
      color: metrics.total_realized >= 0 ? 'green' : 'red',
      subtext: `${metrics.reconciled_count} conciliados`,
    },
    {
      title: 'Saldo Previsto',
      value: metrics.total_predicted,
      icon: Clock,
      color: 'blue',
      subtext: `${metrics.pending_count} pendentes`,
    },
  ];

  const reconciliationTotal = metrics.reconciled_count + metrics.unreconciled_count;
  const reconciliationPercent = reconciliationTotal > 0
    ? Math.round((metrics.reconciled_count / reconciliationTotal) * 100)
    : 0;
  const reconciliationWidthClass = reconciliationPercent >= 100
    ? 'w-full'
    : reconciliationPercent >= 75
      ? 'w-3/4'
      : reconciliationPercent >= 50
        ? 'w-1/2'
        : reconciliationPercent >= 25
          ? 'w-1/4'
          : reconciliationPercent > 0
            ? 'w-1/12'
            : 'w-0';

  const colorClasses = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      badge: 'bg-green-100 text-green-700',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
  };

  return (
    <>
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const colors = colorClasses[card.color as keyof typeof colorClasses];

          return (
            <div
              key={idx}
              className={`${colors.bg} border ${colors.border} rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(card.value)}
                  </p>
                  <p className={`text-xs mt-3 px-2 py-1 rounded-full inline-block ${colors.badge}`}>
                    {card.subtext}
                  </p>
                </div>
                <Icon className={`w-8 h-8 ${colors.icon} flex-shrink-0`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Saldo Geral */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Saldo Geral</h3>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className={`text-3xl font-bold ${
            metrics.net_balance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(metrics.net_balance)}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {metrics.total_realized >= 0 ? 'Realizado' : 'Realizado em déficit'} + {metrics.total_predicted >= 0 ? 'Previsão positiva' : 'Previsão negativa'}
          </p>
        </div>

        {/* Status de Conciliação */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Conciliação</h3>
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conciliados:</span>
              <span className="font-semibold text-green-600">{metrics.reconciled_count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pendentes:</span>
              <span className="font-semibold text-yellow-600">{metrics.unreconciled_count}</span>
            </div>
            <div className="pt-2 border-t border-purple-200">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className={`bg-green-600 h-2 rounded-full transition-all ${reconciliationWidthClass}`} />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {reconciliationPercent}% conciliado
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

FinancialDashboard.displayName = 'FinancialDashboard';
