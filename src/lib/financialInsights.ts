/**
 * 🧠 Financial Insights Engine
 *
 * Motor de inteligência financeira para gerar alertas e recomendações
 * Usa dados consolidados para criar insights automáticos
 */

import type {
  CashFlowSummary,
  Receivable,
  Payable,
  calculateVariation,
} from './financialCalculations';

export const RECEIVABLES_OVERDUE_FROM_CASHFLOW_URL = '/clinica/financeiro/receber?from=fluxo-caixa&trace=financial-insight&status=overdue';
export const RECEIVABLES_OPEN_FROM_CASHFLOW_URL = '/clinica/financeiro/receber?from=fluxo-caixa&trace=financial-insight&status=open';
export const PAYABLES_FROM_CASHFLOW_URL = '/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=financial-insight&status=open,partial,approved,overdue';

export interface FinancialAlert {
  id: string;
  type:
    | 'overdue'
    | 'negative-balance'
    | 'low-liquidity'
    | 'low-coverage'
    | 'no-revenue'
    | 'expense-increase'
    | 'revenue-decrease'
    | 'healthy'
    | 'high-dependency';
  severity: 'info' | 'warning' | 'high' | 'critical' | 'success';
  title: string;
  message: string;
  action?: string;
  actionLink?: string;
  impactEstimate?: string;
}

/**
 * Gera lista de alertas financeiros baseado em regras
 */
export function generateFinancialAlerts(
  summary: CashFlowSummary | null,
  receivables: Receivable[],
  payables: Payable[],
  previousSummary?: CashFlowSummary | null
): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];

  if (!summary) return alerts;

  // 1. CONTAS VENCIDAS
  const overdue = receivables.reduce((sum, r) => {
    const today = new Date().toISOString().split('T')[0];
    if (r.due_date && r.due_date < today && r.status === 'open') {
      return sum + (r.amount || 0);
    }
    return sum;
  }, 0);

  if (overdue > 0) {
    alerts.push({
      id: 'overdue',
      type: 'overdue',
      severity: overdue > 50000 ? 'critical' : 'high',
      title: `${formatCurrency(overdue)} em atraso`,
      message: `Existem ${receivables.filter(r => r.due_date && r.due_date < new Date().toISOString().split('T')[0] && r.status === 'open').length} contas vencidas que devem ser cobradas`,
      action: 'Ver recebíveis vencidos',
      actionLink: RECEIVABLES_OVERDUE_FROM_CASHFLOW_URL,
      impactEstimate: `+${formatCurrency(overdue)} no caixa se cobrados`,
    });
  }

  // 2. SALDO NEGATIVO
  if (summary.net_balance < 0) {
    alerts.push({
      id: 'negative-balance',
      type: 'negative-balance',
      severity: 'critical',
      title: 'Saldo Negativo',
      message: `Saldo atual: ${formatCurrency(summary.net_balance)}. A clínica está em débito.`,
      action: 'Ações recomendadas',
      impactEstimate: `Déficit de ${formatCurrency(Math.abs(summary.net_balance))}`,
    });
  }

  // 3. LIQUIDEZ BAIXA
  if (summary.liquidity_ratio < 1) {
    const severity = summary.liquidity_ratio < 0.5 ? 'critical' : 'warning';
    alerts.push({
      id: 'low-liquidity',
      type: 'low-liquidity',
      severity,
      title: `Liquidez Baixa: ${summary.liquidity_ratio.toFixed(2)}`,
      message: `Liquidez de ${summary.liquidity_ratio.toFixed(2)}. Menos de R$ 1 em caixa para cada R$ 1 em dívidas de curto prazo.`,
      action: 'Ver recebíveis vencidos',
      actionLink: RECEIVABLES_OVERDUE_FROM_CASHFLOW_URL,
      impactEstimate: `Necessário aumentar caixa em ${formatCurrency((1 - summary.liquidity_ratio) * Math.abs(summary.net_balance))}`,
    });
  }

  // 4. DIAS DE COBERTURA BAIXOS
  if (summary.coverage_days < 30) {
    const severity = summary.coverage_days < 7 ? 'critical' : 'warning';
    alerts.push({
      id: 'low-coverage',
      type: 'low-coverage',
      severity,
      title: `${summary.coverage_days} dias de cobertura`,
      message: `O saldo atual cobre apenas ${summary.coverage_days} dias de despesas. Menos de 1 mês de segurança.`,
      action: 'Ver recebíveis em aberto',
      actionLink: RECEIVABLES_OPEN_FROM_CASHFLOW_URL,
      impactEstimate: `Necessário manter mínimo de ${formatCurrency((30 - summary.coverage_days) * (summary.total_outflows / (summary.period?.days || 30)))} adicional`,
    });
  }

  // 5. SEM ENTRADAS REGISTRADAS
  if (summary.total_inflows === 0) {
    alerts.push({
      id: 'no-revenue',
      type: 'no-revenue',
      severity: 'info',
      title: 'Sem entradas no período',
      message: 'Nenhuma entrada foi registrada no período selecionado. Verifique se há contas a receber pendentes.',
      action: 'Ver contas a receber',
      actionLink: RECEIVABLES_OPEN_FROM_CASHFLOW_URL,
    });
  }

  // 6. AUMENTO RELEVANTE DE DESPESAS (vs período anterior)
  if (previousSummary && summary.total_outflows > previousSummary.total_outflows * 1.2) {
    const increase = ((summary.total_outflows - previousSummary.total_outflows) / previousSummary.total_outflows) * 100;
    alerts.push({
      id: 'expense-increase',
      type: 'expense-increase',
      severity: 'warning',
      title: `Despesas +${increase.toFixed(0)}%`,
      message: `Despesas aumentaram ${increase.toFixed(1)}% em relação ao período anterior.`,
      action: 'Revisar despesas',
      actionLink: PAYABLES_FROM_CASHFLOW_URL,
      impactEstimate: `Aumento de ${formatCurrency(summary.total_outflows - previousSummary.total_outflows)}`,
    });
  }

  // 7. QUEDA RELEVANTE DE ENTRADAS
  if (previousSummary && summary.total_inflows < previousSummary.total_inflows * 0.8) {
    const decrease = ((previousSummary.total_inflows - summary.total_inflows) / previousSummary.total_inflows) * 100;
    alerts.push({
      id: 'revenue-decrease',
      type: 'revenue-decrease',
      severity: 'warning',
      title: `Receita -${decrease.toFixed(0)}%`,
      message: `Receita caiu ${decrease.toFixed(1)}% em relação ao período anterior.`,
      action: 'Analisar causa',
      actionLink: RECEIVABLES_OPEN_FROM_CASHFLOW_URL,
      impactEstimate: `Redução de ${formatCurrency(previousSummary.total_inflows - summary.total_inflows)}`,
    });
  }

  // 8. SITUAÇÃO SAUDÁVEL (apenas se sem alertas críticos)
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length === 0 && alerts.filter(a => a.severity === 'high').length === 0) {
    if (summary.net_balance > 0 && summary.liquidity_ratio >= 1 && summary.coverage_days >= 30) {
      alerts.push({
        id: 'healthy',
        type: 'healthy',
        severity: 'success',
        title: '✓ Situação Financeira Estável',
        message: 'Fluxo de caixa saudável. Saldo positivo, liquidez adequada e cobertura segura. Continue monitorando regularmente.',
      });
    }
  }

  return alerts;
}

/**
 * Classifica status financeiro da clínica em 4 níveis
 */
export function classifyFinancialStatus(
  summary: CashFlowSummary | null
): 'Excelente' | 'Estável' | 'Atenção' | 'Crítico' {
  if (!summary) return 'Atenção';

  const { liquidity_ratio, net_balance, coverage_days } = summary;

  // Excelente: Liquidez ≥ 2, Saldo > 0, Cobertura ≥ 60 dias
  if (liquidity_ratio >= 2 && net_balance > 0 && coverage_days >= 60) {
    return 'Excelente';
  }

  // Estável: Liquidez ≥ 1, Saldo > 0, Cobertura ≥ 30 dias
  if (liquidity_ratio >= 1 && net_balance > 0 && coverage_days >= 30) {
    return 'Estável';
  }

  // Atenção: Liquidez ≥ 0.5 ou Saldo > 0
  if (liquidity_ratio >= 0.5 || net_balance > 0) {
    return 'Atenção';
  }

  // Crítico: Fora dos critérios anteriores
  return 'Crítico';
}

/**
 * Estima nível de risco financeiro
 */
export function estimateFinancialRisk(
  summary: CashFlowSummary | null
): 'low' | 'medium' | 'high' {
  if (!summary) return 'high';

  const { liquidity_ratio, net_balance, coverage_days, total_outflows } = summary;

  // Risco Alto: Liquidez < 0.5, Saldo negativo ou < 5k, Cobertura < 7 dias
  if (
    liquidity_ratio < 0.5 ||
    net_balance < 5000 ||
    coverage_days < 7
  ) {
    return 'high';
  }

  // Risco Médio: Liquidez < 1, Cobertura < 30 dias
  if (liquidity_ratio < 1 || coverage_days < 30) {
    return 'medium';
  }

  // Risco Baixo: Demais casos
  return 'low';
}

/**
 * Gera recomendações acionáveis baseadas em status financeiro
 */
export interface FinancialRecommendation {
  priority: 'baixa' | 'média' | 'alta' | 'crítica';
  title: string;
  description: string;
  estimatedImpact: string;
  action: string;
  actionLink?: string;
}

export function generateRecommendations(
  summary: CashFlowSummary | null,
  receivables: Receivable[],
  overdue: number
): FinancialRecommendation[] {
  const recommendations: FinancialRecommendation[] = [];

  if (!summary) return recommendations;

  // 1. Cobrar contas vencidas
  if (overdue > 0) {
    recommendations.push({
      priority: 'crítica',
      title: `${formatCurrency(overdue)} podem ser recuperados`,
      description: 'Existem contas vencidas ou pendentes de recebimento',
      estimatedImpact: `+${formatCurrency(overdue)} no caixa`,
      action: 'Ver recebíveis vencidos',
      actionLink: RECEIVABLES_OVERDUE_FROM_CASHFLOW_URL,
    });
  }

  // 2. Revisar despesas se estão altas
  if (summary.total_outflows > summary.total_inflows * 1.1) {
    const excess = summary.total_outflows - summary.total_inflows;
    recommendations.push({
      priority: 'alta',
      title: 'Despesas excedem receitas',
      description: `Despesas estão ${formatCurrency(excess)} acima das receitas`,
      estimatedImpact: `Economia potencial: ${formatCurrency(excess * 0.1)}`,
      action: 'Revisar despesas',
      actionLink: PAYABLES_FROM_CASHFLOW_URL,
    });
  }

  // 3. Aumentar receitas se liquidez baixa
  if (summary.liquidity_ratio < 1) {
    const needed = summary.net_balance * (1 - summary.liquidity_ratio);
    recommendations.push({
      priority: 'alta',
      title: 'Aumentar receitas',
      description: 'Liquidez abaixo do ideal. Foque em receber contas e ampliar faturamento',
      estimatedImpact: `Necessário +${formatCurrency(Math.abs(needed))}`,
      action: 'Estratégia de cobrança',
      actionLink: RECEIVABLES_OVERDUE_FROM_CASHFLOW_URL,
    });
  }

  return recommendations;
}

/**
 * Formata valor monetário (helper)
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Retorna cor baseada em severidade de alerta
 */
export function getSeverityColor(
  severity: 'info' | 'warning' | 'high' | 'critical' | 'success'
): string {
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    high: 'bg-orange-50 border-orange-200 text-orange-700',
    critical: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
  };
  return colors[severity] || colors.info;
}

/**
 * Retorna ícone para tipo de alert
 */
export function getAlertIcon(
  type: string
): 'AlertCircle' | 'TrendingDown' | 'TrendingUp' | 'CheckCircle' {
  const icons = {
    overdue: 'AlertCircle',
    'negative-balance': 'TrendingDown',
    'low-liquidity': 'AlertCircle',
    'low-coverage': 'AlertCircle',
    'no-revenue': 'TrendingDown',
    'expense-increase': 'TrendingDown',
    'revenue-decrease': 'TrendingDown',
    healthy: 'CheckCircle',
    'high-dependency': 'AlertCircle',
  };
  return icons[type] || 'AlertCircle';
}
