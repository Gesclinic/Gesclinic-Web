/**
 * 💼 CashFlowSummary Component
 * 
 * Displays key financial metrics:
 * - Total Income (Receita)
 * - Total Expense (Despesa)
 * - Net Balance (Saldo Líquido)
 * - Variation % (Variação %)
 */

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency, formatPercent, calculateVariation } from '../utils/calculations';

export interface CashFlowSummaryMetrics {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  previousNetBalance?: number;
  period: string;
  isLoading?: boolean;
  error?: string;
}

interface CashFlowSummaryProps {
  metrics: CashFlowSummaryMetrics;
  className?: string;
  onMetricClick?: (metricType: 'income' | 'expense' | 'balance' | 'variation') => void;
}

const SummaryCard = memo(({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  trend, 
  isNegative, 
  isLoading,
  onClick,
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  trend?: number;
  isNegative?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}) => (
  <Card 
    className={`cursor-pointer transition-all hover:shadow-md ${
      isNegative ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
    } ${isLoading ? 'opacity-60' : ''}`}
    onClick={onClick}
  >
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        {Icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-3xl font-bold ${
            isNegative ? 'text-red-600' : 'text-green-600'
          }`}>
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-1">{subtext}</p>
          )}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend > 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
            <span className="text-sm font-semibold">
              {formatPercent(Math.abs(trend))}
            </span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
));

const CashFlowSummary = memo(({ 
  metrics, 
  className = '',
  onMetricClick,
}: CashFlowSummaryProps) => {
  if (metrics.error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erro ao carregar resumo</p>
              <p className="text-sm">{metrics.error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const netBalanceVariation = metrics.previousNetBalance !== undefined
    ? calculateVariation(metrics.netBalance, metrics.previousNetBalance)
    : undefined;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Período de referência */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Resumo Financeiro</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {metrics.period}
        </span>
      </div>

      {/* Grid de 4 cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Total de Receita */}
        <SummaryCard
          title="Receita Total"
          value={formatCurrency(metrics.totalIncome)}
          subtext="Entradas neste período"
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          isNegative={false}
          isLoading={metrics.isLoading}
          onClick={() => onMetricClick?.('income')}
        />

        {/* Total de Despesa */}
        <SummaryCard
          title="Despesa Total"
          value={formatCurrency(Math.abs(metrics.totalExpense))}
          subtext="Saídas neste período"
          icon={<DollarSign className="h-4 w-4 text-red-600" />}
          isNegative={metrics.totalExpense > 0}
          isLoading={metrics.isLoading}
          onClick={() => onMetricClick?.('expense')}
        />

        {/* Saldo Líquido */}
        <SummaryCard
          title="Saldo Líquido"
          value={formatCurrency(metrics.netBalance)}
          subtext={metrics.netBalance >= 0 ? 'Superávit' : 'Déficit'}
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          isNegative={metrics.netBalance < 0}
          isLoading={metrics.isLoading}
          onClick={() => onMetricClick?.('balance')}
        />

        {/* Variação % */}
        <SummaryCard
          title="Variação"
          value={
            netBalanceVariation === undefined || !isFinite(netBalanceVariation)
              ? 'N/A'
              : formatPercent(Math.abs(netBalanceVariation))
          }
          subtext={
            netBalanceVariation === undefined
              ? 'Sem período anterior'
              : netBalanceVariation > 0
              ? 'Melhoria'
              : 'Piora'
          }
          icon={<DollarSign className="h-4 w-4 text-purple-600" />}
          trend={netBalanceVariation}
          isLoading={metrics.isLoading}
          onClick={() => onMetricClick?.('variation')}
        />
      </div>

      {/* Nota de rodapé */}
      {metrics.isLoading && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Carregando dados...</p>
        </div>
      )}
    </div>
  );
});

CashFlowSummary.displayName = 'CashFlowSummary';

export default CashFlowSummary;
