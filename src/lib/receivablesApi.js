import { supabase } from '@/lib/customSupabaseClient';
import { logReceivableCreated, logPaymentReceived } from '@/lib/auditFinancialIntegration.js';
import { classifyReceivableForEnterprise } from '@/lib/enterpriseChartOfAccounts';
import { resolveEnterpriseCostCenterId } from '@/lib/enterpriseCostCenters';
import { resolveCostCenterAllocation } from '@/lib/costCenterAllocationEngine';

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

function normalizeReceivableText(...values) {
  return values.filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getReceivableAppointment(row = {}) {
  return Array.isArray(row.appointments) ? row.appointments[0] : row.appointments;
}

function getReceivableAppointmentId(row = {}) {
  const metadata = row.metadata || {};
  return row.appointment_id
    || row.agendamento_id
    || metadata.appointment_id
    || metadata.agendamento_id
    || metadata.appointment?.id
    || metadata.payment_data?.appointment_id
    || metadata.last_payment?.appointment_id
    || null;
}

function getReceivableProfessionalId(row = {}) {
  const appointment = getReceivableAppointment(row) || {};
  const metadata = row.metadata || {};
  return row.professional_id
    || row.profissional_id
    || appointment.professional_id
    || appointment.professionals?.id
    || metadata.professional_id
    || metadata.profissional_id
    || metadata.appointment?.professional_id
    || metadata.appointment?.professionals?.id
    || null;
}

function getReceivableProfessionalName(row = {}) {
  const appointment = getReceivableAppointment(row) || {};
  const metadata = row.metadata || {};
  return row.professional_name
    || row.profissional_name
    || appointment.professionals?.name
    || metadata.professional_name
    || metadata.profissional_name
    || metadata.appointment?.professional_name
    || metadata.appointment?.professionals?.name
    || null;
}

function getReceivablePatientId(row = {}) {
  const appointment = getReceivableAppointment(row) || {};
  const metadata = row.metadata || {};
  return row.patient_id
    || row.paciente_id
    || appointment.patient_id
    || metadata.patient_id
    || metadata.paciente_id
    || metadata.appointment?.patient_id
    || metadata.payment_data?.patient_id
    || null;
}

function getReceivablePatientName(row = {}) {
  const appointment = getReceivableAppointment(row) || {};
  const metadata = row.metadata || {};
  return row.patient_name
    || row.payer_name
    || row.payer_display
    || appointment.patients?.name
    || appointment.patient_name
    || metadata.patient_name
    || metadata.payer_name
    || metadata.appointment?.patientName
    || metadata.appointment?.patient_name
    || metadata.appointment?.patients?.name
    || metadata.payment_data?.patientName
    || metadata.payment_data?.patient_name
    || metadata.payment_data?.payer_name
    || null;
}

async function hydrateReceivableAppointments(clinicId, rows = []) {
  const appointmentIds = [...new Set(rows
    .map(getReceivableAppointmentId)
    .filter(Boolean))];

  if (!clinicId || appointmentIds.length === 0) {
    return rows;
  }

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_date,
      service_id,
      patient_id,
      professional_id,
      room_id,
      payment_method,
      payment_splits,
      plano_contas_id,
      payer_id,
      patients!left(name),
      professionals!left(id, name),
      services!left(id, name),
      rooms!left(id, name)
    `)
    .eq('clinic_id', clinicId)
    .in('id', appointmentIds);

  if (error) {
    console.warn('hydrateReceivableAppointments skipped:', error.message);
    return rows;
  }

  const appointmentsById = new Map((data || []).map((appointment) => [appointment.id, appointment]));

  return rows.map((row) => {
    const appointmentId = getReceivableAppointmentId(row);
    const appointment = appointmentId ? appointmentsById.get(appointmentId) : null;

    if (!appointment) {
      return row;
    }

    const currentAppointment = getReceivableAppointment(row) || {};
    const hydratedAppointment = {
      ...currentAppointment,
      ...appointment,
      patients: currentAppointment.patients || appointment.patients,
      professionals: currentAppointment.professionals || appointment.professionals,
      services: currentAppointment.services || appointment.services,
      rooms: currentAppointment.rooms || appointment.rooms,
      scheduled_date: currentAppointment.scheduled_date || appointment.scheduled_date,
      professional_id: currentAppointment.professional_id || appointment.professional_id,
      patient_id: currentAppointment.patient_id || appointment.patient_id,
      service_id: currentAppointment.service_id || appointment.service_id,
      room_id: currentAppointment.room_id || appointment.room_id,
    };

    return {
      ...row,
      appointment_id: row.appointment_id || appointment.id,
      appointments: [hydratedAppointment],
      patient_id: row.patient_id || row.paciente_id || appointment.patient_id || null,
      professional_id: row.professional_id || row.profissional_id || appointment.professional_id || null,
      procedure_id: row.procedure_id || row.service_id || appointment.service_id || null,
      unit_id: row.unit_id || row.room_id || appointment.room_id || null,
    };
  });
}

function mapLegacyInvoiceToReceivable(row, clinicId) {
  const amount = Number(row.amount ?? row.total ?? row.valor ?? row.value ?? 0);
  const received = ['paid', 'received', 'pago', 'recebido', 'quitado'].includes(String(row.status || '').toLowerCase());
  const dueDate = parseDateOnly(row.due_date || row.vencimento || row.data_vencimento || row.created_at);
  const invoiceDate = parseDateOnly(row.invoice_date || row.issue_date || row.emission_date || row.created_at);
  const payerName = row.payer_name || row.patient_name || row.customer_name || row.client_name || row.name || 'Pagador não informado';

  return {
    ...row,
    clinic_id: row.clinic_id || clinicId,
    patient_name: payerName,
    payer_name: payerName,
    description: row.description || row.descricao || row.notes || `Fatura ${row.id ? String(row.id).slice(0, 8) : ''}`.trim(),
    amount,
    gross_amount: Number(row.gross_amount ?? amount),
    net_value: Number(row.net_value ?? row.total ?? amount),
    received_value: Number(row.received_value ?? (received ? (row.net_value ?? row.total ?? amount) : 0)),
    due_date: dueDate,
    invoice_date: invoiceDate,
    competency_date: parseDateOnly(row.competency_date || invoiceDate || dueDate),
    received_date: parseDateOnly(row.received_date || row.paid_at || row.payment_date),
    status: normalizeArStatus(row.status) || (received ? 'received' : 'open'),
    origem: row.origem || row.origin || 'legacy_invoices',
  };
}

function matchesLegacyReceivableFilters(row, filters) {
  if (filters.payer && !normalizeReceivableText(row.patient_name, row.payer_name).includes(normalizeReceivableText(filters.payer))) return false;
  if (filters.payerType && String(row.payer_type || '').toLowerCase() !== String(filters.payerType).toLowerCase()) return false;
  if (filters.statusList?.length) {
    const accepted = normalizeStatusListForQuery(filters.statusList);
    if (!accepted.includes(String(row.status || '').toLowerCase())) return false;
  } else if (filters.status) {
    const accepted = normalizeStatusListForQuery([filters.status]);
    if (!accepted.includes(String(row.status || '').toLowerCase())) return false;
  }
  if (filters.dueStart && (!row.due_date || row.due_date < filters.dueStart)) return false;
  if (filters.dueEnd && (!row.due_date || row.due_date > filters.dueEnd)) return false;
  if (filters.emissionStart && (!row.invoice_date || row.invoice_date < filters.emissionStart)) return false;
  if (filters.emissionEnd && (!row.invoice_date || row.invoice_date > filters.emissionEnd)) return false;
  if (filters.receivedStart && (!row.received_date || row.received_date < filters.receivedStart)) return false;
  if (filters.receivedEnd && (!row.received_date || row.received_date > filters.receivedEnd)) return false;
  if (filters.minValue !== null && filters.minValue !== undefined && filters.minValue !== '' && Number(row.net_value || row.amount || 0) < Number(filters.minValue)) return false;
  if (filters.maxValue !== null && filters.maxValue !== undefined && filters.maxValue !== '' && Number(row.net_value || row.amount || 0) > Number(filters.maxValue)) return false;
  if (filters.search && !normalizeReceivableText(row.description, row.patient_name, row.payer_name, row.document_number, row.invoice_number).includes(normalizeReceivableText(filters.search))) return false;
  return true;
}

async function listLegacyInvoiceReceivables(clinicId, filters) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(20000);

    if (error) throw error;
    const rows = (data || [])
      .map((row) => mapLegacyInvoiceToReceivable(row, clinicId))
      .filter((row) => matchesLegacyReceivableFilters(row, filters));
    return rows.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100));
  } catch (error) {
    console.warn('listLegacyInvoiceReceivables skipped:', error?.message || error);
    return [];
  }
}

async function listArInvoicesViaRpc(clinicId, filters) {
  try {
    const { sessionUserId, sessionEmail } = getCustomSessionIdentity();

    const { data, error } = await supabase.rpc('list_ar_invoices', {
      p_clinic_id: clinicId,
      p_limit: 20000,
      p_offset: 0,
      p_user_id: sessionUserId,
      p_email: sessionEmail,
    });

    if (error) throw error;
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return (data || [])
      .filter((row) => matchesLegacyReceivableFilters(row, filters))
      .slice(offset, offset + limit);
  } catch (error) {
    console.warn('listArInvoicesViaRpc skipped:', error?.message || error);
    return [];
  }
}

function getCustomSessionIdentity() {
  let sessionUserId = null;
  let sessionEmail = null;
  try {
    if (typeof localStorage !== 'undefined') {
      const session = JSON.parse(localStorage.getItem('gesclinic_session') || '{}');
      sessionUserId = session.user_id || session.userId || null;
      sessionEmail = session.email || null;
    }
  } catch (_error) {
    // Ignore malformed local custom sessions; Supabase auth claims may still work.
  }
  return { sessionUserId, sessionEmail };
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
    financial_plan_account_id: payload.financial_plan_account_id || null,
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
    service_group: payload.service_group || null,
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
    financial_plan_account_id: row.financial_plan_account_id,
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

function buildReceivableAllocatedRows(baseRow, allocationRows, totalAmount) {
  const total = Number(totalAmount || 0);
  const rows = (allocationRows || [])
    .filter((item) => item?.target_cost_center_id && Number(item.amount || 0) > 0)
    .map((item) => {
      const allocatedAmount = Number(item.amount || 0);
      const percentage = total > 0 ? Number(((allocatedAmount / total) * 100).toFixed(6)) : null;
      return {
        ...baseRow,
        amount: allocatedAmount,
        cost_center_id: item.target_cost_center_id,
        centro_custo_id: item.target_cost_center_id,
        metadata: {
          allocation: {
            applied: true,
            target_cost_center_id: item.target_cost_center_id,
            percentage,
            source: 'cost_center_allocation_rule',
          },
        },
      };
    });

  return rows.length > 0 ? rows : [{ ...baseRow, amount: total }];
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
    const sourceCostCenterId = row.cost_center_id || row.centro_custo_id || null;
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
      financial_plan_account_id: row.financial_plan_account_id || null,
      professional_id: row.professional_id || null,
      origin_module: 'accounts_receivable',
      origin_id: row.id,
      is_reconciled: false,
    };
    const description = row.description || row.service_description || row.patient_name || 'Conta a receber';
    const rows = [];

    if (grossAmount > 0 && dates.status !== 'canceled') {
      const grossBase = {
        ...base,
        description: `Receita bruta - ${description}`,
        type: 'revenue',
        category: 'medical_service',
        transaction_type: 'INCOME',
        notes: 'Receita bruta originada em contas a receber',
      };

      const allocationRows = sourceCostCenterId
        ? await resolveCostCenterAllocation({
          clinicId: row.clinic_id,
          sourceCostCenterId,
          amount: grossAmount,
        })
        : [];

      rows.push(...buildReceivableAllocatedRows(grossBase, allocationRows, grossAmount));
    }

    if (discountAmount > 0 && dates.status !== 'canceled') {
      const discountBase = {
        ...base,
        description: `Desconto concedido - ${description}`,
        type: 'deduction',
        category: 'revenue_deduction',
        transaction_type: 'ADJUSTMENT',
        notes: 'Dedução da receita originada em contas a receber',
      };

      const allocationRows = sourceCostCenterId
        ? await resolveCostCenterAllocation({
          clinicId: row.clinic_id,
          sourceCostCenterId,
          amount: discountAmount,
        })
        : [];

      rows.push(...buildReceivableAllocatedRows(discountBase, allocationRows, discountAmount));
    }

    if (feeAmount > 0 && dates.status !== 'canceled') {
      const feeBase = {
        ...base,
        description: `Taxa de cartão - ${description}`,
        type: 'expense',
        category: 'card_fee',
        transaction_type: 'EXPENSE',
        notes: 'Despesa financeira de taxa de cartão originada em contas a receber',
      };

      const allocationRows = sourceCostCenterId
        ? await resolveCostCenterAllocation({
          clinicId: row.clinic_id,
          sourceCostCenterId,
          amount: feeAmount,
        })
        : [];

      rows.push(...buildReceivableAllocatedRows(feeBase, allocationRows, feeAmount));
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
  if ('chart_account_id' in normalized && !('plano_contas_id' in normalized)) {
    normalized.plano_contas_id = normalized.chart_account_id || null;
  }
  if ('financial_plan_account_id' in normalized) {
    normalized.financial_plan_account_id = normalized.financial_plan_account_id || null;
  }
  if ('payer_name' in normalized && !('patient_name' in normalized)) {
    normalized.patient_name = normalized.payer_name;
  }
  if ('profissional_id' in normalized && !('professional_id' in normalized)) {
    normalized.professional_id = normalized.profissional_id || null;
  }
  if ('payer_type' in normalized) {
    const payerType = String(normalized.payer_type || '').toLowerCase();
    if (!['convenio', 'empresa'].includes(payerType)) {
      normalized.payer_id = null;
    }
    if (payerType !== 'convenio') {
      normalized.convenio_id = null;
    }
    if (payerType !== 'empresa') {
      normalized.company_id = null;
    }
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

function isRlsPolicyError(error) {
  const text = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42501' || text.includes('row-level security policy');
}

async function insertArInvoicesViaRpc(clinicId, rows) {
  const { sessionUserId, sessionEmail } = getCustomSessionIdentity();
  const { data, error } = await supabase.rpc('create_ar_invoices_from_json', {
    p_clinic_id: clinicId,
    p_rows: rows,
    p_user_id: sessionUserId,
    p_email: sessionEmail,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).sort((left, right) => String(left.due_date || '').localeCompare(String(right.due_date || '')));
}

async function updateArInvoiceViaRpc(id, clinicId, patch) {
  const { sessionUserId, sessionEmail } = getCustomSessionIdentity();
  const { data, error } = await supabase.rpc('update_ar_invoice_from_json', {
    p_ar_invoice_id: id,
    p_clinic_id: clinicId,
    p_patch: patch,
    p_user_id: sessionUserId,
    p_email: sessionEmail,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data[0] : data;
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
    service_group,
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

  const appointmentHydratedRows = await hydrateReceivableAppointments(clinicId, rows);
  const normalizedRows = appointmentHydratedRows.map((row) => {
    const professionalId = getReceivableProfessionalId(row);
    const professionalName = getReceivableProfessionalName(row);
    const patientId = getReceivablePatientId(row);
    const patientName = getReceivablePatientName(row);
    return {
      ...row,
      patient_id: patientId || row.patient_id || null,
      patient_name: patientName || row.patient_name || null,
      payer_name: patientName || row.payer_name || null,
      payer_display: patientName || row.payer_display || null,
      professional_id: professionalId || row.professional_id || null,
      professional_name: professionalName || row.professional_name || null,
    };
  });

  // Extrair IDs únicos de payers e professionals
  const payerIds = [...new Set(normalizedRows.map(r => r.payer_id).filter(Boolean))];
  const professionalIds = [...new Set(normalizedRows.map(r => r.professional_id).filter(Boolean))];
  const chartAccountIds = [...new Set(normalizedRows.map(r => r.chart_account_id).filter(Boolean))];
  const serviceIds = [...new Set(normalizedRows.map(getRegisteredServiceId).filter(Boolean))];
  const hasRowsWithoutService = normalizedRows.some((row) => !getRegisteredServiceId(row));
  
  // Contar quantos têm chart_account_id NULL (precisam classificação automática)
  const needsClassification = normalizedRows.filter(r => !r.chart_account_id).length;

  console.log('🔍 [attachLatestGlosas] Enriquecimento de dados:', {
    payerIds: payerIds.length,
    professionalIds: professionalIds.length,
    chartAccountIds: chartAccountIds.length,
    serviceIds: serviceIds.length,
    needsClassification,
    totalRows: normalizedRows.length,
  });

  // Buscar nomes de payers, professionals e chart_of_accounts
  const [payersMap, professionalsMap, chartsMap, servicesMap, allServices] = await Promise.all([
    payerIds.length > 0 ? fetchPayersMap(clinicId, payerIds) : Promise.resolve(new Map()),
    professionalIds.length > 0 ? fetchProfessionalsMap(clinicId, professionalIds) : Promise.resolve(new Map()),
    chartAccountIds.length > 0 ? fetchChartsMap(clinicId, chartAccountIds) : Promise.resolve(new Map()),
    serviceIds.length > 0 ? fetchServicesMap(clinicId, serviceIds) : Promise.resolve(new Map()),
    hasRowsWithoutService ? fetchServicesForClassification(clinicId) : Promise.resolve([]),
  ]);

  console.log('📦 [attachLatestGlosas] Dados enriquecidos:', {
    payersMapSize: payersMap.size,
    professionalsMapSize: professionalsMap.size,
    chartsMapSize: chartsMap.size,
    servicesMapSize: servicesMap.size,
    allServicesSize: allServices.length,
  });

  // Enriquecer rows com nomes E classificação automática
  const enrichedRows = await Promise.all(normalizedRows.map(async (row, idx) => {
    // Se chart_account_id for NULL, classificar automaticamente
    let classifiedChartAccountId = row.chart_account_id;
    let classifiedChartName = null;
    
    if (!classifiedChartAccountId) {
      try {
        const classification = await classifyReceivableForEnterprise(clinicId, row, { strict: false });
        if (classification.chartAccountId) {
          classifiedChartAccountId = classification.chartAccountId;
          classifiedChartName = chartsMap.get(classifiedChartAccountId);
        }
      } catch (e) {
        console.warn('⚠️ Classificação automática falhou para row', idx, ':', e.message);
      }
    }
    
    const registeredService = servicesMap.get(getRegisteredServiceId(row)) || findRegisteredServiceByText(row, allServices);
    const enriched = {
      ...row,
      chart_account_id: classifiedChartAccountId || row.chart_account_id,
      convenio_name: payersMap.get(row.payer_id) || row.convenio_name || null,
      professional_name: row.professional_id 
        ? (professionalsMap.get(row.professional_id) || row.professional_name || 'Não identificado')
        : 'Não identificado',
      plano_contas_name: classifiedChartName || chartsMap.get(classifiedChartAccountId) || row.plano_contas_name || 'Não classificado',
      registered_service_id: registeredService?.id || null,
      registered_service_name: registeredService?.name || null,
      registered_service_group: getServiceGroupLabel(registeredService),
      guide_number: row.guide_number || null, // Vem do XML
    };
    
    // Log primeiros 3 registros com TODOS os campos relevantes
    if (idx < 3) {
      console.log(`  🔍 Row ${idx} enriquecido:`, {
        id: row.id,
        patient_name: row.patient_name,
        convenio_name: enriched.convenio_name,
        professional_name: enriched.professional_name,
        plano_contas_name: enriched.plano_contas_name,
        guide_number: enriched.guide_number,
      });
    }
    
    return enriched;
  }));

  const ids = enrichedRows.map((row) => row.id).filter(Boolean);
  if (!ids.length) {
    return enrichedRows;
  }

  const { data, error } = await supabase
    .from('receivable_glosas')
    .select('id, ar_invoice_id, contestation_status, contested_amount, recovered_amount, final_loss_amount, contestation_deadline, responsible, evidence_url, evidence_path, evidence_name, workflow_notes, updated_at, created_at')
    .eq('clinic_id', clinicId)
    .in('ar_invoice_id', ids)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('attachLatestGlosas skipped:', error.message);
    return enrichedRows;
  }

  const latestByReceivable = new Map();
  (data || []).forEach((glosa) => {
    if (!latestByReceivable.has(glosa.ar_invoice_id)) {
      latestByReceivable.set(glosa.ar_invoice_id, glosa);
    }
  });

  return enrichedRows.map((row) => {
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

// Helper functions to fetch related data
async function fetchPayersMap(clinicId, payerIds) {
  if (!payerIds.length) return new Map();
  const { data, error } = await supabase
    .from('payers')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .in('id', payerIds);
  
  if (error) {
    console.warn('fetchPayersMap error:', error.message);
    return new Map();
  }
  
  return new Map((data || []).map(p => [p.id, p.name]));
}

async function fetchProfessionalsMap(clinicId, professionalIds) {
  if (!professionalIds.length) return new Map();
  const { data, error } = await supabase
    .from('professionals')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .in('id', professionalIds);
  
  if (error) {
    console.warn('fetchProfessionalsMap error:', error.message);
    return new Map();
  }
  
  return new Map((data || []).map(p => [p.id, p.name]));
}

async function fetchChartsMap(clinicId, chartAccountIds) {
  if (!chartAccountIds.length) return new Map();
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, name')
    .eq('clinic_id', clinicId)
    .in('id', chartAccountIds);
  
  if (error) {
    console.warn('fetchChartsMap error:', error.message);
    return new Map();
  }
  
  return new Map((data || []).map(c => [c.id, c.name]));
}

function getRegisteredServiceId(row = {}) {
  const appointment = Array.isArray(row.appointments) ? row.appointments[0] : row.appointments;
  return row.procedure_id || row.service_id || appointment?.service_id || null;
}

function getServiceGroupLabel(service) {
  if (!service) return null;
  const category = service.service_category || service.type_service || '';
  const labels = {
    consultation: 'Consultas',
    exam: 'Exames',
    procedure: 'Procedimentos',
    surgery: 'Cirurgias',
    other: 'Outros',
  };
  return labels[category] || service.service_group || null;
}

function normalizeServiceMatchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildReceivableServiceHaystack(row = {}) {
  const fields = row.metadata?.document_extraction?.fields || {};
  return normalizeServiceMatchText([
    row.procedure_name,
    row.service_description,
    row.description,
    row.nf_document_name,
    fields.procedure_name,
    fields.service_name,
    fields.description,
    fields.tuss_code,
  ].filter(Boolean).join(' '));
}

function findRegisteredServiceByText(row = {}, services = []) {
  const haystack = buildReceivableServiceHaystack(row);
  if (!haystack) return null;
  return [...services]
    .sort((left, right) => String(right.name || '').length - String(left.name || '').length)
    .find((service) => {
      const name = normalizeServiceMatchText(service.name);
      const code = normalizeServiceMatchText(service.tuss_code || service.code);
      return (name && haystack.includes(name)) || (code && haystack.includes(code));
    }) || null;
}

async function fetchServicesMap(clinicId, serviceIds) {
  if (!serviceIds.length) return new Map();
  const { data, error } = await supabase
    .from('services')
    .select('id, name, code, tuss_code, service_category, type_service')
    .eq('clinic_id', clinicId)
    .in('id', serviceIds);

  if (error) {
    console.warn('fetchServicesMap error:', error.message);
    return new Map();
  }

  return new Map((data || []).map((service) => [service.id, service]));
}

async function fetchServicesForClassification(clinicId) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, code, tuss_code, service_category, type_service')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    console.warn('fetchServicesForClassification error:', error.message);
    return [];
  }

  return data || [];
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
        scheduled_date,
        service_id,
        patient_id,
        professional_id,
        room_id,
        patients!left(name),
        professionals!left(id, name),
        services!left(id, name),
        rooms!left(id, name),
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
            scheduled_date,
            service_id,
            patient_id,
            professional_id,
            room_id,
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

  if (!data?.length) {
    const rpcRows = await listArInvoicesViaRpc(clinicId, {
      payer,
      payerType,
      status,
      statusList,
      dueStart,
      dueEnd,
      emissionStart,
      emissionEnd,
      receivedStart,
      receivedEnd,
      minValue,
      maxValue,
      search,
      limit,
      offset,
    });
    if (rpcRows.length) {
      return attachLatestGlosas(clinicId, rpcRows);
    }

    const legacyRows = await listLegacyInvoiceReceivables(clinicId, {
      payer,
      payerType,
      status,
      statusList,
      dueStart,
      dueEnd,
      emissionStart,
      emissionEnd,
      receivedStart,
      receivedEnd,
      minValue,
      maxValue,
      search,
      limit,
      offset,
    });
    if (legacyRows.length) {
      return attachLatestGlosas(clinicId, legacyRows);
    }
  }

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
  const classification = await classifyReceivableForEnterprise(clinicId, payload, { strict: true });
  const resolvedCostCenterId = await resolveEnterpriseCostCenterId(clinicId, payload, 'receivable');
  const base = normalizeReceivablePayload(clinicId, {
    ...payload,
    chart_account_id: payload.chart_account_id || classification.chartAccountId,
    plano_contas_id: payload.plano_contas_id || classification.chartAccountId,
    centro_custo_id: payload.centro_custo_id || classification.costCenterId || resolvedCostCenterId,
    cost_center_id: payload.cost_center_id || classification.costCenterId || resolvedCostCenterId,
  });

  if (!base.chart_account_id) {
    throw new Error('Receita sem classificação no plano de contas ERP.');
  }

  if (!base.centro_custo_id && !base.cost_center_id) {
    throw new Error('Receita sem centro de custo. Configure o Centro de Custos ERP e tente novamente.');
  }
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
    if (isRlsPolicyError(error)) {
      data = await insertArInvoicesViaRpc(clinicId, rows);
      error = null;
    } else if (!isMissingColumnError(error)) {
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
      const fallbackRows = rows.map(omitOptionalReceivableColumns);
      const fallback = await supabase
        .from('ar_invoices')
        .insert(fallbackRows)
        .select()
        .order('due_date', { ascending: true });
      data = fallback.data;
      error = fallback.error;
      if (error) {
        if (isRlsPolicyError(error)) {
          data = await insertArInvoicesViaRpc(clinicId, fallbackRows);
          error = null;
        }
      }

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
    if (isRlsPolicyError(error) && clinicId) {
      data = [await updateArInvoiceViaRpc(id, clinicId, updateData)];
      error = null;
    } else if (!isMissingColumnError(error)) {
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

      if (isRlsPolicyError(error) && clinicId) {
        data = [await updateArInvoiceViaRpc(id, clinicId, updateData)];
        error = null;
      }
    }

    if (error) throw new Error(error.message);
  }

  if ((!data || data.length === 0) && clinicId) {
    data = [await updateArInvoiceViaRpc(id, clinicId, updateData)];
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
  if (data?.length) {
    invalidateFinanceCaches(data[0].clinic_id || clinicId);
    return;
  }

  const { sessionUserId, sessionEmail } = getCustomSessionIdentity();
  const { data: rpcData, error: rpcError } = await supabase.rpc('delete_ar_invoice_cascade', {
    p_ar_invoice_id: id,
    p_clinic_id: clinicId,
    p_user_id: sessionUserId,
    p_email: sessionEmail,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }
  if (!rpcData || rpcData.length === 0) {
    throw new Error('Record not found or outside current clinic');
  }

  invalidateFinanceCaches(rpcData[0].clinic_id || clinicId);
}

/**
 * Get a receivable by ID from ar_invoices
 */
export async function getReceivableById(id, clinicId = null) {
  const receivableSelect = `
    *,
    appointments!left(
      id,
      scheduled_date,
      service_id,
      patient_id,
      professional_id,
      room_id,
      patients!left(name),
      professionals!left(id, name),
      services!left(id, name),
      rooms!left(id, name),
      payment_method,
      payment_splits,
      plano_contas_id,
      payer_id
    )
  `;

  let query = supabase
    .from('ar_invoices')
    .select(receivableSelect)
    .eq('id', id)
    .limit(1);

  if (clinicId) {
    query = query.eq('clinic_id', clinicId);
  }

  let { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if ((!data || data.length === 0) && clinicId) {
    const fallback = await supabase
      .from('ar_invoices')
      .select(receivableSelect)
      .eq('id', id)
      .limit(1);

    data = fallback.data;
    error = fallback.error;

    if (error) {
      throw new Error(error.message);
    }
  }

  if ((!data || data.length === 0) && clinicId) {
    const rpcRows = await listArInvoicesViaRpc(clinicId, { limit: 20000, offset: 0 });
    const rpcRow = (rpcRows || []).find((row) => row.id === id || row.appointment_id === id);
    if (rpcRow) {
      return rpcRow;
    }
  }

  if ((!data || data.length === 0) && clinicId) {
    const appointmentFallback = await supabase
      .from('ar_invoices')
      .select(receivableSelect)
      .eq('clinic_id', clinicId)
      .eq('appointment_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    data = appointmentFallback.data;
    error = appointmentFallback.error;

    if (error) {
      throw new Error(error.message);
    }
  }

  if (!data || data.length === 0) {
    throw new Error('Recebivel nao encontrado');
  }

  if (clinicId) {
    const enriched = await attachLatestGlosas(clinicId, data);
    return enriched[0] || data[0];
  }

  return {
    ...data[0],
    professional_id: getReceivableProfessionalId(data[0]),
    professional_name: getReceivableProfessionalName(data[0]),
  };
}

export async function registerReceivablePayment({
  clinicId,
  receivableId,
  amount,
  payments = [],
  paymentDate = new Date().toISOString().split('T')[0],
  notes = '',
  createdBy = 'system',
  receivable: providedReceivable = null,
} = {}) {
  if (!clinicId || !receivableId) {
    throw new Error('Recebivel e clinica sao obrigatorios');
  }

  const receivable = providedReceivable || await getReceivableById(receivableId, clinicId);
  const netValue = Number(receivable.net_value || receivable.amount || 0);
  const currentReceived = Number(receivable.received_value || receivable.paid_total || 0);
  const normalizedPayments = (payments.length ? payments : [{ method: receivable.payment_method || 'pix', amount }])
    .filter((payment) => Number(payment.amount || 0) > 0)
    .map((payment) => ({
      method: normalizePaymentLabel(payment.method),
      enumMethod: normalizePaymentMethodForEnum(payment.method),
      amount: Number(payment.amount || 0),
      reference: payment.reference || null,
      installments: payment.installments || null,
      installment_dates: payment.installment_dates || null,
      payment_due_date: payment.payment_due_date || null,
      card_brand: payment.card_brand || null,
      observation: payment.observation || null,
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
    installments: payment.installments,
    installment_dates: payment.installment_dates,
    payment_due_date: payment.payment_due_date,
    card_brand: payment.card_brand,
    observation: payment.observation,
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
      metadata: {
        source: 'contas_receber_enterprise',
        installments: payment.installments,
        installment_dates: payment.installment_dates,
        payment_due_date: payment.payment_due_date,
        card_brand: payment.card_brand,
        observation: payment.observation,
      },
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
