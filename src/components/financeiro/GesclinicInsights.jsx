import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const closedStatuses = new Set(['paid', 'pago', 'paga', 'received', 'recebido', 'quitado', 'processed', 'canceled', 'cancelado', 'cancelada', 'reversed', 'estornado']);

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOpenFinancialItem(item = {}) {
  return !closedStatuses.has(String(item.status || '').toLowerCase());
}

function isPastDue(item = {}) {
  if (!isOpenFinancialItem(item) || !item.due_date) return false;
  return new Date(`${String(item.due_date).split('T')[0]}T00:00:00`) < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');
}

/**
 * Gesclinic Insights - Gerador automático de insights
 *
 * Analisa dados financeiros e gera recomendações executivas
 */
export default function GesclinicInsights({
  summary,
  receivables = [],
  payables = [],
  previousSummary,
  loading = false,
}) {
  const insights = useMemo(() => {
    if (!summary || loading) return [];

    const generated = [];

    // Insight 1: Tendência de receita
    if (previousSummary && summary.total_inflows > previousSummary.total_inflows * 1.15) {
      generated.push({
        id: 'revenue-growth',
        type: 'positive',
        icon: TrendingUp,
        title: 'Receita em crescimento',
        message: `Receitas aumentaram ${(((summary.total_inflows - previousSummary.total_inflows) / previousSummary.total_inflows) * 100).toFixed(1)}% versus período anterior`,
        action: 'Considere reinvestir o lucro extra em infraestrutura ou marketing',
      });
    }

    // Insight 2: Contas vencidas
    const overdueReceivables = receivables.filter(isPastDue);
    const overdueCount = overdueReceivables.length;
    if (overdueCount > 0) {
      const overdueAmount = overdueReceivables.reduce((sum, r) => sum + money(r.balance_amount ?? r.open_amount ?? r.amount), 0);

      generated.push({
        id: 'overdue-receivables',
        type: 'warning',
        icon: AlertTriangle,
        title: 'Contas vencidas',
        message: `${overdueCount} conta(s) vencida(s) totalizando R$ ${overdueAmount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`,
        action: 'Contate devedores hoje mesmo para cobrar ou renegociar prazos',
      });
    }

    // Insight 3: Saldo projetado positivo
    const projectedBalance = money(summary.net_balance) + money(summary.total_inflows) * 0.3 - money(summary.total_outflows) * 0.2;
    if (projectedBalance > money(summary.net_balance) && money(summary.net_balance) > 0) {
      generated.push({
        id: 'positive-projection',
        type: 'positive',
        icon: CheckCircle,
        title: 'Fluxo de caixa com tendência positiva',
        message: 'Projeção indica acúmulo de caixa nos próximos 30 dias',
        action: 'Situação favorável! Mantenha o controle e acompanhe recebimentos',
      });
    }

    // Insight 4: Liquidez crítica
    if (summary.liquidity_ratio && summary.liquidity_ratio < 0.5) {
      generated.push({
        id: 'critical-liquidity',
        type: 'critical',
        icon: AlertTriangle,
        title: 'Liquidez crítica',
        message: `Razão de liquidez em ${summary.liquidity_ratio.toFixed(2)} - sério risco de insolvência`,
        action: 'Ação urgente: reduza despesas, acelere recebimentos ou busque crédito emergencial',
      });
    }

    // Insight 5: Dias de cobertura baixos
    if (summary.coverage_days && summary.coverage_days < 15 && summary.coverage_days > 0) {
      generated.push({
        id: 'low-coverage',
        type: 'warning',
        icon: AlertTriangle,
        title: 'Cobertura de caixa reduzida',
        message: `Caixa cobre apenas ${summary.coverage_days.toFixed(0)} dias de despesas`,
        action: 'Aumente reservas: meta é 30-60 dias de cobertura para segurança',
      });
    }

    // Insight 6: Padrão de pagamentos
    const totalInflows = money(summary.total_inflows);
    const totalOutflows = money(summary.total_outflows);
    if (totalInflows > 0 && totalOutflows > totalInflows * 0.9) {
      generated.push({
        id: 'tight-margin',
        type: 'info',
        icon: Lightbulb,
        title: 'Margem operacional pressionada',
        message: `Despesas representam ${((totalOutflows / totalInflows) * 100).toFixed(0)}% das receitas`,
        action: 'Revisar custos operacionais e buscar oportunidades de otimização',
      });
    }

    return generated;
  }, [summary, receivables, payables, previousSummary, loading]);

  if (loading) {
    return (
      <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 animate-slide-up">
        <div className="flex gap-3 items-start">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-1">Situação financeira estável</h3>
            <p className="text-green-700 dark:text-green-400 text-sm">Nenhum alerta crítico identificado no momento.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-400" />
        Resumo executivo
      </h2>

      {insights.map((insight, index) => {
        const IconComponent = insight.icon;
        const bgColor =
          insight.type === 'positive'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : insight.type === 'critical'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : insight.type === 'warning'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';

        const iconColor =
          insight.type === 'positive'
            ? 'text-green-600'
            : insight.type === 'critical'
              ? 'text-red-600'
              : insight.type === 'warning'
                ? 'text-yellow-600'
                : 'text-blue-600';

        return (
          <Card key={insight.id} className={`p-4 border ${bgColor}`}>
            <div className="flex gap-3 items-start">
              <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${insight.type === 'positive' ? 'text-green-900' : insight.type === 'critical' ? 'text-red-900' : insight.type === 'warning' ? 'text-yellow-900' : 'text-blue-900'}`}>
                  {insight.title}
                </h3>
                <p className={`text-sm mb-2 ${insight.type === 'positive' ? 'text-green-700' : insight.type === 'critical' ? 'text-red-700' : insight.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'}`}>
                  {insight.message}
                </p>
                <p className={`text-xs font-medium italic ${insight.type === 'positive' ? 'text-green-600' : insight.type === 'critical' ? 'text-red-600' : insight.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`}>
                  Recomendação: {insight.action}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
