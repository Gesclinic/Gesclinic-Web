import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  CheckCircle,
} from 'lucide-react';
import {
  classifyFinancialStatus,
  generateRecommendations,
} from '@/lib/financialInsights';
import {
  calculateOverdueReceivables,
  formatCurrency,
} from '@/lib/financialCalculations';

/**
 * 📊 Resumo Executivo
 * 
 * Layout 3 colunas:
 * 1. O Essencial - KPIs principais
 * 2. Próximos 30 dias - Projeção
 * 3. Ações - Recomendações
 */
export default function ExecutiveSummary(props) {
  const { summary, receivable30d, payable30d, projectedBalance, receivables = [], loading = false } = props;

  // Calcular informações derivadas
  const overdue = useMemo(() => {
    return calculateOverdueReceivables(receivables);
  }, [receivables]);

  const financialStatus = useMemo(() => {
    return classifyFinancialStatus(summary);
  }, [summary]);

  const recommendations = useMemo(() => {
    return generateRecommendations(summary, receivables, overdue.total);
  }, [summary, receivables, overdue.total]);

  if (loading) {
    return (
      <Card className="p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className="p-6 mb-6 bg-gradient-to-r from-slate-50 to-slate-100 border-slate-300 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 animate-slide-up">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Resumo Executivo</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1: O Essencial */}
        <div className="space-y-4 p-4 bg-white rounded-lg border border-slate-200 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            O Essencial
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Resultado Período</p>
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-lg font-bold number-transition ${summary.net_balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {formatCurrency(summary.net_balance)}
                </p>
                {summary.net_balance >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>

            <div>
              <p className="text-gray-600 dark:text-gray-400">Entradas Realizadas</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400 number-transition">
                {formatCurrency(summary.total_inflows)}
              </p>
            </div>

            <div>
              <p className="text-gray-600 dark:text-gray-400">Saídas Realizadas</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-400 number-transition">
                {formatCurrency(summary.total_outflows)}
              </p>
            </div>

            <div>
              <p className="text-gray-600 dark:text-gray-400">Liquidez</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white number-transition">{summary.liquidity_ratio.toFixed(2)}</p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 mb-1">Status</p>
              <StatusBadge status={financialStatus} />
            </div>
          </div>
        </div>

        {/* Coluna 2: Próximos 30 Dias */}
        <div className="space-y-4 p-4 bg-white rounded-lg border border-slate-200 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Próximos 30 Dias
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">A Receber</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400 number-transition">{formatCurrency(receivable30d)}</p>
            </div>

            <div>
              <p className="text-gray-600 dark:text-gray-400">A Pagar</p>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-400 number-transition">{formatCurrency(payable30d)}</p>
            </div>

            <div>
              <p className="text-gray-600 dark:text-gray-400">Saldo Projetado</p>
              <p className={`text-lg font-bold number-transition ${projectedBalance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {formatCurrency(projectedBalance)}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 mb-1">Dias de Cobertura</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{summary.coverage_days} dias</p>
            </div>
          </div>
        </div>

        {/* Coluna 3: Ações Recomendadas */}
        <div className="space-y-4 p-4 bg-white rounded-lg border border-slate-200 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Ações
          </h3>

          <div className="space-y-2 text-sm">
            {overdue.count > 0 && (
              <ActionItem
                label="Contas Vencidas"
                value={overdue.count}
                detail={formatCurrency(overdue.total)}
                priority="high"
              />
            )}

            {recommendations.length > 0 ? (
              <ActionItem
                label={recommendations[0].title}
                value={recommendations[0].estimatedImpact}
                priority={recommendations[0].priority}
              />
            ) : (
              <p className="text-gray-600 py-2">Financeiro saudável</p>
            )}

            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-gray-600">
                🎯 Monitore regularmente e tome ações estratégicas para manter saúde financeira.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Excelente: 'bg-green-100 text-green-700 border-green-300',
    Estável: 'bg-blue-100 text-blue-700 border-blue-300',
    Atenção: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    Crítico: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.Atenção}`}>
      {status}
    </span>
  );
}

function ActionItem({ label, value, detail, priority }) {
  const priorityColors = {
    crítica: 'text-red-700',
    alta: 'text-orange-700',
    média: 'text-yellow-700',
    baixa: 'text-blue-700',
  };

  return (
    <div className="pb-2 border-b border-slate-100 last:border-0">
      <p className={`text-xs font-semibold ${priorityColors[priority]} mb-1`}>
        {label}
      </p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
      {detail && <p className="text-xs text-gray-600 mt-1">{detail}</p>}
    </div>
  );
}
