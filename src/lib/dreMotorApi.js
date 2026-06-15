/**
 * ETAPA 5: DRE DINÂMICA - API
 * Dynamic Income Statement with real-time calculations
 * 
 * Features:
 * - Calculate monthly DRE from receivable_payments, ap_bills, medical_commission_ledger
 * - Generate DRE for different periods (daily, weekly, monthly, quarterly, yearly)
 * - Compare periods (month-over-month, year-over-year)
 * - Dashboard views and KPIs
 */

import { supabase } from './customSupabaseClient';

/**
 * Calculate DRE for a specific period
 * @param {UUID} clinicId
 * @param {string} periodType - 'monthly', 'quarterly', 'yearly'
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{success, data, error}>}
 */
export const calculateDREPeriod = async (clinicId, periodType, startDate, endDate) => {
  try {
    const { data, error } = await supabase.rpc('fn_calculate_dre_period', {
      p_clinic_id: clinicId,
      p_period_type: periodType,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;

    return {
      success: true,
      data: data[0],
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error calculating DRE period:', err);
    return {
      success: false,
      data: null,
      error: err.message
    };
  }
};

/**
 * Get monthly DRE summary for a clinic
 * @param {UUID} clinicId
 * @param {number} months - Number of months to fetch (default 12)
 * @returns {Promise<Array>}
 */
export const getMonthlyDRESummary = async (clinicId, months = 12) => {
  try {
    const { data, error } = await supabase
      .from('dre_periods')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('period_type', 'monthly')
      .order('period_start_date', { ascending: false })
      .limit(months);

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error fetching monthly summary:', err);
    return {
      success: false,
      data: [],
      error: err.message
    };
  }
};

/**
 * Get YTD performance metrics
 * @param {UUID} clinicId
 * @returns {Promise<Object>}
 */
export const getYTDPerformance = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('vw_dre_ytd_performance')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return {
      success: true,
      data: data || {},
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error fetching YTD performance:', err);
    return {
      success: false,
      data: {},
      error: err.message
    };
  }
};

/**
 * Get profitability metrics for dashboard
 * @param {UUID} clinicId
 * @returns {Promise<Array>}
 */
export const getProfitabilityMetrics = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('vw_dre_profitability_metrics')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('period_start_date', { ascending: false })
      .limit(12);

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error fetching profitability metrics:', err);
    return {
      success: false,
      data: [],
      error: err.message
    };
  }
};

/**
 * Generate DRE comparison between two periods
 * @param {UUID} clinicId
 * @param {Date} currentStart
 * @param {Date} currentEnd
 * @param {Date} previousStart
 * @param {Date} previousEnd
 * @returns {Promise<Array>}
 */
export const generateDREComparison = async (
  clinicId,
  currentStart,
  currentEnd,
  previousStart,
  previousEnd
) => {
  try {
    // Get current period
    const { data: currentData, error: currentError } = await supabase
      .from('dre_periods')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('period_start_date', currentStart)
      .lte('period_end_date', currentEnd)
      .single();

    if (currentError && currentError.code !== 'PGRST116') throw currentError;

    // Get previous period
    const { data: previousData, error: previousError } = await supabase
      .from('dre_periods')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('period_start_date', previousStart)
      .lte('period_end_date', previousEnd)
      .single();

    if (previousError && previousError.code !== 'PGRST116') throw previousError;

    // Calculate comparison
    const comparison = {
      revenue: {
        current: currentData?.gross_revenue || 0,
        previous: previousData?.gross_revenue || 0,
        variance: (currentData?.gross_revenue || 0) - (previousData?.gross_revenue || 0),
        variance_pct: previousData?.gross_revenue
          ? (((currentData?.gross_revenue || 0) - (previousData?.gross_revenue || 0)) /
              previousData.gross_revenue) *
            100
          : 0,
        trend: (currentData?.gross_revenue || 0) > (previousData?.gross_revenue || 0) ? 'UP' : 'DOWN'
      },
      expenses: {
        current: currentData?.total_operating_expenses || 0,
        previous: previousData?.total_operating_expenses || 0,
        variance: (currentData?.total_operating_expenses || 0) - (previousData?.total_operating_expenses || 0),
        variance_pct: previousData?.total_operating_expenses
          ? (((currentData?.total_operating_expenses || 0) - (previousData?.total_operating_expenses || 0)) /
              previousData.total_operating_expenses) *
            100
          : 0,
        trend: (currentData?.total_operating_expenses || 0) > (previousData?.total_operating_expenses || 0)
          ? 'UP'
          : 'DOWN'
      },
      net_income: {
        current: currentData?.net_income || 0,
        previous: previousData?.net_income || 0,
        variance: (currentData?.net_income || 0) - (previousData?.net_income || 0),
        variance_pct: previousData?.net_income
          ? (((currentData?.net_income || 0) - (previousData?.net_income || 0)) / previousData.net_income) *
            100
          : 0,
        trend: (currentData?.net_income || 0) > (previousData?.net_income || 0) ? 'UP' : 'DOWN'
      },
      margins: {
        current_operating: currentData?.operating_margin_pct || 0,
        previous_operating: previousData?.operating_margin_pct || 0,
        current_net: currentData?.net_margin_pct || 0,
        previous_net: previousData?.net_margin_pct || 0
      }
    };

    return {
      success: true,
      data: comparison,
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error generating comparison:', err);
    return {
      success: false,
      data: null,
      error: err.message
    };
  }
};

/**
 * Get current month DRE summary
 * @param {UUID} clinicId
 * @returns {Promise<Object>}
 */
export const getCurrentMonthDRE = async (clinicId) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('dre_periods')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('period_type', 'monthly')
      .gte('period_start_date', startOfMonth.toISOString().split('T')[0])
      .lte('period_end_date', endOfMonth.toISOString().split('T')[0])
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return {
      success: true,
      data: data || {},
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error fetching current month DRE:', err);
    return {
      success: false,
      data: {},
      error: err.message
    };
  }
};

/**
 * Create DRE projection
 * @param {UUID} clinicId
 * @param {Date} projectionMonth
 * @param {string} scenarioName
 * @param {Object} projectionData
 * @returns {Promise<Object>}
 */
export const createDREProjection = async (
  clinicId,
  projectionMonth,
  scenarioName,
  projectionData
) => {
  try {
    const { data, error } = await supabase
      .from('dre_projections')
      .insert({
        clinic_id: clinicId,
        projection_month: projectionMonth,
        scenario_name: scenarioName,
        ...projectionData
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data,
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error creating projection:', err);
    return {
      success: false,
      data: null,
      error: err.message
    };
  }
};

/**
 * Get DRE projections
 * @param {UUID} clinicId
 * @param {Date} month
 * @returns {Promise<Array>}
 */
export const getDREProjections = async (clinicId, month) => {
  try {
    const { data, error } = await supabase
      .from('dre_projections')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('projection_month', month);

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error fetching projections:', err);
    return {
      success: false,
      data: [],
      error: err.message
    };
  }
};

/**
 * Get DRE dashboard data (comprehensive)
 * @param {UUID} clinicId
 * @returns {Promise<Object>}
 */
export const getDREDashboard = async (clinicId) => {
  try {
    // Fetch all dashboard data in parallel
    const [
      monthlyData,
      ytdData,
      profitabilityData,
      currentMonthData
    ] = await Promise.all([
      getMonthlyDRESummary(clinicId, 12),
      getYTDPerformance(clinicId),
      getProfitabilityMetrics(clinicId),
      getCurrentMonthDRE(clinicId)
    ]);

    return {
      success: true,
      data: {
        monthly: monthlyData.data,
        ytd: ytdData.data,
        profitability: profitabilityData.data,
        current_month: currentMonthData.data,
        timestamp: new Date().toISOString()
      },
      error: null
    };
  } catch (err) {
    console.error('[DRE API] Error fetching dashboard:', err);
    return {
      success: false,
      data: null,
      error: err.message
    };
  }
};

export default {
  calculateDREPeriod,
  getMonthlyDRESummary,
  getYTDPerformance,
  getProfitabilityMetrics,
  generateDREComparison,
  getCurrentMonthDRE,
  createDREProjection,
  getDREProjections,
  getDREDashboard
};
