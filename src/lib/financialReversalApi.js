import { supabase } from '@/lib/customSupabaseClient';
import { updateReceivable } from '@/lib/receivablesApi';
import {
  FINANCIAL_EVENT_TYPES,
  RELATED_ENTITY_TYPES,
  logAppointmentFinancialAudit,
} from '@/lib/auditFinancialApi';

function isMissingColumnError(error) {
  const text = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42703' || (text.includes('column') && text.includes('does not exist'));
}

function isMissingRelationError(error) {
  const text = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || text.includes('does not exist') || text.includes('could not find the table');
}

function getMissingColumnName(error) {
  const text = String(error?.message || error?.details || '');
  return text.match(/column "?([a-zA-Z0-9_]+)"? of relation/i)?.[1]
    || text.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i)?.[1]
    || text.match(/Could not find the '([^']+)' column/i)?.[1]
    || null;
}

function omitColumn(row, columnName) {
  if (!columnName || !(columnName in row)) {
    return row;
  }
  const { [columnName]: _removed, ...rest } = row;
  return rest;
}

function addStep(steps, name, status, details = {}) {
  steps.push({ name, status, ...details });
}

function parseMaybeJson(value, fallback) {
  if (!value) {
    return fallback;
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function updateRowsWithFallback({ table, patch, filters, select = 'id' }) {
  const removedColumns = new Set();
  let updatePatch = { ...patch };

  for (let attempt = 0; attempt < 25; attempt += 1) {
    let query = supabase.from(table).update(updatePatch);
    filters.forEach(([method, ...args]) => {
      query = query[method](...args);
    });

    const { data, error } = await query.select(select);
    if (!error) {
      return data || [];
    }

    if (!isMissingColumnError(error)) {
      throw error;
    }

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || removedColumns.has(missingColumn)) {
      throw error;
    }

    removedColumns.add(missingColumn);
    updatePatch = omitColumn(updatePatch, missingColumn);
  }

  throw new Error(`Nao foi possivel atualizar ${table}`);
}

async function listRows(table, filters, select = '*') {
  let query = supabase.from(table).select(select);
  filters.forEach(([method, ...args]) => {
    query = query[method](...args);
  });
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data || [];
}

async function listRowsOptional(table, filters, select = '*') {
  try {
    return await listRows(table, filters, select);
  } catch (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error)) {
      return [];
    }
    throw error;
  }
}

function uniqueRowsById(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row?.id || seen.has(row.id)) {
      return false;
    }
    seen.add(row.id);
    return true;
  });
}

function getReceivableReversalAmount(row = {}) {
  return Number(row.paid_total || row.received_value || row.net_value || row.gross_amount || row.amount || 0);
}

function isCardReceivable(row = {}) {
  const method = String(row.payment_method || '').toLowerCase();
  const metadata = parseMaybeJson(row.metadata, {});
  const paymentSplit = parseMaybeJson(row.payment_split, []);
  const split = Array.isArray(paymentSplit) ? paymentSplit[0] : null;
  return Boolean(
    row.processor_id
      || row.card_brand
      || metadata?.card
      || split?.card_brand
      || method.includes('cart')
      || method.includes('credit')
      || method.includes('debit'),
  );
}

async function markAppointmentReversed({ appointmentId, clinicId, reason, userId, now, steps }) {
  const rows = await updateRowsWithFallback({
    table: 'appointments',
    patch: {
      status: 'canceled',
      cancellation_reason: `Estorno financeiro: ${reason}`,
      canceled_at: now,
      financial_status: 'reversed',
      financial_reversed_at: now,
      financial_reversal_reason: reason,
      financial_reversed_by: userId || null,
      updated_at: now,
    },
    filters: [
      ['eq', 'id', appointmentId],
      ['eq', 'clinic_id', clinicId],
    ],
    select: 'id, status',
  });

  addStep(steps, 'appointment', rows.length ? 'financially_reversed' : 'not_found', {
    ids: rows.map((row) => row.id),
  });
}

async function reverseReceivables({ appointmentId, clinicId, reason, userId, now, steps }) {
  const rows = await listRows('ar_invoices', [
    ['eq', 'clinic_id', clinicId],
    ['eq', 'appointment_id', appointmentId],
  ]);

  const reversed = [];
  for (const row of rows) {
    const currentMetadata = parseMaybeJson(row.metadata, {});
    try {
      const updated = await updateReceivable(row.id, {
        status: 'reversed',
        reversed_at: now,
        cancellation_reason: reason,
        notes: `Estorno financeiro: ${reason}`,
        metadata: {
          ...currentMetadata,
          reversal: {
            reason,
            reversed_at: now,
            reversed_by: userId || null,
          },
        },
      }, clinicId);
      reversed.push(updated.id);
    } catch (_error) {
      const updated = await updateReceivable(row.id, {
        status: 'canceled',
        canceled_at: now,
        cancellation_reason: reason,
        notes: `Estorno financeiro: ${reason}`,
      }, clinicId);
      reversed.push(updated.id);
    }
  }

  addStep(steps, 'ar_invoices', rows.length ? 'reversed_or_canceled' : 'none', {
    ids: reversed,
    totalAmount: rows.reduce((sum, row) => sum + getReceivableReversalAmount(row), 0),
  });

  return rows;
}

async function reverseFinancialTransactions({ appointmentId, clinicId, receivables, reason, userId, now, steps }) {
  const receivableIds = receivables.map((row) => row.id).filter(Boolean);
  const directRows = await listRowsOptional('financial_transactions', [
    ['eq', 'clinic_id', clinicId],
    ['eq', 'appointment_id', appointmentId],
  ]);
  const originRows = receivableIds.length > 0
    ? await listRowsOptional('financial_transactions', [
      ['eq', 'clinic_id', clinicId],
      ['in', 'origin_id', receivableIds],
    ])
    : [];
  const rows = uniqueRowsById([...directRows, ...originRows]);

  if (!rows.length) {
    addStep(steps, 'financial_transactions', 'none', { reason: 'Sem transacoes vinculadas encontradas' });
    return [];
  }

  const ids = rows.map((row) => row.id);
  const canceled = await updateRowsWithFallback({
    table: 'financial_transactions',
    patch: {
      status: 'canceled',
      notes: `Estorno financeiro do atendimento ${appointmentId}: ${reason}`,
      is_reconciled: false,
      reconciliation_id: null,
      reversed_at: now,
      reversal_reason: reason,
      reversed_by: userId || null,
      updated_at: now,
    },
    filters: [
      ['eq', 'clinic_id', clinicId],
      ['in', 'id', ids],
    ],
    select: 'id',
  });

  addStep(steps, 'financial_transactions', 'canceled', {
    ids: canceled.map((row) => row.id),
  });

  return rows;
}

async function reverseCashMovements({ clinicId, appointmentId, reason, userId, amount, now, steps }) {
  const reversalAmount = Number(amount || 0);

  try {
    const linkedMovements = await listRowsOptional('cash_register_movements', [
      ['eq', 'clinic_id', clinicId],
      ['eq', 'appointment_id', appointmentId],
    ]);

    if (linkedMovements.length > 0) {
      await updateRowsWithFallback({
        table: 'cash_register_movements',
        patch: {
          status: 'reversed',
          notes: `Estorno financeiro: ${reason}`,
          reversed_at: now,
          reversed_by: userId || null,
          updated_at: now,
        },
        filters: [
          ['eq', 'clinic_id', clinicId],
          ['in', 'id', linkedMovements.map((row) => row.id)],
        ],
        select: 'id',
      });
    }
  } catch (error) {
    addStep(steps, 'cash_register_movements_mark', 'skipped', { reason: error.message });
  }

  if (reversalAmount <= 0) {
    addStep(steps, 'cash_register_movements', 'none', { reason: 'Sem valor recebido para estornar' });
    return;
  }

  const { data: sessions, error: sessionError } = await supabase
    .from('cash_register_sessions')
    .select('id, current_balance')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (sessionError || !sessions?.length) {
    addStep(steps, 'cash_register_movements', 'skipped', {
      reason: sessionError?.message || 'Nenhum caixa encontrado para contrapartida',
    });
    return;
  }

  const session = sessions[0];
  const { data: movement, error } = await supabase
    .from('cash_register_movements')
    .insert({
      cash_session_id: session.id,
      clinic_id: clinicId,
      movement_type: 'ADJUSTMENT',
      amount: -Math.abs(reversalAmount),
      payment_method: 'ESTORNO',
      received_by: userId || null,
      description: `Contrapartida de estorno financeiro do atendimento ${appointmentId}`,
      notes: reason,
      appointment_id: appointmentId,
      recorded_at: now,
    })
    .select('id')
    .single();

  if (error) {
    addStep(steps, 'cash_register_movements', 'skipped', { reason: error.message });
    return;
  }

  await supabase
    .from('cash_register_sessions')
    .update({ current_balance: Number(session.current_balance || 0) - Math.abs(reversalAmount) })
    .eq('id', session.id);

  addStep(steps, 'cash_register_movements', 'counter_entry_created', {
    ids: [movement.id],
    amount: -Math.abs(reversalAmount),
  });
}

async function reverseConciliationLinks({ clinicId, appointmentId, receivables, financialTransactions, reason, now, steps }) {
  const receivableIds = receivables.map((row) => row.id).filter(Boolean);
  const transactionIds = financialTransactions.map((row) => row.id).filter(Boolean);
  const linkedIds = [...new Set([...receivableIds, ...transactionIds])];
  const cardRows = receivables.filter(isCardReceivable);

  if (!linkedIds.length && !cardRows.length) {
    addStep(steps, 'card_conciliation', 'none', { reason: 'Sem cartao ou conciliacao vinculada' });
    return;
  }

  const conciliationSteps = [];

  if (linkedIds.length > 0) {
    try {
      const rows = await updateRowsWithFallback({
        table: 'conciliation_bank_statements',
        patch: {
          status: 'pending',
          linked_financial_id: null,
          linked_type: null,
          divergence_reason: `Desconciliado por estorno financeiro: ${reason}`,
          updated_at: now,
        },
        filters: [
          ['eq', 'clinic_id', clinicId],
          ['in', 'linked_financial_id', linkedIds],
        ],
        select: 'id',
      });
      conciliationSteps.push({ table: 'conciliation_bank_statements', ids: rows.map((row) => row.id) });
    } catch (error) {
      conciliationSteps.push({ table: 'conciliation_bank_statements', skipped: error.message });
    }
  }

  try {
    const rows = await updateRowsWithFallback({
      table: 'card_receivables',
      patch: {
        status: 'reversed',
        reversal_reason: reason,
        reversed_at: now,
        updated_at: now,
      },
      filters: [
        ['eq', 'clinic_id', clinicId],
        ['eq', 'appointment_id', appointmentId],
      ],
      select: 'id',
    });
    conciliationSteps.push({ table: 'card_receivables', ids: rows.map((row) => row.id) });
  } catch (error) {
    if (!isMissingRelationError(error)) {
      conciliationSteps.push({ table: 'card_receivables', skipped: error.message });
    }
  }

  addStep(steps, 'card_conciliation', cardRows.length ? 'reversed_or_unlinked' : 'unlinked', {
    cardReceivableIds: cardRows.map((row) => row.id),
    linkedIds,
    details: conciliationSteps,
  });
}

async function cancelInvoicesAndGuides({ appointmentId, clinicId, reason, now, steps }) {
  const invoices = await updateRowsWithFallback({
    table: 'invoices',
    patch: {
      status: 'canceled',
      cancellation_reason: reason,
      canceled_at: now,
      updated_at: now,
    },
    filters: [
      ['eq', 'clinic_id', clinicId],
      ['eq', 'appointment_id', appointmentId],
    ],
    select: 'id, invoice_number',
  });
  addStep(steps, 'invoices', invoices.length ? 'canceled' : 'none', { ids: invoices.map((row) => row.id) });

  try {
    const guides = await updateRowsWithFallback({
      table: 'billing_guides',
      patch: {
        status: 'Cancelada',
        observacoes: `Estorno financeiro: ${reason}`,
        data_atualizacao: now,
        updated_at: now,
      },
      filters: [
        ['eq', 'clinic_id', clinicId],
        ['eq', 'appointment_id', appointmentId],
      ],
      select: 'id',
    });
    addStep(steps, 'billing_guides', guides.length ? 'canceled' : 'none', { ids: guides.map((row) => row.id) });
  } catch (error) {
    addStep(steps, 'billing_guides', 'skipped', { reason: error.message });
  }
}

async function registerAudit({ appointmentId, clinicId, patientId, reason, userId, amount, steps, now }) {
  const payload = {
    clinic_id: clinicId,
    appointment_id: appointmentId,
    patient_id: patientId || null,
    action: 'FINANCIAL_REVERSAL',
    amount: amount || 0,
    payment_method: 'ESTORNO',
    object_data: {
      reason,
      reversed_at: now,
      reversed_by: userId || null,
      steps,
    },
    performed_by: userId,
    performed_at: now,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };

  try {
    const { data, error } = await supabase.from('financial_audits').insert(payload).select('id').single();
    if (error) {
      throw error;
    }
    addStep(steps, 'financial_audits', 'created', { ids: [data.id] });
  } catch (error) {
    addStep(steps, 'financial_audits', 'skipped', { reason: error.message });
  }

  await logAppointmentFinancialAudit({
    appointmentId,
    financialEventType: FINANCIAL_EVENT_TYPES.FINANCIAL_REVERSAL,
    relatedEntity: RELATED_ENTITY_TYPES.APPOINTMENT,
    relatedEntityId: appointmentId,
    amount: amount || 0,
    status: 'reversed',
    context: {
      clinic_id: clinicId,
      reason,
      reversed_by: userId || null,
      reversed_at: now,
      steps,
    },
  });
}

export async function reverseAppointmentFinancialOperation({
  appointmentId,
  clinicId,
  reason,
  userId,
} = {}) {
  if (!appointmentId) {
    throw new Error('Atendimento obrigatorio');
  }
  if (!clinicId) {
    throw new Error('Clinica obrigatoria');
  }
  if (!String(reason || '').trim()) {
    throw new Error('Motivo do estorno obrigatorio');
  }
  if (!userId) {
    throw new Error('Usuario obrigatorio para rastreabilidade do estorno');
  }

  const now = new Date().toISOString();
  const steps = [];
  const trimmedReason = String(reason).trim();

  const appointmentRows = await listRows('appointments', [
    ['eq', 'id', appointmentId],
    ['eq', 'clinic_id', clinicId],
  ]);
  const appointment = appointmentRows[0] || null;
  const patientId = appointment?.patient_id || null;

  await markAppointmentReversed({ appointmentId, clinicId, reason: trimmedReason, userId, now, steps });
  const receivables = await reverseReceivables({ appointmentId, clinicId, reason: trimmedReason, userId, now, steps });
  const financialTransactions = await reverseFinancialTransactions({
    appointmentId,
    clinicId,
    receivables,
    reason: trimmedReason,
    userId,
    now,
    steps,
  });

  const reversalAmount = receivables.reduce((sum, row) => sum + getReceivableReversalAmount(row), 0);
  await reverseCashMovements({ clinicId, appointmentId, reason: trimmedReason, userId, amount: reversalAmount, now, steps });
  await reverseConciliationLinks({
    clinicId,
    appointmentId,
    receivables,
    financialTransactions,
    reason: trimmedReason,
    now,
    steps,
  });
  await cancelInvoicesAndGuides({ appointmentId, clinicId, reason: trimmedReason, now, steps });
  await registerAudit({ appointmentId, clinicId, patientId, reason: trimmedReason, userId, amount: reversalAmount, steps, now });

  return {
    success: true,
    appointmentId,
    clinicId,
    reversedAt: now,
    amount: reversalAmount,
    steps,
  };
}

export default {
  reverseAppointmentFinancialOperation,
};
