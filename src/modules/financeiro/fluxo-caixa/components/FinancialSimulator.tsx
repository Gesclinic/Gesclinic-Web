/**
 * 🔬 FinancialSimulator — Simula impacto de novos médicos, unidades, equipamentos, perda de convênios
 */
import React, { useState } from 'react';
import { Plus, X, Play } from 'lucide-react';
import type { SimulationParam } from '../services/projectionEngine';

const PRESETS: SimulationParam[] = [
  { label: 'Novo médico (geral)', monthlyInflow: 25000, monthlyOutflow: 5000 },
  { label: 'Nova unidade', monthlyInflow: 80000, monthlyOutflow: 45000 },
  { label: 'Novo equipamento', monthlyInflow: 10000, monthlyOutflow: 8000 },
  { label: 'Perda convênio (–30%)', monthlyInflow: -15000, monthlyOutflow: 0 },
  { label: 'Perda convênio (–50%)', monthlyInflow: -25000, monthlyOutflow: 0 },
  { label: 'Redução de pessoal', monthlyInflow: 0, monthlyOutflow: -12000 },
];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface Props {
  simulations: SimulationParam[];
  onAdd: (p: SimulationParam) => void;
  onRemove: (i: number) => void;
  onClear: () => void;
  onRun: () => void;
  loading?: boolean;
}

export default function FinancialSimulator({ simulations, onAdd, onRemove, onClear, onRun, loading }: Props) {
  const [customLabel, setCustomLabel] = useState('');
  const [customInflow, setCustomInflow] = useState('');
  const [customOutflow, setCustomOutflow] = useState('');

  const addCustom = () => {
    if (!customLabel.trim()) return;
    onAdd({
      label: customLabel.trim(),
      monthlyInflow: Number(customInflow) || 0,
      monthlyOutflow: Number(customOutflow) || 0,
    });
    setCustomLabel('');
    setCustomInflow('');
    setCustomOutflow('');
  };

  const totalImpact = simulations.reduce(
    (acc, s) => ({ inflow: acc.inflow + (s.monthlyInflow || 0), outflow: acc.outflow + (s.monthlyOutflow || 0) }),
    { inflow: 0, outflow: 0 }
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <p className="text-sm font-semibold text-slate-800">🔬 Simulador Financeiro</p>

      {/* Presets */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Adicionar cenário pré-definido:</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onAdd(p)}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              + {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
        <p className="text-xs font-medium text-slate-600">Personalizado:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Nome da simulação"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            placeholder="Entrada mensal (+/-)"
            type="number"
            value={customInflow}
            onChange={(e) => setCustomInflow(e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
            placeholder="Saída mensal (+/-)"
            type="number"
            value={customOutflow}
            onChange={(e) => setCustomOutflow(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={addCustom}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </div>

      {/* Active simulations */}
      {simulations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">Simulações ativas:</p>
          {simulations.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs">
              <span className="font-medium text-blue-800">{s.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-700">+{fmt(s.monthlyInflow || 0)}/mês</span>
                <span className="text-red-700">–{fmt(s.monthlyOutflow || 0)}/mês</span>
                <button type="button" onClick={() => onRemove(i)} className="text-slate-400 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {/* Impact summary */}
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs">
            <span className="font-semibold text-slate-700">Impacto total/mês: </span>
            <span className="text-emerald-700">+{fmt(totalImpact.inflow)} entradas</span>
            <span className="mx-2 text-slate-400">|</span>
            <span className="text-red-700">–{fmt(totalImpact.outflow)} saídas</span>
            <span className="mx-2 text-slate-400">|</span>
            <span className={totalImpact.inflow - totalImpact.outflow >= 0 ? 'text-green-700' : 'text-red-700'}>
              Líquido: {fmt(totalImpact.inflow - totalImpact.outflow)}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Play className="h-4 w-4" />
          {loading ? 'Calculando...' : 'Recalcular Projeção'}
        </button>
        {simulations.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}
