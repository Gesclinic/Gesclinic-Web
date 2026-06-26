/**
 * 🚨 ProjectionAlerts — Alertas financeiros automáticos baseados na projeção
 */
import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { ScenarioResult } from '../services/projectionEngine';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface Alert {
  type: 'danger' | 'warning' | 'success' | 'info';
  message: string;
}

function generateAlerts(projection: ScenarioResult): Alert[] {
  const alerts: Alert[] = [];
  const { totals, burnRate, runwayDays } = projection;

  if (totals.endBalance < 0) {
    alerts.push({ type: 'danger', message: `⚠️ Saldo projetado negativo: ${fmt(totals.endBalance)}. Necessidade de capital de giro imediata.` });
  } else if (totals.endBalance < burnRate * 15) {
    alerts.push({ type: 'warning', message: `Saldo final do período é menor que 15 dias de operação (${fmt(totals.endBalance)}).` });
  }

  if (runwayDays < 30 && runwayDays < 9999) {
    alerts.push({ type: 'danger', message: `Runway crítico: apenas ${runwayDays} dias até o caixa zerar.` });
  } else if (runwayDays < 90 && runwayDays < 9999) {
    alerts.push({ type: 'warning', message: `Runway de ${runwayDays} dias. Monitore entradas com atenção.` });
  }

  if (totals.inflows === 0) {
    alerts.push({ type: 'warning', message: 'Nenhuma entrada prevista no período. Verifique se há recebíveis ou faturamento pendente.' });
  }

  const liquidez = totals.outflows > 0 ? totals.inflows / totals.outflows : totals.inflows > 0 ? 999 : 0;
  if (liquidez < 0.8 && totals.outflows > 0) {
    alerts.push({ type: 'danger', message: `Índice de liquidez baixo: ${liquidez.toFixed(2)}. Entradas não cobrem saídas previstas.` });
  } else if (liquidez < 1.0 && totals.outflows > 0) {
    alerts.push({ type: 'warning', message: `Índice de liquidez: ${liquidez.toFixed(2)}. Entradas menores que saídas no período.` });
  }

  const negDays = projection.days.filter((d) => d.cumulativeBalance < 0).length;
  if (negDays > 0) {
    alerts.push({ type: 'warning', message: `Há ${negDays} dia(s) com saldo acumulado negativo no período.` });
  }

  if (alerts.length === 0) {
    alerts.push({ type: 'success', message: 'Projeção saudável. Caixa positivo e liquidez adequada no período.' });
  }

  return alerts;
}

const styles: Record<Alert['type'], { bg: string; border: string; text: string; Icon: React.ElementType }> = {
  danger:  { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    Icon: AlertTriangle },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', Icon: AlertCircle },
  success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  Icon: CheckCircle },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   Icon: Info },
};

interface Props {
  projection: ScenarioResult | null;
  loading?: boolean;
}

export default function ProjectionAlerts({ projection, loading }: Props) {
  if (loading) return <div className="h-16 animate-pulse rounded-xl bg-slate-100" />;
  if (!projection) return null;

  const alerts = generateAlerts(projection);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
      <p className="text-sm font-semibold text-slate-800 mb-3">🚨 Alertas Financeiros</p>
      {alerts.map((a, i) => {
        const { bg, border, text, Icon } = styles[a.type];
        return (
          <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${bg} ${border} ${text}`}>
            <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{a.message}</span>
          </div>
        );
      })}
    </div>
  );
}
