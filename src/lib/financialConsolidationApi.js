import { supabase } from '@/lib/customSupabaseClient';
import { listAP } from '@/lib/financeApi';

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value) {
  if (!value) return null;
  return String(value).split('T')[0];
}

function inRange(value, startDate, endDate) {
  const date = dateOnly(value);
  if (!date) return false;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function lowerText(...values) {
  return values.filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isCanceledStatus(status) {
  return ['canceled', 'cancelado', 'cancelada', 'reversed', 'estornado', 'estornada'].includes(
    String(status || '').toLowerCase(),
  );
}

function isPaidStatus(status) {
  return ['paid', 'pago', 'paga', 'received', 'recebido', 'quitado', 'processed'].includes(
    String(status || '').toLowerCase(),
  );
}

function isCashDrawerSettledPayable(row = {}) {
  return Boolean(
    row?.metadata?.drawer_movement_id
      || row?.metadata?.origem === 'Caixa Diario'
      || String(row?.notes || '').includes('Movimento do caixa:')
      || String(row?.description || '').toLowerCase().includes('despesa manual do caixa'),
  );
}

function getReceivableCompetenceDate(row) {
  return dateOnly(row.competency_date || row.invoice_date || row.due_date || row.received_date || row.created_at);
}

function getReceivableMovementDate(row) {
  if (isPaidStatus(row.status)) {
    return dateOnly(row.received_date || row.received_at || row.due_date || row.invoice_date || row.created_at);
  }
  return dateOnly(row.due_date || row.competency_date || row.invoice_date || row.created_at);
}

function getPayableCompetenceDate(row) {
  return dateOnly(row.competency_date || row.issue_date || row.due_date || row.paid_at || row.created_at);
}

function getPayableMovementDate(row) {
  if (isPaidStatus(row.status) || isCashDrawerSettledPayable(row)) {
    return dateOnly(row.paid_date || row.paid_at || row.payment_date || row.due_date || row.issue_date || row.created_at);
  }
  return dateOnly(row.due_date || row.competency_date || row.issue_date || row.created_at);
}

function getTransactionCompetenceDate(row) {
  return dateOnly(row.transaction_date || row.competency_date || row.scheduled_date || row.due_date || row.created_at);
}

function getDrawerMovementDate(row) {
  return dateOnly(row.drawer_date || row.date_opened || row.transaction_date || row.created_at);
}

function getReceivableGross(row) {
  return money(row.gross_amount ?? row.amount ?? row.service_value);
}

function isCardReceivable(row = {}) {
  const text = lowerText(row.payment_method, row.forma_prevista, row.received_payment_method, row.card_brand, row.processor_name);
  return /cartao|card|credito|debito/.test(text);
}

function getReceivableCardFee(row) {
  const explicitFee = money(row.fee_amount ?? row.card_fee_amount ?? row.processing_fee_amount);
  if (explicitFee > 0) return explicitFee;
  if (!isCardReceivable(row)) return 0;

  const gross = getReceivableGross(row);
  const discount = money(row.discount_value ?? row.descontos);
  const taxes = money(row.taxes_value ?? row.total_taxes);
  const netCandidate = money(row.net_value ?? row.received_value ?? row.paid_total ?? row.balance_amount);
  if (gross <= 0 || netCandidate <= 0) return 0;
  return Math.max(0, gross - discount - taxes - netCandidate);
}

function getReceivableNet(row) {
  const gross = getReceivableGross(row);
  const discount = money(row.discount_value ?? row.descontos);
  const fee = getReceivableCardFee(row);
  return money(row.net_value ?? Math.max(0, gross - discount - fee));
}

function getReceivableCash(row) {
  return money(row.received_value ?? row.paid_total ?? (isPaidStatus(row.status) ? getReceivableNet(row) : 0));
}

function getReceivableOpen(row) {
  if (isPaidStatus(row.status)) return 0;
  return money(row.balance_amount ?? getReceivableNet(row) - getReceivableCash(row));
}

function getPayableAmount(row) {
  return money(row.net_amount ?? row.amount ?? row.value ?? row.valor ?? row.total ?? row.balance_amount);
}

function getPayablePaid(row) {
  const explicitPaid = money(row.paid_amount ?? row.paid_value ?? row.payment_amount);
  if (explicitPaid > 0) return explicitPaid;
  return (isPaidStatus(row.status) || isCashDrawerSettledPayable(row)) ? getPayableAmount(row) : 0;
}

function getPayableOpen(row, amount = getPayableAmount(row), paid = getPayablePaid(row)) {
  if (isCashDrawerSettledPayable(row)) return 0;
  return Math.max(0, amount - paid);
}

function classifyExpense(row = {}) {
  const text = lowerText(row.category, row.category_name, row.description, row.vendor_name, row.notes, row.payment_method);
  if (/tarifa|taxa|cartao|cartao|juros|multa|banco|financeir|iof|ted|pix/.test(text)) return 'financial';
  if (/administr|contador|contabil|juridic|software|sistema|telefone|internet|escritorio/.test(text)) return 'administrative';
  return 'operational';
}

function isCardFee(row = {}) {
  const text = lowerText(row.category, row.category_name, row.description, row.notes, row.payment_method);
  return /card_fee|taxa.*cartao|cartao.*taxa|taxa de cartao|cartao/.test(text);
}

function getTransactionType(row = {}) {
  const type = String(row.type || '').toLowerCase();
  const transactionType = String(row.transaction_type || '').toUpperCase();
  if (type === 'revenue' || type === 'income' || transactionType === 'INCOME') return 'revenue';
  if (['expense', 'cost', 'fee'].includes(type) || transactionType === 'EXPENSE' || transactionType === 'FEE') return 'expense';
  if (type === 'deduction' || transactionType === 'ADJUSTMENT') return 'deduction';
  return type || transactionType.toLowerCase();
}

function getDrawerMovementType(row = {}) {
  const type = lowerText(row.payment_type, row.type, row.movement_type);
  if (/entrada|income|revenue|receita|credito|credit/.test(type)) return 'revenue';
  if (/saida|expense|despesa|debito|debit/.test(type)) return 'expense';
  return money(row.amount) >= 0 ? 'revenue' : 'expense';
}

function getReceivablePayerName(row = {}) {
  return row.payer_name
    || row.convenio_name
    || row.convenio
    || row.company_name
    || row.empresa_name
    || row.patient_name
    || 'Pagador nao informado';
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

async function hydrateReceivableAppointmentsForConsolidation(clinicId, rows = []) {
  const appointmentIds = [...new Set(rows.map(getReceivableAppointmentId).filter(Boolean))];
  if (!clinicId || appointmentIds.length === 0) return rows;

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
    console.warn('getFinancialConsolidation appointment hydration skipped:', error.message);
    return rows;
  }

  const appointmentsById = new Map((data || []).map((appointment) => [appointment.id, appointment]));

  return rows.map((row) => {
    const appointmentId = getReceivableAppointmentId(row);
    const appointment = appointmentId ? appointmentsById.get(appointmentId) : null;
    if (!appointment) return row;

    const currentAppointment = getReceivableAppointment(row) || {};
    const hydratedAppointment = {
      ...currentAppointment,
      ...appointment,
      patients: currentAppointment.patients || appointment.patients,
      professionals: currentAppointment.professionals || appointment.professionals,
      services: currentAppointment.services || appointment.services,
      rooms: currentAppointment.rooms || appointment.rooms,
    };

    return {
      ...row,
      appointment_id: row.appointment_id || appointment.id,
      appointments: [hydratedAppointment],
      patient_id: row.patient_id || row.paciente_id || appointment.patient_id || null,
      patient_name: row.patient_name || appointment.patients?.name || currentAppointment.patient_name || null,
      professional_id: row.professional_id || row.profissional_id || appointment.professional_id || null,
      professional_name: row.professional_name || row.profissional_name || appointment.professionals?.name || null,
      service_id: row.service_id || row.procedure_id || appointment.service_id || null,
      procedure_id: row.procedure_id || row.service_id || appointment.service_id || null,
      service_name: row.service_name || row.procedure_name || appointment.services?.name || null,
      procedure_name: row.procedure_name || row.service_name || appointment.services?.name || null,
      payment_method: row.payment_method || appointment.payment_method || null,
      plano_contas_id: row.plano_contas_id || appointment.plano_contas_id || null,
    };
  });
}

function getPayableRecipientName(row = {}) {
  const parsedFromDescription = String(row.description || '').match(/^NF\s+[^-]+-\s*(.+)$/i)?.[1]?.trim();
  return row.vendor_name
    || row.supplier_name
    || row.fornecedor_name
    || row.recipient_name
    || row.payee_name
    || row.beneficiary_name
    || row.favorecido
    || row.metadata?.nfe?.supplier_name
    || row.metadata?.nfe?.supplier?.name
    || row.metadata?.public_supplier_lookup?.name
    || parsedFromDescription
    || 'Destinatario nao informado';
}

function isReceivableOrPayableOrigin(row = {}) {
  const origin = String(row.origin_module || '').toLowerCase();
  return [
    'accounts_receivable',
    'accounts_payable',
    'contas_receber',
    'contas_pagar',
    'ar_invoices',
    'ap_bills',
  ].includes(origin);
}

function getRepresentedDrawerMovementId(row = {}) {
  if (row.metadata?.drawer_movement_id) return row.metadata.drawer_movement_id;
  const text = lowerText(row.notes, row.description);
  return text.match(/movimento do caixa:\s*([0-9a-f-]+)/i)?.[1] || null;
}

function isDerivedSyncDescription(row = {}) {
  const description = lowerText(row.description);
  return description.startsWith('receita bruta -')
    || description.startsWith('taxa de cartao -')
    || description.startsWith('desconto concedido -')
    || description.startsWith('conta a pagar -');
}

function buildEmptyConsolidation(startDate, endDate) {
  return {
    period: { startDate, endDate },
    revenue: {
      grossRevenue: 0,
      discounts: 0,
      cardFees: 0,
      taxes: 0,
      netRevenueBeforeCardFees: 0,
      netRevenue: 0,
      receivedRevenue: 0,
      openReceivables: 0,
      receivableCount: 0,
      receivedCount: 0,
    },
    expenses: {
      operational: 0,
      administrative: 0,
      financial: 0,
      cardFees: 0,
      totalOperating: 0,
      totalWithCardFees: 0,
      paid: 0,
      open: 0,
      payableCount: 0,
      paidPayableCount: 0,
    },
    result: {
      ebitda: 0,
      operatingIncome: 0,
      netIncome: 0,
      grossMarginPct: 0,
      ebitdaMarginPct: 0,
      netMarginPct: 0,
    },
    receivables: [],
    payables: [],
    transactions: [],
  };
}

function mapLegacyInvoiceForConsolidation(row, clinicId) {
  const amount = money(row.amount ?? row.total ?? row.value ?? row.valor);
  const status = String(row.status || '').toLowerCase();
  const isReceived = ['paid', 'received', 'pago', 'recebido', 'quitado'].includes(status);
  const dueDate = dateOnly(row.due_date || row.vencimento || row.data_vencimento || row.created_at);
  const invoiceDate = dateOnly(row.invoice_date || row.issue_date || row.emission_date || row.created_at);
  const receivedDate = dateOnly(row.received_date || row.paid_at || row.payment_date);
  const payerName = row.payer_name || row.patient_name || row.customer_name || row.client_name || row.name;

  return {
    ...row,
    clinic_id: row.clinic_id || clinicId,
    patient_name: payerName,
    payer_name: payerName,
    description: row.description || row.descricao || row.notes || 'Conta a receber',
    amount,
    gross_amount: money(row.gross_amount ?? amount),
    net_value: money(row.net_value ?? row.total ?? amount),
    received_value: money(row.received_value ?? (isReceived ? (row.net_value ?? row.total ?? amount) : 0)),
    due_date: dueDate,
    invoice_date: invoiceDate,
    competency_date: dateOnly(row.competency_date || invoiceDate || dueDate),
    received_date: receivedDate,
    status: isReceived ? 'received' : (status || 'open'),
    origem: row.origem || row.origin || 'legacy_invoices',
  };
}

async function listLegacyInvoicesForConsolidation(clinicId) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(20000);

    if (error) throw error;
    return (data || []).map((row) => mapLegacyInvoiceForConsolidation(row, clinicId));
  } catch (error) {
    console.warn('getFinancialConsolidation legacy invoice fallback skipped:', error?.message || error);
    return [];
  }
}

export async function getFinancialConsolidation(clinicId, startDate, endDate) {
  if (!clinicId) return buildEmptyConsolidation(startDate, endDate);

  const [receivablesResult, payablesResult, transactionsResult, drawerMovementsResult] = await Promise.all([
    supabase.from('ar_invoices').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(20000),
    supabase.from('ap_bills').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(20000),
    supabase.from('financial_transactions').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(20000),
    supabase.from('drawer_movements').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(20000),
  ]);

  if (receivablesResult.error) throw receivablesResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  let rawPayables = payablesResult.data || [];
  if (payablesResult.error) {
    try {
      rawPayables = await listAP({ clinicId, limit: 20000, offset: 0 });
    } catch (_fallbackError) {
      throw payablesResult.error;
    }
  } else if (rawPayables.length === 0) {
    try {
      const fallbackPayables = await listAP({ clinicId, limit: 20000, offset: 0 });
      if (fallbackPayables?.length) rawPayables = fallbackPayables;
    } catch (fallbackError) {
      console.warn('getFinancialConsolidation AP fallback skipped:', fallbackError?.message || fallbackError);
    }
  }

  let rawReceivables = receivablesResult.data || [];
  if (rawReceivables.length === 0) {
    const fallbackReceivables = await listLegacyInvoicesForConsolidation(clinicId);
    if (fallbackReceivables.length) rawReceivables = fallbackReceivables;
  }

  rawReceivables = await hydrateReceivableAppointmentsForConsolidation(clinicId, rawReceivables);

  const receivables = rawReceivables.filter(
    (row) => !isCanceledStatus(row.status) && inRange(getReceivableCompetenceDate(row), startDate, endDate),
  );
  const payables = rawPayables.filter(
    (row) => !isCanceledStatus(row.status) && inRange(getPayableCompetenceDate(row), startDate, endDate),
  );
  const transactions = (transactionsResult.data || []).filter(
    (row) => !isCanceledStatus(row.status)
      && !isReceivableOrPayableOrigin(row)
      && !isDerivedSyncDescription(row)
      && inRange(getTransactionCompetenceDate(row), startDate, endDate),
  );

  let drawerMovements = [];
  if (drawerMovementsResult.error) {
    console.warn('getFinancialConsolidation drawer movements skipped:', drawerMovementsResult.error?.message || drawerMovementsResult.error);
  } else {
    const representedAppointmentIds = new Set(receivables.map((row) => row.appointment_id).filter(Boolean));
    const representedDrawerMovementIds = new Set([
      ...receivables.map(getRepresentedDrawerMovementId),
      ...payables.map(getRepresentedDrawerMovementId),
    ].filter(Boolean));
    const rawDrawerMovements = drawerMovementsResult.data || [];
    const drawerIds = [...new Set(rawDrawerMovements.map((row) => row.drawer_id).filter(Boolean))];
    let drawersById = new Map();

    if (drawerIds.length) {
      const { data: drawers, error: drawersError } = await supabase
        .from('cash_drawers')
        .select('id,date_opened')
        .eq('clinic_id', clinicId)
        .in('id', drawerIds);

      if (drawersError) {
        console.warn('getFinancialConsolidation drawer dates skipped:', drawersError?.message || drawersError);
      } else {
        drawersById = new Map((drawers || []).map((drawer) => [drawer.id, drawer.date_opened]));
      }
    }

    drawerMovements = rawDrawerMovements
      .filter((row) => !representedAppointmentIds.has(row.appointment_id))
      .filter((row) => !representedDrawerMovementIds.has(row.id))
      .map((row) => {
        const type = getDrawerMovementType(row);
        const drawerDate = drawersById.get(row.drawer_id) || null;
        const transactionDate = getDrawerMovementDate({ ...row, drawer_date: drawerDate });

        return {
          ...row,
          drawer_date: drawerDate,
          type,
          transaction_type: type === 'revenue' ? 'INCOME' : 'EXPENSE',
          status: 'paid',
          movement_type: 'REALIZED',
          category: 'cash_drawer',
          description: row.description || 'Movimento de caixa',
          amount: Math.abs(money(row.amount)),
          transaction_date: transactionDate,
          competency_date: transactionDate,
          origin_module: 'drawer_movements',
          origin_id: row.id,
        };
      })
      .filter((row) => inRange(getTransactionCompetenceDate(row), startDate, endDate));
  }

  transactions.push(...drawerMovements);

  const summary = buildEmptyConsolidation(startDate, endDate);
  summary.receivables = receivables;
  summary.payables = payables;
  summary.transactions = transactions;

  receivables.forEach((row) => {
    const gross = getReceivableGross(row);
    const discount = money(row.discount_value ?? row.descontos);
    const cardFee = getReceivableCardFee(row);
    const taxes = money(row.taxes_value ?? row.total_taxes);
    const cash = getReceivableCash(row);

    summary.revenue.grossRevenue += gross;
    summary.revenue.discounts += discount;
    summary.revenue.cardFees += cardFee;
    summary.revenue.taxes += taxes;
    summary.revenue.receivedRevenue += cash;
    summary.revenue.openReceivables += getReceivableOpen(row);
    summary.revenue.receivableCount += 1;
    if (cash > 0 || isPaidStatus(row.status)) summary.revenue.receivedCount += 1;
  });

  payables.forEach((row) => {
    const amount = getPayableAmount(row);
    const paid = getPayablePaid(row);
    const bucket = classifyExpense(row);

    summary.expenses[bucket] += amount;
    summary.expenses.paid += paid;
    summary.expenses.open += getPayableOpen(row, amount, paid);
    summary.expenses.payableCount += 1;
    if (paid > 0 || isPaidStatus(row.status) || isCashDrawerSettledPayable(row)) summary.expenses.paidPayableCount += 1;
  });

  transactions.forEach((row) => {
    const amount = money(row.amount);
    const type = getTransactionType(row);

    if (type === 'revenue') {
      summary.revenue.grossRevenue += amount;
      summary.revenue.receivableCount += 1;
      if (isPaidStatus(row.status) || row.movement_type === 'REALIZED') {
        summary.revenue.receivedRevenue += amount;
        summary.revenue.receivedCount += 1;
      } else {
        summary.revenue.openReceivables += amount;
      }
      return;
    }

    if (type === 'deduction') {
      summary.revenue.discounts += amount;
      return;
    }

    if (type === 'expense') {
      if (isCardFee(row)) {
        summary.revenue.cardFees += amount;
        return;
      }
      const bucket = classifyExpense(row);
      summary.expenses[bucket] += amount;
      summary.expenses.payableCount += 1;
      if (isPaidStatus(row.status) || row.movement_type === 'REALIZED') {
        summary.expenses.paid += amount;
        summary.expenses.paidPayableCount += 1;
      } else {
        summary.expenses.open += amount;
      }
    }
  });

  summary.expenses.cardFees = summary.revenue.cardFees;
  summary.revenue.netRevenueBeforeCardFees = Math.max(
    0,
    summary.revenue.grossRevenue - summary.revenue.discounts - summary.revenue.taxes,
  );
  summary.revenue.netRevenue = Math.max(0, summary.revenue.netRevenueBeforeCardFees - summary.revenue.cardFees);
  summary.expenses.totalOperating = summary.expenses.operational + summary.expenses.administrative;
  summary.expenses.totalWithCardFees = summary.expenses.totalOperating + summary.expenses.financial + summary.expenses.cardFees;

  summary.result.ebitda = summary.revenue.netRevenue - summary.expenses.totalOperating;
  summary.result.operatingIncome = summary.result.ebitda - summary.expenses.financial;
  summary.result.netIncome = summary.result.operatingIncome;
  summary.result.grossMarginPct = summary.revenue.grossRevenue > 0
    ? (summary.revenue.netRevenueBeforeCardFees / summary.revenue.grossRevenue) * 100
    : 0;
  summary.result.ebitdaMarginPct = summary.revenue.netRevenueBeforeCardFees > 0
    ? (summary.result.ebitda / summary.revenue.netRevenueBeforeCardFees) * 100
    : 0;
  summary.result.netMarginPct = summary.revenue.netRevenueBeforeCardFees > 0
    ? (summary.result.netIncome / summary.revenue.netRevenueBeforeCardFees) * 100
    : 0;

  return summary;
}

export function buildDerivedFinancialTransactions(consolidation) {
  const rows = [];

  consolidation.receivables.forEach((row) => {
    const movementDate = getReceivableMovementDate(row);
    const competenceDate = getReceivableCompetenceDate(row);
    const gross = getReceivableGross(row);
    const discount = money(row.discount_value ?? row.descontos);
    const fee = getReceivableCardFee(row);
    const status = isPaidStatus(row.status) ? 'paid' : 'scheduled';
    const description = row.description || row.service_description || row.patient_name || 'Conta a receber';
    const payerName = getReceivablePayerName(row);
    const receivableMeta = {
      counterparty_name: payerName,
      counterparty_role: 'Pagador',
      payer_name: payerName,
      payer_type: row.payer_type || row.tipo_pagador || null,
      convenio_name: row.convenio_name || row.payer_contract_name || null,
      company_name: row.company_name || row.empresa_name || null,
      patient_name: row.patient_name || null,
      professional_name: row.professional_name || row.profissional_name || row.doctor_name || null,
      service_name: row.service_name || row.procedure_name || row.service_description || null,
      procedure_name: row.procedure_name || null,
      service_description: row.service_description || null,
      document_number: row.document_number
        || row.invoice_number
        || row.numero_documento
        || row.insurance_invoice_number
        || row.guide_number
        || row.nf_document_name
        || null,
    };

    if (gross > 0) {
      rows.push({
        id: `ar-${row.id}-gross`,
        clinic_id: row.clinic_id,
        type: 'revenue',
        transaction_type: 'INCOME',
        status,
        category: 'medical_service',
        chart_account_id: row.chart_account_id || row.plano_contas_id || row.category_id || null,
        chart_account_name: row.chart_account_name || row.plano_contas_name || row.category_name || null,
        category_id: row.category_id || row.chart_account_id || row.plano_contas_id || null,
        category_name: row.category_name || row.chart_account_name || row.plano_contas_name || null,
        ...receivableMeta,
        flow_detail_name: 'Receita bruta',
        description: `Receita bruta - ${description}`,
        amount: gross,
        transaction_date: movementDate,
        competency_date: competenceDate,
        origin_module: 'accounts_receivable',
        origin_id: row.id,
        is_reconciled: status === 'paid',
        created_at: row.created_at,
        notes: 'Lancamento derivado de contas a receber',
      });
    }

    if (discount > 0) {
      rows.push({
        id: `ar-${row.id}-discount`,
        clinic_id: row.clinic_id,
        type: 'deduction',
        transaction_type: 'ADJUSTMENT',
        status,
        category: 'revenue_deduction',
        chart_account_id: row.chart_account_id || row.plano_contas_id || row.category_id || null,
        chart_account_name: row.chart_account_name || row.plano_contas_name || row.category_name || null,
        category_id: row.category_id || row.chart_account_id || row.plano_contas_id || null,
        category_name: row.category_name || row.chart_account_name || row.plano_contas_name || null,
        ...receivableMeta,
        flow_detail_name: 'Desconto concedido',
        description: `Desconto concedido - ${description}`,
        amount: discount,
        transaction_date: movementDate,
        competency_date: competenceDate,
        origin_module: 'accounts_receivable',
        origin_id: row.id,
        is_reconciled: status === 'paid',
        created_at: row.created_at,
        notes: 'Dedução derivada de contas a receber',
      });
    }

    if (fee > 0) {
      rows.push({
        id: `ar-${row.id}-card-fee`,
        clinic_id: row.clinic_id,
        type: 'deduction',
        transaction_type: 'ADJUSTMENT',
        status,
        category: 'card_fee',
        chart_account_id: row.chart_account_id || row.plano_contas_id || row.category_id || null,
        chart_account_name: row.chart_account_name || row.plano_contas_name || row.category_name || null,
        category_id: row.category_id || row.chart_account_id || row.plano_contas_id || null,
        category_name: row.category_name || row.chart_account_name || row.plano_contas_name || null,
        ...receivableMeta,
        flow_detail_name: 'Taxa de cartao',
        description: `Taxa de cartão - ${description}`,
        amount: fee,
        transaction_date: movementDate,
        competency_date: competenceDate,
        origin_module: 'accounts_receivable',
        origin_id: row.id,
        is_reconciled: status === 'paid',
        created_at: row.created_at,
        notes: 'Dedução de receita derivada de taxa de cartão',
      });
    }
  });

  consolidation.payables.forEach((row) => {
    const movementDate = getPayableMovementDate(row);
    const competenceDate = getPayableCompetenceDate(row);
    const recipientName = getPayableRecipientName(row);
    rows.push({
      id: `ap-${row.id}`,
      clinic_id: row.clinic_id,
      type: 'expense',
      transaction_type: 'EXPENSE',
      status: (isPaidStatus(row.status) || isCashDrawerSettledPayable(row)) ? 'paid' : 'scheduled',
      category: classifyExpense(row),
      chart_account_id: row.chart_account_id || row.plano_contas_id || row.category_id || null,
      chart_account_name: row.chart_account_name || row.plano_contas_name || row.category_name || null,
      category_id: row.category_id || row.chart_account_id || row.plano_contas_id || null,
      category_name: row.category_name || row.chart_account_name || row.plano_contas_name || null,
      counterparty_name: recipientName,
      counterparty_role: 'Destinatario',
      recipient_name: recipientName,
      vendor_name: recipientName,
      document_number: row.document_number || row.invoice_number || row.nf_number || row.numero_documento || null,
      flow_detail_name: 'Conta a pagar',
      description: row.description || row.vendor_name || 'Conta a pagar',
      amount: getPayableAmount(row),
      transaction_date: movementDate,
      competency_date: competenceDate,
      origin_module: 'accounts_payable',
      origin_id: row.id,
      is_reconciled: isPaidStatus(row.status),
      created_at: row.created_at,
      notes: 'Lancamento derivado de contas a pagar',
    });
  });

  (consolidation.transactions || []).forEach((row) => {
    const date = getTransactionCompetenceDate(row);
    const type = getTransactionType(row);
    const counterpartyName = row.counterparty_name || row.payer_name || row.vendor_name || row.recipient_name || row.payee_name || row.patient_name || 'Contraparte nao informada';
    rows.push({
      id: `ft-${row.id}`,
      clinic_id: row.clinic_id,
      type,
      transaction_type: type === 'revenue' ? 'INCOME' : type === 'expense' ? 'EXPENSE' : 'ADJUSTMENT',
      status: String(row.status || '').toLowerCase(),
      category: row.category || row.category_id || 'general',
      chart_account_id: row.chart_account_id || row.plano_contas_id || row.category_id || null,
      chart_account_name: row.chart_account_name || row.plano_contas_name || row.category_name || null,
      category_id: row.category_id || row.chart_account_id || row.plano_contas_id || null,
      category_name: row.category_name || row.chart_account_name || row.plano_contas_name || null,
      counterparty_name: counterpartyName,
      counterparty_role: type === 'revenue' ? 'Pagador' : 'Destinatario',
      payer_name: row.payer_name || null,
      payer_type: row.payer_type || row.tipo_pagador || null,
      convenio_name: row.convenio_name || row.payer_contract_name || null,
      company_name: row.company_name || row.empresa_name || null,
      patient_name: row.patient_name || row.paciente_name || null,
      professional_name: row.professional_name || row.profissional_name || row.doctor_name || null,
      service_name: row.service_name || row.procedure_name || row.service_description || null,
      procedure_name: row.procedure_name || null,
      service_description: row.service_description || null,
      recipient_name: row.recipient_name || row.vendor_name || null,
      document_number: row.document_number || row.reference_document || null,
      flow_detail_name: row.flow_detail_name || row.category_name || row.category || 'Lancamento manual',
      description: row.description || row.reference_document || 'Lancamento financeiro',
      amount: money(row.amount),
      transaction_date: date,
      competency_date: date,
      origin_module: row.origin_module || 'financial_transactions',
      origin_id: row.origin_id || row.id,
      is_reconciled: row.is_reconciled === true,
      created_at: row.created_at,
      reference_document: row.reference_document || row.document_number,
      notes: row.notes,
    });
  });

  return rows;
}

export default {
  getFinancialConsolidation,
  buildDerivedFinancialTransactions,
};
