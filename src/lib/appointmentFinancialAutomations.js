/**
 * ETAPA 1: Enhancing Appointment-to-Financial Automation
 * 
 * Enhancements:
 * 1. Auto-update cashflow (predicted)
 * 2. Auto-update DRE metrics
 * 3. Auto-update financial indicators
 * 4. Auto-log audit events
 * 5. Error handling + rollback
 * 
 * Usage: This is called automatically by triggers when appointment is attended/canceled
 */

import { customSupabaseClient } from '@/lib/customSupabaseClient';

const supabase = customSupabaseClient;

// ============================================================================
// ETAPA 1: AUTOMAÇÕES SCHEDULER
// ============================================================================

/**
 * Queue a financial automation event for async processing
 * Prevents blocking the trigger execution
 */
async function queueFinancialAutomation(appointmentId, clinicId, eventType, payload = {}) {
  try {
    const { data, error } = await supabase
      .from('financial_automation_queue')
      .insert({
        appointment_id: appointmentId,
        clinic_id: clinicId,
        event_type: eventType,
        payload,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[queueFinancialAutomation] Error queuing event:', error);
      return null;
    }

    console.log('[queueFinancialAutomation] Queued:', { eventType, appointmentId });
    return data;
  } catch (err) {
    console.error('[queueFinancialAutomation] Exception:', err);
    return null;
  }
}

/**
 * ETAPA 1: Auto-update cashflow (predicted)
 * When: Appointment attended (receivable created)
 * Action: Add to predicted cashflow
 */
export async function autoupdateCashflowPredicted(appointmentId, clinicId, appointmentValue, appointmentData = {}) {
  try {
    if (!appointmentValue || appointmentValue <= 0) {
      console.log('[autoupdateCashflowPredicted] Skipping: no value');
      return { success: true };
    }

    const now = new Date();
    const predictedDate = new Date(now);
    predictedDate.setDate(predictedDate.getDate() + 3); // Predict 3 days forward
    const predictedDateString = predictedDate.toISOString().split('T')[0];
    const description = appointmentData.description || `Receita prevista de atendimento ${appointmentId}`;

    await supabase
      .from('fluxo_caixa_movimentos')
      .delete()
      .eq('reference_type', 'appointment')
      .eq('reference_id', appointmentId);

    await supabase
      .from('financial_transactions')
      .delete()
      .eq('origin_module', 'appointment')
      .eq('origin_id', appointmentId);

    const { error: cashflowError } = await supabase
      .from('fluxo_caixa_movimentos')
      .insert({
        clinic_id: clinicId,
        date: predictedDateString,
        description,
        category: 'appointment',
        type: 'entrada',
        amount: appointmentValue,
        status: 'pending',
        reference_type: 'appointment',
        reference_id: appointmentId,
        payment_method: appointmentData.payment_method || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

    if (cashflowError) {
      throw cashflowError;
    }

    const { error: transactionError } = await supabase
      .from('financial_transactions')
      .insert({
        clinic_id: clinicId,
        description,
        amount: appointmentValue,
        type: 'revenue',
        category: 'appointment',
        status: 'scheduled',
        appointment_id: appointmentId,
        professional_id: appointmentData.professional_id || null,
        scheduled_date: predictedDateString,
        due_date: predictedDateString,
        reference_document: appointmentData.guide_number || appointmentData.authorization_number || null,
        transaction_type: 'INCOME',
        movement_type: 'PREDICTED',
        transaction_date: predictedDateString,
        competency_date: appointmentData.competency_date || appointmentData.scheduled_date || predictedDateString,
        origin_module: 'appointment',
        origin_id: appointmentId,
        is_reconciled: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

    if (transactionError) {
      throw transactionError;
    }

    console.log('[autoupdateCashflowPredicted] Created predicted cashflow movement');

    return { success: true, predictedDate };
  } catch (err) {
    console.error('[autoupdateCashflowPredicted] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * ETAPA 1: Auto-update DRE metrics
 * When: Appointment attended
 * Action: Update DRE revenue metrics
 */
export async function autoupdateDREMetrics(appointmentId, clinicId, appointmentData) {
  try {
    const { value } = appointmentData;

    if (!value || value <= 0) {
      console.log('[autoupdateDREMetrics] Skipping: no value');
      return { success: true };
    }

    const now = new Date();
    const referenceDate = new Date(
      appointmentData.competency_date || appointmentData.scheduled_date || now.toISOString(),
    );
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const nextMonthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1)
      .toISOString()
      .split('T')[0];
    const entryDate = referenceDate.toISOString().split('T')[0];
    const description = appointmentData.description || `Receita de atendimento ${appointmentId}`;

    const { error: deleteEntryError } = await supabase
      .from('dre_entries')
      .delete()
      .eq('reference_type', 'appointment')
      .eq('reference_id', appointmentId);

    if (deleteEntryError) {
      throw deleteEntryError;
    }

    const { error: insertEntryError } = await supabase
      .from('dre_entries')
      .insert({
        clinic_id: clinicId,
        plano_contas_id: appointmentData.chart_account_id || appointmentData.plano_contas_id || null,
        date: entryDate,
        description,
        amount: value,
        reference_type: 'appointment',
        reference_id: appointmentId,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

    if (insertEntryError) {
      throw insertEntryError;
    }

    const { data: monthEntries, error: entriesError } = await supabase
      .from('dre_entries')
      .select('amount')
      .eq('clinic_id', clinicId)
      .gte('date', monthStart)
      .lt('date', nextMonthStart);

    if (entriesError) {
      throw entriesError;
    }

    const revenue = (monthEntries || [])
      .filter((entry) => Number(entry.amount || 0) > 0)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const expenses = Math.abs((monthEntries || [])
      .filter((entry) => Number(entry.amount || 0) < 0)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0));

    const { data: existingDRE, error: fetchError } = await supabase
      .from('dre_metrics')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('month', monthStart)
      .limit(1);

    if (fetchError) {
      throw fetchError;
    }

    const existingMetric = existingDRE?.[0];

    if (existingMetric) {
      const { error: updateError } = await supabase
        .from('dre_metrics')
        .update({
          revenue,
          expenses,
        })
        .eq('id', existingMetric.id);

      if (updateError) throw updateError;
      console.log('[autoupdateDREMetrics] Updated DRE metrics');
    } else {
      const { error: insertError } = await supabase
        .from('dre_metrics')
        .insert({
          clinic_id: clinicId,
          month: monthStart,
          revenue,
          expenses,
          created_at: now.toISOString(),
        });

      if (insertError) throw insertError;
      console.log('[autoupdateDREMetrics] Created DRE metrics');
    }

    return { success: true, month: monthStart, revenue, expenses };
  } catch (err) {
    console.error('[autoupdateDREMetrics] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * ETAPA 1: Auto-update financial indicators
 * When: Appointment attended
 * Action: Update clinic financial indicators (KPIs)
 */
export async function autoupdateFinancialIndicators(clinicId, appointmentData) {
  try {
    const { value, professional_id } = appointmentData;

    if (!value || value <= 0) {
      console.log('[autoupdateFinancialIndicators] Skipping: no value');
      return { success: true };
    }

    // Get clinic indicators
    const { data: indicators, error: fetchError } = await supabase
      .from('financial_indicators')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const now = new Date();

    // Calculate new metrics
    const updatedIndicators = {
      ...indicators,
      total_revenue: (indicators?.total_revenue || 0) + value,
      pending_revenue: (indicators?.pending_revenue || 0) + value,
      today_revenue: (indicators?.today_revenue || 0) + value,
      updated_at: now.toISOString(),
    };

    if (indicators) {
      const { error: updateError } = await supabase
        .from('financial_indicators')
        .update(updatedIndicators)
        .eq('id', indicators.id);

      if (updateError) throw updateError;
      console.log('[autoupdateFinancialIndicators] Updated indicators');
    } else {
      const { error: insertError } = await supabase
        .from('financial_indicators')
        .insert({
          clinic_id: clinicId,
          ...updatedIndicators,
        });

      if (insertError) throw insertError;
      console.log('[autoupdateFinancialIndicators] Created indicators');
    }

    return { success: true, indicators: updatedIndicators };
  } catch (err) {
    console.error('[autoupdateFinancialIndicators] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * ETAPA 1: Auto-log financial audit event
 * When: Any financial automation
 * Action: Create structured audit log
 */
export async function autologFinancialAudit(appointmentId, clinicId, eventType, details = {}) {
  try {
    const { data, error } = await supabase
      .from('appointment_financial_audit_logs')
      .insert({
        appointment_id: appointmentId,
        clinic_id: clinicId,
        financial_event_type: eventType,
        performed_by: 'system',
        performed_at: new Date().toISOString(),
        status: 'completed',
        context: details,
      });

    if (error) throw error;
    console.log('[autologFinancialAudit] Logged:', eventType);
    return { success: true };
  } catch (err) {
    console.error('[autologFinancialAudit] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * ETAPA 1: Handle errors with rollback
 * When: Any automation fails
 * Action: Rollback related transactions
 */
export async function rollbackAppointmentFinancials(appointmentId, clinicId, reason) {
  try {
    console.log('[rollbackAppointmentFinancials] Starting rollback:', { appointmentId, reason });

    // 1. Cancel canonical receivables
    const { error: arError } = await supabase
      .from('ar_invoices')
      .update({ status: 'canceled' })
      .eq('appointment_id', appointmentId)
      .eq('clinic_id', clinicId);

    if (arError) console.error('[rollback] AR error:', arError);

    // 2. Cancel TISS guides
    const { error: tissError } = await supabase
      .from('tiss_guides')
      .update({ status: 'canceled' })
      .eq('appointment_id', appointmentId);

    if (tissError) console.error('[rollback] TISS error:', tissError);

    // 3. Cancel medical commissions
    const { error: commError } = await supabase
      .from('medical_commissions')
      .update({ status: 'canceled' })
      .eq('appointment_id', appointmentId);

    if (commError) console.error('[rollback] Commission error:', commError);

    // 4. Log rollback event
    await autologFinancialAudit(appointmentId, clinicId, 'AUTOMATION_ROLLED_BACK', {
      reason,
      timestamp: new Date().toISOString(),
    });

    console.log('[rollbackAppointmentFinancials] Rollback completed');
    return { success: true };
  } catch (err) {
    console.error('[rollbackAppointmentFinancials] Rollback failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * ETAPA 1: Main orchestrator
 * Runs all automations for an attended appointment
 */
export async function orchestrateAppointmentFinancialAutomations(appointmentId, clinicId, appointmentData) {
  try {
    console.log('[orchestrateAppointmentFinancialAutomations] Starting for appointment:', appointmentId);

    const { value, professional_id, payer_id } = appointmentData;

    // 1. Update cashflow
    const cashflowResult = await autoupdateCashflowPredicted(appointmentId, clinicId, value, appointmentData);
    if (!cashflowResult.success) {
      console.warn('[orchestrate] Cashflow update failed, continuing...', cashflowResult.error);
    }

    // 2. Update DRE metrics
    const dreResult = await autoupdateDREMetrics(appointmentId, clinicId, appointmentData);
    if (!dreResult.success) {
      console.warn('[orchestrate] DRE update failed, continuing...', dreResult.error);
    }

    // 3. Update financial indicators
    const indicatorsResult = await autoupdateFinancialIndicators(clinicId, appointmentData);
    if (!indicatorsResult.success) {
      console.warn('[orchestrate] Indicators update failed, continuing...', indicatorsResult.error);
    }

    // 4. Log audit event
    await autologFinancialAudit(appointmentId, clinicId, 'APPOINTMENT_ATTENDED', {
      value,
      professional_id,
      payer_id,
      automations_run: true,
    });

    console.log('[orchestrateAppointmentFinancialAutomations] Completed successfully');
    return {
      success: true,
      results: {
        cashflow: cashflowResult,
        dre: dreResult,
        indicators: indicatorsResult,
      },
    };
  } catch (err) {
    console.error('[orchestrateAppointmentFinancialAutomations] Failed:', err);
    
    // Attempt rollback
    await rollbackAppointmentFinancials(appointmentId, clinicId, `Automation orchestration failed: ${err.message}`);
    
    return {
      success: false,
      error: err.message,
      rolledBack: true,
    };
  }
}

export default {
  autoupdateCashflowPredicted,
  autoupdateDREMetrics,
  autoupdateFinancialIndicators,
  autologFinancialAudit,
  rollbackAppointmentFinancials,
  orchestrateAppointmentFinancialAutomations,
  queueFinancialAutomation,
};
