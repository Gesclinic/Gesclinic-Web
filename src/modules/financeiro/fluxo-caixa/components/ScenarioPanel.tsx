/**
 * 🎯 ScenarioPanel — Painel comparativo Conservador / Realista / Otimista
 */
import React from 'react';
import { TrendingDown, Minus, TrendingUp } from 'lucide-react';
import type { ScenarioType } from '../services/projectionEngine';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface ScenarioTotals {
  inflows: number;
  outflows: number;
  net: number;
  startBalance: number;
  endBalance: number;
}

type ScenarioComparison = Record<ScenarioType, ScenarioTotals>;

interface Props {
  comparison: ScenarioComparison | null;
  activeScenario: ScenarioType;
  onScenarioChange: (s: ScenarioType) => void;
}

const configs: { key: ScenarioType; label: string; Icon: React.ElementType; color: string; ring: string }[] = [
  { key: 'conservador', label: 'Conservador', Icon: TrendingDown, color: 'bg-red-50 border-red-200', ring: 'ring-red-500' },
  { key: 'realista',    label: 'Realista',    Icon: Minus,        color: 'bg-blue-50 border-blue-200', ring: 'ring-blue-500' },
  { key: 'otimista',    label: 'Otimista',    Icon: TrendingUp,   color: 'bg-green-50 border-green-200', ring: 'ring-green-500' },
];

export default function ScenarioPanel({ comparison, activeScenario, onScenarioChange }: Props) {
  if (!comparison) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-800">Cenários Projetados</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {configs.map(({ key, label, Icon, color, ring }) => {
          const t = comparison[key];
          const isActive = key === activeScenario;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onScenarioChange(key)}
              className={`rounded-xl border p-4 text-left transition-all ${color} ${isActive ? `ring-2 ${ring} shadow-md` : 'hover:shadow-sm opacity-80'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                {isActive && <span className="ml-auto text-[10px] font-bold bg-white rounded px-1.5 py-0.5 border">ATIVO</span>}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Entradas</span>
                  <span className="font-semibold text-emerald-700">{fmt(t.inflows)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Saídas</span>
                  <span className="font-semibold text-red-700">{fmt(t.outflows)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                  <span className="text-slate-600 font-medium">Saldo Final</span>
                  <span className={`font-bold ${t.endBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {fmt(t.endBalance)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
