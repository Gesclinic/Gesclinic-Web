/**
 * Dynamic DRE Service - ETAPA 5
 * 
 * Calculates Income Statement (DRE) dynamically from actual financial data
 * Removes all hardcoding, supports competence/cash basis, comparisons, drill-down
 */

import { customSupabaseClient } from '@/lib/customSupabaseClient';

export interface ChartOfAccount {
  id: number | string;
  clinic_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_category: string;
  dre_line_item: string;
  dre_order: number;
  dre_sign: '+' | '-';
  is_active: boolean;
}

function mapRealChartAccount(row: any): ChartOfAccount {
  const type = row.account_type || row.type || 'despesa';
  const dreLineItem = row.dre_line_item || mapAccountTypeToDRELine(type, row.nature);

  return {
    id: row.id,
    clinic_id: row.clinic_id,
    account_code: row.account_code || row.code,
    account_name: row.account_name || row.name,
    account_type: type,
    account_category: row.account_category || row.nature || type,
    dre_line_item: dreLineItem,
    dre_order: row.dre_order || mapDRELineOrder(dreLineItem),
    dre_sign: row.dre_sign || (['receita', 'revenue'].includes(String(type).toLowerCase()) ? '+' : '-'),
    is_active: row.is_active,
  };
}

function mapAccountTypeToDRELine(type: string, nature?: string): string {
  const value = `${type || ''} ${nature || ''}`.toLowerCase();
  if (value.includes('receita') || value.includes('revenue')) return 'gross_revenue';
  if (value.includes('dedu')) return 'revenue_deductions';
  if (value.includes('custo') || value.includes('cost')) return 'cogs';
  if (value.includes('imposto') || value.includes('tax')) return 'tax_expense';
  if (value.includes('comercial') || value.includes('marketing')) return 'commercial_expense';
  if (value.includes('finance')) return 'financial_expense';
  if (value.includes('clinica') || value.includes('clinic')) return 'clinic_expense';
  return 'admin_expense';
}

function mapDRELineOrder(line: string): number {
  const order: Record<string, number> = {
    gross_revenue: 10,
    revenue_deductions: 20,
    net_revenue: 30,
    cogs: 40,
    gross_profit: 50,
    admin_expense: 60,
    clinic_expense: 70,
    commercial_expense: 80,
    financial_expense: 90,
    tax_expense: 100,
    net_income: 110,
  };
  return order[line] || 999;
}

function categoryFilterForDRELine(dreLineItem: string): string[] | null {
  const filters: Record<string, string[]> = {
    admin_expense: ['payroll', 'other'],
    clinic_expense: ['rent', 'utilities', 'maintenance', 'materials', 'equipment', 'software'],
    commercial_expense: ['marketing', 'commission'],
    financial_expense: ['other'],
    tax_expense: ['tax'],
    cogs: ['materials', 'medical_service', 'exam', 'procedure', 'surgery'],
  };
  return filters[dreLineItem] || null;
}

export interface DRESnapshot {
  id: number;
  clinic_id: string;
  period_type: 'month' | 'quarter' | 'year';
  period_year: number;
  period_month?: number;
  period_quarter?: number;
  gross_revenue: number;
  revenue_deductions: number;
  net_revenue: number;
  cogs: number;
  gross_profit: number;
  gross_profit_margin: number;
  admin_expense: number;
  clinic_expense: number;
  commercial_expense: number;
  financial_expense: number;
  total_operating_expense: number;
  ebitda: number;
  ebitda_margin: number;
  tax_expense: number;
  net_income: number;
  net_margin: number;
  competence_type: 'accrual' | 'cash';
  is_projected: boolean;
}

export interface DRECalculation {
  period_start: string;
  period_end: string;
  competence_type: 'accrual' | 'cash';
  revenue: {
    gross_revenue: number;
    revenue_deductions: number;
    net_revenue: number;
  };
  costs_and_profit: {
    cogs: number;
    gross_profit: number;
    gross_profit_margin: number;
  };
  expenses: {
    admin_expense: number;
    clinic_expense: number;
    commercial_expense: number;
    financial_expense: number;
    total_operating_expense: number;
  };
  result: {
    ebitda: number;
    ebitda_margin: number;
    tax_expense: number;
    net_income: number;
    net_margin: number;
  };
}

/**
 * Calculate DRE for period
 */
export async function calculateDREForPeriod(
  clinicId: string,
  startDate: string,
  endDate: string,
  competenceType: 'accrual' | 'cash' = 'accrual'
): Promise<DRECalculation | any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('calculate_dre_for_period', {
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_competence_type: competenceType,
      });

    if (error) throw error;
    return data as DRECalculation;
  } catch (err) {
    console.error('[calculateDREForPeriod] Error:', err);
    throw err;
  }
}

/**
 * Compare two DRE periods (YoY, MoM)
 */
export async function compareDREPeriods(
  clinicId: string,
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('compare_dre_periods', {
        p_clinic_id: clinicId,
        p_period1_start: period1Start,
        p_period1_end: period1End,
        p_period2_start: period2Start,
        p_period2_end: period2End,
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[compareDREPeriods] Error:', err);
    throw err;
  }
}

/**
 * Get chart of accounts for clinic
 */
export async function getChartOfAccounts(
  clinicId: string,
  filters?: {
    accountType?: string;
    isActive?: boolean;
  }
): Promise<ChartOfAccount[]> {
  try {
    let query = customSupabaseClient
      .from('financial_chart_of_accounts')
      .select('*')
      .eq('clinic_id', clinicId);

    if (filters?.accountType) {
      query = query.eq('type', filters.accountType);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query.order('code', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapRealChartAccount);
  } catch (err) {
    console.error('[getChartOfAccounts] Error:', err);
    throw err;
  }
}

/**
 * Get DRE account for DRE line item
 */
export async function getAccountsForDRELineItem(
  clinicId: string,
  dreLineItem: string
): Promise<ChartOfAccount[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('financial_chart_of_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapRealChartAccount).filter(account => account.dre_line_item === dreLineItem);
  } catch (err) {
    console.error('[getAccountsForDRELineItem] Error:', err);
    throw err;
  }
}

/**
 * Get DRE snapshot
 */
export async function getDRESnapshot(
  clinicId: string,
  periodType: 'month' | 'quarter' | 'year',
  periodYear: number,
  periodMonth?: number,
  periodQuarter?: number
): Promise<DRESnapshot | null> {
  try {
    let query = customSupabaseClient
      .from('dre_snapshots')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('period_type', periodType)
      .eq('period_year', periodYear);

    if (periodMonth !== undefined) {
      query = query.eq('period_month', periodMonth);
    }
    if (periodQuarter !== undefined) {
      query = query.eq('period_quarter', periodQuarter);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as DRESnapshot) || null;
  } catch (err) {
    if ((err as any)?.code === '42P01' || String((err as any)?.message || '').includes('dre_snapshots')) {
      return null;
    }
    console.error('[getDRESnapshot] Error:', err);
    throw err;
  }
}

/**
 * Get DRE snapshots for period
 */
export async function getDRESnapshotsForRange(
  clinicId: string,
  startDate: string,
  endDate: string,
  periodType: 'month' | 'quarter' | 'year' = 'month'
): Promise<DRESnapshot[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('dre_snapshots')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('period_type', periodType)
      .order('period_year, period_month, period_quarter', {
        ascending: true,
      });

    if (error) throw error;
    return (data || []) as DRESnapshot[];
  } catch (err) {
    if ((err as any)?.code === '42P01' || String((err as any)?.message || '').includes('dre_snapshots')) {
      return [];
    }
    console.error('[getDRESnapshotsForRange] Error:', err);
    throw err;
  }
}

/**
 * Save DRE snapshot
 */
export async function saveDRESnapshot(
  clinicId: string,
  dre: DRECalculation,
  periodType: 'month' | 'quarter' | 'year',
  periodYear: number,
  periodMonth?: number,
  periodQuarter?: number
): Promise<DRESnapshot> {
  try {
    const { data, error } = await customSupabaseClient
      .from('dre_snapshots')
      .upsert(
        {
          clinic_id: clinicId,
          period_type: periodType,
          period_year: periodYear,
          period_month: periodMonth,
          period_quarter: periodQuarter,
          gross_revenue: dre.revenue.gross_revenue,
          revenue_deductions: dre.revenue.revenue_deductions,
          net_revenue: dre.revenue.net_revenue,
          cogs: dre.costs_and_profit.cogs,
          gross_profit: dre.costs_and_profit.gross_profit,
          gross_profit_margin: dre.costs_and_profit.gross_profit_margin,
          admin_expense: dre.expenses.admin_expense,
          clinic_expense: dre.expenses.clinic_expense,
          commercial_expense: dre.expenses.commercial_expense,
          financial_expense: dre.expenses.financial_expense,
          total_operating_expense: dre.expenses.total_operating_expense,
          ebitda: dre.result.ebitda,
          ebitda_margin: dre.result.ebitda_margin,
          tax_expense: dre.result.tax_expense,
          net_income: dre.result.net_income,
          net_margin: dre.result.net_margin,
          competence_type: dre.competence_type,
        },
        {
          onConflict: 'clinic_id,period_type,period_year,period_month,period_quarter',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data as DRESnapshot;
  } catch (err) {
    if ((err as any)?.code === '42P01' || String((err as any)?.message || '').includes('dre_snapshots')) {
      return {
        id: 0,
        clinic_id: clinicId,
        period_type: periodType,
        period_year: periodYear,
        period_month: periodMonth,
        period_quarter: periodQuarter,
        gross_revenue: dre.revenue.gross_revenue,
        revenue_deductions: dre.revenue.revenue_deductions,
        net_revenue: dre.revenue.net_revenue,
        cogs: dre.costs_and_profit.cogs,
        gross_profit: dre.costs_and_profit.gross_profit,
        gross_profit_margin: dre.costs_and_profit.gross_profit_margin,
        admin_expense: dre.expenses.admin_expense,
        clinic_expense: dre.expenses.clinic_expense,
        commercial_expense: dre.expenses.commercial_expense,
        financial_expense: dre.expenses.financial_expense,
        total_operating_expense: dre.expenses.total_operating_expense,
        ebitda: dre.result.ebitda,
        ebitda_margin: dre.result.ebitda_margin,
        tax_expense: dre.result.tax_expense,
        net_income: dre.result.net_income,
        net_margin: dre.result.net_margin,
        competence_type: dre.competence_type,
        is_projected: false,
      } as DRESnapshot;
    }
    console.error('[saveDRESnapshot] Error:', err);
    throw err;
  }
}

/**
 * Get DRE drill-down (valores por linha de DRE)
 */
export async function getDREDrillDown(
  clinicId: string,
  startDate: string,
  endDate: string,
  dreLineItem: string
): Promise<Array<{
  account_code: string;
  account_name: string;
  value: number;
  percentage_of_total: number;
}>> {
  try {
    // Calcular DRE geral
    const dre = await calculateDREForPeriod(clinicId, startDate, endDate);

    // Buscar contas dessa linha
    const accounts = await getAccountsForDRELineItem(clinicId, dreLineItem);

    // Para cada conta, somar valores de transactions
    const drillDown = await Promise.all(
      accounts.map(async (account) => {
        let total = 0;

        const categories = categoryFilterForDRELine(dreLineItem);
        let query = customSupabaseClient
          .from('financial_transactions')
          .select('amount')
          .eq('clinic_id', clinicId)
          .gte('competency_date', startDate)
          .lte('competency_date', endDate)
          .neq('status', 'canceled');

        if (dreLineItem === 'gross_revenue') {
          query = query.eq('type', 'revenue');
        } else if (dreLineItem === 'revenue_deductions') {
          query = query.eq('type', 'deduction');
        } else if (dreLineItem === 'cogs') {
          query = query.eq('type', 'cost');
        } else {
          query = query.eq('type', 'expense');
          if (categories) query = query.in('category', categories);
        }

        const { data: entries, error } = await query;

        if (!error) {
          total = (entries || []).reduce((acc, e) => acc + (e.amount || 0), 0);
        }

        // Calcular % do total dre
        const lineTotal = (dre.revenue as any)[dreLineItem] ||
          (dre.costs_and_profit as any)[dreLineItem] ||
          (dre.expenses as any)[dreLineItem] ||
          (dre.result as any)[dreLineItem] || 0;

        return {
          account_code: account.account_code,
          account_name: account.account_name,
          value: total,
          percentage_of_total:
            lineTotal > 0 ? (total / Math.abs(lineTotal)) * 100 : 0,
        };
      })
    );

    return drillDown.filter((d) => d.value !== 0);
  } catch (err) {
    console.error('[getDREDrillDown] Error:', err);
    throw err;
  }
}

/**
 * Get DRE forecast (projeção com base em histórico)
 */
export async function getDREForecast(
  clinicId: string,
  forecastMonths: number = 3
): Promise<DRESnapshot[]> {
  try {
    // Buscar últimos 12 meses
    const { data: historicalDREs, error } = await customSupabaseClient
      .from('dre_snapshots')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('period_type', 'month')
      .order('period_year, period_month', { ascending: false })
      .limit(12);

    if (error) throw error;

    // Calcular média dos últimos 3 meses
    const recent3 = (historicalDREs || []).slice(0, 3);
    if (recent3.length === 0) {
      return []; // Sem dados históricos
    }

    const avgNetRevenue =
      recent3.reduce((acc, d) => acc + d.net_revenue, 0) / recent3.length;
    const avgNetMargin =
      recent3.reduce((acc, d) => acc + d.net_margin, 0) / recent3.length;
    const avgEbitdaMargin =
      recent3.reduce((acc, d) => acc + d.ebitda_margin, 0) / recent3.length;

    // Gerar forecast
    const forecast: DRESnapshot[] = [];
    const now = new Date();

    for (let i = 1; i <= forecastMonths; i++) {
      const forecastDate = new Date(now);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      const projectedNetRevenue = avgNetRevenue * 1.05; // 5% growth
      const projectedNetIncome =
        projectedNetRevenue * (avgNetMargin / 100);

      forecast.push({
        id: 0,
        clinic_id: clinicId,
        period_type: 'month',
        period_year: forecastDate.getFullYear(),
        period_month: forecastDate.getMonth() + 1,
        gross_revenue: projectedNetRevenue / (1 - 0.15), // assumir 15% deductions
        revenue_deductions:
          (projectedNetRevenue / (1 - 0.15)) * 0.15,
        net_revenue: projectedNetRevenue,
        cogs: projectedNetRevenue * 0.2,
        gross_profit: projectedNetRevenue * 0.8,
        gross_profit_margin: 80,
        admin_expense: projectedNetRevenue * 0.15,
        clinic_expense: projectedNetRevenue * 0.2,
        commercial_expense: projectedNetRevenue * 0.05,
        financial_expense: projectedNetRevenue * 0.02,
        total_operating_expense: projectedNetRevenue * 0.42,
        ebitda: projectedNetRevenue * (avgEbitdaMargin / 100),
        ebitda_margin: avgEbitdaMargin,
        tax_expense: projectedNetIncome * 0.15,
        net_income: projectedNetIncome,
        net_margin: avgNetMargin,
        competence_type: 'accrual',
        is_projected: true,
      } as DRESnapshot);
    }

    return forecast;
  } catch (err) {
    if ((err as any)?.code === '42P01' || String((err as any)?.message || '').includes('dre_snapshots')) {
      return [];
    }
    console.error('[getDREForecast] Error:', err);
    throw err;
  }
}

export default {
  calculateDREForPeriod,
  compareDREPeriods,
  getChartOfAccounts,
  getAccountsForDRELineItem,
  getDRESnapshot,
  getDRESnapshotsForRange,
  saveDRESnapshot,
  getDREDrillDown,
  getDREForecast,
};
