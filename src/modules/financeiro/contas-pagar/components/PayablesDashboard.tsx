/**
 * 💰 Payables Dashboard Component
 * KPI cards with key financial metrics
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/modules/financeiro/utils/calculations';
import { PayablesSummary } from '../types';
import { cn } from '@/lib/utils';

interface PayablesDashboardProps {
  summary?: PayablesSummary;
  isLoading?: boolean;
  className?: string;
}

export const PayablesDashboard = React.memo<PayablesDashboardProps>(
  ({ summary, isLoading, className }) => {
    if (isLoading || !summary) {
      return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    const cards = [
      {
        title: 'Total em Aberto',
        value: summary.open_amount,
        icon: AlertCircle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        trend: summary.open_amount > 0 ? 'up' : 'down',
      },
      {
        title: 'Total Vencido',
        value: summary.overdue_amount,
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        trend: summary.overdue_amount > 0 ? 'up' : 'down',
      },
      {
        title: 'Pago este Mês',
        value: summary.paid_amount,
        icon: TrendingDown,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        trend: 'down',
      },
      {
        title: 'Próximos 30 Dias',
        value: summary.due_next_30_days_count,
        icon: Calendar,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        trend: 'neutral',
        isCount: true,
      },
    ];

    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader className={cn('pb-3', card.bgColor)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {card.title}
                  </CardTitle>
                  <Icon className={cn('w-5 h-5', card.color)} />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {card.isCount ? card.value : formatCurrency(card.value)}
                    </p>
                    {!card.isCount && (
                      <p className="text-xs text-gray-500 mt-1">
                        {card.trend === 'up' ? '↑ Aumentou' : card.trend === 'down' ? '↓ Diminuiu' : '→ Estável'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
);

PayablesDashboard.displayName = 'PayablesDashboard';

/**
 * Extended Dashboard with more metrics
 */
interface PayablesExtendedDashboardProps {
  summary?: PayablesSummary;
  isLoading?: boolean;
  className?: string;
}

export const PayablesExtendedDashboard = React.memo<PayablesExtendedDashboardProps>(
  ({ summary, isLoading, className }) => {
    if (isLoading || !summary) {
      return (
        <div className={cn('space-y-6', className)}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    const indicators = [
      {
        label: 'Taxa de Inadimplência',
        value: `${((summary.overdue_count / summary.total_payables) * 100).toFixed(1)}%`,
        status: ((summary.overdue_count / summary.total_payables) * 100) > 10 ? 'warning' : 'good',
      },
      {
        label: 'Contas Hoje',
        value: summary.due_today_count,
        status: summary.due_today_count > 0 ? 'warning' : 'good',
      },
      {
        label: 'Índice de Adimplência',
        value: `${((summary.paid_amount / (summary.paid_amount + summary.open_amount)) * 100).toFixed(1)}%`,
        status: ((summary.paid_amount / (summary.paid_amount + summary.open_amount)) * 100) > 70 ? 'good' : 'warning',
      },
    ];

    return (
      <div className={cn('space-y-6', className)}>
        {/* Main KPIs */}
        <PayablesDashboard summary={summary} isLoading={isLoading} />

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {indicators.map((indicator, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-600">{indicator.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p
                  className={cn('text-2xl font-bold', {
                    'text-green-600': indicator.status === 'good',
                    'text-orange-600': indicator.status === 'warning',
                  })}
                >
                  {indicator.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total de Contas</span>
                <span className="font-semibold text-gray-900">{summary.total_payables}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-gray-600">Total em Aberto</span>
                <span className="font-semibold text-yellow-600">
                  {formatCurrency(summary.open_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Vencido</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(summary.overdue_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Parcial</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(summary.partial_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-gray-700 font-medium">Total Pago</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(summary.paid_amount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

PayablesExtendedDashboard.displayName = 'PayablesExtendedDashboard';
