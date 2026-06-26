import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertTriangle, TrendingDown, TrendingUp, Lightbulb } from 'lucide-react';
import type { DRESummary, DREComparison } from '@/lib/dreEnterpriseEngine';

type Props = {
  summary: DRESummary | null;
  comparison: DREComparison | null;
};

export default function DREAlerts({ summary, comparison }: Props) {
  if (!summary) return null;

  const alerts: Array<{ message: string; severity: 'critical' | 'warning' | 'info' | 'success'; icon: React.ReactNode }> = [];

  // ETAPA 19: Inteligência Financeira - Detectar anomalias e sugerir ações

  // === LUCRO E RESULT ADO ===
  if (summary.lucroLiquido < 0) {
    alerts.push({
      message: '🔴 Resultado deficitário. Revisar despesas operacionais e mix de serviços.',
      severity: 'critical',
      icon: <TrendingDown className="w-4 h-4 text-red-600" />,
    });
  } else if (summary.lucroLiquido < summary.receitaBruta * 0.05) {
    alerts.push({
      message: '⚠️ Lucro líquido abaixo de 5% da receita. Margem muito apertada.',
      severity: 'warning',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    });
  }

  // === MARGEM E DEDUCÕES ===
  if (summary.margemBrutaPercent < 30) {
    alerts.push({
      message: '⚠️ Margem bruta abaixo de 30%. Analisar glosas e descontos operacionais.',
      severity: 'warning',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    });
  }

  // Glosa alta
  const glosaPercent = summary.receitaBruta > 0 ? (summary.deducoes / summary.receitaBruta) * 100 : 0;
  if (glosaPercent > 15) {
    alerts.push({
      message: `📊 Taxa de glosa elevada (${glosaPercent.toFixed(1)}%). Identificar convênios problemáticos.`,
      severity: 'warning',
      icon: <Lightbulb className="w-4 h-4 text-blue-600" />,
    });
  }

  // === COMPARATIVO COM PERIODO ANTERIOR ===
  if (comparison?.deltaPercent?.receitaBruta !== undefined && comparison.deltaPercent.receitaBruta < -10) {
    alerts.push({
      message: `📉 Queda de receita ${Math.abs(comparison.deltaPercent.receitaBruta).toFixed(1)}%. Investigar sazonalidade ou perda de convênios.`,
      severity: 'warning',
      icon: <TrendingDown className="w-4 h-4 text-orange-600" />,
    });
  } else if (comparison?.deltaPercent?.receitaBruta !== undefined && comparison.deltaPercent.receitaBruta > 10) {
    alerts.push({
      message: `📈 Crescimento de receita ${comparison.deltaPercent.receitaBruta.toFixed(1)}%. Oportunidade de otimizar mix.`,
      severity: 'success',
      icon: <TrendingUp className="w-4 h-4 text-green-600" />,
    });
  }

  // Queda de lucro líquido
  if (comparison?.deltaPercent?.lucroLiquidoPercent !== undefined && comparison.deltaPercent.lucroLiquidoPercent < -15) {
    alerts.push({
      message: `🔴 Lucro líquido piorou ${Math.abs(comparison.deltaPercent.lucroLiquidoPercent).toFixed(1)}%. Aumentar controle de custos.`,
      severity: 'critical',
      icon: <TrendingDown className="w-4 h-4 text-red-600" />,
    });
  }

  // === EBITDA E OPERACIONAL ===
  const ebitdaPercent = summary.receitaBruta > 0 ? (summary.ebitda / summary.receitaBruta) * 100 : 0;
  if (ebitdaPercent < 15) {
    alerts.push({
      message: `⚠️ EBITDA baixo (${ebitdaPercent.toFixed(1)}% da receita). Revisar eficiência operacional.`,
      severity: 'warning',
      icon: <Lightbulb className="w-4 h-4 text-blue-600" />,
    });
  }

  // === DESPESAS FINANCEIRAS ===
  if (summary.despesasFinanceiras && summary.receitaBruta > 0) {
    const despFinPercent = (summary.despesasFinanceiras / summary.receitaBruta) * 100;
    if (despFinPercent > 5) {
      alerts.push({
        message: `💳 Despesas financeiras altas (${despFinPercent.toFixed(1)}%). Considerar refinanciamento de dívidas.`,
        severity: 'warning',
        icon: <Lightbulb className="w-4 h-4 text-blue-600" />,
      });
    }
  }

  // === ANÁLISE DE CUSTOS ===
  const custoAssistencial = summary.custos || 0;
  const custoAssistPercent = summary.receitaBruta > 0 ? (custoAssistencial / summary.receitaBruta) * 100 : 0;
  if (custoAssistPercent > 60) {
    alerts.push({
      message: `🏥 Custos assistenciais acima de 60% (${custoAssistPercent.toFixed(1)}%). Otimizar mix de procedimentos.`,
      severity: 'warning',
      icon: <Lightbulb className="w-4 h-4 text-blue-600" />,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      message: '✅ Sem alertas críticos. Indicadores dentro dos parâmetros normais.',
      severity: 'success',
      icon: <TrendingUp className="w-4 h-4 text-green-600" />,
    });
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <Card className={`p-4 border-l-4 ${criticalCount > 0 ? 'border-red-500 bg-red-50' : warningCount > 0 ? 'border-amber-500 bg-amber-50' : 'border-green-500 bg-green-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${criticalCount > 0 ? 'text-red-900' : warningCount > 0 ? 'text-amber-900' : 'text-green-900'}`}>
          💡 Inteligência Financeira
        </h3>
        {(criticalCount > 0 || warningCount > 0) && (
          <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">
            {criticalCount} crítico(s) • {warningCount} aviso(s)
          </span>
        )}
      </div>
      <ul className="space-y-2 text-sm">
        {alerts.map((alert, index) => (
          <li key={index} className={`flex gap-2 ${alert.severity === 'critical' ? 'text-red-800' : alert.severity === 'warning' ? 'text-amber-800' : alert.severity === 'success' ? 'text-green-800' : 'text-blue-800'}`}>
            {alert.icon}
            <span>{alert.message}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
