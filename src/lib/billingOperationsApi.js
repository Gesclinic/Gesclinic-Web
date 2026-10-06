import { supabase } from './customSupabaseClient';

export const BILLING_BATCH_TRANSITIONS = Object.freeze({
  draft: ['closed', 'canceled'],
  closed: ['xml_generated', 'reopened', 'canceled'],
  reopened: ['closed', 'canceled'],
  xml_generated: ['sent', 'reopened'],
  sent: ['protocolled', 'processed'],
  protocolled: ['processed'],
  processed: ['partially_paid', 'paid', 'glossed'],
  partially_paid: ['paid', 'glossed'],
  glossed: ['partially_paid', 'paid'],
});

export function canTransitionBillingBatch(currentStatus, nextStatus) {
  return BILLING_BATCH_TRANSITIONS[currentStatus]?.includes(nextStatus) === true;
}

export async function listBillingBatches(clinicId) {
  const { data, error } = await supabase
    .from('billing_batches')
    .select('*, billing_batch_guides(id, guide_id, removed_at)')
    .eq('clinic_id', clinicId)
    .order('competency_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createBillingBatch({ clinicId, batchKey, payerId = null, payerName, competencyDate, guideIds }) {
  const { data, error } = await supabase.rpc('create_billing_batch', {
    p_clinic_id: clinicId,
    p_batch_key: batchKey,
    p_payer_name: payerName || 'Particular',
    p_competency_date: competencyDate,
    p_guide_ids: guideIds,
    p_payer_id: payerId,
  });
  if (error) throw error;
  return data;
}

export async function transitionBillingBatch({ clinicId, batchId, nextStatus, context = {} }) {
  const { data: current, error: currentError } = await supabase
    .from('billing_batches')
    .select('status')
    .eq('clinic_id', clinicId)
    .eq('id', batchId)
    .single();
  if (currentError) throw currentError;
  if (!canTransitionBillingBatch(current.status, nextStatus)) {
    throw new Error(`Transicao de lote invalida: ${current.status} -> ${nextStatus}`);
  }
  const { data, error } = await supabase.rpc('transition_billing_batch', {
    p_clinic_id: clinicId,
    p_batch_id: batchId,
    p_next_status: nextStatus,
    p_context: context,
  });
  if (error) throw error;
  return data;
}

export async function listBillingCalendars(clinicId, { startDate, endDate } = {}) {
  let query = supabase.from('billing_calendars').select('*').eq('clinic_id', clinicId);
  if (startDate) query = query.gte('billing_close_date', startDate);
  if (endDate) query = query.lte('billing_close_date', endDate);
  const { data, error } = await query.order('billing_close_date');
  if (error) throw error;
  return data || [];
}

export async function saveBillingCalendar(clinicId, calendar) {
  const payload = { ...calendar, clinic_id: clinicId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('billing_calendars')
    .upsert(payload, { onConflict: 'clinic_id,payer_id,competency_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createPayerPaymentImport(clinicId, payload) {
  const { data, error } = await supabase
    .from('payer_payment_imports')
    .insert({ ...payload, clinic_id: clinicId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPayerPaymentImports(clinicId) {
  const { data, error } = await supabase
    .from('payer_payment_imports')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('imported_at', { ascending: false });
  if (error) throw error;
  return data || [];
}