import { supabase } from '@/lib/customSupabaseClient.js';
import { listReceivables } from '@/lib/receivablesApi.js';
import { listAPQuery } from '@/lib/financeApi.js';

/**
 * Get clinic tax regime for cashflow tax projections
 */
async function getClinicTaxRegime(clinicId) {
  try {
    const { data, error } = await supabase
      .from('clinics')
      .select('tax_regime, iss_rate')
      .eq('id', clinicId)
      .single();

    if (error) throw error;
    
    const regime = data?.tax_regime || 'simples_nacional';
    let issRate = data?.iss_rate || 5;
    if (issRate > 1) {
      issRate = issRate / 100;
    }
    
    return { regime, issRate };
  } catch (err) {
    console.warn('⚠️ Could not fetch clinic tax regime, using defaults:', err.message);
    return { regime: 'simples_nacional', issRate: 0.09 };
  }
}

/**
 * Calculate effective tax rate based on regime
 */
function getEffectiveTaxRate(regime, issRate = 0.05) {
  const rates = {
    simples_nacional: 0.09, // 9% unified
    lucro_presumido: 0.048 + 0.0288 + 0.0065 + 0.03 + (issRate || 0.05), // ~16.33%
    lucro_real: 0.03 + 0.018 + 0.0065 + 0.03 + (issRate || 0.05), // ~12.13%
  };
  return rates[regime] || rates.simples_nacional;
}

// ========== TESTE DIRETO ==========
// Função de teste que será executada uma única vez
let testExecuted = false;
export async function runDebugTest(clinicId) {
  if (testExecuted) return;
  testExecuted = true;
  
  console.log('🧪 [TESTE DIRETO] Verificando status values no banco...');
  
  try {
    // Get distinct status values
    const { data, error } = await supabase
      .from('ar_invoices')
      .select('id, amount, status')
      .eq('clinic_id', clinicId)
      .limit(10);
    
    if (data && data.length > 0) {
      console.log('🧪 [TEST] Status values found in DB:');
      const statuses = new Set();
      data.forEach(r => {
        statuses.add(r.status);
        console.log('  Record:', { id: r.id.substring(0,8), status: r.status, amount: r.amount });
      });
      console.log('🧪 [TEST] Unique statuses:', Array.from(statuses));
    }
  } catch (e) {
    console.error('🧪 [TEST] Error:', e.message);
  }
}

/**
 * 💰 CASHFLOW API
 * 
 * Sincroniza dados de múltiplas fontes financeiras para criar
 * uma visão integrada do fluxo de caixa da clínica.
 * 
 * Inflows: ar_invoices (recebíveis recebidos)
 * Outflows: ap_bills (contas a pagar pagas)
 * Saldo: Inflows - Outflows
 */

/**
 * 📊 Resumo executivo do fluxo de caixa
 * 
 * @param {string} clinicId - ID da clínica
 * @param {string} startDate - Data início (YYYY-MM-DD)
 * @param {string} endDate - Data fim (YYYY-MM-DD)
 * @returns {Promise<{
 *   total_inflows: number,
 *   total_outflows: number,
 *   net_balance: number,
 *   liquidity_ratio: number,
 *   liquidity_status: 'healthy' | 'warning' | 'critical',
 *   coverage_days: number,
 *   period: { start: string, end: string, days: number }
 * }>}
 */
export async function getCashFlowSummary(clinicId, startDate, endDate) {
  try {
    // O resumo da tela precisa refletir caixa realizado. O RPC em alguns bancos
    // antigos soma títulos abertos, então calculamos aqui usando status recebido.
    return await getCashFlowSummaryManual(clinicId, startDate, endDate);
  } catch (err) {
    console.error('getCashFlowSummary error:', err);
    return await getCashFlowSummaryManual(clinicId, startDate, endDate);
  }
}

/**
 * 📊 Fluxo de caixa diário
 * 
 * @param {string} clinicId - ID da clínica
 * @param {string} startDate - Data início (YYYY-MM-DD)
 * @param {string} endDate - Data fim (YYYY-MM-DD)
 * @returns {Promise<Array>} Array com {date, inflow, outflow, balance_change, cumulative_balance}
 */
export async function getDailyCashFlow(clinicId, startDate, endDate) {
  // Buscar recebíveis e contas a pagar
  const receivables = await listReceivables({
    clinicId,
    statusList: ['received', 'paid'],
    limit: 1000,
  });

  const payables = await listAPQuery({
    clinicId,
    statusList: ['paid'],
    limit: 1000,
  });

  // Organizar por data
  const dailyMap = new Map();

  // Adicionar inflows
  receivables.forEach((r) => {
    const date = r.received_date || r.received_at || r.due_date || new Date().toISOString().split('T')[0];
    const key = date.split('T')[0]; // Normalizar para YYYY-MM-DD
    if (!isDateInRange(key, startDate, endDate)) {
      return;
    }
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { inflow: 0, outflow: 0 });
    }
    dailyMap.get(key).inflow += Number(r.received_value || r.amount || 0);
  });

  // Adicionar outflows
  payables.forEach((p) => {
    const date = p.paid_date || p.due_date;
    if (date) {
      const key = date.split('T')[0];
      if (!dailyMap.has(key)) {
        dailyMap.set(key, { inflow: 0, outflow: 0 });
      }
      dailyMap.get(key).outflow += Number(p.amount || p.valor || 0);
    }
  });

  // Gerar array ordenado
  const dates = Array.from(dailyMap.keys()).sort();
  let cumulativeBalance = 0;

  return dates.map((date) => {
    const daily = dailyMap.get(date);
    const balanceChange = daily.inflow - daily.outflow;
    cumulativeBalance += balanceChange;

    return {
      date,
      inflow: Number(daily.inflow.toFixed(2)),
      outflow: Number(daily.outflow.toFixed(2)),
      balance_change: Number(balanceChange.toFixed(2)),
      cumulative_balance: Number(cumulativeBalance.toFixed(2)),
    };
  });
}

/**
 * 🔮 Projeção de fluxo para os próximos N dias
 * 
 * @param {string} clinicId - ID da clínica
 * @param {number} days - Número de dias para projetar (default: 30)
 * @returns {Promise<Array>} Array com {date, projected_inflow, projected_outflow, projected_balance}
 */
export async function getCashFlowProjection(clinicId, days = 30) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  const [movementsResult, receivables] = await Promise.all([
    supabase
      .from('cash_flow')
      .select('date,type,amount,status')
      .eq('clinic_id', clinicId)
      .gte('date', start)
      .lte('date', end)
      .in('status', ['pending', 'scheduled']),
    listReceivables({
      clinicId,
      dueStart: start,
      dueEnd: end,
      statusList: ['open', 'pending'],
      limit: 1000,
    }).catch(() => []),
  ]);

  if (movementsResult.error) {
    throw movementsResult.error;
  }

  const dailyMap = new Map();

  (movementsResult.data || []).forEach((movement) => {
    const key = movement.date;
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { inflow: 0, outflow: 0 });
    }

    if (movement.type === 'entrada') {
      dailyMap.get(key).inflow += Number(movement.amount || 0);
    } else if (movement.type === 'saida') {
      dailyMap.get(key).outflow += Number(movement.amount || 0);
    }
  });

  receivables.forEach((receivable) => {
    const key = (receivable.due_date || '').split('T')[0];
    if (!key || !isDateInRange(key, start, end)) return;
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { inflow: 0, outflow: 0 });
    }
    dailyMap.get(key).inflow += Number(receivable.net_value ?? receivable.balance_amount ?? receivable.amount ?? receivable.valor_bruto ?? 0);
  });

  const projection = [];
  let projectedBalance = 0;

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const daily = dailyMap.get(dateStr) || { inflow: 0, outflow: 0 };

    projectedBalance += daily.inflow - daily.outflow;

    projection.push({
      date: dateStr,
      projected_inflow: Number(daily.inflow.toFixed(2)),
      projected_outflow: Number(daily.outflow.toFixed(2)),
      projected_balance: Number(projectedBalance.toFixed(2)),
    });
  }

  return projection;
}

/**
 * ⚠️ Alertas de liquidez e riscos
 * 
 * @param {string} clinicId - ID da clínica
 * @returns {Promise<Array>} Array com alertas {type, severity, message, value}
 */
export async function getCashFlowAlerts(clinicId) {
  const alerts = [];
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Alerta 1: Recebíveis atrasados
  try {
    const overdue = await listReceivables({
      clinicId,
      dueEnd: today,
      status: 'pending',
      limit: 100,
    });

    if (overdue.length > 0) {
      const totalOverdue = overdue.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      alerts.push({
        type: 'overdue_receivables',
        severity: totalOverdue > 5000 ? 'critical' : 'warning',
        message: `${overdue.length} recebível(is) atrasado(s) - Total: R$ ${totalOverdue.toFixed(2)}`,
        value: totalOverdue,
        count: overdue.length,
      });
    }
  } catch (err) {
    console.warn('Erro ao buscar recebíveis atrasados:', err);
  }

  // Alerta 2: Contas a pagar próximas ao vencimento
  try {
    const upcomingPayables = await listAPQuery({
      clinicId,
      statusList: ['open', 'partial'],
      start: today,
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    if (upcomingPayables.length > 0) {
      const totalUpcoming = upcomingPayables.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      alerts.push({
        type: 'upcoming_payables',
        severity: 'info',
        message: `${upcomingPayables.length} conta(s) a pagar no próximos 7 dias - Total: R$ ${totalUpcoming.toFixed(2)}`,
        value: totalUpcoming,
        count: upcomingPayables.length,
      });
    }
  } catch (err) {
    console.warn('Erro ao buscar contas próximas ao vencimento:', err);
  }

  // Alerta 3: Liquidez baixa
  try {
    const summary = await getCashFlowSummary(clinicId, thirtyDaysAgo, today);
    if (summary.liquidity_status === 'critical') {
      alerts.push({
        type: 'low_liquidity',
        severity: 'critical',
        message: `Liquidez crítica! Razão de liquidez: ${summary.liquidity_ratio.toFixed(2)}`,
        value: summary.liquidity_ratio,
      });
    } else if (summary.liquidity_status === 'warning') {
      alerts.push({
        type: 'low_liquidity',
        severity: 'warning',
        message: `Atenção à liquidez. Razão: ${summary.liquidity_ratio.toFixed(2)}`,
        value: summary.liquidity_ratio,
      });
    }
  } catch (err) {
    console.warn('Erro ao calcular alerta de liquidez:', err);
  }

  return alerts;
}

/**
 * 📈 Fluxo de caixa por categoria
 * 
 * @param {string} clinicId - ID da clínica
 * @param {'inflow'|'outflow'} type - Tipo de fluxo
 * @param {string} startDate - Data início
 * @param {string} endDate - Data fim
 * @returns {Promise<Array>} Array com {category, amount, percentage, count}
 */
export async function getCashFlowByCategory(clinicId, type = 'inflow', startDate, endDate) {
  if (type === 'inflow') {
    // Recebíveis por serviço
    const receivables = await listReceivables({
      clinicId,
      dueStart: startDate,
      dueEnd: endDate,
      status: 'received',
      limit: 1000,
    });

    const byService = {};
    receivables.forEach((r) => {
      const service = r.service_name || 'Outro';
      if (!byService[service]) {
        byService[service] = { total: 0, count: 0 };
      }
      byService[service].total += Number(r.amount || 0);
      byService[service].count += 1;
    });

    const totalAmount = Object.values(byService).reduce((sum, cat) => sum + cat.total, 0);

    return Object.entries(byService).map(([category, data]) => ({
      category,
      amount: Number(data.total.toFixed(2)),
      percentage: Number(((data.total / totalAmount) * 100).toFixed(2)),
      count: data.count,
    }));
  } else {
    // Contas a pagar por categoria (Plano de Contas)
    const payables = await listAPQuery({
      clinicId,
      statusList: ['paid'],
      start: startDate,
      end: endDate,
      limit: 1000,
    });

    const byCategory = {};
    payables.forEach((p) => {
      const category = p.category_name || p.vendor_name || 'Outro';
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, count: 0 };
      }
      byCategory[category].total += Number(p.amount || 0);
      byCategory[category].count += 1;
    });

    const totalAmount = Object.values(byCategory).reduce((sum, cat) => sum + cat.total, 0);

    return Object.entries(byCategory).map(([category, data]) => ({
      category,
      amount: Number(data.total.toFixed(2)),
      percentage: Number(((data.total / totalAmount) * 100).toFixed(2)),
      count: data.count,
    }));
  }
}

/**
 * 🔄 Sincronizar dados de fluxo (refresh manual)
 * 
 * @param {string} clinicId - ID da clínica
 * @returns {Promise<{status: 'ok', synced_at: string}>}
 */
export async function syncCashFlowData(clinicId) {
  try {
    // Se houver view materializada, atualizar aqui
    const { error } = await supabase.rpc('refresh_cashflow_view', {
      p_clinic_id: clinicId,
    });

    if (error) {
      console.warn('RPC refresh_cashflow_view não disponível:', error.message);
    }

    return {
      status: 'ok',
      synced_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('syncCashFlowData error:', err);
    throw err;
  }
}

/* ========================
   FUNÇÕES AUXILIARES
   ======================== */

/**
 * Implementação manual do resumo de fluxo (fallback para RPC)
 */
async function getCashFlowSummaryManual(clinicId, startDate, endDate) {
  try {
    const receivables = await listReceivables({
      clinicId,
      statusList: ['received', 'paid'],
      limit: 1000,
    });

    // Buscar contas a pagar
    const payables = await listAPQuery({
      clinicId,
      statusList: ['paid'],
      start: startDate,
      end: endDate,
      limit: 1000,
    });

    const totalInflows = receivables.reduce((sum, r) => {
      const receivedDate = (r.received_date || r.received_at || '').split('T')[0];
      if (!isDateInRange(receivedDate, startDate, endDate)) {
        return sum;
      }
      return sum + Number(r.received_value || r.amount || 0);
    }, 0);
    const totalOutflows = payables.reduce((sum, p) => sum + Number(p.amount || p.valor || 0), 0);

    const { data: projectedMovements, error: projectedError } = await supabase
      .from('cash_flow')
      .select('type,amount,status')
      .eq('clinic_id', clinicId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['pending', 'scheduled']);

    if (projectedError) {
      throw projectedError;
    }

    const projectedTotals = (projectedMovements || []).reduce(
      (acc, movement) => {
        if (movement.type === 'entrada') {
          acc.inflows += Number(movement.amount || 0);
        } else if (movement.type === 'saida') {
          acc.outflows += Number(movement.amount || 0);
        }
        return acc;
      },
      { inflows: 0, outflows: 0 }
    );

    const netBalance = totalInflows - totalOutflows;
    const liquidityRatio = totalOutflows > 0 ? totalInflows / totalOutflows : Infinity;

    return {
      total_inflows: Number(totalInflows.toFixed(2)),
      total_outflows: Number(totalOutflows.toFixed(2)),
      net_balance: Number(netBalance.toFixed(2)),
      fluxo_entrada: Number(totalInflows.toFixed(2)),
      fluxo_saida: Number(totalOutflows.toFixed(2)),
      saldo_atual: Number(netBalance.toFixed(2)),
      projected_inflows: Number(projectedTotals.inflows.toFixed(2)),
      projected_outflows: Number(projectedTotals.outflows.toFixed(2)),
      projected_net: Number((projectedTotals.inflows - projectedTotals.outflows).toFixed(2)),
      liquidity_ratio: Number(liquidityRatio.toFixed(2)),
      liquidity_status: getLiquidityStatus(liquidityRatio),
      coverage_days: calculateCoverageDays(totalInflows, totalOutflows, startDate, endDate),
      period: { start: startDate, end: endDate, days: getDaysDiff(startDate, endDate) },
    };
  } catch (err) {
    console.error('❌ getCashFlowSummaryManual error:', err);
    throw err;
  }
}

/**
 * Determinar status de liquidez baseado na razão
 * > 1.5: saudável | 1.0-1.5: warning | < 1.0: critical
 */
function getLiquidityStatus(ratio) {
  if (ratio === Infinity) return 'healthy'; // Sem saídas
  if (ratio > 1.5) return 'healthy';
  if (ratio >= 1.0) return 'warning';
  return 'critical';
}

/**
 * Calcular dias de cobertura
 */
function calculateCoverageDays(inflows, outflows, startDate, endDate) {
  if (outflows === 0) return Infinity;
  const days = getDaysDiff(startDate, endDate);
  const avgDaily = outflows / days;
  return inflows / avgDaily;
}

function isDateInRange(dateString, startDate, endDate) {
  if (!dateString) {
    return false;
  }
  return dateString >= startDate && dateString <= endDate;
}

/**
 * Calcular diferença entre datas em dias
 */
function getDaysDiff(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}
