/**
 * Dashboard Metrics Cards Component
 * Displays key financial metrics: total, reconciled, entries/exits, forecast, projection
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Zap, Target, PieChart, Clock } from 'lucide-react';
import { DashboardMetrics } from '../types';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan';
  change?: number;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, change, subtitle }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-white border-slate-200',
      text: 'text-blue-600',
      icon: 'bg-blue-100 text-blue-600',
      badge: 'bg-blue-50 text-blue-700',
    },
    green: {
      bg: 'bg-white border-slate-200',
      text: 'text-green-600',
      icon: 'bg-green-100 text-green-600',
      badge: 'bg-green-50 text-green-700',
    },
    red: {
      bg: 'bg-white border-slate-200',
      text: 'text-red-600',
      icon: 'bg-red-100 text-red-600',
      badge: 'bg-red-50 text-red-700',
    },
    purple: {
      bg: 'bg-white border-slate-200',
      text: 'text-purple-600',
      icon: 'bg-purple-100 text-purple-600',
      badge: 'bg-purple-50 text-purple-700',
    },
    orange: {
      bg: 'bg-white border-slate-200',
      text: 'text-orange-600',
      icon: 'bg-orange-100 text-orange-600',
      badge: 'bg-orange-50 text-orange-700',
    },
    cyan: {
      bg: 'bg-white border-slate-200',
      text: 'text-cyan-600',
      icon: 'bg-cyan-100 text-cyan-600',
      badge: 'bg-cyan-50 text-cyan-700',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 group`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600 tracking-wide uppercase">{title}</p>
          <p className={`${colors.text} text-xl font-bold mt-2 transition-colors whitespace-nowrap`}>{value}</p>
          {subtitle && <p className="text-[11px] text-gray-500 mt-1 leading-tight">{subtitle}</p>}
          {change !== undefined && (
            <div className={`${colors.badge} inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full`}>
              {change > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : change < 0 ? (
                <TrendingDown className="w-3 h-3 text-red-600" />
              ) : (
                <span className="text-xs font-medium">→</span>
              )}
              <span className={`text-xs font-bold ${change > 0 ? 'text-green-700' : change < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        <div className={`${colors.icon} p-2.5 rounded-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
        </div>
      </div>
    </div>
  );
};

interface DashboardMetricsCardsProps {
  metrics: DashboardMetrics;
  loading?: boolean;
}

/**
 * Memoized Dashboard Metrics Cards Component
 */
export const DashboardMetricsCards = React.memo<DashboardMetricsCardsProps>(
  ({ metrics, loading = false }) => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    const formatPercentage = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const memoizedCards = useMemo(() => [
      {
        title: 'Saldo em Contas',
        value: formatCurrency(metrics.total_balance),
        icon: <PieChart className="w-6 h-6" />,
        color: 'blue' as const,
        subtitle: 'Contas financeiras ativas',
      },
      {
        title: 'Saldo Conciliado',
        value: formatCurrency(metrics.reconciled_balance),
        icon: <Zap className="w-6 h-6" />,
        color: 'green' as const,
        subtitle: 'Verificado com banco',
      },
      {
        title: 'Entradas Hoje',
        value: formatCurrency(metrics.entries_today),
        icon: <TrendingUp className="w-6 h-6" />,
        color: 'green' as const,
        change: formatPercentage(metrics.entries_today, metrics.entries_today * 0.9),
      },
      {
        title: 'Saídas Hoje',
        value: formatCurrency(metrics.exits_today),
        icon: <TrendingDown className="w-6 h-6" />,
        color: 'red' as const,
        change: formatPercentage(metrics.exits_today, metrics.exits_today * 0.8),
      },
      {
        title: 'Previsão 7 dias',
        value: formatCurrency(metrics.forecast_7_days),
        icon: <Clock className="w-6 h-6" />,
        color: 'orange' as const,
        subtitle: 'Movimentações de contas',
      },
      {
        title: 'Saldo Projetado',
        value: formatCurrency(metrics.projected_balance),
        icon: <Target className="w-6 h-6" />,
        color: 'cyan' as const,
        subtitle: 'Com previsões',
      },
    ], [metrics]);

    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 animate-pulse"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-6 bg-gray-300 rounded w-28" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {memoizedCards.map((card, index) => (
          <MetricCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            change={card.change}
            subtitle={card.subtitle}
          />
        ))}
      </div>
    );
  }
);

DashboardMetricsCards.displayName = 'DashboardMetricsCards';
