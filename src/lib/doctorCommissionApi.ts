/**
 * Doctor Commission Service - ETAPA 4
 * 
 * Handles automatic calculation of doctor commissions with multiple models,
 * tax handling, scheduling, and reporting
 */

import { customSupabaseClient } from '@/lib/customSupabaseClient';

export interface DoctorCommissionCalculation {
  id: number;
  clinic_id: string;
  professional_id: string;
  receivable_id: number;
  appointment_id: string;
  config_id?: number;
  regime_code?: string;
  commission_model: string;
  base_amount: number;
  commission_percent: number;
  commission_fixed: number;
  taxes_iss: number;
  taxes_inss: number;
  taxes_irpf: number;
  retention_total: number;
  commission_net: number;
  status: string;
  payment_date?: string;
  created_at: string;
}

/**
 * Calculate doctor commission
 */
export async function calculateDoctorCommission(
  clinicId: string,
  professionalId: string,
  receivableId: number,
  appointmentId: string
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('calculate_doctor_commission', {
        p_clinic_id: clinicId,
        p_professional_id: professionalId,
        p_receivable_id: receivableId,
        p_appointment_id: appointmentId,
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[calculateDoctorCommission] Error:', err);
    throw err;
  }
}

/**
 * Schedule doctor commission for payment
 */
export async function scheduleDoctorCommission(
  calculationId: number,
  clinicId: string,
  paymentDate: string
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('schedule_doctor_commission', {
        p_calculation_id: calculationId,
        p_clinic_id: clinicId,
        p_payment_date: paymentDate,
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[scheduleDoctorCommission] Error:', err);
    throw err;
  }
}

/**
 * Get doctor commission summary for period
 */
export async function getDoctorCommissionSummary(
  professionalId: string,
  clinicId: string,
  startDate: string,
  endDate: string
): Promise<any> {
  try {
    const { data, error } = await customSupabaseClient
      .rpc('get_doctor_commission_summary', {
        p_professional_id: professionalId,
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[getDoctorCommissionSummary] Error:', err);
    throw err;
  }
}

/**
 * Get commission calculations for professional
 */
export async function getCommissionCalculations(
  professionalId: string,
  clinicId?: string,
  filters?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }
): Promise<DoctorCommissionCalculation[]> {
  try {
    let query = customSupabaseClient
      .from('doctor_commission_calculations')
      .select('*')
      .eq('professional_id', professionalId);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('created_at', filters.toDate);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as DoctorCommissionCalculation[];
  } catch (err) {
    console.error('[getCommissionCalculations] Error:', err);
    throw err;
  }
}

/**
 * Get all calculations for clinic
 */
export async function getClinicCommissionCalculations(
  clinicId: string,
  filters?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
  }
): Promise<DoctorCommissionCalculation[]> {
  try {
    let query = customSupabaseClient
      .from('doctor_commission_calculations')
      .select('*')
      .eq('clinic_id', clinicId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('created_at', filters.toDate);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return (data || []) as DoctorCommissionCalculation[];
  } catch (err) {
    console.error('[getClinicCommissionCalculations] Error:', err);
    throw err;
  }
}

/**
 * Get pending commissions (calculated but not scheduled)
 */
export async function getPendingCommissions(
  clinicId: string
): Promise<DoctorCommissionCalculation[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('doctor_commission_calculations')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'calculated')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as DoctorCommissionCalculation[];
  } catch (err) {
    console.error('[getPendingCommissions] Error:', err);
    throw err;
  }
}

/**
 * Get scheduled commissions
 */
export async function getScheduledCommissions(
  clinicId: string
): Promise<DoctorCommissionCalculation[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('doctor_commission_calculations')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'scheduled')
      .order('payment_date', { ascending: true });

    if (error) throw error;
    return (data || []) as DoctorCommissionCalculation[];
  } catch (err) {
    console.error('[getScheduledCommissions] Error:', err);
    throw err;
  }
}

/**
 * Get paid commissions
 */
export async function getPaidCommissions(
  clinicId: string,
  fromDate?: string,
  toDate?: string
): Promise<DoctorCommissionCalculation[]> {
  try {
    let query = customSupabaseClient
      .from('doctor_commission_calculations')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'paid');

    if (fromDate) {
      query = query.gte('payment_date', fromDate);
    }
    if (toDate) {
      query = query.lte('payment_date', toDate);
    }

    const { data, error } = await query.order('payment_date', {
      ascending: false,
    });

    if (error) throw error;
    return (data || []) as DoctorCommissionCalculation[];
  } catch (err) {
    console.error('[getPaidCommissions] Error:', err);
    throw err;
  }
}

/**
 * Get commission statistics for clinic
 */
export async function getCommissionStats(
  clinicId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  total_calculations: number;
  total_commission_gross: number;
  total_taxes: number;
  total_commission_net: number;
  pending_count: number;
  scheduled_count: number;
  paid_count: number;
  average_commission: number;
  by_professional: Record<string, any>;
}> {
  try {
    let query = customSupabaseClient
      .from('doctor_commission_calculations')
      .select('*')
      .eq('clinic_id', clinicId);

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      query = query.lte('created_at', toDate);
    }

    const { data: calculations, error } = await query;

    if (error) throw error;

    const totalCommissionGross = (calculations || []).reduce(
      (acc, c) => acc + (c.commission_percent > 0 ? c.commission_net : c.commission_fixed),
      0
    );

    const totalTaxes = (calculations || []).reduce(
      (acc, c) => acc + (c.retention_total || 0),
      0
    );

    const byProfessional = (calculations || []).reduce(
      (acc, c) => {
        const key = c.professional_id;
        if (!acc[key]) {
          acc[key] = { count: 0, total: 0, net: 0 };
        }
        acc[key].count += 1;
        acc[key].total +=
          c.commission_percent > 0 ? c.commission_net : c.commission_fixed;
        acc[key].net += c.commission_net;
        return acc;
      },
      {} as Record<string, any>
    );

    return {
      total_calculations: calculations?.length || 0,
      total_commission_gross: totalCommissionGross,
      total_taxes: totalTaxes,
      total_commission_net:
        totalCommissionGross - totalTaxes || totalCommissionGross,
      pending_count:
        (calculations || []).filter((c) => c.status === 'calculated').length ||
        0,
      scheduled_count:
        (calculations || []).filter((c) => c.status === 'scheduled').length || 0,
      paid_count:
        (calculations || []).filter((c) => c.status === 'paid').length || 0,
      average_commission:
        ((calculations || []).length > 0
          ? (totalCommissionGross - totalTaxes) / (calculations?.length || 1)
          : 0) || 0,
      by_professional: byProfessional,
    };
  } catch (err) {
    console.error('[getCommissionStats] Error:', err);
    throw err;
  }
}

/**
 * Bulk schedule pending commissions
 */
export async function bulkScheduleCommissions(
  clinicId: string,
  paymentDate: string
): Promise<{
  scheduled: number;
  failed: number;
  errors: string[];
}> {
  try {
    const pending = await getPendingCommissions(clinicId);

    let scheduled = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const commission of pending) {
      try {
        await scheduleDoctorCommission(commission.id, clinicId, paymentDate);
        scheduled++;
      } catch (err) {
        failed++;
        errors.push(`Commission ${commission.id}: ${(err as Error).message}`);
      }
    }

    return { scheduled, failed, errors };
  } catch (err) {
    console.error('[bulkScheduleCommissions] Error:', err);
    throw err;
  }
}

/**
 * Mark commission as paid
 */
export async function markCommissionAsPaid(
  calculationId: number,
  paymentDate: string
): Promise<DoctorCommissionCalculation> {
  try {
    const { data, error } = await customSupabaseClient
      .from('doctor_commission_calculations')
      .update({ status: 'paid', payment_date: paymentDate })
      .eq('id', calculationId)
      .select()
      .single();

    if (error) throw error;
    return data as DoctorCommissionCalculation;
  } catch (err) {
    console.error('[markCommissionAsPaid] Error:', err);
    throw err;
  }
}

export default {
  calculateDoctorCommission,
  scheduleDoctorCommission,
  getDoctorCommissionSummary,
  getCommissionCalculations,
  getClinicCommissionCalculations,
  getPendingCommissions,
  getScheduledCommissions,
  getPaidCommissions,
  getCommissionStats,
  bulkScheduleCommissions,
  markCommissionAsPaid,
};
