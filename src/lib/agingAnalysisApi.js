/**
 * Aging Analysis API
 * Funções para análise de atrasos em recebíveis
 */

import { supabase } from '@/lib/customSupabaseClient';
import { listReceivables } from '@/lib/receivablesApi';

/**
 * Get aging analysis for receivables
 * @param {UUID} clinicId
 * @returns {Promise<{byDaysOverdue, totalValue, avgDaysOverdue}>}
 */
export const getAgingAnalysis = async (clinicId) => {
  try {
    // Get all receivables
    const receivables = await listReceivables({
      clinicId,
      statusList: ['open', 'partial', 'overdue'],
      limit: 1000,
    });

    if (!receivables || receivables.length === 0) {
      return {
        byDaysOverdue: {
          current: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
        },
        totalValue: 0,
        avgDaysOverdue: 0,
      };
    }

    const today = new Date();
    const analysis = {
      current: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
    };

    let totalOverdue = 0;
    let totalDays = 0;
    let overdueCount = 0;

    receivables.forEach((r) => {
      if (!r.due_date) return;

      const dueDate = new Date(r.due_date);
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const amount = r.amount || 0;

      if (daysOverdue <= 0) {
        // Ainda não venceu
        analysis.current += amount;
      } else if (daysOverdue <= 30) {
        analysis.current += amount;
        totalOverdue += amount;
        totalDays += daysOverdue;
        overdueCount++;
      } else if (daysOverdue <= 60) {
        analysis.days31to60 += amount;
        totalOverdue += amount;
        totalDays += daysOverdue;
        overdueCount++;
      } else if (daysOverdue <= 90) {
        analysis.days61to90 += amount;
        totalOverdue += amount;
        totalDays += daysOverdue;
        overdueCount++;
      } else {
        analysis.over90 += amount;
        totalOverdue += amount;
        totalDays += daysOverdue;
        overdueCount++;
      }
    });

    return {
      byDaysOverdue: analysis,
      totalValue: Object.values(analysis).reduce((a, b) => a + b, 0),
      avgDaysOverdue: overdueCount > 0 ? totalDays / overdueCount : 0,
    };
  } catch (error) {
    console.error('[Aging Analysis] Error:', error);
    return {
      byDaysOverdue: {
        current: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
      },
      totalValue: 0,
      avgDaysOverdue: 0,
    };
  }
};

/**
 * Get receivables for calendar display
 * @param {UUID} clinicId
 * @param {Date} month
 * @returns {Promise<Array>}
 */
export const getReceivablesForCalendar = async (clinicId, month) => {
  try {
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const receivables = await listReceivables({
      clinicId,
      dueStart: startDate,
      dueEnd: endDate,
      statusList: ['open', 'partial', 'overdue'],
      limit: 1000,
    });

    return receivables || [];
  } catch (error) {
    console.error('[Calendar Events] Error:', error);
    return [];
  }
};

/**
 * Get aging summary by bucket
 * @param {UUID} clinicId
 * @returns {Promise<Object>}
 */
export const getAgingSummary = async (clinicId) => {
  const analysis = await getAgingAnalysis(clinicId);

  const total = analysis.totalValue;
  const current = analysis.byDaysOverdue.current;
  const overdue = total - current;

  return {
    total,
    current,
    overdue,
    overduePercentage: total > 0 ? (overdue / total) * 100 : 0,
    byBucket: analysis.byDaysOverdue,
    avgDaysOverdue: analysis.avgDaysOverdue,
  };
};

export default {
  getAgingAnalysis,
  getReceivablesForCalendar,
  getAgingSummary,
};
