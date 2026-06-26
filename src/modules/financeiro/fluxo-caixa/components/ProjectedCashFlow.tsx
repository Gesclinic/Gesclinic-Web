/**
 * 💹 ProjectedCashFlow — Aba Enterprise de Fluxo de Caixa Projetado
 *
 * Orquestra todos os sub-componentes da seção "model" no FluxoCaixa.jsx,
 * substituindo o antigo CashFlowWorkbookModel por módulo real.
 *
 * Integrações:
 *  - ar_invoices (entradas previstas)
 *  - ap_bills (saídas previstas + repasses)
 *  - billing_guides (faturamento de convênios)
 *  - financial_accounts (saldo atual)
 */
import React, { useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useProjectedCashFlow, ForecastDays } from '../hooks/useProjectedCashFlow';
import ProjectionKpiCards from './ProjectionKpiCards';
import CashCurveChart from './CashCurveChart';
import ScenarioPanel from './ScenarioPanel';
import FinancialSimulator from './FinancialSimulator';
import ForecastPanel from './ForecastPanel';
import BreakdownTables from './BreakdownTables';
import ProjectionAlerts from './ProjectionAlerts';
import type { ScenarioType, SimulationParam } from '../services/projectionEngine';

const PERIOD_OPTIONS: { label: string; days: number }[] = [
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 365 },
];

interface ProjectedCashFlowProps {
  externalStartDate?: string;
  externalEndDate?: string;
  externalForecastHorizon?: ForecastDays;
}

function addDays(base: string, n: number) {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n - 1);
  return d.toISOString().split('T')[0];
}

export default function ProjectedCashFlow({ externalStartDate, externalEndDate, externalForecastHorizon }: ProjectedCashFlowProps) {
  const {
    loading, error,
    startDate, setStartDate, endDate, setEndDate,
    scenario, setScenario,
    forecastHorizon, setForecastHorizon,
    simulations, addSimulation, removeSimulation, clearSimulations,
    projection, allScenarios, forecast,
    kpis, chartData, scenarioComparison,
    reload,
  } = useProjectedCashFlow({
    startDate: externalStartDate,
    endDate: externalEndDate,
    forecastHorizon: externalForecastHorizon,
  });

  const today = new Date().toISOString().split('T')[0];

  const handlePeriod = (days: number) => {
    setStartDate(today);
    setEndDate(addDays(today, days));
  };

  const handleAddSim = useCallback((param: SimulationParam) => {
    addSimulation(param);
  }, [addSimulation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Fluxo de Caixa</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Projeção Financeira Enterprise</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Integra AR · AP · Faturamento · Repasse Médico em tempo real. Usa o período selecionado no topo; cenários são próprios da projeção.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Calculando...' : 'Recalcular'}
        </button>
      </div>

      {/* Period + Scenario controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden divide-x divide-slate-200 dark:border-gray-700 dark:bg-gray-900">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePeriod(p.days)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Cenário:</span>
          {(['conservador', 'realista', 'otimista'] as ScenarioType[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScenario(s)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                scenario === s
                  ? s === 'conservador' ? 'bg-red-500 text-white'
                    : s === 'otimista' ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium">{startDate}</span>
          <span>→</span>
          <span className="font-medium">{endDate}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Alertas */}
      <ProjectionAlerts projection={projection} loading={loading} />

      {/* KPIs */}
      <ProjectionKpiCards kpis={kpis} loading={loading} />

      {/* Gráfico curva de caixa */}
      <CashCurveChart data={chartData} loading={loading} />

      {/* Cenários */}
      <ScenarioPanel
        comparison={scenarioComparison}
        activeScenario={scenario}
        onScenarioChange={setScenario}
      />

      {/* Forecast */}
      <ForecastPanel
        horizon={forecastHorizon as ForecastDays}
        onHorizonChange={(h) => setForecastHorizon(h as ForecastDays)}
        forecast={forecast}
        loading={loading}
      />

      {/* Breakdowns */}
      {projection && (
        <BreakdownTables
          byConvenio={projection.byConvenio}
          byDoctor={projection.byDoctor}
          byCostCenter={projection.byCostCenter}
          loading={loading}
        />
      )}

      {/* Simulador */}
      <FinancialSimulator
        simulations={simulations}
        onAdd={handleAddSim}
        onRemove={removeSimulation}
        onClear={clearSimulations}
        onRun={reload}
        loading={loading}
      />

      {/* Tabela diária resumida */}
      {projection && !loading && (
        <DailyProjectionTable days={projection.days} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABELA DIÁRIA (inline, sem arquivo separado)
// ─────────────────────────────────────────────────────────────────────────────

import type { ProjectionDay } from '../services/projectionEngine';

const fmtCur = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const fmtDatePT = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

function DailyProjectionTable({ days }: { days: ProjectionDay[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? days : days.slice(0, 14);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-800">📋 Projeção Diária</p>
        <span className="text-xs text-slate-500">{days.length} dias</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              {['Data', 'Entradas', 'Saídas', 'Saldo Dia', 'Saldo Acumulado'].map((h) => (
                <th key={h} className="pb-2 pr-4 font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr
                key={d.date}
                className={`border-b border-slate-50 hover:bg-slate-50 ${d.cumulativeBalance < 0 ? 'bg-red-50/40' : ''}`}
              >
                <td className="py-1.5 pr-4 font-mono text-slate-700">{fmtDatePT(d.date)}</td>
                <td className="py-1.5 pr-4 text-emerald-700 font-medium">{d.inflows > 0 ? fmtCur(d.inflows) : '—'}</td>
                <td className="py-1.5 pr-4 text-red-700 font-medium">{d.outflows > 0 ? fmtCur(d.outflows) : '—'}</td>
                <td className={`py-1.5 pr-4 font-semibold ${d.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {fmtCur(d.net)}
                </td>
                <td className={`py-1.5 font-bold ${d.cumulativeBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                  {fmtCur(d.cumulativeBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {days.length > 14 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          {expanded ? 'Ver menos' : `Ver todos os ${days.length} dias`}
        </button>
      )}
    </div>
  );
}
