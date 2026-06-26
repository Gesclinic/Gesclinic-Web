/**
 * 💹 ENTERPRISE PROJECTION ENGINE — GesClinic Fluxo de Caixa
 *
 * Calcula projeções de caixa a partir de fontes reais:
 *  - ar_invoices      (contas a receber)
 *  - ap_bills         (contas a pagar)
 *  - ap_bills         (repasses médicos vinculados)
 *  - billing_guides   (faturamento de convênios pendente)
 *  - financial_accounts (saldo atual)
 *
 * Não cria tabelas novas. Reutiliza APIs e serviços já existentes.
 */

import { supabase } from '@/lib/customSupabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectionDay {
  date: string;            // YYYY-MM-DD
  inflows: number;         // entradas previstas
  outflows: number;        // saídas previstas
  net: number;             // inflows - outflows
  cumulativeBalance: number;
  // breakdowns
  receivables: number;
  payables: number;
  repasses: number;
  billingPending: number;
}

export interface ProjectionPeriod {
  days: ProjectionDay[];
  totals: {
    inflows: number;
    outflows: number;
    net: number;
    startBalance: number;
    endBalance: number;
  };
  byConvenio: ConvenioBreakdown[];
  byDoctor: DoctorBreakdown[];
  byCostCenter: CostCenterBreakdown[];
  burnRate: number;     // média diária de saída
  runwayDays: number;   // dias até caixa zerar
}

export interface ConvenioBreakdown {
  name: string;
  expectedInflow: number;
  itemCount: number;
}

export interface DoctorBreakdown {
  name: string;
  expectedRepasse: number;
  itemCount: number;
}

export interface CostCenterBreakdown {
  name: string;
  expectedOutflow: number;
  itemCount: number;
}

export type ScenarioType = 'conservador' | 'realista' | 'otimista';

export interface ScenarioResult extends ProjectionPeriod {
  scenario: ScenarioType;
  adjustmentFactor: number;
}

export interface SimulationParam {
  label: string;
  monthlyInflow?: number;   // nova entrada mensal
  monthlyOutflow?: number;  // nova saída mensal
}

export interface ForecastHorizon {
  days: 30 | 60 | 90 | 180 | 365;
}

export interface ProjectionScope {
  centroId?: string;
  professionalId?: string;
  convenioId?: string;
  unitId?: string;
  unitName?: string;
}

// Fatores de ajuste por cenário
const SCENARIO_FACTORS: Record<ScenarioType, { inflow: number; outflow: number }> = {
  conservador: { inflow: 0.7, outflow: 1.15 },
  realista:    { inflow: 1.0, outflow: 1.0  },
  otimista:    { inflow: 1.25, outflow: 0.9 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SALDO ATUAL
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrentBalance(clinicId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (!data?.length) return 0;
    return data.reduce((sum, acc) => {
      const bal = Number(
        acc.current_balance ??
        acc.saldo_atual ??
        acc.initial_balance ??
        acc.saldo_inicial ??
        0
      );
      return sum + bal;
    }, 0);
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CARREGAMENTO DE DADOS BRUTOS
// ─────────────────────────────────────────────────────────────────────────────

interface RawProjectionData {
  openReceivables: any[];
  openPayables: any[];
  recentReceivables: any[];
  recentPayables: any[];
  repasses: any[];
  billingGuides: any[];
  startBalance: number;
}

const normalizeText = (value: any): string => String(value || '').trim().toLowerCase();

const CLOSED_RECEIVABLE_STATUSES = new Set([
  'received', 'paid', 'recebido', 'pago', 'quitado', 'canceled', 'cancelado', 'cancelada',
  'reversed', 'estornado', 'estornada', 'glossed', 'glosado',
]);

const CLOSED_PAYABLE_STATUSES = new Set([
  'paid', 'pago', 'paga', 'quitado', 'quitada', 'canceled', 'cancelado', 'cancelada',
  'reversed', 'estornado', 'estornada', 'blocked', 'bloqueado', 'bloqueada',
]);

function dateOnly(value: any): string {
  return String(value || '').split('T')[0];
}

function isInProjectionWindow(value: any, startDate: string, endDate: string): boolean {
  const date = dateOnly(value);
  if (!date) return true;
  return date <= endDate && date >= '1900-01-01' && (!startDate || date >= startDate || date < startDate);
}

function isOpenReceivable(row: any): boolean {
  const status = normalizeText(row?.status || row?.enterprise_status);
  if (CLOSED_RECEIVABLE_STATUSES.has(status)) return false;
  const balance = Number(row?.balance_amount ?? 0);
  const received = Number(row?.received_value ?? row?.paid_total ?? 0);
  const gross = Number(row?.net_value ?? row?.gross_amount ?? row?.amount ?? row?.service_value ?? 0);
  return balance > 0 || gross > received;
}

function isOpenPayable(row: any): boolean {
  const status = normalizeText(row?.status);
  if (CLOSED_PAYABLE_STATUSES.has(status)) return false;
  return getAPAmount(row) > 0;
}

function isReceivedReceivable(row: any): boolean {
  const status = normalizeText(row?.status || row?.enterprise_status);
  return ['received', 'paid', 'recebido', 'pago', 'quitado'].includes(status);
}

function isPaidPayable(row: any): boolean {
  const status = normalizeText(row?.status);
  return ['paid', 'pago', 'paga', 'quitado', 'quitada'].includes(status);
}

function getReceivableRealizedDate(row: any): string {
  return dateOnly(row?.received_date || row?.received_at || row?.due_date || row?.invoice_date || row?.created_at);
}

function getPayableRealizedDate(row: any): string {
  return dateOnly(row?.paid_at || row?.payment_date || row?.due_date || row?.issue_date || row?.created_at);
}

function subtractDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function matchesProjectionScope(row: any, scope?: ProjectionScope): boolean {
  if (!scope) return true;

  const centerId = row?.cost_center_id ?? row?.centro_custo_id ?? row?.costCenterId ?? null;
  if (scope.centroId && String(centerId || '') !== String(scope.centroId)) return false;

  const professionalId = row?.professional_id ?? row?.doctor_id ?? row?.medico_id ?? row?.provider_id ?? null;
  if (scope.professionalId && String(professionalId || '') !== String(scope.professionalId)) return false;

  const convenioId = row?.payer_id ?? row?.convenio_id ?? row?.health_insurance_id ?? null;
  if (scope.convenioId && String(convenioId || '') !== String(scope.convenioId)) return false;

  const unitId = row?.unit_id ?? row?.branch_id ?? row?.clinica_unidade_id ?? null;
  if (scope.unitId && String(unitId || '') !== String(scope.unitId)) return false;

  const unitName = normalizeText(row?.unit_name ?? row?.branch_name ?? row?.clinic_unit_name ?? row?.unit ?? '');
  if (scope.unitName && !unitName.includes(normalizeText(scope.unitName))) return false;

  return true;
}

async function loadRawData(
  clinicId: string,
  startDate: string,
  endDate: string,
  scope?: ProjectionScope
): Promise<RawProjectionData> {
  const lookbackStart = subtractDays(startDate, 30);

  const [receivablesResult, payablesResult, recentReceivables, recentPayables, billingGuides, startBalance] = await Promise.all([
    supabase
      .from('ar_invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .lte('due_date', endDate)
      .limit(5000)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data || [])
          .filter((row: any) => isOpenReceivable(row))
          .filter((row: any) => isInProjectionWindow(row.due_date || row.expected_payment_date || row.competency_date, startDate, endDate))
          .filter((row: any) => matchesProjectionScope(row, scope));
      })
      .catch(() => [] as any[]),

    supabase
      .from('ap_bills')
      .select('*')
      .eq('clinic_id', clinicId)
      .lte('due_date', endDate)
      .limit(5000)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data || [])
          .filter((row: any) => isOpenPayable(row))
          .filter((row: any) => isInProjectionWindow(row.due_date || row.scheduled_date || row.issue_date, startDate, endDate))
          .filter((row: any) => matchesProjectionScope(row, scope));
      })
      .catch(() => [] as any[]),

    supabase
      .from('ar_invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(5000)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data || [])
          .filter((row: any) => isReceivedReceivable(row))
          .filter((row: any) => {
            const date = getReceivableRealizedDate(row);
            return date && date >= lookbackStart && date <= startDate;
          })
          .filter((row: any) => matchesProjectionScope(row, scope));
      })
      .catch(() => [] as any[]),

    supabase
      .from('ap_bills')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(5000)
      .then(({ data, error }) => {
        if (error) throw error;
        return (data || [])
          .filter((row: any) => isPaidPayable(row))
          .filter((row: any) => {
            const date = getPayableRealizedDate(row);
            return date && date >= lookbackStart && date <= startDate;
          })
          .filter((row: any) => matchesProjectionScope(row, scope));
      })
      .catch(() => [] as any[]),

    // Faturamento/guias pendentes
    supabase
      .from('billing_guides')
      .select('*')
      .eq('clinic_id', clinicId)
      .then(({ data }) => (data || []).filter((g: any) => {
        const status = String(g.status || '').toLowerCase();
        const allowed = !status || ['submitted', 'approved', 'pending_payment', 'pendente', 'aprovado'].includes(status);
        const d = String(
          g.expected_payment_date || g.data_prevista_recebimento || g.competencia || g.data_criacao || ''
        ).split('T')[0];
        return allowed && (!d || d <= endDate) && matchesProjectionScope(g, scope);
      }))
      .catch(() => [] as any[]),

    getCurrentBalance(clinicId),
  ]);

  const openReceivables = receivablesResult;
  const openPayables = payablesResult;
  const repasses = openPayables.filter((row: any) => row.repasse_doctor_name || row.linked_revenue || row.linked_invoice_id);

  return { openReceivables, openPayables, recentReceivables, recentPayables, repasses, billingGuides, startBalance };
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO PRINCIPAL DE PROJEÇÃO
// ─────────────────────────────────────────────────────────────────────────────

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const endD = new Date(end);
  while (cur <= endD) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function getItemDate(item: any): string {
  return String(
    item.due_date || item.vencimento || item.expected_payment_date ||
    item.data_prevista_recebimento || item.prediction_date || item.scheduled_date ||
    item.competency_date || item.competencia || item.data_criacao || ''
  ).split('T')[0];
}

function resolveProjectionBucketDate(item: any, windowStart: string, windowEnd: string): string {
  const dateValue = getItemDate(item);
  if (!dateValue) return windowStart;

  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return windowStart;

  const start = new Date(`${windowStart}T00:00:00`);
  const end = new Date(`${windowEnd}T00:00:00`);

  if (parsed < start) return windowStart;
  if (parsed > end) return windowEnd;
  return dateValue;
}

function getARAmount(item: any): number {
  const balance = item.balance_amount ?? item.open_amount ?? item.remaining_amount;
  if (balance !== null && balance !== undefined && Number(balance) > 0) {
    return Math.max(0, Number(balance));
  }
  const net = Number(item.net_value ?? item.gross_amount ?? item.amount ?? item.service_value ?? item.valor_bruto ?? 0);
  const received = Number(item.received_value ?? item.paid_total ?? 0);
  if (received > 0) {
    return Math.max(0, net - received);
  }
  return Math.max(0, Number(
    item.net_value ?? item.gross_amount ?? item.amount ?? item.service_value ?? item.valor_bruto ?? 0
  ));
}

function getAPAmount(item: any): number {
  const explicit = item.balance_amount ?? item.open_amount ?? item.remaining_amount;
  if (explicit !== null && explicit !== undefined) return Math.max(0, Number(explicit));
  const amount = Number(item.net_amount ?? item.amount ?? item.valor ?? 0);
  const paid = Number(item.paid_amount ?? item.paid_value ?? 0);
  return Math.max(0, amount - paid);
}

function getHistoricalReceivableAmount(item: any): number {
  return Math.max(0, Number(item.received_value ?? item.paid_total ?? item.net_value ?? item.gross_amount ?? item.amount ?? 0));
}

function getHistoricalPayableAmount(item: any): number {
  return Math.max(0, Number(item.paid_value ?? item.paid_total ?? item.net_amount ?? item.amount ?? item.valor ?? 0));
}

function applyHistoricalForecastFallback(
  raw: RawProjectionData,
  dayMap: Map<string, Omit<ProjectionDay, 'cumulativeBalance'>>,
  inflowFactor: number,
  outflowFactor: number
) {
  const hasProjectedEntries = Array.from(dayMap.values()).some((day) => day.inflows > 0 || day.outflows > 0);
  if (hasProjectedEntries) return;

  const lookbackDays = 30;
  const recentInflow = raw.recentReceivables.reduce((sum: number, row: any) => sum + getHistoricalReceivableAmount(row), 0);
  const recentOutflow = raw.recentPayables.reduce((sum: number, row: any) => sum + getHistoricalPayableAmount(row), 0);
  const dailyInflow = (recentInflow / lookbackDays) * inflowFactor;
  const dailyOutflow = (recentOutflow / lookbackDays) * outflowFactor;

  if (dailyInflow <= 0 && dailyOutflow <= 0) return;

  Array.from(dayMap.values()).forEach((bucket) => {
    if (dailyInflow > 0) {
      bucket.receivables += dailyInflow;
      bucket.inflows += dailyInflow;
    }
    if (dailyOutflow > 0) {
      bucket.payables += dailyOutflow;
      bucket.outflows += dailyOutflow;
    }
  });
}

export function buildProjectionDays(
  raw: RawProjectionData,
  dates: string[],
  inflowFactor = 1.0,
  outflowFactor = 1.0,
  windowStart?: string,
  windowEnd?: string
): ProjectionDay[] {
  const safeWindowStart = windowStart || dates[0];
  const safeWindowEnd = windowEnd || dates[dates.length - 1] || safeWindowStart;
  const dayMap = new Map<string, Omit<ProjectionDay, 'cumulativeBalance'>>();
  dates.forEach((d) => dayMap.set(d, {
    date: d, inflows: 0, outflows: 0, net: 0,
    receivables: 0, payables: 0, repasses: 0, billingPending: 0,
  }));

  const repasseIds = new Set(raw.repasses.map((r: any) => r.id));

  // AR – entradas
  raw.openReceivables.forEach((r: any) => {
    const d = resolveProjectionBucketDate(r, safeWindowStart, safeWindowEnd);
    if (!dayMap.has(d)) return;
    const amount = getARAmount(r) * inflowFactor;
    const bucket = dayMap.get(d)!;
    bucket.receivables += amount;
    bucket.inflows += amount;
  });

  // Faturamento/guias
  raw.billingGuides.forEach((g: any) => {
    const d = resolveProjectionBucketDate(g, safeWindowStart, safeWindowEnd);
    if (!dayMap.has(d)) return;
    const amount = Number(g.value ?? g.valor ?? g.net_value ?? 0) * inflowFactor;
    const bucket = dayMap.get(d)!;
    bucket.billingPending += amount;
    bucket.inflows += amount;
  });

  // AP – saídas (excluindo repasses já contados separado)
  raw.openPayables.forEach((p: any) => {
    const d = resolveProjectionBucketDate(p, safeWindowStart, safeWindowEnd);
    if (!dayMap.has(d)) return;
    const amount = getAPAmount(p) * outflowFactor;
    const bucket = dayMap.get(d)!;
    if (repasseIds.has(p.id)) {
      bucket.repasses += amount;
    } else {
      bucket.payables += amount;
    }
    bucket.outflows += amount;
  });

  applyHistoricalForecastFallback(raw, dayMap, inflowFactor, outflowFactor);

  // Calcular cumulative
  let cumulative = raw.startBalance;
  return dates.map((d) => {
    const b = dayMap.get(d)!;
    b.net = b.inflows - b.outflows;
    cumulative += b.net;
    return { ...b, cumulativeBalance: cumulative };
  });
}

function aggregateTotals(days: ProjectionDay[], startBalance: number) {
  const inflows = days.reduce((s, d) => s + d.inflows, 0);
  const outflows = days.reduce((s, d) => s + d.outflows, 0);
  return {
    inflows, outflows,
    net: inflows - outflows,
    startBalance,
    endBalance: startBalance + inflows - outflows,
  };
}

function buildConvenioBreakdown(raw: RawProjectionData): ConvenioBreakdown[] {
  const map = new Map<string, ConvenioBreakdown>();

  [...raw.openReceivables, ...raw.billingGuides].forEach((item: any) => {
    const name = item.health_plan_name || item.convenio_nome || item.insurance_name || item.convenio || 'Particular';
    if (!map.has(name)) map.set(name, { name, expectedInflow: 0, itemCount: 0 });
    const b = map.get(name)!;
    const guideAmount = Number(item.value ?? item.valor ?? 0);
    b.expectedInflow += guideAmount > 0 ? guideAmount : getARAmount(item);
    b.itemCount += 1;
  });

  return Array.from(map.values()).sort((a, b) => b.expectedInflow - a.expectedInflow);
}

function buildDoctorBreakdown(raw: RawProjectionData): DoctorBreakdown[] {
  const map = new Map<string, DoctorBreakdown>();
  raw.repasses.forEach((r: any) => {
    const name = r.repasse_doctor_name || 'Não identificado';
    if (!map.has(name)) map.set(name, { name, expectedRepasse: 0, itemCount: 0 });
    const b = map.get(name)!;
    b.expectedRepasse += getAPAmount(r);
    b.itemCount += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.expectedRepasse - a.expectedRepasse);
}

function buildCostCenterBreakdown(raw: RawProjectionData): CostCenterBreakdown[] {
  const map = new Map<string, CostCenterBreakdown>();
  raw.openPayables.forEach((p: any) => {
    const name = p.cost_center_name || p.centro_custo_nome || 'Sem centro de custo';
    if (!map.has(name)) map.set(name, { name, expectedOutflow: 0, itemCount: 0 });
    const b = map.get(name)!;
    b.expectedOutflow += getAPAmount(p);
    b.itemCount += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.expectedOutflow - a.expectedOutflow);
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA
// ─────────────────────────────────────────────────────────────────────────────

export async function computeProjection(
  clinicId: string,
  startDate: string,
  endDate: string,
  scenario: ScenarioType = 'realista',
  extraSimulations: SimulationParam[] = [],
  scope?: ProjectionScope
): Promise<ScenarioResult> {
  const raw = await loadRawData(clinicId, startDate, endDate, scope);
  const { inflow: inflowF, outflow: outflowF } = SCENARIO_FACTORS[scenario];

  const dates = dateRange(startDate, endDate);
  const days = buildProjectionDays(raw, dates, inflowF, outflowF, startDate, endDate);

  // Adicionar simulações extras distribuídas proporcionalmente
  if (extraSimulations.length > 0) {
    const totalDays = Math.max(dates.length, 1);
    extraSimulations.forEach((sim) => {
      const dailyInflow = (sim.monthlyInflow || 0) / 30;
      const dailyOutflow = (sim.monthlyOutflow || 0) / 30;
      let cumAdj = 0;
      days.forEach((d) => {
        d.inflows += dailyInflow;
        d.outflows += dailyOutflow;
        d.net = d.inflows - d.outflows;
        cumAdj += d.net;
      });
      // Recalculate cumulative
      let cum = raw.startBalance;
      days.forEach((d) => {
        cum += d.net;
        d.cumulativeBalance = cum;
      });
    });
  }

  const totals = aggregateTotals(days, raw.startBalance);
  const totalDays = Math.max(days.length, 1);
  const burnRate = totals.outflows / totalDays;
  const runwayDays = burnRate > 0 ? Math.floor(Math.max(0, totals.startBalance) / burnRate) : 9999;

  return {
    scenario,
    adjustmentFactor: inflowF,
    days,
    totals,
    byConvenio: buildConvenioBreakdown(raw),
    byDoctor: buildDoctorBreakdown(raw),
    byCostCenter: buildCostCenterBreakdown(raw),
    burnRate,
    runwayDays,
  };
}

/** Gera 3 cenários em paralelo */
export async function computeAllScenarios(
  clinicId: string,
  startDate: string,
  endDate: string,
  scope?: ProjectionScope
): Promise<Record<ScenarioType, ScenarioResult>> {
  const [conservador, realista, otimista] = await Promise.all([
    computeProjection(clinicId, startDate, endDate, 'conservador', [], scope),
    computeProjection(clinicId, startDate, endDate, 'realista', [], scope),
    computeProjection(clinicId, startDate, endDate, 'otimista', [], scope),
  ]);
  return { conservador, realista, otimista };
}

/** Forecast para horizonte N dias */
export async function computeForecast(
  clinicId: string,
  horizonDays: 30 | 60 | 90 | 180 | 365
): Promise<ScenarioResult> {
  const today = new Date().toISOString().split('T')[0];
  const end = new Date();
  end.setDate(end.getDate() + horizonDays - 1);
  const endDate = end.toISOString().split('T')[0];
  return computeProjection(clinicId, today, endDate, 'realista');
}
