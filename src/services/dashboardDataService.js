/**
 * Dashboard Data Service
 * Orquestra carregamento de dados do Supabase para o dashboard financeiro
 * Implementa caching, error handling, e parallelização de queries
 */

import {
  getCashFlowSummary,
  getDailyCashFlow,
  getCashFlowProjection,
} from '../lib/cashflowApi';
import { listAppointments } from '../lib/appointmentsApi';
import { getClinic } from '../lib/clinicsApi';
import { listAPQuery } from '../lib/financeApi';
import { listReceivables } from '../lib/receivablesApi';
import { buildDerivedFinancialTransactions, getFinancialConsolidation } from '../lib/financialConsolidationApi';

const OPEN_PAYABLE_STATUSES = ['open', 'partial', 'approved', 'overdue'];

function isOpenPayableStatus(status) {
  return OPEN_PAYABLE_STATUSES.includes(String(status || '').toLowerCase());
}

export function getOpenPayableBalance(payable = {}) {
  if (!isOpenPayableStatus(payable.status)) return 0;
  const explicitBalance = payable.balance_amount ?? payable.open_amount ?? payable.remaining_amount;
  if (explicitBalance !== null && explicitBalance !== undefined) {
    return Math.max(0, Number(explicitBalance || 0));
  }
  const amount = Number(payable.net_amount ?? payable.amount ?? payable.valor ?? 0);
  const paid = Number(payable.paid_amount ?? payable.paid_value ?? 0);
  return Math.max(0, amount - paid);
}

/**
 * Calcula período de data baseado em label (7d, 30d, 90d, 12m, custom)
 * @param {string} period - 'today', '7d', '30d', '90d', '12m', ou 'custom'
 * @param {Date} customEndDate - data final para período custom
 * @param {Date} customStartDate - data inicial para período custom
 * @returns {{start: string, end: string}} Datas em ISO format (YYYY-MM-DD)
 */
export const calculatePeriodDates = (period = '30d', customEndDate = null, customStartDate = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = today.toISOString().split('T')[0];

  let start;

  if (period === 'custom' && customStartDate && customEndDate) {
    start = new Date(customStartDate).toISOString().split('T')[0];
    return { start, end: customEndDate.toISOString().split('T')[0] };
  }

  switch (period) {
    case 'today':
      start = end;
      break;
    case '7d': {
      const date7d = new Date(today);
      date7d.setDate(date7d.getDate() - 7);
      start = date7d.toISOString().split('T')[0];
      break;
    }
    case '30d': {
      const date30d = new Date(today);
      date30d.setDate(date30d.getDate() - 30);
      start = date30d.toISOString().split('T')[0];
      break;
    }
    case '90d': {
      const date90d = new Date(today);
      date90d.setDate(date90d.getDate() - 90);
      start = date90d.toISOString().split('T')[0];
      break;
    }
    case '12m': {
      const date12m = new Date(today);
      date12m.setFullYear(date12m.getFullYear() - 1);
      start = date12m.toISOString().split('T')[0];
      break;
    }
    default: {
      // Default 30d
      const dateDefault = new Date(today);
      dateDefault.setDate(dateDefault.getDate() - 30);
      start = dateDefault.toISOString().split('T')[0];
    }
  }

  return { start, end };
};

/**
 * Carrega dados consolidados do dashboard em paralelo
 * Executa 6 queries em paralelo para performance
 * @param {string} clinicId - ID da clínica
 * @param {string} period - Período ('7d', '30d', '90d', '12m', 'custom')
 * @param {Date} customStartDate - Data inicial (para período custom)
 * @param {Date} customEndDate - Data final (para período custom)
 * @returns {Promise<Object>} Objeto com todos os dados consolidados
 */
export const loadDashboardData = async (
  clinicId,
  period = '30d',
  customStartDate = null,
  customEndDate = null
) => {
  if (!clinicId) {
    throw new Error('clinicId é obrigatório');
  }

  const { start, end } = calculatePeriodDates(period, customEndDate, customStartDate);

  try {
    // Executar 6 queries em paralelo
    const [
      cashflowData,
      apBillsData,
      projectionData,
      receivablesData,
      clinicData,
      dailyData,
      consolidated,
    ] = await Promise.all([
      // Query 1: Cashflow summary (inflows, outflows, balance, etc)
      getCashFlowSummary(clinicId, start, end).catch((err) => {
        console.error('[dashboardDataService] Erro ao carregar cashflow:', err);
        return null;
      }),

      // Query 2: AP Bills (contas a pagar)
      listAPQuery({
        clinicId,
        start,
        end,
        statusList: OPEN_PAYABLE_STATUSES,
      }).catch((err) => {
        console.error('[dashboardDataService] Erro ao carregar AP bills:', err);
        return [];
      }),

      // Query 3: Projection (saldo projetado)
      getCashFlowProjection(clinicId, 30).catch((err) => {
        console.error('[dashboardDataService] Erro ao carregar projection:', err);
        return [];
      }),

      // Query 4: Receivables (contas a receber)
      listReceivables({
        clinicId,
        statusList: ['open', 'pending'],
      }).catch((err) => {
        console.error('[dashboardDataService] Erro ao carregar receivables:', err);
        return [];
      }),

      // Query 5: Clinic settings
      getClinic(clinicId).catch((err) => {
        console.error('[dashboardDataService] Erro ao carregar clinic:', err);
        return null;
      }),

      // Query 6: Daily cashflow (for charts)
      getDailyCashFlow(clinicId, start, end).catch((err) => {
        console.error('[dashboardDataService] Erro ao carregar daily cashflow:', err);
        return [];
      }),

      getFinancialConsolidation(clinicId, start, end).catch((err) => {
        console.error('[dashboardDataService] Erro ao carregar consolidado financeiro:', err);
        return null;
      }),
    ]);

    const consolidatedCashflow = consolidated ? buildCashflowFromConsolidation(consolidated) : null;
    const consolidatedDailyData = consolidated ? buildDailyCashflowFromConsolidation(consolidated) : [];

    // Processar dados e consolidar
    const processedData = {
      period,
      dateRange: { start, end },
      cashflow: consolidatedCashflow || cashflowData || {},
      apBills: apBillsData || [],
      projection: projectionData || [],
      receivables: {
        items: receivablesData || [],
        windows: processReceivables(receivablesData || []).windows,
        total: processReceivables(receivablesData || []).total,
      },
      clinic: clinicData || {},
      dailyData: consolidatedDailyData.length ? consolidatedDailyData : dailyData || [],
      financialConsolidation: consolidated || null,
      metadata: {
        loadedAt: new Date().toISOString(),
        clinicId,
      },
    };

    return processedData;
  } catch (error) {
    console.error('[dashboardDataService] Erro crítico ao carregar dados:', error);
    throw error;
  }
};

function buildCashflowFromConsolidation(consolidation) {
  const realizedRows = getRealizedConsolidatedRows(consolidation);
  const totalInflows = realizedRows
    .filter((item) => item.type === 'revenue')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalOutflows = realizedRows
    .filter((item) => item.type !== 'revenue')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netBalance = totalInflows - totalOutflows;
  const dailyOutflow = totalOutflows / Math.max(1, getPeriodDays(consolidation.period?.startDate, consolidation.period?.endDate));

  return {
    total_inflows: totalInflows,
    total_outflows: totalOutflows,
    net_balance: netBalance,
    fluxo_entrada: totalInflows,
    fluxo_saida: totalOutflows,
    saldo_atual: netBalance,
    liquidity_ratio: totalOutflows > 0 ? totalInflows / totalOutflows : totalInflows > 0 ? 999 : 0,
    liquidity_status: netBalance >= 0 ? 'healthy' : 'critical',
    coverage_days: dailyOutflow > 0 ? Math.max(0, Math.round(netBalance / dailyOutflow)) : 0,
    period: {
      start: consolidation.period?.startDate,
      end: consolidation.period?.endDate,
      days: getPeriodDays(consolidation.period?.startDate, consolidation.period?.endDate),
    },
  };
}

function buildDailyCashflowFromConsolidation(consolidation) {
  const dailyMap = new Map();

  getRealizedConsolidatedRows(consolidation)
    .forEach((item) => {
      const date = String(item.transaction_date || item.created_at || '').split('T')[0];
      if (!date) return;
      if (!dailyMap.has(date)) dailyMap.set(date, { inflow: 0, outflow: 0 });
      const bucket = dailyMap.get(date);
      if (item.type === 'revenue') bucket.inflow += Number(item.amount || 0);
      else bucket.outflow += Number(item.amount || 0);
    });

  let cumulativeBalance = 0;
  return Array.from(dailyMap.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, values]) => {
      const balanceChange = values.inflow - values.outflow;
      cumulativeBalance += balanceChange;
      return {
        date,
        inflow: Number(values.inflow.toFixed(2)),
        outflow: Number(values.outflow.toFixed(2)),
        balance_change: Number(balanceChange.toFixed(2)),
        balance: Number(cumulativeBalance.toFixed(2)),
        cumulative_balance: Number(cumulativeBalance.toFixed(2)),
      };
    });
}

function getRealizedConsolidatedRows(consolidation) {
  const realizedStatuses = new Set(['paid', 'received', 'processed', 'pago', 'recebido', 'quitado']);
  return buildDerivedFinancialTransactions(consolidation)
    .filter((item) => realizedStatuses.has(String(item.status || '').toLowerCase()));
}

function getPeriodDays(start, end) {
  if (!start || !end) return 30;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 30;
}

/**
 * Processa receivables para extrair consolidadas por data de vencimento
 * @param {Array} receivables - Lista de receivables (ar_invoices)
 * @returns {Object} Receivables processadas com janelas de vencimento
 */
function processReceivables(receivables = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windows = {
    today: { value: 0, count: 0, items: [] },
    '7d': { value: 0, count: 0, items: [] },
    '30d': { value: 0, count: 0, items: [] },
    overdue: { value: 0, count: 0, items: [] },
  };

  receivables.forEach((receivable) => {
    // Skip paid or canceled receivables
    if (['received', 'paid', 'canceled', 'glossed'].includes(receivable.status)) return;

    const amount = Number(receivable.net_value ?? receivable.balance_amount ?? receivable.amount ?? receivable.valor_bruto ?? 0);
    if (amount === 0) return;

    const dueDate = receivable.due_date ? new Date(receivable.due_date) : null;
    if (!dueDate) return; // Skip if no due date

    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0 || receivable.status === 'overdue') {
      // Vencida
      windows.overdue.value += amount;
      windows.overdue.count += 1;
      windows.overdue.items.push(receivable);
    } else if (daysUntilDue === 0) {
      // Hoje
      windows.today.value += amount;
      windows.today.count += 1;
      windows.today.items.push(receivable);
    } else if (daysUntilDue <= 7) {
      // Até 7 dias
      windows['7d'].value += amount;
      windows['7d'].count += 1;
      windows['7d'].items.push(receivable);
    } else if (daysUntilDue <= 30) {
      // Até 30 dias
      windows['30d'].value += amount;
      windows['30d'].count += 1;
      windows['30d'].items.push(receivable);
    }
  });

  return {
    windows,
    total: {
      value: Object.values(windows).reduce((sum, w) => sum + w.value, 0),
      count: Object.values(windows).reduce((sum, w) => sum + w.count, 0),
    },
  };
}

/**
 * Calcula métricas adicionais para Phase 2 components
 * (Insights, Cockpit, Radar, etc)
 * @param {Object} data - Dados consolidados do dashboard
 * @returns {Object} Métricas calculadas
 */
export const calculateDashboardMetrics = (data) => {
  if (!data) return {};

  const { cashflow, projection, receivables, apBills } = data;

  const metrics = {
    // Liquidez (dias de cobertura)
    liquidity: {
      daysOfCoverage: calculateDaysOfCoverage(cashflow),
      score: calculateLiquidityScore(cashflow),
    },

    // Saldo/Cobertura
    balance: {
      current: cashflow?.saldo_atual || 0,
      projected: projection?.saldo_projetado || 0,
      score: calculateBalanceScore(cashflow),
    },

    // Fluxo
    flow: {
      inflows: cashflow?.fluxo_entrada || 0,
      outflows: cashflow?.fluxo_saida || 0,
      net: (cashflow?.fluxo_entrada || 0) - (cashflow?.fluxo_saida || 0),
      score: calculateFlowScore(cashflow),
    },

    // Recebíveis
    receivablesMetric: {
      total: receivables?.total?.value || 0,
      overdue: receivables?.windows?.overdue?.value || 0,
      score: calculateReceivablesScore(receivables),
    },

    // Eficiência
    efficiency: {
      payablesTotalValue: apBills?.reduce((sum, bill) => sum + (bill.amount || bill.net_amount || bill.balance_amount || bill.valor || 0), 0) || 0,
      payablesCount: apBills?.length || 0,
      score: calculateEfficiencyScore(apBills, cashflow),
    },

    // Overall Health (média dos 5 scores)
    overallHealth: 0,
  };

  // Calcular overall health
  const scores = [
    metrics.liquidity.score,
    metrics.balance.score,
    metrics.flow.score,
    metrics.receivablesMetric.score,
    metrics.efficiency.score,
  ].filter((s) => s !== null);

  metrics.overallHealth =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;

  return metrics;
};

// Funções auxiliares para cálculo de scores (0-100)

function calculateDaysOfCoverage(cashflow) {
  if (!cashflow || !cashflow.fluxo_saida || cashflow.fluxo_saida === 0) return 0;
  const daysOfMonthly = (cashflow.saldo_atual / (cashflow.fluxo_saida / 30)) || 0;
  return Math.max(0, Math.round(daysOfMonthly));
}

function calculateLiquidityScore(cashflow) {
  const daysOfCoverage = calculateDaysOfCoverage(cashflow);
  // Score: 80+ dias = 100, 30 dias = 70, 0 dias = 0
  return Math.min(100, Math.round((daysOfCoverage / 80) * 100));
}

function calculateBalanceScore(cashflow) {
  const balance = cashflow?.saldo_atual || 0;
  // Score: > 50k = 100, 10k = 60, 0 = 30, < 0 = 0
  if (balance < 0) return 0;
  if (balance < 10000) return 30 + (balance / 10000) * 30;
  if (balance < 50000) return 60 + ((balance - 10000) / 40000) * 40;
  return 100;
}

function calculateFlowScore(cashflow) {
  const inflows = cashflow?.fluxo_entrada || 0;
  const outflows = cashflow?.fluxo_saida || 0;
  const netFlow = inflows - outflows;
  
  // Score: netFlow > 0 e crescente = 100, break even = 50, negativo = 0-30
  if (inflows === 0) return 50;
  const flowRatio = netFlow / inflows;
  return Math.max(0, Math.min(100, 50 + flowRatio * 50));
}

function calculateReceivablesScore(receivables) {
  if (!receivables || !receivables.total) return 50;
  
  const total = receivables.total.value || 0;
  const overdue = receivables.windows?.overdue?.value || 0;
  
  if (total === 0) return 100; // Sem contas a receber é positivo
  
  const overdueRatio = overdue / total;
  // Score: 0% overdue = 100, 50% = 50, 100% = 0
  return Math.max(0, Math.round(100 * (1 - overdueRatio)));
}

function calculateEfficiencyScore(apBills, cashflow) {
  if (!apBills || apBills.length === 0) return 80;
  if (!cashflow || cashflow.fluxo_saida === 0) return 50;
  
  const totalPayables = apBills.reduce((sum, bill) => sum + (bill.amount || bill.net_amount || bill.balance_amount || bill.valor || 0), 0);
  const ratio = totalPayables / cashflow.fluxo_saida;
  
  // Score: ratio < 0.3 = 100, 0.5 = 70, > 1 = 0
  if (ratio < 0.3) return 100;
  if (ratio > 1) return 0;
  return Math.round(100 * (1 - ratio));
}

/**
 * Cache simples em memória (1 minuto)
 */
const cache = {};

export const invalidateDashboardDataCache = (clinicId = null) => {
  Object.keys(cache).forEach((key) => {
    if (!clinicId || key.includes(`dashboard_${clinicId}_`)) {
      delete cache[key];
    }
  });
};

export const loadDashboardDataWithCache = async (clinicId, period, customStartDate, customEndDate) => {
  const cacheKey = `dashboard_v2_${clinicId}_${period}_${customStartDate}_${customEndDate}`;
  const cached = cache[cacheKey];

  if (cached && new Date() - cached.timestamp < 60000) {
    console.log('[dashboardDataService] Usando dados do cache');
    return cached.data;
  }

  const data = await loadDashboardData(clinicId, period, customStartDate, customEndDate);
  cache[cacheKey] = { data, timestamp: new Date() };

  return data;
};
