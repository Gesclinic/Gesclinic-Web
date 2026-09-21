import { supabase } from './customSupabaseClient';
import {
  createReceivable,
  registerReceivableGlosa,
  registerReceivablePayment,
  updateReceivableGlosaWorkflow,
  updateReceivable,
} from './receivablesApi';

const WORKFLOW_STATUS = {
  ATENDIMENTO: 'atendimento',
  PRE_AUDITORIA: 'pre_auditoria',
  AUDITORIA: 'auditoria',
  FATURAVEL: 'faturavel',
  LOTE: 'lote',
  XML: 'xml',
  ENVIO: 'envio',
  RETORNO: 'retorno',
  RECEBIVEL: 'recebivel',
  RECEBIMENTO: 'recebimento',
};

const WORKFLOW_LABELS = {
  [WORKFLOW_STATUS.ATENDIMENTO]: 'Atendimento',
  [WORKFLOW_STATUS.PRE_AUDITORIA]: 'Pre Auditoria',
  [WORKFLOW_STATUS.AUDITORIA]: 'Auditoria',
  [WORKFLOW_STATUS.FATURAVEL]: 'Faturavel',
  [WORKFLOW_STATUS.LOTE]: 'Lote',
  [WORKFLOW_STATUS.XML]: 'XML',
  [WORKFLOW_STATUS.ENVIO]: 'Envio',
  [WORKFLOW_STATUS.RETORNO]: 'Retorno',
  [WORKFLOW_STATUS.RECEBIVEL]: 'Recebivel',
  [WORKFLOW_STATUS.RECEBIMENTO]: 'Recebimento',
};

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function lower(value) {
  return String(value || '').toLowerCase();
}

function normalizeText(value) {
  return lower(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function todayPlus(days = 0) {
  return new Date(Date.now() + Number(days || 0) * 86400000).toISOString().slice(0, 10);
}

function uniqueRows(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const id = row?.id || JSON.stringify(row);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function getGuideNumber(guide = {}) {
  return guide.numero_guia || guide.guide_number || guide.id || null;
}

export function getGuideValue(guide = {}) {
  return money(guide.valor || guide.value || guide.amount || guide.total_value);
}

function getGuideCid(guide = {}) {
  return guide.cid || guide.cid_code || guide.diagnosis_code || guide.metadata?.cid || guide.metadata?.diagnosis?.cid || null;
}

function getGuideAuthorization(guide = {}) {
  return guide.authorization_number || guide.autorizacao || guide.numero_autorizacao || guide.metadata?.authorization_number || null;
}

function getGuideProcedureCode(guide = {}) {
  return guide.codigo_cbhpm || guide.codigo_tuss || guide.procedure_code || guide.tuss_code || guide.metadata?.procedure_code || null;
}

function getGuidePayerName(guide = {}) {
  return guide.convenio || guide.payer_name || guide.health_insurance_name || guide.metadata?.payer_name || 'Particular';
}

function getRuleValue(rule = {}, key, fallback = null) {
  const metadataValue = rule.metadata?.[key] ?? rule.rules?.[key];
  return rule[key] ?? metadataValue ?? fallback;
}

function hasMissingColumnError(error) {
  return /column|schema cache|workflow_status|status_history|audit_results|anti_glosa_alerts|billing_rules_snapshot|contractual_due_date|negotiated_value|coparticipation_value|billing_batch_key/i.test(error?.message || '');
}

async function updateBillingGuideSafe(clinicId, guideId, patch) {
  const basePatch = {
    status: patch.status,
    data_atualizacao: patch.data_atualizacao || new Date().toISOString(),
    ...(patch.data_envio ? { data_envio: patch.data_envio } : {}),
    ...(patch.data_processamento ? { data_processamento: patch.data_processamento } : {}),
    ...(patch.xml_path ? { xml_path: patch.xml_path } : {}),
    ...(patch.observacoes ? { observacoes: patch.observacoes } : {}),
  };

  const query = supabase
    .from('billing_guides')
    .update(patch)
    .eq('clinic_id', clinicId)
    .eq('id', guideId)
    .select()
    .single();
  let { data, error } = await query;

  if (error && hasMissingColumnError(error)) {
    const fallback = await supabase
      .from('billing_guides')
      .update(basePatch)
      .eq('clinic_id', clinicId)
      .eq('id', guideId)
      .select()
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return data;
}

async function logTissGuideEvent({ clinicId, guide, event, message, details = null }) {
  if (!clinicId || !guide?.id) return null;
  try {
    const { error } = await supabase.from('tiss_audit_logs').insert({
      clinic_id: clinicId,
      guide_id: guide.id,
      event,
      message,
      details: details ? JSON.stringify(details).slice(0, 4000) : null,
    });
    if (error) console.warn('[faturamento] TISS audit log skipped:', error.message);
  } catch (error) {
    console.warn('[faturamento] TISS audit log failed:', error?.message || error);
  }
  return null;
}

function appendGuideHistory(guide = {}, nextStatus, context = {}) {
  const current = Array.isArray(guide.status_history) ? guide.status_history : [];
  return [
    ...current,
    {
      status: nextStatus,
      label: WORKFLOW_LABELS[nextStatus] || nextStatus,
      at: new Date().toISOString(),
      source: 'faturamento_enterprise',
      ...context,
    },
  ];
}

export async function persistGuideWorkflowStatus({ clinicId, guide, workflowStatus, status, context = {} }) {
  const data = await updateBillingGuideSafe(clinicId, guide.id, {
    status: status || guide.status || WORKFLOW_LABELS[workflowStatus] || workflowStatus,
    workflow_status: workflowStatus,
    status_history: appendGuideHistory(guide, workflowStatus, context),
    data_atualizacao: new Date().toISOString(),
  });
  await logTissGuideEvent({
    clinicId,
    guide: data || guide,
    event: 'WORKFLOW_STATUS',
    message: `Faturamento: ${WORKFLOW_LABELS[workflowStatus] || workflowStatus}`,
    details: context,
  });
  return data;
}

export async function loadConventionRules(clinicId) {
  if (!clinicId) return [];
  const { data, error } = await supabase
    .from('appointment_payer_rules')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('is_active', true);
  if (error) {
    console.warn('[faturamento] Convention rules unavailable:', error.message);
    return [];
  }
  return data || [];
}

export function findConventionRuleForGuide(guide = {}, rules = []) {
  const payer = normalizeText(getGuidePayerName(guide));
  const plan = normalizeText(guide.plano || guide.plan_name || guide.metadata?.plan_name);
  return rules.find((rule) => {
    const ruleName = normalizeText(rule.name || rule.description);
    const rulePlan = normalizeText(rule.plan_name || rule.metadata?.plan_name);
    if (rule.health_plan_id && [guide.health_plan_id, guide.plan_id, guide.payer_id, guide.convenio_id].includes(rule.health_plan_id)) return true;
    return Boolean(ruleName && (payer.includes(ruleName) || ruleName.includes(payer) || (plan && rulePlan && plan.includes(rulePlan))));
  }) || null;
}

export function evaluateConventionRulesForGuide(guide = {}, rules = [], context = {}) {
  const rule = findConventionRuleForGuide(guide, rules);
  const guideValue = getGuideValue(guide);
  const issues = [];
  const alerts = [];
  const requiresTuss = getRuleValue(rule, 'requires_tuss', true);
  const requiresCid = getRuleValue(rule, 'requires_cid', false);
  const requiresAuthorization = getRuleValue(rule, 'requires_authorization', getRuleValue(rule, 'requires_pre_authorization', false));
  const annualLimit = Number(getRuleValue(rule, 'annual_limit', getRuleValue(rule, 'maximum_value', 0)) || 0);
  const monthlyLimit = Number(getRuleValue(rule, 'monthly_limit', 0) || 0);
  const negotiatedValue = Number(getRuleValue(rule, 'negotiated_value', 0) || 0);
  const coparticipationPercent = Number(getRuleValue(rule, 'coparticipation_percent', 0) || 0);
  const contractualDaysToPay = Number(getRuleValue(rule, 'contractual_days_to_pay', getRuleValue(rule, 'days_to_pay', 30)) || 30);

  if (requiresTuss && !getGuideProcedureCode(guide)) {
    issues.push({ code: 'TUSS_OBRIGATORIA', severity: 'critical', message: 'Codigo TUSS/CBHPM obrigatorio para a operadora.' });
  }
  if (requiresCid && !getGuideCid(guide)) {
    issues.push({ code: 'CID_OBRIGATORIO', severity: 'high', message: 'CID obrigatorio para a operadora.' });
  }
  if (requiresAuthorization && !getGuideAuthorization(guide)) {
    issues.push({ code: 'AUTORIZACAO_AUSENTE', severity: 'critical', message: 'Autorizacao previa obrigatoria ausente.' });
  }
  if (annualLimit > 0 && guideValue > annualLimit) {
    issues.push({ code: 'LIMITE_ANUAL_EXCEDIDO', severity: 'high', message: `Valor da guia supera limite anual configurado (${annualLimit}).` });
  }
  if (monthlyLimit > 0 && guideValue > monthlyLimit) {
    issues.push({ code: 'LIMITE_MENSAL_EXCEDIDO', severity: 'high', message: `Valor da guia supera limite mensal configurado (${monthlyLimit}).` });
  }
  if (negotiatedValue > 0 && Math.abs(guideValue - negotiatedValue) > 0.01) {
    alerts.push({ code: 'VALOR_DIVERGENTE', severity: 'medium', message: `Valor divergente do negociado (${negotiatedValue}).` });
  }

  const receivedByPayer = Number(context.receivedByPayer || 0);
  const glosaByPayer = Number(context.glosaByPayer || 0);
  if (glosaByPayer > 0 && receivedByPayer > 0 && (glosaByPayer / receivedByPayer) > 0.12) {
    alerts.push({ code: 'RISCO_GLOSA_OPERADORA', severity: 'medium', message: 'Historico de glosa elevado para esta operadora.' });
  }

  return {
    valid: issues.length === 0,
    rule,
    issues,
    alerts,
    negotiatedValue,
    coparticipationPercent,
    coparticipationValue: guideValue * (coparticipationPercent / 100),
    contractualDaysToPay,
    contractualDueDate: todayPlus(contractualDaysToPay),
  };
}

export function buildAntiGlosaAlerts({ guides = [], receivables = [], glosas = [], rules = [] } = {}) {
  const alerts = [];
  for (const guide of guides) {
    const evaluation = evaluateConventionRulesForGuide(guide, rules);
    alerts.push(...evaluation.issues.map((issue) => ({ ...issue, guide_id: guide.id, guide_number: getGuideNumber(guide), payer_name: getGuidePayerName(guide), source: 'billing_guides' })));
    alerts.push(...evaluation.alerts.map((issue) => ({ ...issue, guide_id: guide.id, guide_number: getGuideNumber(guide), payer_name: getGuidePayerName(guide), source: 'billing_guides' })));
  }
  for (const row of receivables) {
    if (!invoiceHasTuss(row)) alerts.push({ code: 'TUSS_INVALIDA', severity: 'high', message: 'Recebivel sem codigo TUSS/CBHPM.', receivable_id: row.id, source: 'ar_invoices' });
    if (row.authorization_required && !row.authorization_number) alerts.push({ code: 'AUTORIZACAO_AUSENTE', severity: 'critical', message: 'Recebivel exige autorizacao, mas nao possui numero.', receivable_id: row.id, source: 'ar_invoices' });
  }
  for (const glosa of glosas) {
    if (money(glosa.glosa_amount) > 0) alerts.push({ code: 'GLOSA_RECORRENTE', severity: 'medium', message: glosa.reason || 'Glosa sem motivo classificado.', glosa_id: glosa.id, source: 'receivable_glosas' });
  }
  return alerts;
}

export function normalizeBillingGuideStatus(status) {
  const text = lower(status);
  if (text.includes('receb') || text.includes('pag')) return 'recebido';
  if (text.includes('glos')) return 'glosado';
  if (text.includes('envi')) return 'enviado';
  if (text.includes('xml')) return 'faturado';
  if (text.includes('fatur')) return 'faturado';
  if (text.includes('process') || text.includes('retorn')) return 'enviado';
  if (text.includes('andamento') || text.includes('em fatur')) return 'em_faturamento';
  return 'a_faturar';
}

export function normalizeReceivableBillingStatus(receivable = {}) {
  const status = lower(receivable.status);
  const insuranceStatus = lower(receivable.insurance_billing_status);
  const xmlStatus = lower(receivable.tiss_xml_status);
  const returnStatus = lower(receivable.insurance_return_status);

  if (status.includes('gloss') || money(receivable.glosa_value) > 0) return 'glosado';
  if (status.includes('received') || status.includes('paid')) return 'recebido';
  if (insuranceStatus.includes('enviado') || xmlStatus.includes('enviado') || returnStatus.includes('receb')) return 'enviado';
  if (status.includes('billed') || insuranceStatus.includes('fatur')) return 'faturado';
  if (status.includes('planned') || status.includes('open') || status.includes('pending')) return 'a_faturar';
  return 'em_faturamento';
}

function getStatusLabel(status) {
  const labels = {
    a_faturar: 'A faturar',
    em_faturamento: 'Em faturamento',
    faturado: 'Faturado',
    enviado: 'Enviado',
    recebido: 'Recebido',
    glosado: 'Glosado',
  };
  return labels[status] || status;
}

function addToMap(map, key, seed, amount, count = 1) {
  const safeKey = key || 'Nao informado';
  const current = map.get(safeKey) || { ...seed, label: safeKey, count: 0, value: 0 };
  current.count += count;
  current.value += money(amount);
  map.set(safeKey, current);
}

function servicesFromInvoice(row = {}) {
  const services = row.metadata?.billing_event?.services || row.metadata?.services || [];
  return Array.isArray(services) ? services : [];
}

function invoiceHasTuss(row = {}) {
  if (row.procedure_code || row.codigo_tuss || row.codigo_cbhpm) return true;
  const services = servicesFromInvoice(row);
  return services.some((item) => item.procedure_code || item.tuss_code || item.code);
}

function getInvoiceAmount(row = {}) {
  return money(row.net_value || row.amount || row.gross_amount);
}

function getGuideReceivableKey(value) {
  return String(value || '').trim().toLowerCase();
}

function buildReceivablesByGuide(receivables = []) {
  const map = new Map();
  for (const receivable of receivables) {
    const key = getGuideReceivableKey(receivable.guide_number || receivable.metadata?.guide_number);
    if (!key) continue;
    const rows = map.get(key) || [];
    rows.push(receivable);
    map.set(key, rows);
  }
  return map;
}

export function buildReceivablePayloadFromGuide(guide = {}) {
  const guideNumber = getGuideNumber(guide);
  const amount = getGuideValue(guide);
  const createdAt = dateOnly(guide.data_criacao || guide.created_at);
  const billingEvent = guide.metadata?.billing_event || {};
  const payerId = guide.payer_id || guide.convenio_id || billingEvent.payer_id || null;
  const payerType = guide.payer_type || billingEvent.payer_type || (guide.convenio ? 'CONVENIO' : 'PARTICULAR');
  const isConvenio = normalizeText(payerType) === 'convenio';

  return {
    patient_id: guide.patient_id || billingEvent.patient_id || null,
    patient_name: guide.paciente_nome || guide.patient_name || guide.payer_name || 'Paciente',
    payer_name: guide.convenio || guide.payer_name || 'Particular',
    amount,
    gross_amount: amount,
    net_value: amount,
    origem: 'Faturamento',
    description: `Guia ${guideNumber} - ${guide.convenio || 'Particular'}`,
    service_description: guide.codigo_cbhpm || guide.procedure_name || guide.tipo_guia || 'Guia TISS',
    invoice_date: createdAt,
    competency_date: createdAt,
    due_date: dateOnly(guide.data_envio || guide.data_criacao || guide.created_at),
    status: 'billed',
    payment_method: guide.convenio ? 'convenio' : 'pix',
    payer_type: payerType,
    payer_id: payerId,
    convenio_id: isConvenio ? payerId : null,
    appointment_id: guide.appointment_id || billingEvent.appointment_id || null,
    professional_id: guide.professional_id || billingEvent.professional_id || null,
    guide_number: guideNumber,
    procedure_id: guide.service_id || guide.procedure_id || billingEvent.procedure_id || null,
    procedure_name: guide.codigo_cbhpm || guide.tipo_guia || null,
    specialty_id: guide.specialty_id || billingEvent.specialty_id || null,
    specialty_name: guide.specialty_name || billingEvent.specialty_name || null,
    unit_id: guide.unit_id || billingEvent.unit_id || null,
    unit_name: guide.unit_name || billingEvent.unit_name || null,
    insurance_billing_status: guide.convenio ? 'FATURADO' : null,
    tiss_xml_status: guide.xml_path ? 'GERADO' : null,
    repasse_expected: money(guide.repasse_expected ?? billingEvent.repasse_expected),
    repasse_model: guide.repasse_model || billingEvent.repasse_model || null,
    negotiated_value: guide.negotiated_value || guide.metadata?.negotiated_value || null,
    coparticipation_value: guide.coparticipation_value || guide.metadata?.coparticipation_value || 0,
    metadata: {
      source: 'faturamento_operacional',
      guide_id: guide.id,
      guide_number: guideNumber,
      appointment_id: guide.appointment_id || billingEvent.appointment_id || null,
      professional_id: guide.professional_id || billingEvent.professional_id || null,
      billing_guide: guide,
      billing_workflow_status: WORKFLOW_STATUS.RECEBIVEL,
    },
  };
}

export function buildForecastRows({ guides = [], receivables = [], glosas = [] } = {}) {
  return [30, 60, 90, 180].map((days) => {
    const endDate = todayPlus(days);
    const invoiceRows = receivables.filter((row) => {
      const dueDate = dateOnly(row.due_date || row.competency_date || row.invoice_date);
      return dueDate <= endDate && !['received', 'paid', 'canceled'].includes(lower(row.status));
    });
    const guideRows = guides.filter((guide) => {
      const guideDate = dateOnly(guide.data_envio || guide.data_criacao || guide.created_at);
      return guideDate <= endDate && !['recebido', 'glosado'].includes(normalizeBillingGuideStatus(guide.status));
    });
    const glosaRows = glosas.filter((glosa) => dateOnly(glosa.glosa_date || glosa.created_at) <= endDate);
    const invoiceRevenue = invoiceRows.reduce((sum, row) => sum + getInvoiceAmount(row), 0);
    const guideRevenue = guideRows.reduce((sum, guide) => sum + getGuideValue(guide), 0);
    const glosaRevenue = glosaRows.reduce((sum, glosa) => sum + money(glosa.glosa_amount), 0);
    const recoveredRevenue = glosaRows.reduce((sum, glosa) => sum + money(glosa.recovered_amount), 0);
    return {
      label: `${days} dias`,
      days,
      guideRevenue,
      billedRevenue: invoiceRevenue,
      glosaRevenue,
      recoveredRevenue,
      expectedRevenue: Math.max(0, guideRevenue + invoiceRevenue - glosaRevenue + recoveredRevenue),
      cashflowImpact: Math.max(0, invoiceRevenue - glosaRevenue + recoveredRevenue),
    };
  });
}

export function buildWorkflowRows({ guides = [], submissions = [], receivables = [], glosas = [] } = {}) {
  return Object.values(WORKFLOW_STATUS).map((step) => {
    let rows = [];
    if (step === WORKFLOW_STATUS.ATENDIMENTO) rows = receivables.filter((row) => row.appointment_id);
    if (step === WORKFLOW_STATUS.PRE_AUDITORIA) rows = guides.filter((guide) => normalizeBillingGuideStatus(guide.status) === 'a_faturar');
    if (step === WORKFLOW_STATUS.AUDITORIA) rows = guides.filter((guide) => buildAntiGlosaAlerts({ guides: [guide] }).length > 0);
    if (step === WORKFLOW_STATUS.FATURAVEL) rows = guides.filter((guide) => normalizeBillingGuideStatus(guide.status) === 'em_faturamento');
    if (step === WORKFLOW_STATUS.LOTE) rows = guides.filter((guide) => normalizeBillingGuideStatus(guide.status) === 'faturado');
    if (step === WORKFLOW_STATUS.XML) rows = guides.filter((guide) => guide.xml_path);
    if (step === WORKFLOW_STATUS.ENVIO) rows = submissions;
    if (step === WORKFLOW_STATUS.RETORNO) rows = submissions.filter((row) => row.response_data || ['accepted', 'rejected', 'error'].includes(lower(row.status)));
    if (step === WORKFLOW_STATUS.RECEBIVEL) rows = receivables;
    if (step === WORKFLOW_STATUS.RECEBIMENTO) rows = receivables.filter((row) => ['received', 'paid'].includes(lower(row.status)) || money(row.received_value || row.paid_total) > 0);
    return {
      step,
      label: WORKFLOW_LABELS[step],
      count: rows.length,
      value: rows.reduce((sum, row) => sum + (row.glosa_amount ? money(row.glosa_amount) : money(row.net_value || row.amount || row.valor)), 0),
    };
  });
}

export function deriveFaturamentoSnapshot({ guides = [], submissions = [], receivables = [], glosas = [], rules = [] } = {}) {
  const receivablesByGuide = buildReceivablesByGuide(receivables);
  const submissionsByGuide = new Map();
  for (const submission of submissions) {
    const rows = submissionsByGuide.get(submission.guide_id) || [];
    rows.push(submission);
    submissionsByGuide.set(submission.guide_id, rows);
  }

  const productionByDoctor = new Map();
  const productionBySpecialty = new Map();
  const productionByUnit = new Map();
  const productionByPayer = new Map();
  const billableStatus = new Map([
    ['a_faturar', { status: 'a_faturar', label: 'A faturar', count: 0, value: 0 }],
    ['em_faturamento', { status: 'em_faturamento', label: 'Em faturamento', count: 0, value: 0 }],
    ['faturado', { status: 'faturado', label: 'Faturado', count: 0, value: 0 }],
    ['enviado', { status: 'enviado', label: 'Enviado', count: 0, value: 0 }],
    ['recebido', { status: 'recebido', label: 'Recebido', count: 0, value: 0 }],
    ['glosado', { status: 'glosado', label: 'Glosado', count: 0, value: 0 }],
  ]);

  for (const receivable of receivables) {
    const value = getInvoiceAmount(receivable);
    const doctor = receivable.professional_name || receivable.profissional || receivable.professional_id || 'Sem medico';
    const specialty = receivable.specialty_name || receivable.specialty_id || 'Sem especialidade';
    const unit = receivable.unit_name || receivable.unit_id || 'Sem unidade';
    const payer = receivable.payer_name || receivable.patient_name || 'Particular';
    const status = normalizeReceivableBillingStatus(receivable);

    addToMap(productionByDoctor, doctor, { professional_id: receivable.professional_id || null }, value);
    addToMap(productionBySpecialty, specialty, { specialty_id: receivable.specialty_id || null }, value);
    addToMap(productionByUnit, unit, { unit_id: receivable.unit_id || null }, value);
    addToMap(productionByPayer, payer, { payer_id: receivable.payer_id || receivable.convenio_id || null }, value);

    const currentStatus = billableStatus.get(status) || { status, label: getStatusLabel(status), count: 0, value: 0 };
    currentStatus.count += 1;
    currentStatus.value += value;
    billableStatus.set(status, currentStatus);
  }

  for (const guide of guides) {
    const guideNumber = getGuideNumber(guide);
    const linkedReceivables = receivablesByGuide.get(getGuideReceivableKey(guideNumber)) || [];
    if (linkedReceivables.length > 0) continue;
    const status = normalizeBillingGuideStatus(guide.status);
    const currentStatus = billableStatus.get(status) || { status, label: getStatusLabel(status), count: 0, value: 0 };
    currentStatus.count += 1;
    currentStatus.value += getGuideValue(guide);
    billableStatus.set(status, currentStatus);
  }

  const particularReceivables = receivables.filter((row) => lower(row.payer_type).includes('particular') || lower(row.payer_name) === 'particular' || !row.convenio_id && lower(row.payment_method) !== 'convenio');
  const convenioReceivables = receivables.filter((row) => lower(row.payer_type).includes('convenio') || row.convenio_id || lower(row.payment_method) === 'convenio');
  const glosaValue = glosas.reduce((sum, row) => sum + money(row.glosa_amount), 0);
  const recoveredValue = glosas.reduce((sum, row) => sum + money(row.recovered_amount), 0);
  const expectedRevenue = receivables.reduce((sum, row) => sum + getInvoiceAmount(row), 0) + guides.reduce((sum, guide) => {
    const linkedReceivables = receivablesByGuide.get(getGuideReceivableKey(getGuideNumber(guide))) || [];
    return linkedReceivables.length ? sum : sum + getGuideValue(guide);
  }, 0);
  const receivedRevenue = receivables.reduce((sum, row) => sum + money(row.received_value || row.paid_total), 0);
  const billedRevenue = receivables.reduce((sum, row) => {
    const status = normalizeReceivableBillingStatus(row);
    return ['faturado', 'enviado', 'recebido', 'glosado'].includes(status) ? sum + getInvoiceAmount(row) : sum;
  }, 0);
  const averageReceiptRows = receivables.filter((row) => row.received_date || row.received_at);
  const averageReceiptDays = averageReceiptRows.length
    ? averageReceiptRows.reduce((sum, row) => {
      const start = new Date(`${dateOnly(row.invoice_date || row.competency_date || row.due_date)}T00:00:00`);
      const end = new Date(`${dateOnly(row.received_date || row.received_at)}T00:00:00`);
      return sum + Math.max(0, Math.round((end - start) / 86400000));
    }, 0) / averageReceiptRows.length
    : 0;

  const invalidGuides = guides.filter((guide) => !getGuideNumber(guide) || !guide.paciente_nome || !guide.numero_carteirinha || getGuideValue(guide) <= 0);
  const proceduresWithoutTuss = receivables.filter((row) => !invoiceHasTuss(row));
  const doctorsWithoutRepasse = receivables.filter((row) => row.professional_id && money(row.repasse_expected) <= 0);
  const guidesWithoutReceivable = guides.filter((guide) => {
    const guideNumber = getGuideNumber(guide);
    const status = normalizeBillingGuideStatus(guide.status);
    return ['faturado', 'enviado', 'recebido', 'glosado'].includes(status) && !(receivablesByGuide.get(getGuideReceivableKey(guideNumber)) || []).length;
  });
  const divergentRevenue = guides.filter((guide) => {
    const linked = receivablesByGuide.get(getGuideReceivableKey(getGuideNumber(guide))) || [];
    if (!linked.length) return false;
    const invoiceTotal = linked.reduce((sum, row) => sum + getInvoiceAmount(row), 0);
    return Math.abs(invoiceTotal - getGuideValue(guide)) > 0.01;
  });
  const antiGlosaAlerts = buildAntiGlosaAlerts({ guides, receivables, glosas, rules });
  const workflow = buildWorkflowRows({ guides, submissions, receivables, glosas });
  const forecast = buildForecastRows({ guides, receivables, glosas });

  return {
    kpis: {
      expectedRevenue,
      billedRevenue,
      receivedRevenue,
      openRevenue: Math.max(0, expectedRevenue - receivedRevenue - glosaValue),
      glosaValue,
      recoveredValue,
      glosaRate: expectedRevenue > 0 ? (glosaValue / expectedRevenue) * 100 : 0,
      recoveryRate: glosaValue > 0 ? (recoveredValue / glosaValue) * 100 : 0,
      averageTicket: (receivables.length || guides.length) ? expectedRevenue / (receivables.length || guides.length) : 0,
      averageReceiptDays,
      operatingMargin: expectedRevenue > 0 ? ((receivedRevenue + recoveredValue - glosaValue) / expectedRevenue) * 100 : 0,
      guides: guides.length,
      receivables: receivables.length,
      submissions: submissions.length,
    },
    production: {
      byDoctor: Array.from(productionByDoctor.values()).sort((a, b) => b.value - a.value),
      bySpecialty: Array.from(productionBySpecialty.values()).sort((a, b) => b.value - a.value),
      byUnit: Array.from(productionByUnit.values()).sort((a, b) => b.value - a.value),
      byPayer: Array.from(productionByPayer.values()).sort((a, b) => b.value - a.value),
    },
    billableStatus: Array.from(billableStatus.values()),
    particular: {
      total: particularReceivables.reduce((sum, row) => sum + getInvoiceAmount(row), 0),
      received: particularReceivables.reduce((sum, row) => sum + money(row.received_value || row.paid_total), 0),
      pix: particularReceivables.filter((row) => lower(row.payment_method).includes('pix')).length,
      card: particularReceivables.filter((row) => lower(row.payment_method).includes('cartao') || lower(row.payment_method).includes('card')).length,
      boleto: particularReceivables.filter((row) => lower(row.payment_method).includes('boleto')).length,
      link: particularReceivables.filter((row) => lower(row.payment_method).includes('link')).length,
      receivables: particularReceivables,
    },
    convenio: {
      total: convenioReceivables.reduce((sum, row) => sum + getInvoiceAmount(row), 0),
      pendingGuides: guides.filter((guide) => normalizeBillingGuideStatus(guide.status) === 'a_faturar').length,
      billedGuides: guides.filter((guide) => normalizeBillingGuideStatus(guide.status) === 'faturado').length,
      receivedGuides: guides.filter((guide) => normalizeBillingGuideStatus(guide.status) === 'recebido').length,
      glossedGuides: guides.filter((guide) => normalizeBillingGuideStatus(guide.status) === 'glosado').length,
      byPayer: Array.from(productionByPayer.values()).sort((a, b) => b.value - a.value),
    },
    glosas: {
      technical: glosas.filter((row) => lower(row.glosa_type).includes('tecn')).length,
      administrative: glosas.filter((row) => lower(row.glosa_type).includes('admin')).length,
      financial: glosas.filter((row) => lower(row.glosa_type).includes('financ')).length,
      resources: glosas.filter((row) => lower(row.contestation_status).includes('recurso') || lower(row.contestation_status).includes('contesta')).length,
      reenvios: submissions.filter((row) => lower(row.status).includes('resend') || lower(row.status).includes('reenvi')).length,
      recoveredValue,
      recoveryRate: glosaValue > 0 ? (recoveredValue / glosaValue) * 100 : 0,
      rows: glosas,
    },
    audit: {
      proceduresWithoutTuss,
      invalidGuides,
      doctorsWithoutRepasse,
      inconsistentBilling: guidesWithoutReceivable,
      divergentRevenue,
      antiGlosaAlerts,
    },
    workflow,
    forecast,
    submissionsByGuide,
  };
}

export async function loadFaturamentoOperationalData(clinicId) {
  if (!clinicId) {
    return { guides: [], submissions: [], receivables: [], glosas: [], snapshot: deriveFaturamentoSnapshot() };
  }

  const [guidesResult, submissionsResult, receivablesResult, glosasResult, rules] = await Promise.all([
    supabase.from('billing_guides').select('*').eq('clinic_id', clinicId).order('data_criacao', { ascending: false }),
    supabase.from('tiss_submissions').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
    supabase.from('ar_invoices').select('*').eq('clinic_id', clinicId).order('due_date', { ascending: false }),
    supabase.from('receivable_glosas').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
    loadConventionRules(clinicId),
  ]);

  const failed = [guidesResult, submissionsResult, receivablesResult, glosasResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const data = {
    guides: guidesResult.data || [],
    submissions: submissionsResult.data || [],
    receivables: receivablesResult.data || [],
    glosas: glosasResult.data || [],
    rules: rules || [],
  };

  return {
    ...data,
    snapshot: deriveFaturamentoSnapshot(data),
  };
}

export async function findReceivablesByGuide(clinicId, guideNumber) {
  if (!clinicId || !guideNumber) return [];
  const { data, error } = await supabase
    .from('ar_invoices')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('guide_number', guideNumber);
  if (error) throw error;
  return data || [];
}

async function syncGuideProfessionalRepasse(clinicId, guide = {}, receivable = null) {
  const payload = buildReceivablePayloadFromGuide(guide);
  if (!clinicId || !payload.appointment_id || !payload.professional_id || !receivable) return;

  try {
    const referenceDate = new Date(`${payload.competency_date || payload.invoice_date}T00:00:00`);
    await supabase.rpc('gerar_repasse_medico', {
      p_clinic_id: clinicId,
      p_mes: referenceDate.getMonth() + 1,
      p_ano: referenceDate.getFullYear(),
      p_tipo_geracao: 'agenda',
    });
  } catch (error) {
    console.warn('[faturamento] Repasse automatico ignorado:', error.message);
  }
}

export async function ensureReceivableForGuide(clinicId, guide) {
  const guideNumber = getGuideNumber(guide);
  const existing = await findReceivablesByGuide(clinicId, guideNumber);
  if (existing.length > 0) {
    return existing[0];
  }
  const rules = await loadConventionRules(clinicId);
  const validation = evaluateConventionRulesForGuide(guide, rules);
  if (!validation.valid) {
    await persistGuideWorkflowStatus({ clinicId, guide, workflowStatus: WORKFLOW_STATUS.AUDITORIA, status: 'Auditoria', context: { validation } });
    throw new Error(validation.issues.map((issue) => issue.message).join(' '));
  }
  const payload = buildReceivablePayloadFromGuide(guide);
  payload.due_date = validation.contractualDueDate;
  payload.negotiated_value = validation.negotiatedValue || null;
  payload.coparticipation_value = validation.coparticipationValue || 0;
  payload.metadata = {
    ...payload.metadata,
    convention_rule_id: validation.rule?.id || null,
    billing_rules_snapshot: validation,
  };
  const receivable = await createReceivable(clinicId, payload);
  await syncGuideProfessionalRepasse(clinicId, guide, receivable);
  await persistGuideWorkflowStatus({ clinicId, guide, workflowStatus: WORKFLOW_STATUS.RECEBIVEL, status: 'Faturado', context: { receivable_id: Array.isArray(receivable) ? receivable[0]?.id : receivable?.id } });
  return receivable;
}

export async function markGuideAsBilled(clinicId, guide) {
  const rules = await loadConventionRules(clinicId);
  const validation = evaluateConventionRulesForGuide(guide, rules);
  if (!validation.valid) {
    await persistGuideWorkflowStatus({ clinicId, guide, workflowStatus: WORKFLOW_STATUS.AUDITORIA, status: 'Auditoria', context: { validation } });
    throw new Error(validation.issues.map((issue) => issue.message).join(' '));
  }
  const receivable = await ensureReceivableForGuide(clinicId, guide);
  const data = await updateBillingGuideSafe(clinicId, guide.id, {
    status: 'Faturado',
    workflow_status: WORKFLOW_STATUS.LOTE,
    status_history: appendGuideHistory(guide, WORKFLOW_STATUS.LOTE, { validation }),
    audit_results: validation.issues,
    anti_glosa_alerts: validation.alerts,
    billing_rules_snapshot: validation,
    contractual_due_date: validation.contractualDueDate,
    negotiated_value: validation.negotiatedValue || null,
    coparticipation_value: validation.coparticipationValue || 0,
    data_atualizacao: new Date().toISOString(),
  });
  return { guide: data, receivable };
}

export async function markGuidesAsBilled(clinicId, guides = []) {
  const results = [];
  for (const guide of guides) {
    results.push(await markGuideAsBilled(clinicId, guide));
  }
  return results;
}

export async function markGuideAsSent(clinicId, guide) {
  const { receivable } = await markGuideAsBilled(clinicId, guide);
  const now = new Date().toISOString();
  const data = await updateBillingGuideSafe(clinicId, guide.id, {
    status: 'Enviado',
    workflow_status: WORKFLOW_STATUS.ENVIO,
    status_history: appendGuideHistory(guide, WORKFLOW_STATUS.ENVIO),
    data_envio: now,
    data_atualizacao: now,
  });

  await updateReceivable(receivable.id, {
    status: 'billed',
    insurance_billing_status: 'ENVIADO',
    tiss_xml_status: guide.xml_path ? 'ENVIADO' : 'NAO_GERADO',
  }, clinicId).catch((errorUpdate) => {
    console.warn('[faturamento] Receivable status sync skipped:', errorUpdate.message);
  });

  return { guide: data, receivable };
}

export async function registerBillingPayment({ clinicId, receivable, amount, paymentDate, paymentMethod = 'convenio', notes = '' }) {
  const updated = await registerReceivablePayment({
    clinicId,
    receivableId: receivable.id,
    amount: money(amount || receivable.balance_amount || receivable.net_value || receivable.amount),
    payments: [{ method: paymentMethod, amount: money(amount || receivable.balance_amount || receivable.net_value || receivable.amount) }],
    paymentDate,
    notes,
    createdBy: 'faturamento',
  });
  await syncGuideFromReceivable(clinicId, updated);
  return updated;
}

export async function registerBillingGlosa({
  clinicId,
  receivable,
  glosaAmount,
  paidAmount = 0,
  reason,
  glosaType = 'administrativa',
  contestationStatus = 'pendente',
  responsible = 'faturamento',
  contestationDeadline = null,
} = {}) {
  const updated = await registerReceivableGlosa({
    clinicId,
    receivableId: receivable.id,
    sentAmount: money(receivable.net_value || receivable.amount),
    paidAmount: money(paidAmount || receivable.received_value || 0),
    glosaAmount: money(glosaAmount),
    reason,
    glosaType,
    contestationStatus,
    responsible,
  });
  if (contestationDeadline || responsible !== 'faturamento') {
    await updateReceivableGlosaWorkflow({
      clinicId,
      receivableId: receivable.id,
      status: contestationStatus,
      contestedAmount: money(glosaAmount),
      contestationDeadline,
      responsible,
      notes: reason,
    }).catch((error) => console.warn('[faturamento] Glosa workflow skipped:', error.message));
  }
  await syncGuideFromReceivable(clinicId, updated);
  return updated;
}

export async function updateBillingGlosaWorkflow(params = {}) {
  const result = await updateReceivableGlosaWorkflow(params);
  await syncGuideFromReceivable(params.clinicId, result.receivable);
  return result;
}

export async function syncGuideFromReceivable(clinicId, receivable) {
  const guideNumber = receivable.guide_number || receivable.metadata?.guide_number;
  if (!clinicId || !guideNumber) return null;
  const status = normalizeReceivableBillingStatus(receivable);
  const guideStatus = status === 'recebido' ? 'Pago' : status === 'glosado' ? 'Glosado' : status === 'enviado' ? 'Enviado' : 'Faturado';
  let { data, error } = await supabase
    .from('billing_guides')
    .update({ status: guideStatus, data_atualizacao: new Date().toISOString() })
    .eq('clinic_id', clinicId)
    .eq('numero_guia', guideNumber)
    .select();

  if (error && String(error.message || '').includes('numero_guia')) {
    const fallback = await supabase
      .from('billing_guides')
      .update({ status: guideStatus, data_atualizacao: new Date().toISOString() })
      .eq('clinic_id', clinicId)
      .eq('guide_number', guideNumber)
      .select();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.warn('[faturamento] Guide sync skipped:', error.message);
    return null;
  }
  return data || [];
}

export function subscribeFaturamentoRealtime(clinicId, onChange) {
  if (!clinicId || typeof onChange !== 'function') return null;
  const channel = supabase
    .channel(`faturamento-enterprise:${clinicId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_guides', filter: `clinic_id=eq.${clinicId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tiss_submissions', filter: `clinic_id=eq.${clinicId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ar_invoices', filter: `clinic_id=eq.${clinicId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'receivable_glosas', filter: `clinic_id=eq.${clinicId}` }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function registerFaturamentoScheduledJobs(clinicId) {
  if (!clinicId) throw new Error('Clínica não identificada para registrar jobs de faturamento.');
  const jobs = [
    ['faturamento_validar_guias_01h', 'faturamento', '0 1 * * *'],
    ['faturamento_gerar_lotes_02h', 'faturamento', '0 2 * * *'],
    ['faturamento_enviar_xml_03h', 'faturamento', '0 3 * * *'],
    ['faturamento_consultar_retornos_04h', 'faturamento', '0 4 * * *'],
    ['faturamento_atualizar_recebiveis_05h', 'faturamento', '0 5 * * *'],
  ];
  const results = [];
  for (const [jobName, jobType, cronExpression] of jobs) {
    const { data, error } = await supabase
      .from('scheduled_jobs')
      .upsert({ clinic_id: clinicId, job_name: jobName, job_type: jobType, cron_expression: cronExpression, is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'job_name' })
      .select()
      .single();
    if (error) throw error;
    results.push(data);
  }
  return results;
}

export default {
  buildReceivablePayloadFromGuide,
  deriveFaturamentoSnapshot,
  ensureReceivableForGuide,
  loadFaturamentoOperationalData,
  markGuideAsBilled,
  markGuideAsSent,
  normalizeBillingGuideStatus,
  normalizeReceivableBillingStatus,
  registerFaturamentoScheduledJobs,
  registerBillingGlosa,
  registerBillingPayment,
  subscribeFaturamentoRealtime,
  syncGuideFromReceivable,
  updateBillingGlosaWorkflow,
};