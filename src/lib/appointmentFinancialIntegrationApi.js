/**
 * PHASE 2: Appointment Financial Integration API
 * Wraps PHASE 1 database triggers & functions
 *
 * Responsibilities:
 * - Finalize appointment → trigger AR/TISS guide auto-creation
 * - Fetch auto-created financial records
 * - Cancel appointment → trigger AR soft-delete
 * - Error handling & idempotency
 *
 * Date: April 11, 2026
 */

import { customSupabaseClient } from './customSupabaseClient';

// ============================================================================
// 1. FINALIZE APPOINTMENT (triggers AR + Guide creation via PHASE 1 triggers)
// ============================================================================

/**
 * Mark appointment as "attended" → auto-triggers:
 *   - create_ar_receivable_from_appointment()
 *   - create_tiss_guide_from_appointment() (if convênio)
 *
 * @param {UUID} appointmentId
 * @param {UUID} clinicId
 * @returns {Promise<{success: boolean, appointment: object, ar: object|null, guide: object|null}>}
 */
export async function finalizeAppointmentWithFinancials(appointmentId, clinicId) {
  try {
    const supabase = customSupabaseClient;

    // Step 1: Get current appointment details
    const { data: currentAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select(
        `
        id, 
        clinic_id, 
        status, 
        total_value, 
        payer_id, 
        professional_id,
        service_id
      `,
      )
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .single();

    if (fetchError || !currentAppointment) {
      return {
        success: false,
        error: `Appointment not found: ${fetchError?.message || 'Unknown'}`,
      };
    }

    // Step 2: Update status to 'attended' (triggers PHASE 1 functions)
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'attended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .select();


    if (updateError) {
      return {
        success: false,
        error: `Failed to update appointment: ${updateError.message}`,
      };
    }

    // Step 3: Fetch auto-created AR (check if trigger fired)
    const { data: arRecord } = await supabase
      .from('ar_receivables')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('clinic_id', clinicId);


    // Step 4: Fetch auto-created TISS guide (if convênio)
    let guideRecord = null;
    if (currentAppointment.payer_id) {
      const { data: guide } = await supabase
        .from('billing_guides')
        .select('*')
        .eq('appointment_id', appointmentId)
        .eq('clinic_id', clinicId);

      guideRecord = guide;
    }

    return {
      success: true,
      appointment: updatedAppointment,
      ar: arRecord || null,
      guide: guideRecord || null,
      message: `Appointment finalized. AR created: ${!!arRecord}, Guide created: ${!!guideRecord}`,
    };
  } catch (error) {
    console.error('Error in finalizeAppointmentWithFinancials:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// 2. GET AUTO-CREATED AR RECORD
// ============================================================================

/**
 * Fetch AR receivable created by trigger
 *
 * @param {UUID} appointmentId
 * @param {UUID} clinicId
 * @returns {Promise<object>}
 */
export async function getARFromAppointment(appointmentId, clinicId) {
  try {
    const supabase = customSupabaseClient;

    const { data, error } = await supabase
      .from('ar_receivables')
      .select(
        `
        id,
        clinic_id,
        appointment_id,
        payer_name,
        valor,
        status,
        origem,
        descricao,
        created_at,
        updated_at
      `,
      )
      .eq('appointment_id', appointmentId)
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      console.warn(`AR not found for appointment ${appointmentId}: ${error.message}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching AR:', error);
    return null;
  }
}

// ============================================================================
// 3. GET AUTO-CREATED TISS GUIDE
// ============================================================================

/**
 * Fetch TISS billing guide created by trigger
 *
 * @param {UUID} appointmentId
 * @param {UUID} clinicId
 * @returns {Promise<object>}
 */
export async function getTISSGuideFromAppointment(appointmentId, clinicId) {
  try {
    const supabase = customSupabaseClient;

    const { data, error } = await supabase
      .from('billing_guides')
      .select(
        `
        id,
        clinic_id,
        appointment_id,
        payer_id,
        guide_number,
        status,
        created_at,
        updated_at
      `,
      )
      .eq('appointment_id', appointmentId)
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      console.warn(`Guide not found for appointment ${appointmentId}: ${error.message}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching TISS guide:', error);
    return null;
  }
}

// ============================================================================
// 4. CANCEL APPOINTMENT FINANCIALS
// ============================================================================

/**
 * Cancel appointment → soft-delete AR via PHASE 1 trigger
 *
 * @param {UUID} appointmentId
 * @param {UUID} clinicId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function cancelAppointmentFinancials(appointmentId, clinicId) {
  try {
    const supabase = customSupabaseClient;

    // Step 1: Update appointment status to 'canceled' (triggers cancel function)
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId);

    if (updateError) {
      return {
        success: false,
        message: `Failed to cancel appointment: ${updateError.message}`,
      };
    }

    // Step 2: Verify AR was soft-deleted
    const { data: arRecord } = await supabase
      .from('ar_receivables')
      .select('status')
      .eq('appointment_id', appointmentId)
      .eq('clinic_id', clinicId);


    return {
      success: true,
      message: `Appointment canceled. AR status: ${arRecord?.status || 'not found'}`,
      arStatus: arRecord?.status,
    };
  } catch (error) {
    console.error('Error canceling appointment financials:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

// ============================================================================
// 5. VALIDATE FINANCIAL INTEGRATION STATUS
// ============================================================================

/**
 * Check if appointment has auto-created financial records
 *
 * @param {UUID} appointmentId
 * @param {UUID} clinicId
 * @returns {Promise<{appointment: object, ar: object|null, guide: object|null, status: string}>}
 */
export async function validateFinancialIntegration(appointmentId, clinicId) {
  try {
    const supabase = customSupabaseClient;

    // Get appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, status, total_value, payer_id')
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId);


    // Get AR
    const { data: ar } = await supabase
      .from('ar_receivables')
      .select('id, status, valor')
      .eq('appointment_id', appointmentId)
      .eq('clinic_id', clinicId)
      .maybeSingle();

    // Get Guide
    const { data: guide } = await supabase
      .from('billing_guides')
      .select('id, status, guide_number')
      .eq('appointment_id', appointmentId)
      .eq('clinic_id', clinicId)
      .maybeSingle();

    // Status summary
    let status = 'pending';
    if (appointment?.status === 'attended') {
      if (ar && guide && appointment.payer_id) {
        status = 'complete_with_guide';
      } else if (ar && !appointment.payer_id) {
        status = 'complete_particular';
      } else {
        status = 'partial_no_ar_guide';
      }
    } else if (appointment?.status === 'canceled') {
      status = 'canceled';
    }

    return {
      appointment,
      ar,
      guide,
      status,
    };
  } catch (error) {
    console.error('Error validating financial integration:', error);
    return {
      error: error.message,
      status: 'error',
    };
  }
}

// ============================================================================
// 6. LIST APPOINTMENTS WITH FINANCIAL STATUS
// ============================================================================

/**
 * Get appointments within date range with their financial integration status
 *
 * @param {UUID} clinicId
 * @param {string} startDate (ISO format)
 * @param {string} endDate (ISO format)
 * @returns {Promise<Array>}
 */
export async function listAppointmentsWithFinancialStatus(clinicId, startDate, endDate) {
  try {
    const supabase = customSupabaseClient;

    // Get appointments
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        clinic_id,
        status,
        total_value,
        payer_id,
        professional_id,
        service_id,
        appointment_time,
        ar_receivables(id, status, valor),
        billing_guides(id, status, guide_number)
      `,
      )
      .eq('clinic_id', clinicId)
      .gte('appointment_time', startDate)
      .lte('appointment_time', endDate)
      .order('appointment_time', { ascending: false });

    if (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }

    // Enrich with financial status
    return appointments.map((appt) => ({
      ...appt,
      financial_status: deriveFinancialStatus(appt),
    }));
  } catch (error) {
    console.error('Error in listAppointmentsWithFinancialStatus:', error);
    return [];
  }
}

// ============================================================================
// 7. HELPER: DERIVE FINANCIAL STATUS
// ============================================================================

/**
 * Determine financial integration status from appointment + related records
 *
 * @param {object} appointment
 * @returns {string}
 */
function deriveFinancialStatus(appointment) {
  const { status, payer_id, ar_receivables, billing_guides } = appointment;

  if (status === 'attended') {
    const hasAR = ar_receivables && ar_receivables.length > 0;
    const hasGuide = billing_guides && billing_guides.length > 0;

    if (payer_id && hasAR && hasGuide) {
      return 'complete_with_guide'; // Convênio + AR + Guide
    } else if (!payer_id && hasAR) {
      return 'complete_particular'; // Particular + AR only
    } else if (hasAR) {
      return 'partial_missing_guide'; // Has AR but no guide (should have one for convênio)
    } else {
      return 'attended_no_financial'; // Attended but no AR (trigger may not have fired)
    }
  } else if (status === 'canceled') {
    return 'canceled';
  } else {
    return 'pending'; // Not yet attended
  }
}

// ============================================================================
// 8. BULK VALIDATE FINANCIAL INTEGRATION
// ============================================================================

/**
 * Check multiple appointments for financial status
 * Useful for dashboard/reports
 *
 * @param {UUID} clinicId
 * @param {Array<UUID>} appointmentIds
 * @returns {Promise<Array>}
 */
export async function bulkValidateFinancialIntegration(clinicId, appointmentIds) {
  try {
    const supabase = customSupabaseClient;

    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        status,
        payer_id,
        total_value,
        ar_receivables(id, status),
        billing_guides(id, status)
      `,
      )
      .eq('clinic_id', clinicId)
      .in('id', appointmentIds);

    if (error) {
      console.error('Error in bulk validation:', error);
      return [];
    }

    return data.map((appt) => ({
      appointment_id: appt.id,
      status: appt.status,
      has_ar: appt.ar_receivables?.length > 0,
      has_guide: appt.billing_guides?.length > 0,
      ar_status: appt.ar_receivables?.[0]?.status || null,
      guide_status: appt.billing_guides?.[0]?.status || null,
      financial_status: deriveFinancialStatus(appt),
    }));
  } catch (error) {
    console.error('Error in bulkValidateFinancialIntegration:', error);
    return [];
  }
}

export default {
  finalizeAppointmentWithFinancials,
  getARFromAppointment,
  getTISSGuideFromAppointment,
  cancelAppointmentFinancials,
  validateFinancialIntegration,
  listAppointmentsWithFinancialStatus,
  bulkValidateFinancialIntegration,
};
