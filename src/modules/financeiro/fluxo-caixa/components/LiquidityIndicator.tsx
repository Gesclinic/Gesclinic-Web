/**
 * 💰 LiquidityIndicator Component
 */

import React, { memo } from 'react';
import { AlertCircle, Check, AlertTriangle } from 'lucide-react';

interface LiquidityIndicatorProps {
  metrics: any;
  className?: string;
}

export const LiquidityIndicator = memo(({ metrics, className = '' }: LiquidityIndicatorProps) => {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
        <p className="text-gray-500">Sem dados</p>
      </div>
    );
  }

  const currentBalance = metrics.currentBalance ?? metrics.current_balance ?? 0;
  const projectedBalance = metrics.projectedBalance ?? metrics.projected_balance ?? metrics.projectedBalance30d ?? currentBalance;
  const expenseRatio = metrics.expenseRatio ?? metrics.expense_ratio ?? 0;
  const dailyRate = metrics.dailyRate ?? metrics.daily_rate ?? 0;
  const runwayDays = metrics.runwayDays ?? metrics.runway_days;
  const isCritical = metrics.isCritical ?? (
    metrics.cashHealth === 'critical' || currentBalance < 0 || projectedBalance < 0 || expenseRatio > 1
  );
  const isWarning = metrics.isWarning ?? (
    metrics.cashHealth === 'warning' || (!isCritical && (projectedBalance < currentBalance || expenseRatio >= 0.7))
  );
  const isHealthy = metrics.isHealthy ?? (!isCritical && !isWarning);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getHealthColor = () => {
    if (isCritical) return 'text-red-600';
    if (isWarning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getHealthBg = () => {
    if (isCritical) return 'bg-red-50';
    if (isWarning) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  const getHealthBorder = () => {
    if (isCritical) return 'border-red-200';
    if (isWarning) return 'border-yellow-200';
    return 'border-green-200';
  };

  const getHealthIcon = () => {
    if (isCritical) return <AlertCircle className="h-8 w-8 text-red-600" />;
    if (isWarning) return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
    return <Check className="h-8 w-8 text-green-600" />;
  };

  const getHealthLabel = () => {
    if (isCritical) return 'Crítico';
    if (isWarning) return 'Atenção';
    return 'Saudável';
  };

  return (
    <div
      className={`space-y-4 ${className}`}
      aria-label={`Indicador de liquidez: ${getHealthLabel()}`}
    >
      {/* Status Principal */}
      <div className={`p-4 rounded-lg border-2 ${getHealthBg()} ${getHealthBorder()}`}>
        <div className="flex items-center gap-3 mb-4">
          {getHealthIcon()}
          <div>
            <p className={`text-lg font-bold ${getHealthColor()}`}>{getHealthLabel()}</p>
            <p className="text-sm text-gray-600">Status de Liquidez</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Saldo Atual:</span>
            <span className="font-semibold">{formatCurrency(currentBalance)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Saldo Projetado:</span>
            <span className="font-semibold">{formatCurrency(projectedBalance)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Índice de Despesas:</span>
            <span className="font-semibold">{Math.round(expenseRatio * 100)}%</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Taxa Diária:</span>
            <span className={`font-semibold ${dailyRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dailyRate >= 0 ? '+' : ''}{formatCurrency(dailyRate)}/dia
            </span>
          </div>

          {runwayDays !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Runway:</span>
              <span className="font-semibold">{runwayDays} dias</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Saúde */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Índice de Saúde</p>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isCritical
                ? 'bg-red-500 w-1/3'
                : isWarning
                  ? 'bg-yellow-500 w-2/3'
                  : 'bg-green-500 w-full'
            }`}
          />
        </div>
      </div>

      {/* Recomendações */}
      <div className={`p-3 rounded-lg text-sm ${
        isCritical
          ? 'bg-red-50 text-red-700'
          : isWarning
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-green-50 text-green-700'
      }`}>
        {isCritical && (
          <p>
            <strong>⚠️ Alerta:</strong> Saldo negativo pode ocorrer em breve. Considere buscar
            financiamento ou reduzir despesas.
          </p>
        )}
        {isWarning && (
          <p>
            <strong>⚠️ Aviso:</strong> Liquidez reduzida. Monitore entradas de caixa nos próximos dias.
          </p>
        )}
        {isHealthy && (
          <p>
            <strong>✅ Ótimo:</strong> Fluxo de caixa em situação saudável. Continue monitorando.
          </p>
        )}
      </div>

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">Contas Ativas</p>
          <p className="text-lg font-semibold text-gray-900">{metrics.accounts_count || 0}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">Média Diária</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(dailyRate)}
          </p>
        </div>
      </div>
    </div>
  );
});

LiquidityIndicator.displayName = 'LiquidityIndicator';

export default LiquidityIndicator;
