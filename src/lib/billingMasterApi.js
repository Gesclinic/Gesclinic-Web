import { supabase } from './customSupabaseClient';

const FINAL_APPOINTMENT_STATUSES = new Set([
  'attended',
  'completed',
  'finished',
  'finalized',
  'concluido',
  'concluído',
  'atendido',
]);

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function payerServiceDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value || '').trim();
  const brazilianDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!brazilianDate) return dateOnly(value);
  const [, day, month, rawYear] = brazilianDate;
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-${day}`;
}

function firstRelated(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function rowValue(row, aliases) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  return aliases.map(normalizeHeader).map((key) => normalized.get(key)).find((value) => value !== undefined && value !== null && value !== '');
}

function parseMoney(value) {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  return numberValue(normalized);
}

function getPayerPaymentSheetData(sheet, XLSX) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const paymentIdentifierRow = rows.find((row) =>
    String(row?.[0] || '').toUpperCase().includes('IDENTIFICADOR PAGAMENTO'),
  );
  const paymentIdentifier = String(paymentIdentifierRow?.[0] || '').match(/:\s*([^\s]+)/)?.[1] || null;
  const headerIndex = rows.findIndex((row) => {
    const headers = new Set((row || []).map(normalizeHeader));
    return headers.has('guia') && headers.has('beneficiario') && headers.has('codigoprocedimento');
  });

  if (headerIndex < 0) {
    return {
      paymentIdentifier,
      headerRowNumber: 1,
      sourceRows: XLSX.utils.sheet_to_json(sheet, { defval: '' }),
    };
  }

  const headers = rows[headerIndex];
  const sourceRows = rows.slice(headerIndex + 1)
    .filter((row) => row.some((value) => String(value || '').trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));

  return { paymentIdentifier, headerRowNumber: headerIndex + 1, sourceRows };
}

function reportDateFromFileName(fileName) {
  const compactDate = String(fileName || '').match(/(?:^|_)(20\d{6})(?:_|\.|$)/)?.[1];
  if (!compactDate) return null;
  return `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
}

async function hashBuffer(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function classifyBillingWorkItem({ appointment, service, payerSetting, documentRequirements = [] }) {
  const serviceDefinition = firstRelated(service.services) || {};
  const blockers = [];
  if (!appointment.patient_id) blockers.push('CADASTRO_PACIENTE');
  if (!appointment.payer_id) blockers.push('CONVENIO_AUSENTE');
  if (payerSetting?.requires_tuss && !(serviceDefinition.tuss_code || serviceDefinition.code)) blockers.push('TUSS_AUSENTE');
  if (payerSetting?.requires_authorization && !(service.authorization_number || appointment.authorization_number)) blockers.push('AUTORIZACAO_AUSENTE');
  if (payerSetting?.requires_cid && !(appointment.cid || appointment.diagnosis_code)) blockers.push('CID_AUSENTE');
  if (numberValue(service.value ?? serviceDefinition.price) <= 0) blockers.push('VALOR_INVALIDO');
  if (documentRequirements.some((requirement) => requirement.required && requirement.blocks_billing)) blockers.push('DOCUMENTOS_PENDENTES');

  return {
    blockerCodes: blockers,
    status: blockers.length > 0 ? 'blocked' : 'pending',
    eligibilityStatus: payerSetting?.requires_eligibility ? 'pending' : 'waived',
    authorizationStatus: payerSetting?.requires_authorization ? 'pending' : 'waived',
    documentStatus: documentRequirements.length > 0 ? 'pending' : 'waived',
    valueStatus: blockers.includes('VALOR_INVALIDO') ? 'divergent' : 'valid',
  };
}

export async function listBillingPayerSettings(clinicId) {
  const { data, error } = await supabase
    .from('billing_payer_settings')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('payer_name');
  if (error) throw error;
  return data || [];
}

export async function saveBillingPayerSetting(clinicId, setting) {
  const payload = { ...setting, clinic_id: clinicId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('billing_payer_settings')
    .upsert(payload, { onConflict: 'clinic_id,payer_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listBillingDocumentRequirements(clinicId, payerId = null, includeInactive = true) {
  let query = supabase
    .from('billing_document_requirements')
    .select('*')
    .eq('clinic_id', clinicId);
  if (!includeInactive) query = query.eq('active', true);
  if (payerId) query = query.eq('payer_id', payerId);
  const { data, error } = await query.order('label');
  if (error) throw error;
  return data || [];
}

export async function saveBillingDocumentRequirement(clinicId, requirement) {
  const payload = { ...requirement, clinic_id: clinicId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('billing_document_requirements')
    .upsert(payload, { onConflict: 'clinic_id,payer_id,guide_type,document_type' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function syncBillingWorkQueue(clinicId) {
  const [appointmentsResult, settings, requirements, existingItems] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id, clinic_id, patient_id, professional_id, payer_id, plan_id, status,
        scheduled_date, finished_at, authorization_number, diagnosis_code,
        appointment_services(
          id, service_id, quantity, value, discount, status, authorization_number,
          services(id, name, code, tuss_code, price)
        )
      `)
      .eq('clinic_id', clinicId)
      .order('scheduled_date', { ascending: false })
      .limit(1000),
    listBillingPayerSettings(clinicId),
    listBillingDocumentRequirements(clinicId, null, false),
    listBillingWorkItems(clinicId),
  ]);
  if (appointmentsResult.error) throw appointmentsResult.error;

  const settingsByPayer = new Map(settings.map((row) => [row.payer_id, row]));
  const requirementsByPayer = new Map();
  const existingByService = new Map(existingItems.map((row) => [row.appointment_service_id, row]));
  requirements.forEach((row) => {
    const rows = requirementsByPayer.get(row.payer_id) || [];
    rows.push(row);
    requirementsByPayer.set(row.payer_id, rows);
  });

  const payload = [];
  for (const appointment of appointmentsResult.data || []) {
    if (!FINAL_APPOINTMENT_STATUSES.has(String(appointment.status || '').toLowerCase())) continue;
    for (const service of appointment.appointment_services || []) {
      const existing = existingByService.get(service.id);
      const payerSetting = settingsByPayer.get(appointment.payer_id);
      const classification = classifyBillingWorkItem({
        appointment,
        service,
        payerSetting,
        documentRequirements: requirementsByPayer.get(appointment.payer_id) || [],
      });
      const quantity = numberValue(service.quantity) || 1;
      const grossAmount = numberValue(service.value ?? firstRelated(service.services)?.price) * quantity;
      payload.push({
        clinic_id: clinicId,
        appointment_id: appointment.id,
        appointment_service_id: service.id,
        payer_id: appointment.payer_id,
        patient_id: appointment.patient_id,
        professional_id: appointment.professional_id,
        procedure_id: service.service_id,
        competency_date: dateOnly(appointment.finished_at || appointment.scheduled_date),
        gross_amount: grossAmount,
        net_amount: Math.max(0, grossAmount - numberValue(service.discount)),
        status: existing?.status || classification.status,
        eligibility_status: existing?.eligibility_status || classification.eligibilityStatus,
        authorization_status: existing?.authorization_status || classification.authorizationStatus,
        document_status: existing?.document_status || classification.documentStatus,
        value_status: existing?.value_status || classification.valueStatus,
        audit_status: existing?.audit_status || 'pending',
        blocker_codes: classification.blockerCodes,
        assigned_to: existing?.assigned_to || null,
        due_at: existing?.due_at || new Date(Date.now() + 2 * 86400000).toISOString(),
        source_snapshot: { appointment, service },
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (payload.length === 0) return [];
  const { data, error } = await supabase
    .from('billing_work_items')
    .upsert(payload, { onConflict: 'clinic_id,appointment_service_id', ignoreDuplicates: false })
    .select();
  if (error) throw error;
  return data || [];
}

export async function listBillingWorkItems(clinicId, filters = {}) {
  let query = supabase.from('billing_work_items').select('*').eq('clinic_id', clinicId);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.payerId) query = query.eq('payer_id', filters.payerId);
  const { data, error } = await query.order('competency_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function transitionBillingWorkItem({ clinicId, workItemId, nextStatus, context = {} }) {
  const { data, error } = await supabase.rpc('transition_billing_work_item', {
    p_clinic_id: clinicId,
    p_work_item_id: workItemId,
    p_next_status: nextStatus,
    p_context: context,
  });
  if (error) throw error;
  return data;
}

export async function generateGuideFromBillingWorkItem(clinicId, workItemId) {
  const { data, error } = await supabase.rpc('generate_guide_from_billing_work_item', {
    p_clinic_id: clinicId,
    p_work_item_id: workItemId,
  });
  if (error) throw error;
  return data;
}

export async function applyPayerPaymentMatch(clinicId, matchId) {
  const { data, error } = await supabase.rpc('apply_payer_payment_match', {
    p_clinic_id: clinicId,
    p_match_id: matchId,
  });
  if (error) throw error;
  return data;
}

export async function listBillingPendingItems(clinicId, status = 'open') {
  let query = supabase.from('billing_pending_items').select('*').eq('clinic_id', clinicId);
  if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query.order('due_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function resolveBillingPendingItem(clinicId, pendingId, notes = '') {
  const { data, error } = await supabase.rpc('resolve_billing_pending_item', {
    p_clinic_id: clinicId,
    p_pending_id: pendingId,
    p_resolution_notes: notes,
  });
  if (error) throw error;
  return data;
}

export async function importPayerPaymentFile({ clinicId, payerId, payerName, file }) {
  if (!file || !payerName) throw new Error('Informe operadora e arquivo de retorno');
  const buffer = await file.arrayBuffer();
  const fileHash = await hashBuffer(buffer);
  const { data: previousImport, error: previousImportError } = await supabase
    .from('payer_payment_imports')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('file_hash', fileHash)
    .maybeSingle();
  if (previousImportError) throw previousImportError;
  if (previousImport) {
    throw new Error(`Arquivo já importado em ${new Date(previousImport.imported_at).toLocaleString('pt-BR')}`);
  }

  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const { paymentIdentifier, headerRowNumber, sourceRows } = getPayerPaymentSheetData(sheet, XLSX);
  if (sourceRows.length === 0) throw new Error('Arquivo sem linhas de demonstrativo');

  const extension = String(file.name).split('.').pop()?.toLowerCase();
  const fileFormat = ['xlsx', 'csv', 'txt'].includes(extension) ? extension : 'xlsx';
  const normalizedRows = sourceRows.map((row, index) => {
    const glosaAmount = parseMoney(rowValue(row, ['valor glosa', 'glosa', 'valor glosado']));
    const totalAmount = parseMoney(rowValue(row, ['total']));
    const explicitPresentedAmount = rowValue(row, ['valor apresentado', 'valor cobrado', 'apresentado']);
    const explicitPaidAmount = rowValue(row, ['valor pago', 'pago', 'valor liberado']);
    const presentedAmount = explicitPresentedAmount === undefined
      ? totalAmount + glosaAmount
      : parseMoney(explicitPresentedAmount);
    const paidAmount = explicitPaidAmount === undefined ? totalAmount : parseMoney(explicitPaidAmount);
    const requesterName = String(rowValue(row, ['solicitante']) || '').trim() || null;
    const procedureName = String(rowValue(row, ['nome procedimento', 'descricao procedimento']) || '').trim() || null;
    const presentedQuantity = parseMoney(rowValue(row, ['qtde apresentada', 'quantidade apresentada']));
    const paidQuantity = parseMoney(rowValue(row, ['qtde paga', 'quantidade paga']));
    const honorariumAmount = parseMoney(rowValue(row, ['honorario', 'honorário']));
    return {
      clinic_id: clinicId,
      line_number: headerRowNumber + index + 2,
      guide_number: String(rowValue(row, ['numero guia', 'guia', 'nr guia']) || '').trim() || null,
      protocol_number: String(rowValue(row, ['protocolo', 'numero protocolo', 'conta']) || '').trim() || null,
      patient_name: String(rowValue(row, ['paciente', 'beneficiario', 'nome paciente']) || '').trim() || null,
      procedure_code: String(rowValue(row, ['procedimento', 'codigo procedimento', 'codigo tuss', 'tuss']) || '').trim() || null,
      service_date: payerServiceDate(rowValue(row, ['data atendimento', 'data servico', 'data execucao', 'data'])),
      presented_amount: presentedAmount,
      paid_amount: paidAmount,
      glosa_amount: glosaAmount,
      discount_amount: parseMoney(rowValue(row, ['desconto', 'valor desconto'])),
      tax_amount: parseMoney(rowValue(row, ['imposto', 'tributo', 'retencao'])),
      event_type: glosaAmount > 0 ? 'glosa' : paidAmount < presentedAmount ? 'partial_payment' : 'payment',
      raw_data: {
        ...row,
        _repasse: {
          requester_name: requesterName,
          procedure_name: procedureName,
          presented_quantity: presentedQuantity,
          paid_quantity: paidQuantity,
          honorarium_amount: honorariumAmount,
          payment_identifier: paymentIdentifier,
        },
      },
    };
  });

  const { data: imported, error: importError } = await supabase
    .from('payer_payment_imports')
    .insert({
      clinic_id: clinicId, payer_id: payerId || null, payer_name: payerName,
      file_name: file.name, file_hash: fileHash, file_format: fileFormat,
      status: 'validated', total_rows: normalizedRows.length,
      total_amount: normalizedRows.reduce((sum, row) => sum + row.paid_amount, 0),
      metadata: {
        payment_identifier: paymentIdentifier,
        report_date: reportDateFromFileName(file.name),
      },
    })
    .select()
    .single();
  if (importError) throw importError;

  const { data: lines, error: linesError } = await supabase
    .from('payer_payment_import_lines')
    .insert(normalizedRows.map((row) => ({ ...row, import_id: imported.id })))
    .select();
  if (linesError) throw linesError;

  const guideNumbers = [...new Set(lines.map((row) => row.guide_number).filter(Boolean))];
  let invoices = [];
  if (guideNumbers.length > 0) {
    const { data, error } = await supabase
      .from('ar_invoices')
      .select('id, guide_number, net_value, amount')
      .eq('clinic_id', clinicId)
      .in('guide_number', guideNumbers);
    if (error) throw error;
    invoices = data || [];
  }
  const invoiceByGuide = new Map(invoices.map((row) => [String(row.guide_number).trim(), row]));
  const matches = lines.flatMap((line) => {
    const invoice = invoiceByGuide.get(String(line.guide_number || '').trim());
    if (!invoice) return [];
    return [{
      clinic_id: clinicId,
      import_line_id: line.id,
      invoice_id: invoice.id,
      match_type: 'exact',
      confidence: 100,
      matched_amount: Math.min(line.paid_amount, numberValue(invoice.net_value || invoice.amount)),
      status: 'suggested',
      reason: 'Número de guia idêntico',
    }];
  });
  if (matches.length > 0) {
    const { error } = await supabase.from('payer_payment_matches').insert(matches);
    if (error) throw error;
  }
  const { error: updateError } = await supabase
    .from('payer_payment_imports')
    .update({ status: matches.length === lines.length ? 'processed' : 'partial', matched_rows: matches.length, matched_amount: matches.reduce((sum, row) => sum + row.matched_amount, 0), processed_at: new Date().toISOString() })
    .eq('clinic_id', clinicId)
    .eq('id', imported.id);
  if (updateError) throw updateError;

  let repasse = null;
  if (paymentIdentifier) {
    const { data, error } = await supabase.rpc('process_payer_report_repasse', {
      p_clinic_id: clinicId,
      p_import_id: imported.id,
    });
    if (error && error.code !== 'PGRST202' && error.code !== '42883') throw error;
    repasse = data || null;
  }

  return { imported, lines, matches, repasse };
}

export async function listBillingXmlVersions(clinicId, batchId = null) {
  let query = supabase.from('billing_xml_versions').select('*').eq('clinic_id', clinicId);
  if (batchId) query = query.eq('batch_id', batchId);
  const { data, error } = await query.order('generated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function loadBillingMasterWorkspace(clinicId) {
  const [settings, requirements, workItems, pendingItems, xmlVersions, importsResult, matchesResult, auditResult] = await Promise.all([
    listBillingPayerSettings(clinicId),
    listBillingDocumentRequirements(clinicId),
    listBillingWorkItems(clinicId),
    listBillingPendingItems(clinicId, 'all'),
    listBillingXmlVersions(clinicId),
    supabase.from('payer_payment_imports').select('*').eq('clinic_id', clinicId).order('imported_at', { ascending: false }),
    supabase.from('payer_payment_matches').select('*').eq('clinic_id', clinicId).order('matched_at', { ascending: false }),
    supabase.from('billing_audit_events').select('*').eq('clinic_id', clinicId).order('occurred_at', { ascending: false }).limit(200),
  ]);
  const failed = [importsResult, matchesResult, auditResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const patientIds = [...new Set(workItems.map((row) => row.patient_id).filter(Boolean))];
  const professionalIds = [...new Set(workItems.map((row) => row.professional_id).filter(Boolean))];
  const procedureIds = [...new Set(workItems.map((row) => row.procedure_id).filter(Boolean))];
  const payerIds = [...new Set(workItems.map((row) => row.payer_id).filter(Boolean))];
  const appointmentIds = [...new Set(workItems.map((row) => row.appointment_id).filter(Boolean))];
  const [patientsResult, professionalsResult, proceduresResult, payersResult, guidesResult] = await Promise.all([
    patientIds.length ? supabase.from('patients').select('id, name').in('id', patientIds) : Promise.resolve({ data: [], error: null }),
    professionalIds.length ? supabase.from('professionals').select('id, name').in('id', professionalIds) : Promise.resolve({ data: [], error: null }),
    procedureIds.length ? supabase.from('services').select('id, name, code, tuss_code').in('id', procedureIds) : Promise.resolve({ data: [], error: null }),
    payerIds.length ? supabase.from('health_insurances').select('id, name, fantasy_name').in('id', payerIds) : Promise.resolve({ data: [], error: null }),
    appointmentIds.length ? supabase.from('billing_guides').select('appointment_id, convenio').in('appointment_id', appointmentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const enrichmentFailure = [patientsResult, professionalsResult, proceduresResult, payersResult, guidesResult]
    .find((result) => result.error);
  if (enrichmentFailure?.error) throw enrichmentFailure.error;

  const patientsById = new Map((patientsResult.data || []).map((row) => [row.id, row]));
  const professionalsById = new Map((professionalsResult.data || []).map((row) => [row.id, row]));
  const proceduresById = new Map((proceduresResult.data || []).map((row) => [row.id, row]));
  const payersById = new Map((payersResult.data || []).map((row) => [row.id, row]));
  const guidesByAppointmentId = new Map((guidesResult.data || []).map((row) => [row.appointment_id, row]));
  const enrichedWorkItems = workItems.map((row) => {
    const procedure = proceduresById.get(row.procedure_id) || {};
    const payer = payersById.get(row.payer_id) || {};
    return {
      ...row,
      patient_name: patientsById.get(row.patient_id)?.name || 'Paciente não identificado',
      professional_name: professionalsById.get(row.professional_id)?.name || 'Profissional não identificado',
      procedure_name: procedure.name || 'Procedimento não identificado',
      procedure_code: procedure.tuss_code || procedure.code || null,
      payer_name: payer.fantasy_name || payer.name || guidesByAppointmentId.get(row.appointment_id)?.convenio || 'Convênio não identificado',
    };
  });

  return {
    settings,
    requirements,
    workItems: enrichedWorkItems,
    pendingItems,
    xmlVersions,
    imports: importsResult.data || [],
    matches: matchesResult.data || [],
    auditEvents: auditResult.data || [],
  };
}