import { supabase } from '@/lib/customSupabaseClient';

const DRAWER_NOTE_PREFIX = 'Movimento do caixa:';

function dateOnly(value) {
  if (!value) {
    return new Date().toISOString().split('T')[0];
  }
  return String(value).split('T')[0];
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getMissingColumnName(error) {
  const text = String(error?.message || error?.details || '');
  return text.match(/Could not find the '([^']+)' column/i)?.[1]
    || text.match(/column "?([a-zA-Z0-9_]+)"? of relation/i)?.[1]
    || text.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i)?.[1]
    || null;
}

function omitKey(row, key) {
  if (!key || !(key in row)) {
    return row;
  }
  const { [key]: _removed, ...rest } = row;
  return rest;
}

async function insertWithColumnFallback(table, payload, optionalColumns = []) {
  let currentPayload = { ...payload };
  const omitted = new Set();

  for (let attempt = 0; attempt <= optionalColumns.length + 2; attempt += 1) {
    const { data, error } = await supabase.from(table).insert(currentPayload).select().single();
    if (!error) {
      return data;
    }

    const missingColumn = getMissingColumnName(error);
    const removableColumn = missingColumn && (missingColumn in currentPayload)
      ? missingColumn
      : optionalColumns.find((column) => column in currentPayload && !omitted.has(column));

    if (!removableColumn) {
      throw new Error(error.message || `Erro ao inserir em ${table}`);
    }

    omitted.add(removableColumn);
    currentPayload = omitKey(currentPayload, removableColumn);
  }

  throw new Error(`Erro ao inserir em ${table}`);
}

function getFinancialCategory(movement) {
  if (movement.financial_category) {
    return movement.financial_category;
  }
  return movement.type === 'entrada' ? 'other' : 'other';
}

function getMovementLabel(type) {
  return type === 'entrada' ? 'Receita' : 'Despesa';
}

function getExpenseCounterparty(movement) {
  return movement.expense_supplier_name
    || movement.expense_provider_name
    || movement.counterparty_name
    || 'Favorecido nao informado';
}

function buildDrawerNote(movement) {
  return `${getMovementLabel(movement.type)} manual do Caixa Diario. ${DRAWER_NOTE_PREFIX} ${movement.id}.`;
}

async function createReceivableFromDrawerMovement(movement) {
  const transactionDate = dateOnly(movement.created_at);
  const amount = round2(movement.amount);
  const counterparty = movement.counterparty_name || 'Pagador nao informado';
  const description = `Receita manual do caixa - ${movement.description || 'Sem descricao'}`;
  const documentNumber = movement.reference_document || `CAIXA-${String(movement.id).slice(0, 8)}`;

  return insertWithColumnFallback('ar_invoices', {
    clinic_id: movement.clinic_id,
    patient_name: counterparty,
    description,
    service_description: description,
    notes: buildDrawerNote(movement),
    amount,
    service_value: amount,
    gross_amount: amount,
    net_value: amount,
    received_value: amount,
    paid_total: amount,
    balance_amount: 0,
    discount_value: 0,
    status: 'received',
    due_date: transactionDate,
    invoice_date: transactionDate,
    competency_date: transactionDate,
    received_date: transactionDate,
    received_at: `${transactionDate}T00:00:00`,
    payment_method: movement.payment_method,
    origem: 'Caixa Diario',
    payer_type: 'particular',
    guide_number: documentNumber,
    insurance_invoice_number: documentNumber,
    metadata: {
      origem: 'Caixa Diario',
      drawer_movement_id: movement.id,
      drawer_id: movement.drawer_id,
      tipo: 'Receita',
    },
  }, [
    'notes',
    'service_value',
    'gross_amount',
    'received_value',
    'paid_total',
    'balance_amount',
    'discount_value',
    'invoice_date',
    'competency_date',
    'received_date',
    'received_at',
    'payment_method',
    'origem',
    'payer_type',
    'guide_number',
    'insurance_invoice_number',
    'metadata',
  ]);
}

async function createPayableFromDrawerMovement(movement) {
  const transactionDate = dateOnly(movement.created_at);
  const amount = round2(movement.amount);
  const counterparty = getExpenseCounterparty(movement);
  const description = `Despesa manual do caixa - ${movement.description || 'Sem descricao'}`;
  const documentNumber = movement.reference_document || `CAIXA-${String(movement.id).slice(0, 8)}`;

  return insertWithColumnFallback('ap_bills', {
    clinic_id: movement.clinic_id,
    vendor_name: counterparty,
    supplier_name: counterparty,
    description,
    due_date: transactionDate,
    issue_date: transactionDate,
    amount,
    net_amount: amount,
    paid_value: amount,
    balance_amount: 0,
    status: 'PAID',
    payment_method: movement.payment_method,
    paid_at: `${transactionDate}T00:00:00`,
    payment_date: transactionDate,
    document_number: documentNumber,
    notes: buildDrawerNote(movement),
    installments: 1,
    metadata: {
      origem: 'Caixa Diario',
      drawer_movement_id: movement.id,
      drawer_id: movement.drawer_id,
      tipo: 'Despesa',
      settlement_status: 'PAID',
    },
  }, [
    'supplier_name',
    'net_amount',
    'paid_value',
    'balance_amount',
    'payment_method',
    'paid_at',
    'payment_date',
    'document_number',
    'notes',
    'installments',
    'issue_date',
    'metadata',
  ]);
}

async function createFinancialTransactionForFinanceDocument({ movement, financeDocument, originModule }) {
  const transactionDate = dateOnly(movement.created_at);
  const isRevenue = movement.type === 'entrada';
  const documentNumber = movement.reference_document || `CAIXA-${String(movement.id).slice(0, 8)}`;
  const description = `${getMovementLabel(movement.type)} manual do caixa - ${movement.description || 'Sem descricao'}`;
  const amount = round2(movement.amount);

  await supabase
    .from('financial_transactions')
    .delete()
    .eq('origin_module', originModule)
    .eq('origin_id', financeDocument.id);

  return insertWithColumnFallback('financial_transactions', {
    clinic_id: movement.clinic_id,
    created_by: movement.created_by || null,
    updated_by: movement.created_by || null,
    type: isRevenue ? 'revenue' : 'expense',
    category: getFinancialCategory(movement),
    transaction_type: isRevenue ? 'INCOME' : 'EXPENSE',
    movement_type: 'REALIZED',
    status: 'paid',
    description,
    amount,
    transaction_date: transactionDate,
    scheduled_date: transactionDate,
    due_date: transactionDate,
    competency_date: transactionDate,
    reference_document: documentNumber,
    document_number: documentNumber,
    origin_module: originModule,
    origin_id: financeDocument.id,
    is_reconciled: false,
    notes: buildDrawerNote(movement),
  }, [
    'updated_by',
    'transaction_type',
    'movement_type',
    'transaction_date',
    'competency_date',
    'document_number',
    'origin_module',
    'origin_id',
    'is_reconciled',
  ]);
}

export async function syncManualDrawerMovementToFinance(movement) {
  if (!movement?.id || movement.origin !== 'manual') {
    return null;
  }

  const financeDocument = movement.type === 'entrada'
    ? await createReceivableFromDrawerMovement(movement)
    : await createPayableFromDrawerMovement(movement);

  const originModule = movement.type === 'entrada' ? 'accounts_receivable' : 'accounts_payable';
  await createFinancialTransactionForFinanceDocument({ movement, financeDocument, originModule });

  return {
    type: movement.type === 'entrada' ? 'contas_receber' : 'contas_pagar',
    id: financeDocument.id,
  };
}

export async function deleteManualDrawerMovementFinance(movementId) {
  if (!movementId) {
    return;
  }
  const notePattern = `%${DRAWER_NOTE_PREFIX} ${movementId}.%`;

  const [receivablesResult, payablesResult] = await Promise.all([
    supabase.from('ar_invoices').select('id').ilike('notes', notePattern),
    supabase.from('ap_bills').select('id').ilike('notes', notePattern),
  ]);

  const receivableIds = (receivablesResult.data || []).map((row) => row.id);
  const payableIds = (payablesResult.data || []).map((row) => row.id);

  await Promise.all([
    receivableIds.length
      ? supabase.from('financial_transactions').delete().eq('origin_module', 'accounts_receivable').in('origin_id', receivableIds)
      : Promise.resolve(),
    payableIds.length
      ? supabase.from('financial_transactions').delete().eq('origin_module', 'accounts_payable').in('origin_id', payableIds)
      : Promise.resolve(),
  ]);

  await Promise.all([
    receivableIds.length ? supabase.from('ar_invoices').delete().in('id', receivableIds) : Promise.resolve(),
    payableIds.length ? supabase.from('ap_bills').delete().in('id', payableIds) : Promise.resolve(),
  ]);
}
