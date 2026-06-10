/**
 * 💰 CashFlowDashboard Component
 */

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useCashFlow, useCashFlowMetrics, useCashFlowAlerts, useCashFlowProjection } from '../hooks/useCashFlow';
import CashFlowChart from './CashFlowChart';
import CashFlowFilters from './CashFlowFilters';
import LiquidityIndicator from './LiquidityIndicator';

interface CashFlowDashboardProps {
  className?: string;
}

export const CashFlowDashboard = memo(({ className = '' }: CashFlowDashboardProps) => {
  const { metrics, snapshots, loading, error, filters, updateFilters } = useCashFlow();
  const calculatedMetrics = useCashFlowMetrics(metrics, snapshots);
  const alerts = useCashFlowAlerts(metrics);
  const projection = useCashFlowProjection(metrics, 30);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filtros */}
      <CashFlowFilters filters={filters} onFiltersChange={updateFilters} />

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.severity === 'critical' ? 'border-l-red-500 bg-red-50' : 'border-l-yellow-500 bg-yellow-50'
            }`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                    alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <p className={alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'}>
                    {alert.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grid de Métricas */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Saldo Atual */}
        <Card className={calculatedMetrics?.isCritical ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Saldo Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6 text-blue-600" />
              <div className="flex-1">
                <p className={`text-2xl font-bold ${
                  (calculatedMetrics?.currentBalance || 0) < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(calculatedMetrics?.currentBalance || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {calculatedMetrics?.balanceChange && (
                    <>
                      {calculatedMetrics.balanceChange > 0 ? (
                        <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="inline h-3 w-3 text-red-600 mr-1" />
                      )}
                      {formatCurrency(Math.abs(calculatedMetrics.balanceChange))}
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entradas Hoje */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Entradas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(calculatedMetrics?.todayIncome || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Realizado</p>
          </CardContent>
        </Card>

        {/* Saídas Hoje */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Saídas Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(calculatedMetrics?.todayExpense || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Realizado</p>
          </CardContent>
        </Card>

        {/* Projetado em 30 Dias */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Projetado 30d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              (calculatedMetrics?.projectedBalance30d || 0) < 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(calculatedMetrics?.projectedBalance30d || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Previsão</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Projeção 30 Dias</CardTitle>
            <CardDescription>Evolução do saldo futuro</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 bg-gray-100 rounded animate-pulse" />
            ) : (
              <CashFlowChart data={projection} type="line" />
            )}
          </CardContent>
        </Card>

        {/* Indicador de Liquidez */}
        <Card>
          <CardHeader>
            <CardTitle>Saúde do Caixa</CardTitle>
            <CardDescription>Status de liquidez</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 bg-gray-100 rounded animate-pulse" />
            ) : (
              <LiquidityIndicator metrics={calculatedMetrics} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Detalhes */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes por Conta</CardTitle>
          <CardDescription>Resumo de todas as contas financeiras</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum dado disponível</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Conta</th>
                    <th className="text-right py-2">Saldo Realizado</th>
                    <th className="text-right py-2">Entradas</th>
                    <th className="text-right py-2">Saídas</th>
                    <th className="text-right py-2">Projetado</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.slice(0, 5).map(snapshot => (
                    <tr key={snapshot.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{snapshot.financial_account_id}</td>
                      <td className="text-right text-green-600 font-medium">
                        {formatCurrency(snapshot.closing_balance)}
                      </td>
                      <td className="text-right text-green-600">
                        {formatCurrency(snapshot.total_income)}
                      </td>
                      <td className="text-right text-red-600">
                        {formatCurrency(snapshot.total_expense)}
                      </td>
                      <td className="text-right text-blue-600 font-medium">
                        {formatCurrency(snapshot.projected_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

CashFlowDashboard.displayName = 'CashFlowDashboard';

export default CashFlowDashboard;
