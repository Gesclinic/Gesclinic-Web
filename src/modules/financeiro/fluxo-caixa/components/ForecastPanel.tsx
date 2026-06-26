/**
 * 📆 ForecastPanel — Forecast 30/60/90/180/365 dias com KPIs e gráfico resumido
 */
import React from 'react';
import type { ScenarioResult } from '../services/projectionEngine';

const HORIZONS = [30, 60, 90, 180, 365] as const;
type Horizon = typeof HORIZONS[number];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

interface Props {
  horizon: Horizon;
  onHorizonChange: (h: Horizon) => void;
  forecast: ScenarioResult | null;
  loading?: boolean;
  projectedScenarioLabel?: string;
}

export default function ForecastPanel({ horizon, onHorizonChange, forecast, loading, projectedScenarioLabel }: Props) {
  const title = projectedScenarioLabel
    ? `📆 Forecast (${projectedScenarioLabel} • ${horizon} dias)`
    : '📆 Forecast';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <div className="flex gap-1.5">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onHorizonChange(h)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                h === horizon
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {h} dias
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="h-32 animate-pulse rounded-xl bg-slate-100" />}

      {!loading && forecast && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Entradas Previstas', value: fmt(forecast.totals.inflows), color: 'text-emerald-700' },
            { label: 'Saídas Previstas', value: fmt(forecast.totals.outflows), color: 'text-red-700' },
            { label: 'Saldo Projetado', value: fmt(forecast.totals.endBalance), color: forecast.totals.endBalance >= 0 ? 'text-green-700' : 'text-red-700' },
            { label: 'Runway', value: forecast.runwayDays >= 9999 ? '∞ dias' : `${forecast.runwayDays}d`, color: forecast.runwayDays < 30 ? 'text-red-700' : 'text-blue-700' },
            { label: 'Burn Rate / dia', value: fmt(forecast.burnRate), color: 'text-orange-700' },
            { label: 'Capital de Giro', value: fmt(forecast.totals.startBalance + forecast.totals.inflows), color: 'text-blue-700' },
            { label: 'Top Convênio', value: forecast.byConvenio[0]?.name || '—', color: 'text-slate-700' },
            { label: 'Top Repasse', value: forecast.byDoctor[0]?.name || '—', color: 'text-slate-700' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className={`mt-0.5 text-sm font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !forecast && (
        <p className="text-sm text-slate-500">Sem dados de forecast para o período.</p>
      )}
    </div>
  );
}
