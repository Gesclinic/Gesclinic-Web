import { supabase } from '@/lib/customSupabaseClient';
import { logReceivableCreated, logPaymentReceived } from '@/lib/auditFinancialIntegration.js';

function invalidateFinanceCaches(clinicId) {
  if (!clinicId) return;
  import('@/services/dashboardDataService')
    .then(({ invalidateDashboardDataCache }) => invalidateDashboardDataCache(clinicId))
    .catch(() => {});
}

function normalizeArStatus(s) {
  if (!s) {
    return null;
  }
  const v = String(s).toLowerCase();
  if (['open', 'em aberto', 'aberto', 'pendente', 'pending'].includes(v)) {
    return 'open';
  }
  if (['planned', 'previsto', 'previsao', 'estimado'].includes(v)) {
    return 'planned';
  }
  if (['billed', 'faturado', 'faturada'].includes(v)) {
    return 'billed';
  }
  if (['received', 'recebido', 'pago', 'quitado', 'paid'].includes(v)) {
    return 'received';
  }
  if (['partial', 'parcial', 'recebido parcial'].includes(v)) {
    return 'partial';
  }
  if (['overdue', 'em atraso', 'atrasado'].includes(v)) {
    return 'overdue';
  }
  if (['canceled', 'cancelado', 'cancelada'].includes(v)) {
    return 'canceled';
  }
  if (['glossed', 'glosado', 'glosa'].includes(v)) {
    return 'glossed';
  }
  if (['reversed', 'estornado', 'estornada', 'refund', 'refunded'].includes(v)) {
    return 'reversed';
  }
  return null;
}

function normalizeStatusListForQuery(statuses = []) {
  const values = new Set();

  statuses.forEach((status) => {
    if (!status) {
      return;
    }

    const raw = String(status).toLowerCase();
    const normalized = normalizeArStatus(raw);

    values.add(raw);
    if (normalized) {
      values.add(normalized);
    }

    if (raw === 'open' || raw === 'pending' || normalized === 'open') {
      values.add('open');
      values.add('pending');
    }
  });

  return Array.from(values);
}

function normalizeEnterpriseStatus(status, row = {}) {
  const normalized = normalizeArStatus(status) || String(status || '').toLowerCase();
  if (normalized === 'received') return 'RECEBIDO';
  if (normalized === 'partial') return 'PARCIAL';
  if (normalized === 'overdue') return 'VENCIDO';
  if (normalized === 'canceled') return 'CANCELADO';
  if (normalized === 'glossed') return 'GLOSADO';
  if (normalized === 'planned') return 'PREVISTO';
  if (normalized === 'billed') return 'FATURADO';
  if (normalized === 'reversed') return 'ESTORNADO';
  if (row.due_date && new Date(row.due_date) < new Date()) return 'VENCIDO';
  return 'PENDENTE';
}

function normalizePaymentMethodForEnum(method) {
  const value = String(method || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = {
    dinheiro: 'cash',
    cash: 'cash',
    pix: 'pix',
    credito: 'cartao_credito',
    credit_card: 'cartao_credito',
    cartao_credito: 'cartao_credito',
    'cartao de credito': 'cartao_credito',
    debito: 'cartao_debito',
    debit_card: 'cartao_debito',
    cartao_debito: 'cartao_debito',
    'cartao de debito': 'cartao_debito',
    ted: 'ted',
    transferencia: 'ted',
    transfer: 'ted',
    doc: 'doc',
    boleto: 'boleto',
    convenio: 'convenio',
    cheque: 'cheque',
    empresa: 'outro',
  };
  return map[value] || 'outro';
}

function normalizePaymentLabel(method) {
  return String(method || '').toLowerCase() || 'outro';
}

function parseDateOnly(value) {
  if (!value) {
    return null;
  }
  return String(value).split('T')[0];
}

function normalizeCardLast4(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function addMonths(dateString, monthsToAdd) {
  const [year, month, day] = parseDateOnly(dateString).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString().split('T')[0];
}

function normalizeReceivablePayload(clinicId, payload) {
  const amount = Number(payload.amount ?? payload.valor_bruto ?? payload.valor_liquido ?? 0);
  const discount = Number(payload.discount_value ?? payload.descontos ?? 0);
  const cardFee = Number(payload.fee_amount ?? 0);
  const cardLast4 = normalizeCardLast4(payload.card_last4 || payload.cardLast4 || payload.metadata?.card?.last4);
  const netValue = Number(
    payload.net_value ?? payload.net_amount ?? Math.max(0, amount - discount - cardFee),
  );
  const receivedValue = Number(payload.received_value ?? 0);
  const status = normalizeArStatus(payload.status) || 'open';
  const dueDate = parseDateOnly(payload.due_date || payload.data_vencimento);
  const receivedDate = parseDateOnly(payload.received_date || payload.data_recebimento || payload.received_at)
    || (status === 'received' ? new Date().toISOString().split('T')[0] : null);
  const hasCardData = Boolean(payload.processor_id || payload.card_brand || payload.settlement_type || cardLast4 || cardFee > 0);
  const paymentSplit = Array.isArray(payload.payment_split) && payload.payment_split.length
    ? payload.payment_split
    : hasCardData
      ? [{
        method: payload.payment_method || payload.forma_prevista || 'Cartao',
        amount: netValue || amount,
        gross_amount: amount,
        card_brand: payload.card_brand || null,
        card_last4: cardLast4,
        processor_id: payload.processor_id || null,
        settlement_type: payload.settlement_type || null,
        fee_amount: cardFee,
      }]
      : [];
  const metadata = {
    ...(payload.metadata || {}),
    ...(cardLast4 || hasCardData
      ? {
        card: {
          ...((payload.metadata || {}).card || {}),
          last4: cardLast4,
          brand: payload.card_brand || null,
          processor_id: payload.processor_id || null,
          settlement_type: payload.settlement_type || null,
        },
      }
      : {}),
  };

  return {
    clinic_id: clinicId,
    patient_name: payload.patient_name || payload.payer_name || null,
    patient_id: payload.patient_id || payload.paciente_id || null,
    description: payload.description || payload.descricao || null,
    service_description: payload.service_description || payload.description || payload.descricao || null,
    notes: payload.notes || payload.observacoes || payload.observations || null,
    amount,
    service_value: amount,
    discount_value: discount,
    net_value: netValue,
    status,
    due_date: dueDate,
    invoice_date: parseDateOnly(payload.invoice_date || payload.data_emissao),
    received_value: status === 'received' ? (receivedValue || netValue) : receivedValue,
    received_at: receivedDate ? `${receivedDate}T00:00:00` : payload.received_at || null,
    received_date: receivedDate,
    appointment_id: payload.appointment_id || null,
    payment_method: payload.payment_method || payload.forma_prevista || null,
    chart_account_id: payload.chart_account_id || payload.plano_contas_id || null,
    financial_account_id: payload.financial_account_id || null,
    origem: payload.origem || payload.origin || null,
    centro_custo_id: payload.centro_custo_id || payload.cost_center_id || null,
    professional_id: payload.professional_id || payload.profissional_id || null,
    payer_type: payload.payer_type || null,
    payer_id: payload.payer_id || payload.convenio_id || payload.empresa_id || null,
    processor_id: payload.processor_id || null,
    card_brand: payload.card_brand || null,
    card_last4: cardLast4,
    settlement_type: payload.settlement_type || null,
    fee_percent: payload.fee_percent ?? null,
    fee_amount: payload.fee_amount ?? null,
    total_parcelas: payload.total_parcelas ? Number.parseInt(payload.total_parcelas, 10) : null,
    nf_document_url: payload.nf_document_url || null,
    nf_document_name: payload.nf_document_name || null,
    nf_document_uploaded_at: payload.nf_document_url ? new Date().toISOString() : null,
    convenio_id: payload.convenio_id || null,
    company_id: payload.company_id || null,
    guide_number: payload.guide_number || null,
    batch_number: payload.batch_number || null,
    procedure_id: payload.procedure_id || null,
    procedure_name: payload.procedure_name || null,
    specialty_id: payload.specialty_id || null,
    specialty_name: payload.specialty_name || null,
    unit_id: payload.unit_id || null,
    unit_name: payload.unit_name || null,
    ans_registration: payload.ans_registration || null,
    insurance_invoice_number: payload.insurance_invoice_number || null,
    insurance_billing_status: payload.insurance_billing_status || null,
    tiss_xml_status: payload.tiss_xml_status || null,
    insurance_return_status: payload.insurance_return_status || null,
    insurance_return_protocol: payload.insurance_return_protocol || null,
    insurance_return_date: parseDateOnly(payload.insurance_return_date),
    competency_date: parseDateOnly(payload.competency_date || payload.competencia) || dueDate,
    gross_amount: Number(payload.gross_amount ?? amount),
    glosa_value: Number(payload.glosa_value ?? 0),
    taxes_value: Number(payload.taxes_value ?? payload.total_taxes ?? 0),
    repasse_expected: Number(payload.repasse_expected ?? payload.repasse_medico ?? 0),
    repasse_paid: Number(payload.repasse_paid ?? 0),
    repasse_percent: payload.repasse_percent ?? null,
    repasse_model: payload.repasse_model || null,
    paid_total: status === 'received' ? (receivedValue || netValue) : receivedValue,
    balance_amount: Math.max(0, netValue - (status === 'received' ? (receivedValue || netValue) : receivedValue)),
    enterprise_status: normalizeEnterpriseStatus(status, { due_date: dueDate }),
    payment_split: paymentSplit,
    metadata,
  };
}

function getReceivableFinancialStatus(row = {}) {
  const status = normalizeArStatus(row.status) || row.status;
  if (status === 'received') return { status: 'paid', movementType: 'REALIZED' };
  if (status === 'canceled' || status === 'reversed') return { status: 'canceled', movementType: 'REALIZED' };
  if (status === 'partial') return { status: 'partial', movementType: 'REALIZED' };
  return { status: 'scheduled', movementType: 'PREDICTED' };
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch (error) {
    return null;
  }
}

async function resolveReceivableFinancialAccountId(clinicId, row = {}) {
  if (row.financial_account_id) return row.financial_account_id;
  if (row.account_id) return row.account_id;

  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('id')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;
    return data?.[0]?.id || null;
  } catch (error) {
    console.warn('syncReceivableFinancialTransactions account lookup skipped:', error?.message || error);
    return null;
  }
}

async function insertFinancialTransactionVariants(rows) {
  if (!rows.length) return;

  const { error: fullError } = await supabase.from('financial_transactions').insert(rows);
  if (!fullError) return;

  const oldSchemaRows = rows.map((row) => ({
    clinic_id: row.clinic_id,
    created_by: row.created_by,
    account_id: row.account_id,
    type: row.type,
    status: row.status,
    category: row.category,
    description: row.description,
    amount: row.amount,
    scheduled_date: row.scheduled_date,
    due_date: row.due_date,
    reference_document: row.reference_document,
    notes: row.notes,
    professional_id: row.professional_id,
    origin_module: row.origin_module,
    origin_id: row.origin_id,
  }));

  const { error: oldError } = await supabase.from('financial_transactions').insert(oldSchemaRows);
  if (!oldError) return;

  const newSchemaRows = rows.map((row) => ({
    clinic_id: row.clinic_id,
    financial_account_id: row.financial_account_id,
    created_by: row.created_by,
    updated_by: row.updated_by,
    transaction_type: row.transaction_type,
    movement_type: row.movement_type,
    description: row.description,
    amount: row.amount,
    status: String(row.status || '').toUpperCase(),
    transaction_date: row.transaction_date,
    due_date: row.due_date,
    competency_date: row.competency_date,
    document_number: row.document_number,
    origin_module: row.origin_module,
    origin_id: row.origin_id,
    is_reconciled: false,
    notes: row.notes,
  }));

  const { error: newError } = await supabase.from('financial_transactions').insert(newSchemaRows);
  if (newError) throw fullError;
}

async function syncReceivableFinancialTransactions(row) {
  if (!row?.clinic_id || !row?.id) return;

  try {
    const accountId = await resolveReceivableFinancialAccountId(row.clinic_id, row);
    const userId = await getCurrentUserId();

    if (!accountId || !userId) {
      console.warn('syncReceivableFinancialTransactions skipped: missing account or user', {
        receivableId: row.id,
        hasAccount: Boolean(accountId),
        hasUser: Boolean(userId),
      });
      return;
    }

    await supabase
      .from('financial_transactions')
      .delete()
      .eq('origin_module', 'accounts_receivable')
      .eq('origin_id', row.id);

    const grossAmount = Number(row.gross_amount ?? row.amount ?? 0);
    const discountAmount = Number(row.discount_value ?? 0);
    const feeAmount = Number(row.fee_amount ?? 0);
    const dates = getReceivableFinancialStatus(row);
    const transactionDate = parseDateOnly(row.received_date || row.received_at || row.due_date || row.invoice_date) || new Date().toISOString().split('T')[0];
    const competencyDate = parseDateOnly(row.competency_date || row.invoice_date || row.due_date || transactionDate);
    const documentNumber = row.insurance_invoice_number || row.nf_document_name || row.guide_number || null;
    const base = {
      clinic_id: row.clinic_id,
      financial_account_id: accountId,
      account_id: accountId,
      created_by: userId,
      updated_by: userId,
      status: dates.status,
      movement_type: dates.movementType,
      transaction_date: transactionDate,
      scheduled_date: row.due_date || transactionDate,
      due_date: row.due_date || transactionDate,
      competency_date: competencyDate,
      reference_document: documentNumber,
      document_number: documentNumber,
      professional_id: row.professional_id || null,
      origin_module: 'accounts_receivable',
      origin_id: row.id,
      is_reconciled: false,
    };
    const description = row.description || row.service_description || row.patient_name || 'Conta a receber';
    const rows = [];

    if (grossAmount > 0 && dates.status !== 'canceled') {
      rows.push({
        ...base,
        description: `Receita bruta - ${description}`,
        amount: grossAmount,
        type: 'revenue',
        category: 'medical_service',
        transaction_type: 'INCOME',
        notes: 'Receita bruta originada em contas a receber',
      });
    }

    if (discountAmount > 0 && dates.status !== 'canceled') {
      rows.push({
        ...base,
        description: `Desconto concedido - ${description}`,
        amount: discountAmount,
        type: 'deduction',
        category: 'revenue_deduction',
        transaction_type: 'ADJUSTMENT',
        notes: 'Dedução da receita originada em contas a receber',
      });
    }

    if (feeAmount > 0 && dates.status !== 'canceled') {
      rows.push({
        ...base,
        description: `Taxa de cartão - ${description}`,
        amount: feeAmount,
        type: 'expense',
        category: 'card_fee',
        transaction_type: 'EXPENSE',
        notes: 'Despesa financeira de taxa de cartão originada em contas a receber',
      });
    }

    await insertFinancialTransactionVariants(rows);
  } catch (error) {
    console.warn('syncReceivableFinancialTransactions failed:', error?.message || error);
  }
}

function normalizeReceivablePatch(patch) {
  const normalized = { ...patch };

  if ('descricao' in normalized && !('description' in normalized)) {
    normalized.description = normalized.descricao;
  }
  if ('valor_bruto' in normalized && !('amount' in normalized)) {
    normalized.amount = Number(normalized.valor_bruto || 0);
  }
  if ('descontos' in normalized && !('discount_value' in normalized)) {
    normalized.discount_value = Number(normalized.descontos || 0);
  }
  if ('data_vencimento' in normalized && !('due_date' in normalized)) {
    normalized.due_date = parseDateOnly(normalized.data_vencimento);
  }
  if ('data_emissao' in normalized && !('invoice_date' in normalized)) {
    normalized.invoice_date = parseDateOnly(normalized.data_emissao);
  }
  if ('data_recebimento' in normalized && !('received_date' in normalized)) {
    normalized.received_date = parseDateOnly(normalized.data_recebimento);
  }
  if ('forma_prevista' in normalized && !('payment_method' in normalized)) {
    normalized.payment_method = normalized.forma_prevista;
  }
  if ('plano_contas_id' in normalized && !('chart_account_id' in normalized)) {
    normalized.chart_account_id = normalized.plano_contas_id || null;
  }
  if ('payer_name' in normalized && !('patient_name' in normalized)) {
    normalized.patient_name = normalized.payer_name;
  }
  if ('profissional_id' in normalized && !('professional_id' in normalized)) {
    normalized.professional_id = normalized.profissional_id || null;
  }
  if ('origin' in normalized && !('origem' in normalized)) {
    normalized.origem = normalized.origin;
  }
  if ('nf_url' in normalized && !('nf_document_url' in normalized)) {
    normalized.nf_document_url = normalized.nf_url;
  }
  if ('nf_name' in normalized && !('nf_document_name' in normalized)) {
    normalized.nf_document_name = normalized.nf_name;
  }
  if ('observacoes' in normalized && !('notes' in normalized)) {
    normalized.notes = normalized.observacoes;
  }
  if ('observations' in normalized && !('notes' in normalized)) {
    normalized.notes = normalized.observations;
  }
  if (normalized.nf_document_url && !normalized.nf_document_uploaded_at) {
    normalized.nf_document_uploaded_at = new Date().toISOString();
  }

  if (normalized.status) {
    normalized.status = normalizeArStatus(normalized.status) || normalized.status;
    normalized.enterprise_status = normalizeEnterpriseStatus(normalized.status, normalized);
  }
  if (normalized.status === 'received') {
    normalized.received_date = normalized.received_date || new Date().toISOString().split('T')[0];
    normalized.received_at = normalized.received_at || `${normalized.received_date}T00:00:00`;
    normalized.received_value = Number(normalized.received_value || normalized.amount || 0);
    normalized.paid_total = normalized.received_value;
    normalized.balance_amount = 0;
    normalized.enterprise_status = 'RECEBIDO';
  }
  if (normalized.status === 'reversed') {
    normalized.reversed_at = normalized.reversed_at || new Date().toISOString();
    normalized.enterprise_status = 'ESTORNADO';
  }
  if (normalized.status === 'canceled') {
    normalized.canceled_at = normalized.canceled_at || new Date().toISOString();
    normalized.enterprise_status = 'CANCELADO';
  }

  delete normalized.descricao;
  delete normalized.valor_bruto;
  delete normalized.descontos;
  delete normalized.data_vencimento;
  delete normalized.data_emissao;
  delete normalized.data_recebimento;
  delete normalized.forma_prevista;
  delete normalized.plano_contas_id;
  delete normalized.profissional_id;
  delete normalized.cost_center_id;
  delete normalized.origin;
  delete normalized.payer_name;
  delete normalized.nf_url;
  delete normalized.nf_name;
  delete normalized.observacoes;
  delete normalized.observations;

  return normalized;
}

function isMissingColumnError(error) {
  const text = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42703' || text.includes('could not find') || text.includes('column') && text.includes('does not exist');
}

function getMissingColumnName(error) {
  const text = String(error?.message || error?.details || '');
  return text.match(/Could not find the '([^']+)' column/i)?.[1]
    || text.match(/column "?([a-zA-Z0-9_]+)"? of relation/i)?.[1]
    || text.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i)?.[1]
    || null;
}

function omitColumn(row, columnName) {
  if (!columnName || !(columnName in row)) return row;
  const { [columnName]: _removed, ...rest } = row;
  return rest;
}

function omitOptionalReceivableColumns(row) {
  const {
    nf_document_url,
    nf_document_name,
    nf_document_uploaded_at,
    notes,
    origem,
    centro_custo_id,
    professional_id,
    processor_id,
    card_brand,
    card_last4,
    settlement_type,
    fee_percent,
    fee_amount,
    total_parcelas,
    convenio_id,
    company_id,
    guide_number,
    batch_number,
    procedure_id,
    procedure_name,
    specialty_id,
    specialty_name,
    unit_id,
    unit_name,
    ans_registration,
    insurance_invoice_number,
    insurance_billing_status,
    tiss_xml_status,
    insurance_return_status,
    insurance_return_protocol,
    insurance_return_date,
    competency_date,
    gross_amount,
    glosa_value,
    taxes_value,
    repasse_expected,
    repasse_paid,
    repasse_percent,
    repasse_model,
    paid_total,
    balance_amount,
    enterprise_status,
    reversed_at,
    canceled_at,
    payment_split,
    financial_account_id,
    glosa_metadata,
    metadata,
    ...rest
  } = row;
  return rest;
}

function omitCardLast4Column(row) {
  const { card_last4, ...rest } = row;
  return rest;
}

async function getReceivablePaymentTotal(arInvoiceId) {
  const { data, error } = await supabase
    .from('receivable_payments')
    .select('amount_paid')
    .eq('ar_invoice_id', arInvoiceId)
    .eq('status', 'completed');

  if (error) {
    return null;
  }

  return (data || []).reduce((sum, item) => sum + Number(item.amount_paid || 0), 0);
}

export async function uploadReceivableNfFile(clinicId, file) {
  if (!clinicId || !file) {
    return null;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${clinicId}/receivables/nf/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('finance_docs').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from('finance_docs').getPublicUrl(path);
  return {
    path,
    url: data?.publicUrl || null,
    name: file.name,
  };
}

export async function uploadReceivableGlosaEvidenceFile(clinicId, file) {
  if (!clinicId || !file) {
    return null;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${clinicId}/receivables/glosas/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('finance_docs').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from('finance_docs').getPublicUrl(path);
  return {
    path,
    url: data?.publicUrl || null,
    name: file.name,
  };
}

async function attachLatestGlosas(clinicId, rows = []) {
  if (!clinicId || !Array.isArray(rows) || rows.length === 0) {
    return rows || [];
  }

  const ids = rows.map((row) => row.id).filter(Boolean);
  if (!ids.length) {
    return rows;
  }

  const { data, error } = await supabase
    .from('receivable_glosas')
    .select('id, ar_invoice_id, contestation_status, contested_amount, recovered_amount, final_loss_amount, contestation_deadline, responsible, evidence_url, evidence_path, evidence_name, workflow_notes, updated_at, created_at')
    .eq('clinic_id', clinicId)
    .in('ar_invoice_id', ids)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('attachLatestGlosas skipped:', error.message);
    return rows;
  }

  const latestByReceivable = new Map();
  (data || []).forEach((glosa) => {
    if (!latestByReceivable.has(glosa.ar_invoice_id)) {
      latestByReceivable.set(glosa.ar_invoice_id, glosa);
    }
  });

  return rows.map((row) => {
    const latestGlosa = latestByReceivable.get(row.id) || row.last_glosa || null;
    return {
      ...row,
      last_glosa: latestGlosa,
      glosa_evidence_url: latestGlosa?.evidence_url || row.glosa_evidence_url || null,
      glosa_evidence_path: latestGlosa?.evidence_path || row.glosa_evidence_path || null,
      glosa_evidence_name: latestGlosa?.evidence_name || row.glosa_evidence_name || null,
    };
  });
}

/**
 * List receivables from ar_invoices table
 * This uses ar_invoices as the source table instead of ar_receivables
 * because the tax calculation engine creates records in ar_invoices
 */
export async function listReceivables({
  clinicId,
  payer = null,
  payerType = null,
  payerId = null,
  professionalId = null,
  status = null,
  statusList = null,
  origin = null,
  ccId = null,
  planId = null,
  emissionStart = null,
  emissionEnd = null,
  dueStart = null,
  dueEnd = null,
  receivedStart = null,
  receivedEnd = null,
  companyId = null,
  unitId = null,
  unitName = null,
  specialtyId = null,
  specialtyName = null,
  paymentMethod = null,
  insuranceBillingStatus = null,
  tissXmlStatus = null,
  insuranceReturnStatus = null,
  hasGlosa = null,
  minValue = null,
  maxValue = null,
  search = null,
  limit = 100,
  offset = 0,
} = {}) {
  console.log('📡 [listReceivables] Iniciada com params:', {
    clinicId,
    payer: payer || '(null)',
    status: status || '(null)',
  });

  let query = supabase
    .from('ar_invoices')
    .select(`
      *,
      appointments!left(
        id,
        patient_id,
        patients!left(name),
        payment_method,
        plano_contas_id,
        payer_id
      )
    `)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Ordena por criação para que importações em lote apareçam imediatamente no topo.

  // Apply filters for ar_invoices columns
  if (payer && payer.trim()) {
    console.log('  ✅ Aplicando filtro: payer.ilike("%' + payer.trim() + '%")');
    query = query.ilike('patient_name', `%${payer.trim()}%`);
  }

  if (payerType) {
    const normalizedPayerType = {
      paciente: 'PARTICULAR',
      particular: 'PARTICULAR',
      convenio: 'CONVENIO',
      empresa: 'EMPRESA',
    }[String(payerType).toLowerCase()] || payerType;
    console.log('  ✅ Aplicando filtro: payer_type = ' + normalizedPayerType);
    query = query.ilike('payer_type', normalizedPayerType);
  }

  if (payerId) {
    console.log('  ✅ Aplicando filtro: payer_id = ' + payerId);
    query = query.eq('payer_id', payerId);
  }

  if (origin) {
    console.log('  ✅ Aplicando filtro: origem = ' + origin);
    query = query.eq('origem', origin);
  }

  if (professionalId) {
    console.log('  ✅ Aplicando filtro: professional_id = ' + professionalId);
    query = query.eq('professional_id', professionalId);
  }

  if (ccId) {
    console.log('  ✅ Aplicando filtro: centro_custo_id = ' + ccId);
    query = query.eq('centro_custo_id', ccId);
  }

  if (planId) {
    console.log('  ✅ Aplicando filtro: chart_account_id = ' + planId);
    query = query.eq('chart_account_id', planId);
  }

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  if (unitId) {
    query = query.eq('unit_id', unitId);
  }

  if (unitName && unitName.trim()) {
    query = query.ilike('unit_name', `%${unitName.trim()}%`);
  }

  if (specialtyId) {
    query = query.eq('specialty_id', specialtyId);
  }

  if (specialtyName && specialtyName.trim()) {
    query = query.ilike('specialty_name', `%${specialtyName.trim()}%`);
  }

  if (paymentMethod) {
    query = query.eq('payment_method', paymentMethod);
  }

  if (insuranceBillingStatus) {
    query = query.eq('insurance_billing_status', insuranceBillingStatus);
  }

  if (tissXmlStatus) {
    query = query.eq('tiss_xml_status', tissXmlStatus);
  }

  if (insuranceReturnStatus) {
    query = query.eq('insurance_return_status', insuranceReturnStatus);
  }

  if (hasGlosa === true || hasGlosa === 'true') {
    query = query.gt('glosa_value', 0);
  }

  if (hasGlosa === false || hasGlosa === 'false') {
    query = query.or('glosa_value.is.null,glosa_value.eq.0');
  }

  if (minValue !== null && minValue !== '') {
    query = query.gte('net_value', Number(minValue));
  }

  if (maxValue !== null && maxValue !== '') {
    query = query.lte('net_value', Number(maxValue));
  }

  if (Array.isArray(statusList) && statusList.length) {
    const normalized = normalizeStatusListForQuery(statusList);
    if (normalized.length) {
      console.log('  ✅ Aplicando filtro: status IN [' + normalized.join(', ') + ']');
      query = query.in('status', normalized);
    }
  } else {
    const norm = normalizeArStatus(status);
    if (norm) {
      const statuses = normalizeStatusListForQuery([status]);
      console.log('  ✅ Aplicando filtro: status IN [' + statuses.join(', ') + ']');
      query = query.in('status', statuses);
    }
  }

  if (dueStart) {
    console.log('  ✅ Aplicando filtro: due_date >= ' + dueStart);
    query = query.gte('due_date', dueStart);
  }
  if (dueEnd) {
    console.log('  ✅ Aplicando filtro: due_date <= ' + dueEnd);
    query = query.lte('due_date', dueEnd);
  }

  if (emissionStart) {
    console.log('  ✅ Aplicando filtro: invoice_date >= ' + emissionStart);
    query = query.gte('invoice_date', emissionStart);
  }
  if (emissionEnd) {
    console.log('  ✅ Aplicando filtro: invoice_date <= ' + emissionEnd);
    query = query.lte('invoice_date', emissionEnd);
  }

  if (receivedStart) {
    console.log('  ✅ Aplicando filtro: received_date >= ' + receivedStart);
    query = query.gte('received_date', receivedStart);
  }
  if (receivedEnd) {
    console.log('  ✅ Aplicando filtro: received_date <= ' + receivedEnd);
    query = query.lte('received_date', receivedEnd);
  }

  if (search && search.trim()) {
    const pat = `%${search.trim()}%`;
    console.log('  ✅ Aplicando filtro: search pattern "%' + search.trim() + '%"');
    query = query.or(`description.ilike.${pat},patient_name.ilike.${pat}`);
  }

  console.log('📡 [listReceivables] Executando query...');
  const { data, error } = await query;

  if (error) {
    console.error('❌ listReceivables error:', error);
    const optionalFilterError = /company_id|unit_id|unit_name|specialty_id|specialty_name|payment_method|insurance_billing_status|tiss_xml_status|insurance_return_status|glosa_value|net_value/i.test(error.message || '');
    if (optionalFilterError) {
      console.warn('⚠️ [listReceivables] Retentando sem filtros enterprise opcionais:', error.message);
      let fallbackQuery = supabase
        .from('ar_invoices')
        .select(`
          *,
          appointments!left(
            id,
            patient_id,
            patients!left(name),
            payment_method,
            plano_contas_id,
            payer_id
          )
        `)
        .eq('clinic_id', clinicId)
        .range(offset, offset + limit - 1);

      if (payer && payer.trim()) fallbackQuery = fallbackQuery.ilike('patient_name', `%${payer.trim()}%`);
      if (payerType) {
        const normalizedPayerType = {
          paciente: 'PARTICULAR',
          particular: 'PARTICULAR',
          convenio: 'CONVENIO',
          empresa: 'EMPRESA',
        }[String(payerType).toLowerCase()] || payerType;
        fallbackQuery = fallbackQuery.ilike('payer_type', normalizedPayerType);
      }
      if (payerId) fallbackQuery = fallbackQuery.eq('payer_id', payerId);
      if (origin) fallbackQuery = fallbackQuery.eq('origem', origin);
      if (professionalId) fallbackQuery = fallbackQuery.eq('professional_id', professionalId);
      if (ccId) fallbackQuery = fallbackQuery.eq('centro_custo_id', ccId);
      if (planId) fallbackQuery = fallbackQuery.eq('chart_account_id', planId);
      if (Array.isArray(statusList) && statusList.length) {
        const normalized = normalizeStatusListForQuery(statusList);
        if (normalized.length) fallbackQuery = fallbackQuery.in('status', normalized);
      } else {
        const norm = normalizeArStatus(status);
        if (norm) fallbackQuery = fallbackQuery.in('status', normalizeStatusListForQuery([status]));
      }
      if (dueStart) fallbackQuery = fallbackQuery.gte('due_date', dueStart);
      if (dueEnd) fallbackQuery = fallbackQuery.lte('due_date', dueEnd);
      if (emissionStart) fallbackQuery = fallbackQuery.gte('invoice_date', emissionStart);
      if (emissionEnd) fallbackQuery = fallbackQuery.lte('invoice_date', emissionEnd);
      if (receivedStart) fallbackQuery = fallbackQuery.gte('received_date', receivedStart);
      if (receivedEnd) fallbackQuery = fallbackQuery.lte('received_date', receivedEnd);
      if (search && search.trim()) {
        const pat = `%${search.trim()}%`;
        fallbackQuery = fallbackQuery.or(`description.ilike.${pat},patient_name.ilike.${pat}`);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (!fallbackError) {
        return attachLatestGlosas(clinicId, fallbackData || []);
      }
    }
    throw new Error(error.message);
  }

  console.log('📡 [listReceivables] ✅ Resultado:', data?.length || 0, 'linhas');

  // DEBUG: Log structure of first record
  if (data && data.length > 0) {
    console.log('🔍 [DEBUG] First record keys:', Object.keys(data[0]));
    console.log('🔍 [DEBUG] First record descricao/description:', data[0].descricao || data[0].description || 'NOT_FOUND');
    console.log('🔍 [DEBUG] Full first record:', JSON.stringify(data[0], null, 2));
  }

  return attachLatestGlosas(clinicId, data || []);
}

/**
 * Create a new receivable in ar_invoices
 */
export async function createReceivable(clinicId, payload) {
  const installments = Math.max(1, Number.parseInt(payload.total_parcelas || '1', 10) || 1);
  const base = normalizeReceivablePayload(clinicId, payload);
  const totalAmount = Number(base.amount || 0);
  const totalDiscount = Number(base.discount_value || 0);
  const totalNetValue = Number(base.net_value || 0);
  const totalFee = Number(base.fee_amount || 0);
  const firstAmount = Number((totalAmount - Number((totalAmount / installments).toFixed(2)) * (installments - 1)).toFixed(2));
  const regularAmount = Number((totalAmount / installments).toFixed(2));
  const firstDiscount = Number((totalDiscount - Number((totalDiscount / installments).toFixed(2)) * (installments - 1)).toFixed(2));
  const regularDiscount = Number((totalDiscount / installments).toFixed(2));
  const firstNetValue = Number((totalNetValue - Number((totalNetValue / installments).toFixed(2)) * (installments - 1)).toFixed(2));
  const regularNetValue = Number((totalNetValue / installments).toFixed(2));
  const firstFee = Number((totalFee - Number((totalFee / installments).toFixed(2)) * (installments - 1)).toFixed(2));
  const regularFee = Number((totalFee / installments).toFixed(2));
  const rows = Array.from({ length: installments }, (_, index) => {
    const amount = index === 0 ? firstAmount : regularAmount;
    const discount = index === 0 ? firstDiscount : regularDiscount;
    const netValue = index === 0 ? firstNetValue : regularNetValue;
    const feeAmount = index === 0 ? firstFee : regularFee;
    const description = installments > 1
      ? `${base.description || 'Recebimento'} (${index + 1}/${installments})`
      : base.description;

    return {
      ...base,
      description,
      service_description: description,
      amount,
      service_value: amount,
      discount_value: discount,
      net_value: netValue,
      gross_amount: amount,
      fee_amount: feeAmount,
      received_value: base.status === 'received' ? netValue : base.received_value,
      due_date: base.due_date ? addMonths(base.due_date, index) : null,
    };
  });

  let { data, error } = await supabase
    .from('ar_invoices')
    .insert(rows)
    .select()
    .order('due_date', { ascending: true });

  if (error) {
    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }

    if (String(error?.message || error?.details || '').toLowerCase().includes('card_last4')) {
      const withoutCardLast4 = await supabase
        .from('ar_invoices')
        .insert(rows.map(omitCardLast4Column))
        .select()
        .order('due_date', { ascending: true });
      data = withoutCardLast4.data;
      error = withoutCardLast4.error;
    }

    if (error) {
      const fallback = await supabase
        .from('ar_invoices')
        .insert(rows.map(omitOptionalReceivableColumns))
        .select()
        .order('due_date', { ascending: true });
      data = fallback.data;
      error = fallback.error;
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  // Log: Conta a receber criada
  if (data?.[0] && payload.appointment_id) {
    logReceivableCreated(payload.appointment_id, data[0].id, totalAmount, {
      patient_name: data[0].patient_name,
      description: data[0].description,
      due_date: data[0].due_date,
    }).catch((err) => console.warn('Auditoria log failed:', err));
  }

  await Promise.all((data || []).map((row) => syncReceivableFinancialTransactions(row)));

  invalidateFinanceCaches(clinicId);

  return installments === 1 ? data[0] : data;
}

/**
 * Update a receivable in ar_invoices
 */
export async function updateReceivable(id, patch, clinicId = null) {
  const upd = normalizeReceivablePatch(patch);

  const runUpdate = async (updateData) => {
    let query = supabase
      .from('ar_invoices')
      .update(updateData)
      .eq('id', id);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    return query.select();
  };

  let updateData = upd;
  let { data, error } = await runUpdate(updateData);

  if (error) {
    if (!isMissingColumnError(error)) {
      throw new Error(error.message);
    }

    const removedColumns = new Set();
    for (let attempt = 0; attempt < 25 && error && isMissingColumnError(error); attempt += 1) {
      const missingColumn = getMissingColumnName(error);
      if (!missingColumn || removedColumns.has(missingColumn)) {
        updateData = omitOptionalReceivableColumns(updateData);
      } else {
        removedColumns.add(missingColumn);
        updateData = omitColumn(updateData, missingColumn);
      }

      const fallback = await runUpdate(updateData);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error('Record not found');
  }

  syncReceivableFinancialTransactions(data[0]).catch((syncError) => {
    console.warn('syncReceivableFinancialTransactions background failed:', syncError?.message || syncError);
  });

  invalidateFinanceCaches(data[0].clinic_id || clinicId);

  return data[0];
}

/**
 * Delete a receivable from ar_invoices
 */
export async function deleteReceivable(id, clinicId = null) {
  await supabase
    .from('financial_transactions')
    .delete()
    .in('origin_module', ['accounts_receivable', 'contas_receber', 'ar_invoices'])
    .eq('origin_id', id);

  let query = supabase.from('ar_invoices').delete().eq('id', id);
  if (clinicId) {
    query = query.eq('clinic_id', clinicId);
  }

  const { data, error } = await query.select('id, clinic_id');
  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Record not found or outside current clinic');
  }

  invalidateFinanceCaches(data[0].clinic_id || clinicId);
}

/**
 * Get a receivable by ID from ar_invoices
 */
export async function getReceivableById(id, clinicId = null) {
  let query = supabase
    .from('ar_invoices')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (clinicId) {
    query = query.eq('clinic_id', clinicId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error('Recebivel nao encontrado');
  }

  return data[0];
}

export async function registerReceivablePayment({
  clinicId,
  receivableId,
  amount,
  payments = [],
  paymentDate = new Date().toISOString().split('T')[0],
  notes = '',
  createdBy = 'system',
} = {}) {
  if (!clinicId || !receivableId) {
    throw new Error('Recebivel e clinica sao obrigatorios');
  }

  const receivable = await getReceivableById(receivableId, clinicId);
  const netValue = Number(receivable.net_value || receivable.amount || 0);
  const currentReceived = Number(receivable.received_value || receivable.paid_total || 0);
  const normalizedPayments = (payments.length ? payments : [{ method: receivable.payment_method || 'pix', amount }])
    .filter((payment) => Number(payment.amount || 0) > 0)
    .map((payment) => ({
      method: normalizePaymentLabel(payment.method),
      enumMethod: normalizePaymentMethodForEnum(payment.method),
      amount: Number(payment.amount || 0),
      reference: payment.reference || null,
    }));

  const totalPaidNow = normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  if (totalPaidNow <= 0) {
    throw new Error('Informe um valor recebido maior que zero');
  }

  const glosaValue = Number(receivable.glosa_value || 0);
  const newReceived = Math.min(netValue, currentReceived + totalPaidNow);
  const newBalance = Math.max(0, netValue - newReceived - glosaValue);
  const newStatus = newBalance <= 0 ? 'received' : 'partial';
  const split = normalizedPayments.map((payment) => ({
    method: payment.method,
    amount: payment.amount,
    reference: payment.reference,
    payment_date: paymentDate,
  }));

  try {
    const rows = normalizedPayments.map((payment) => ({
      clinic_id: clinicId,
      ar_invoice_id: receivableId,
      amount_paid: payment.amount,
      payment_method: payment.enumMethod,
      payment_method_text: payment.method,
      payment_reference: payment.reference,
      payment_date: `${paymentDate}T00:00:00`,
      status: 'completed',
      created_by: createdBy,
      notes,
      metadata: { source: 'contas_receber_enterprise' },
    }));
    const { error: paymentError } = await supabase.from('receivable_payments').insert(rows);
    if (paymentError) {
      console.warn('registerReceivablePayment payment history skipped:', paymentError.message);
    }
  } catch (paymentError) {
    console.warn('registerReceivablePayment payment history failed:', paymentError?.message || paymentError);
  }

  const updatePatch = {
    status: newStatus,
    enterprise_status: newStatus === 'received' ? 'RECEBIDO' : 'PARCIAL',
    received_value: newReceived,
    paid_total: newReceived,
    balance_amount: newBalance,
    received_date: paymentDate,
    received_at: `${paymentDate}T00:00:00`,
    received_payment_method: split.map((item) => item.method).join(' + '),
    payment_split: split,
    metadata: {
      ...(receivable.metadata || {}),
      last_payment: {
        amount: totalPaidNow,
        payment_date: paymentDate,
        methods: split,
        notes,
        registered_at: new Date().toISOString(),
      },
    },
  };

  const updated = await updateReceivable(receivableId, updatePatch, clinicId);
  return updated;
}

export async function registerReceivableGlosa({
  clinicId,
  receivableId,
  sentAmount,
  paidAmount,
  glosaAmount,
  reason,
  glosaType = 'administrativa',
  contestationStatus = 'pendente',
  responsible = '',
  glosaDate = new Date().toISOString().split('T')[0],
} = {}) {
  if (!clinicId || !receivableId) {
    throw new Error('Recebivel e clinica sao obrigatorios');
  }

  const receivable = await getReceivableById(receivableId, clinicId);
  const netValue = Number(receivable.net_value || receivable.amount || 0);
  const currentReceived = Number(receivable.received_value || receivable.paid_total || 0);
  const amountGlosado = Number(glosaAmount || 0);
  if (amountGlosado <= 0) {
    throw new Error('Informe um valor glosado maior que zero');
  }

  try {
    const { error: glosaError } = await supabase.from('receivable_glosas').insert({
      clinic_id: clinicId,
      ar_invoice_id: receivableId,
      sent_amount: Number(sentAmount || netValue),
      paid_amount: Number(paidAmount || currentReceived),
      glosa_amount: amountGlosado,
      reason: reason || null,
      glosa_type: glosaType,
      contestation_status: contestationStatus,
      responsible: responsible || null,
      glosa_date: glosaDate,
      metadata: { source: 'contas_receber_enterprise' },
    });
    if (glosaError) {
      console.warn('registerReceivableGlosa history skipped:', glosaError.message);
    }
  } catch (glosaError) {
    console.warn('registerReceivableGlosa history failed:', glosaError?.message || glosaError);
  }

  const totalGlosa = Number(receivable.glosa_value || 0) + amountGlosado;
  const balance = Math.max(0, netValue - currentReceived - totalGlosa);
  const status = balance <= 0 ? 'glossed' : 'partial';

  return updateReceivable(receivableId, {
    status,
    enterprise_status: status === 'glossed' ? 'GLOSADO' : 'PARCIAL',
    glosa_value: totalGlosa,
    balance_amount: balance,
    glosa_metadata: {
      ...(receivable.glosa_metadata || {}),
      last_glosa: {
        amount: amountGlosado,
        reason,
        glosa_type: glosaType,
        contestation_status: contestationStatus,
        responsible,
        glosa_date: glosaDate,
        registered_at: new Date().toISOString(),
      },
    },
  }, clinicId);
}

export async function updateReceivableGlosaWorkflow({
  clinicId,
  receivableId,
  status,
  contestedAmount = 0,
  recoveredAmount = 0,
  finalLossAmount = 0,
  contestationDeadline = null,
  responsible = '',
  notes = '',
  evidenceUrl = null,
  evidencePath = null,
  evidenceName = null,
} = {}) {
  if (!clinicId || !receivableId || !status) {
    throw new Error('Recebivel, clinica e status da glosa sao obrigatorios');
  }

  const receivable = await getReceivableById(receivableId, clinicId);
  const { data: glosa, error: glosaError } = await supabase
    .from('receivable_glosas')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('ar_invoice_id', receivableId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (glosaError) {
    throw new Error(glosaError.message);
  }
  if (!glosa) {
    throw new Error('Nenhuma glosa encontrada para este recebivel');
  }

  const now = new Date().toISOString();
  const normalizedStatus = String(status).toLowerCase();
  const recoveryValue = Math.max(0, Number(recoveredAmount || 0));
  const lossValue = Math.max(0, Number(finalLossAmount || 0));
  const contestValue = Math.max(0, Number(contestedAmount || glosa.glosa_amount || 0));
  const workflowPatch = {
    contestation_status: normalizedStatus,
    contested_amount: normalizedStatus === 'contestada' ? contestValue : Number(glosa.contested_amount || 0),
    recovered_amount: Number(glosa.recovered_amount || 0) + (normalizedStatus === 'recuperada' ? recoveryValue : 0),
    final_loss_amount: normalizedStatus === 'aceita' ? (lossValue || Number(glosa.glosa_amount || 0)) : Number(glosa.final_loss_amount || 0),
    contestation_deadline: contestationDeadline || glosa.contestation_deadline || null,
    contested_at: normalizedStatus === 'contestada' ? now : glosa.contested_at,
    recovered_at: normalizedStatus === 'recuperada' ? now : glosa.recovered_at,
    accepted_at: normalizedStatus === 'aceita' ? now : glosa.accepted_at,
    responsible: responsible || glosa.responsible || null,
    evidence_url: evidenceUrl || glosa.evidence_url || null,
    evidence_path: evidencePath || glosa.evidence_path || null,
    evidence_name: evidenceName || glosa.evidence_name || null,
    workflow_notes: notes || glosa.workflow_notes || null,
    metadata: {
      ...(glosa.metadata || {}),
      last_workflow: {
        status: normalizedStatus,
        contested_amount: contestValue,
        recovered_amount: recoveryValue,
        final_loss_amount: lossValue,
        notes,
        responsible,
        updated_at: now,
      },
    },
    updated_at: now,
  };

  const { data: updatedGlosa, error: updateError } = await supabase
    .from('receivable_glosas')
    .update(workflowPatch)
    .eq('id', glosa.id)
    .eq('clinic_id', clinicId)
    .select()
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  let updatedReceivable = receivable;
  if (normalizedStatus === 'recuperada' && recoveryValue > 0) {
    const netValue = Number(receivable.net_value || receivable.amount || 0);
    const currentReceived = Number(receivable.received_value || receivable.paid_total || 0);
    const currentGlosa = Number(receivable.glosa_value || 0);
    const newReceived = Math.min(netValue, currentReceived + recoveryValue);
    const newGlosa = Math.max(0, currentGlosa - recoveryValue);
    const newBalance = Math.max(0, netValue - newReceived - newGlosa);
    const newStatus = newBalance <= 0 ? 'received' : 'partial';
    updatedReceivable = await updateReceivable(receivableId, {
      received_value: newReceived,
      paid_total: newReceived,
      glosa_value: newGlosa,
      balance_amount: newBalance,
      status: newStatus,
      enterprise_status: newStatus === 'received' ? 'RECEBIDO' : 'PARCIAL',
      glosa_metadata: {
        ...(receivable.glosa_metadata || {}),
        last_workflow: workflowPatch.metadata.last_workflow,
      },
    }, clinicId);
  } else {
    updatedReceivable = await updateReceivable(receivableId, {
      glosa_metadata: {
        ...(receivable.glosa_metadata || {}),
        last_workflow: workflowPatch.metadata.last_workflow,
      },
    }, clinicId);
  }

  return { receivable: updatedReceivable, glosa: updatedGlosa };
}

export const arStatusOptions = [
  { value: 'open', label: 'Em aberto' },
  { value: 'planned', label: 'Previsto' },
  { value: 'billed', label: 'Faturado' },
  { value: 'received', label: 'Recebido' },
  { value: 'partial', label: 'Recebido Parcial' },
  { value: 'overdue', label: 'Em atraso' },
  { value: 'canceled', label: 'Cancelado' },
  { value: 'glossed', label: 'Glosado' },
  { value: 'reversed', label: 'Estornado' },
];
