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

export async function createBillingBatch({
  clinicId,
  batchKey,
  payerId = null,
  payerName,
  competencyDate,
  guideIds,
}) {
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

export async function setBillingBatchGuide({ clinicId, batchId, guideId, include }) {
  const { data, error } = await supabase.rpc('set_billing_batch_guide', {
    p_clinic_id: clinicId,
    p_batch_id: batchId,
    p_guide_id: guideId,
    p_include: include,
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

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function buildBillingBatchXml(batch, guides, tissVersion = '4.01.00') {
  const guideXml = guides.map((guide, index) => `    <guia sequencial="${index + 1}">
      <numero>${escapeXml(guide.numero_guia || guide.guide_number || guide.id)}</numero>
      <tipo>${escapeXml(guide.tipo_guia || 'SP-SADT')}</tipo>
      <beneficiario>${escapeXml(guide.paciente_nome)}</beneficiario>
      <procedimento>${escapeXml(guide.codigo_cbhpm || guide.codigo_tuss)}</procedimento>
      <valor>${Number(guide.valor || 0).toFixed(2)}</valor>
    </guia>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<loteGuias versaoTISS="${escapeXml(tissVersion)}">
  <cabecalho>
    <identificacaoLote>${escapeXml(batch.batch_key)}</identificacaoLote>
    <operadora>${escapeXml(batch.payer_name)}</operadora>
    <competencia>${escapeXml(batch.competency_date)}</competencia>
  </cabecalho>
  <guias>
${guideXml}
  </guias>
</loteGuias>`;
}

export async function generateBillingBatchXml({ clinicId, batchId, tissVersion = '4.01.00' }) {
  const { data: batch, error: batchError } = await supabase
    .from('billing_batches')
    .select('*, billing_batch_guides(guide_id, removed_at)')
    .eq('clinic_id', clinicId)
    .eq('id', batchId)
    .single();
  if (batchError) throw batchError;
  if (!['draft', 'reopened', 'closed'].includes(batch.status)) {
    throw new Error(`Lote ${batch.status} não permite nova versão XML`);
  }
  const guideIds = (batch.billing_batch_guides || []).filter((row) => !row.removed_at).map((row) => row.guide_id);
  if (guideIds.length === 0) throw new Error('Lote sem guias para gerar XML');
  const { data: guides, error: guidesError } = await supabase
    .from('billing_guides')
    .select('*')
    .eq('clinic_id', clinicId)
    .in('id', guideIds);
  if (guidesError) throw guidesError;

  let currentBatch = batch;
  if (['draft', 'reopened'].includes(batch.status)) {
    currentBatch = await transitionBillingBatch({ clinicId, batchId, nextStatus: 'closed' });
  }
  const xmlContent = buildBillingBatchXml(currentBatch, guides || [], tissVersion);
  const contentHash = await sha256(xmlContent);
  const version = Number(currentBatch.xml_version || 0) + 1;
  const filePath = `tiss/lotes/${currentBatch.batch_key}-v${version}.xml`;
  const { data: xmlVersion, error: versionError } = await supabase
    .from('billing_xml_versions')
    .insert({
      clinic_id: clinicId,
      batch_id: batchId,
      version,
      tiss_version: tissVersion,
      file_path: filePath,
      content_hash: contentHash,
      xml_content: xmlContent,
      validation_status: 'valid',
    })
    .select()
    .single();
  if (versionError) throw versionError;
  const updatedBatch = await transitionBillingBatch({
    clinicId,
    batchId,
    nextStatus: 'xml_generated',
    context: { xml_path: filePath, content_hash: contentHash, tiss_version: tissVersion },
  });
  return { batch: updatedBatch, version: xmlVersion };
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

export async function loadBillingOperationsSnapshot(clinicId) {
  const [batchesResult, calendarsResult, documentsResult, importsResult] = await Promise.all([
    supabase
      .from('billing_batches')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('billing_calendars')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('billing_close_date'),
    supabase.from('billing_documents').select('id, status, required').eq('clinic_id', clinicId),
    supabase
      .from('payer_payment_imports')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('imported_at', { ascending: false }),
  ]);

  const failed = [batchesResult, calendarsResult, documentsResult, importsResult].find(
    (result) => result.error,
  );
  if (failed?.error) throw failed.error;

  const batches = batchesResult.data || [];
  const calendars = calendarsResult.data || [];
  const documents = documentsResult.data || [];
  const imports = importsResult.data || [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    batches,
    calendars,
    imports,
    metrics: {
      batches: batches.length,
      openBatches: batches.filter((row) => ['draft', 'reopened'].includes(row.status)).length,
      readyToSend: batches.filter((row) => ['closed', 'xml_generated'].includes(row.status)).length,
      batchAmount: batches.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0),
      upcomingDeadlines: calendars.filter(
        (row) => row.status !== 'completed' && row.billing_close_date >= today,
      ).length,
      overdueDeadlines: calendars.filter(
        (row) => !['completed', 'canceled'].includes(row.status) && row.billing_close_date < today,
      ).length,
      pendingDocuments: documents.filter(
        (row) => row.required && !['validated', 'waived'].includes(row.status),
      ).length,
      pendingImports: imports.filter((row) => !['processed', 'canceled'].includes(row.status))
        .length,
    },
  };
}
