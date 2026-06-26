/**
 * 📊 ProjectionKpiCards — KPIs executivos do Fluxo Projetado
 */
import React from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Activity,
  Flame, Clock, Briefcase, AlertTriangle,
} from 'lucide-react';

interface Kpis {
  saldoAtual: number;
  saldoProjetado: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  burnRate: number;
  runwayDays: number;
  capitalGiro: number;
  necessidadeCaixa: number;
  liquidez: number;
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function KpiCard({
  title, value, sub, icon: Icon, color,
}: { title: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${color}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{title}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500 truncate">{sub}</p>}
        </div>
        <Icon className="h-7 w-7 text-slate-400 flex-shrink-0 ml-2" />
      </div>
    </div>
  );
}

interface Props {
  kpis: Kpis | null;
  loading?: boolean;
}

export default function ProjectionKpiCards({ kpis, loading }: Props) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 animate-pulse bg-slate-100 h-[90px]" />
        ))}
      </div>
    );
  }

  const runwayLabel =
    kpis.runwayDays >= 9999 ? '∞ dias' :
    kpis.runwayDays > 365 ? `${Math.floor(kpis.runwayDays / 365)} ano(s)` :
    `${kpis.runwayDays} dias`;

  const liquidezColor = kpis.liquidez >= 1.2 ? 'text-green-600' : kpis.liquidez >= 0.8 ? 'text-yellow-600' : 'text-red-600';

  const cards = [
    { title: 'Caixa Atual', value: fmt(kpis.saldoAtual), icon: DollarSign, color: 'bg-white border-slate-200', sub: 'saldo real das contas' },
    { title: 'Caixa Projetado', value: fmt(kpis.saldoProjetado), icon: TrendingUp, color: kpis.saldoProjetado >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200', sub: 'fim do período' },
    { title: 'Entradas Previstas', value: fmt(kpis.entradasPrevistas), icon: TrendingUp, color: 'bg-emerald-50 border-emerald-200', sub: 'AR + faturamento' },
    { title: 'Saídas Previstas', value: fmt(kpis.saidasPrevistas), icon: TrendingDown, color: 'bg-red-50 border-red-200', sub: 'AP + repasses' },
    { title: 'Burn Rate (dia)', value: fmt(kpis.burnRate), icon: Flame, color: 'bg-orange-50 border-orange-200', sub: 'saída média diária' },
    { title: 'Runway', value: runwayLabel, icon: Clock, color: kpis.runwayDays < 30 ? 'bg-red-50 border-red-200' : kpis.runwayDays < 90 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200', sub: 'dias até caixa zerar' },
    { title: 'Capital de Giro', value: fmt(kpis.capitalGiro), icon: Briefcase, color: 'bg-blue-50 border-blue-200', sub: 'caixa + entradas previstas' },
    { title: 'Necessidade de Caixa', value: fmt(kpis.necessidadeCaixa), icon: AlertTriangle, color: kpis.necessidadeCaixa > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200', sub: 'se > 0, há déficit projetado' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <KpiCard key={c.title} {...c} />
      ))}
    </div>
  );
}
