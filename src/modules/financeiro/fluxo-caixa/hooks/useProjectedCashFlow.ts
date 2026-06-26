/**
 * 💹 useProjectedCashFlow — Hook Enterprise de Fluxo Projetado
 *
 * Gerencia toda a lógica de estado e carregamento da aba Fluxo Projetado.
 * Reutiliza projectionEngine.ts sem criar tabelas ou APIs novas.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useClinicContext } from '@/contexts/useClinicContext';
import {
  computeProjection,
  computeAllScenarios,
  computeForecast,
  ScenarioType,
  ScenarioResult,
  SimulationParam,
  ForecastHorizon,
} from '../services/projectionEngine';

export type ForecastDays = 30 | 60 | 90 | 180 | 365;

interface UseProjectedCashFlowOptions {
  startDate?: string;
  endDate?: string;
  scenario?: ScenarioType;
  forecastHorizon?: ForecastDays;
}

export function useProjectedCashFlow(options: UseProjectedCashFlowOptions = {}) {
  const { clinicId, loadingClinic } = useClinicContext();

  const today = new Date().toISOString().split('T')[0];
  const defaultEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 29);
    return d.toISOString().split('T')[0];
  })();

  const [startDate, setStartDate] = useState(options.startDate || today);
  const [endDate, setEndDate] = useState(options.endDate || defaultEnd);
  const [scenario, setScenario] = useState<ScenarioType>(options.scenario || 'realista');
  const [forecastHorizon, setForecastHorizon] = useState<ForecastDays>(options.forecastHorizon || 30);
  const [simulations, setSimulations] = useState<SimulationParam[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projection, setProjection] = useState<ScenarioResult | null>(null);
  const [allScenarios, setAllScenarios] = useState<Record<ScenarioType, ScenarioResult> | null>(null);
  const [forecast, setForecast] = useState<ScenarioResult | null>(null);

  useEffect(() => {
    if (options.startDate) setStartDate(options.startDate);
  }, [options.startDate]);

  useEffect(() => {
    if (options.endDate) setEndDate(options.endDate);
  }, [options.endDate]);

  useEffect(() => {
    if (options.forecastHorizon) setForecastHorizon(options.forecastHorizon);
  }, [options.forecastHorizon]);

  const load = useCallback(async () => {
    if (!clinicId || loadingClinic) return;
    setLoading(true);
    setError(null);
    try {
      const [proj, scenarios, fcast] = await Promise.all([
        computeProjection(clinicId, startDate, endDate, scenario, simulations),
        computeAllScenarios(clinicId, startDate, endDate),
        computeForecast(clinicId, forecastHorizon),
      ]);
      setProjection(proj);
      setAllScenarios(scenarios);
      setForecast(fcast);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao calcular projeção');
    } finally {
      setLoading(false);
    }
  }, [clinicId, loadingClinic, startDate, endDate, scenario, forecastHorizon, simulations]);

  useEffect(() => {
    if (clinicId && !loadingClinic) load();
  }, [clinicId, loadingClinic, startDate, endDate, scenario, forecastHorizon]);

  // KPIs derivados do cenário atual
  const kpis = useMemo(() => {
    if (!projection) return null;
    const { totals, burnRate, runwayDays } = projection;
    const capitalGiro = totals.startBalance + totals.inflows;
    const necessidadeCaixa = Math.max(0, totals.outflows - totals.startBalance);
    return {
      saldoAtual: totals.startBalance,
      saldoProjetado: totals.endBalance,
      entradasPrevistas: totals.inflows,
      saidasPrevistas: totals.outflows,
      burnRate,
      runwayDays,
      capitalGiro,
      necessidadeCaixa,
      liquidez: totals.outflows > 0 ? totals.inflows / totals.outflows : totals.inflows > 0 ? 999 : 0,
    };
  }, [projection]);

  // Dados para gráfico (curva de caixa)
  const chartData = useMemo(() => {
    if (!projection) return [];
    return projection.days.map((d) => ({
      date: d.date,
      entradas: d.inflows,
      saidas: d.outflows,
      saldoAcumulado: d.cumulativeBalance,
    }));
  }, [projection]);

  // Comparativo de cenários
  const scenarioComparison = useMemo(() => {
    if (!allScenarios) return null;
    return {
      conservador: allScenarios.conservador.totals,
      realista: allScenarios.realista.totals,
      otimista: allScenarios.otimista.totals,
    };
  }, [allScenarios]);

  const addSimulation = useCallback((param: SimulationParam) => {
    setSimulations((prev) => [...prev, param]);
  }, []);

  const removeSimulation = useCallback((index: number) => {
    setSimulations((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearSimulations = useCallback(() => setSimulations([]), []);

  return {
    // Estado
    loading, error,
    startDate, setStartDate,
    endDate, setEndDate,
    scenario, setScenario,
    forecastHorizon, setForecastHorizon,
    simulations, addSimulation, removeSimulation, clearSimulations,
    // Dados
    projection, allScenarios, forecast,
    kpis, chartData, scenarioComparison,
    // Ação
    reload: load,
  };
}
