/**
 * ETAPA 2: Motor de Recebimento Automático
 * 
 * Responsabilidades:
 * 1. Criar recebíveis com parcelamento automático
 * 2. Gerenciar status completos (pending, partial, overdue, received, cancelled, refunded)
 * 3. Suportar recebimento parcial
 * 4. Suportar múltiplas formas pagamento
 * 5. Suportar split pagamento (PIX + Cartão)
 * 6. Calcular juros/multa/desconto automáticos
 * 7. Integrar com fluxo de caixa em realtime
 * 
 * Status Flow:
 * PENDING → PARTIAL → RECEIVED
 *    ↓        ↓          ↓
 *  OVERDUE  OVERDUE    -
 *    ↓        ↓
 *  (1 dia vencido)
 *    ↓
 *  (pode ser CANCELLED ou REFUNDED)
 */

import {
  createReceivable,
  getReceivableById,
  listReceivables,
  registerReceivablePayment as registerArInvoicePayment,
  updateReceivable,
} from '@/lib/receivablesApi';

// ============================================================================
// CONSTANTS
// ============================================================================

export const RECEIVABLE_STATUS = {
  PENDING: 'pending',           // Aguardando recebimento
  PARTIAL: 'partial',           // Parcialmente recebido
  OVERDUE: 'overdue',           // Vencido
  RECEIVED: 'received',         // Totalmente recebido
  CANCELLED: 'cancelled',       // Cancelado
  REFUNDED: 'refunded',         // Devolvido
};

export const PAYMENT_METHODS = {
  PIX: 'pix',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  MONEY: 'money',
  CHECK: 'check',
  TRANSFER: 'transfer',
  OTHER: 'other',
};

export const INSTALLMENT_OPTIONS = {
  1: { label: '1x', value: 1 },
  2: { label: '2x', value: 2 },
  3: { label: '3x', value: 3 },
  4: { label: '4x', value: 4 },
  6: { label: '6x', value: 6 },
  12: { label: '12x', value: 12 },
};

function statusForInvoice(status) {
  const map = {
    [RECEIVABLE_STATUS.PENDING]: 'open',
    [RECEIVABLE_STATUS.PARTIAL]: 'partial',
    [RECEIVABLE_STATUS.OVERDUE]: 'overdue',
    [RECEIVABLE_STATUS.RECEIVED]: 'received',
    [RECEIVABLE_STATUS.CANCELLED]: 'canceled',
    [RECEIVABLE_STATUS.REFUNDED]: 'reversed',
  };
  return map[status] || status;
}

function valueOfReceivable(row) {
  return Number(row?.net_value || row?.amount || row?.total_amount || 0);
}

function paidValueOfReceivable(row) {
  return Number(row?.received_value || row?.paid_total || row?.paid_amount || 0);
}

function balanceOfReceivable(row) {
  return Math.max(0, Number(row?.balance_amount ?? valueOfReceivable(row) - paidValueOfReceivable(row)));
}

function buildInstallmentView(rows) {
  const items = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  return items.map((row, index) => ({
    id: row.id,
    receivable_id: row.id,
    clinic_id: row.clinic_id,
    installment_number: index + 1,
    total_installments: items.length,
    amount: valueOfReceivable(row),
    paid_amount: paidValueOfReceivable(row),
    status: row.status,
    due_date: row.due_date,
  }));
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Create receivable with automatic installment plan
 * 
 * @param {Object} data
 * @returns {Promise<{success, receivableId, installments, error}>}
 */
export async function createReceivableWithInstallments(data) {
  try {
    const {
      clinicId,
      appointmentId,
      pacientName,
      payerType,        // 'insurance', 'particular', 'company', 'government'
      payerId,
      amount,
      installments = 1,  // Number of installments (1-12)
      dueDate,           // First due date (YYYY-MM-DD)
      description = '',
    } = data;

    // Validations
    if (!clinicId || !amount || amount <= 0) {
      return { success: false, error: 'Missing required fields or invalid amount' };
    }

    if (!Object.values(INSTALLMENT_OPTIONS).find(o => o.value === installments)) {
      return { success: false, error: `Invalid installments: ${installments}` };
    }

    const created = await createReceivable(clinicId, {
      appointment_id: appointmentId,
      patient_name: data.patientName || pacientName,
      payer_type: payerType,
      payer_id: payerId,
      amount,
      net_value: amount,
      due_date: dueDate,
      description,
      status: 'open',
      total_parcelas: installments,
      metadata: {
        created_from: 'appointment',
        creation_method: 'receivable_motor',
        source_table: 'ar_invoices',
      },
    });

    const rows = Array.isArray(created) ? created : [created];
    const createdInstallments = buildInstallmentView(rows);
    console.log('[createReceivableWithInstallments] Created in ar_invoices:', rows.map((row) => row.id));

    return {
      success: true,
      receivableId: rows[0]?.id,
      totalAmount: amount,
      installmentCount: installments,
      installments: createdInstallments,
      receivables: rows,
      source: 'ar_invoices',
    };
  } catch (err) {
    console.error('[createReceivableWithInstallments] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Register partial payment (can accept multiple payment methods)
 * 
 * @param {Object} data
 * @returns {Promise<{success, receivableId, newStatus, remainingAmount, error}>}
 */
export async function registerPartialPayment(data) {
  try {
    const {
      clinicId,
      receivableId,
      installmentId = null,
      paymentAmount,
      paymentMethod,
      paymentDate = new Date().toISOString().split('T')[0],
      notes = '',
      appliedInterest = 0,
      appliedFine = 0,
      appliedDiscount = 0,
    } = data;

    const updated = await registerArInvoicePayment({
      clinicId,
      receivableId,
      amount: paymentAmount,
      payments: [{ method: paymentMethod, amount: paymentAmount }],
      paymentDate,
      notes,
      createdBy: data.createdBy || 'receivable_motor',
    });

    const newPaidAmount = paidValueOfReceivable(updated);
    const newRemainingAmount = balanceOfReceivable(updated);
    const newStatus = updated.status;

    console.log('[registerPartialPayment] Payment registered:', {
      receivableId,
      paymentAmount,
      newStatus,
    });

    return {
      success: true,
      receivableId,
      paymentId: updated.metadata?.last_payment?.registered_at || null,
      newStatus,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      totalAmount: valueOfReceivable(updated),
      receivable: updated,
      source: 'ar_invoices',
    };
  } catch (err) {
    console.error('[registerPartialPayment] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Split payment (e.g., 60% PIX + 40% Credit Card)
 * 
 * @param {Object} data
 * @returns {Promise<{success, payments, error}>}
 */
export async function registerSplitPayment(data) {
  try {
    const {
      clinicId,
      receivableId,
      installmentId = null,
      totalAmount,
      splits, // [{method, amount, date}]
      notes = '',
    } = data;

    // Validations
    if (!Array.isArray(splits) || splits.length === 0) {
      return { success: false, error: 'At least one split required' };
    }

    const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitTotal - totalAmount) > 0.01) {
      return { success: false, error: `Split total (${splitTotal}) != totalAmount (${totalAmount})` };
    }

    const paymentDate = splits[0]?.date || new Date().toISOString().split('T')[0];
    const updated = await registerArInvoicePayment({
      clinicId,
      receivableId,
      payments: splits.map((split) => ({
        method: split.method,
        amount: split.amount,
        reference: split.reference,
      })),
      paymentDate,
      notes,
      createdBy: data.createdBy || 'receivable_motor',
    });

    return {
      success: true,
      payments: updated.payment_split || [],
      receivable: updated,
      source: 'ar_invoices',
    };
  } catch (err) {
    console.error('[registerSplitPayment] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Calculate interest/fine/discount for overdue receivables
 * 
 * @param {Object} data
 * @returns {Promise<{interest, fine, discount, total}>}
 */
export async function calculateCharges(data) {
  try {
    const {
      principalAmount,
      daysOverdue = 0,
      interestRatePerDay = 0.001,  // 0.1% per day
      finePercentage = 0.02,       // 2% fine
      discountPercentage = 0,      // 0% discount
    } = data;

    const interest = daysOverdue > 0 
      ? principalAmount * interestRatePerDay * daysOverdue 
      : 0;

    const fine = daysOverdue > 0 
      ? principalAmount * finePercentage 
      : 0;

    const discount = principalAmount * discountPercentage;

    const total = principalAmount + interest + fine - discount;

    return {
      principal: principalAmount,
      interest: parseFloat(interest.toFixed(2)),
      fine: parseFloat(fine.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      daysOverdue,
    };
  } catch (err) {
    console.error('[calculateCharges] Error:', err);
    throw err;
  }
}

/**
 * List receivables with filters
 * 
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
export async function listReceivablesWithFilters(filters) {
  try {
    const {
      clinicId,
      status = null,        // 'pending', 'partial', 'overdue', etc
      payerType = null,     // 'insurance', 'particular', etc
      dateFrom = null,
      dateTo = null,
      search = null,
      limit = 50,
      offset = 0,
    } = filters;

    return await listReceivables({
      clinicId,
      status: status ? statusForInvoice(status) : null,
      payerType,
      dueStart: dateFrom,
      dueEnd: dateTo,
      search,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[listReceivablesWithFilters] Error:', err);
    throw err;
  }
}

/**
 * Get receivable summary for dashboard
 * 
 * @param {string} clinicId
 * @returns {Promise<{totalPending, totalPartial, totalOverdue, etc}>}
 */
export async function getReceivableSummary(clinicId) {
  try {
    const now = new Date().toISOString().split('T')[0];

    const [pendingRows, partialRows, overdueRows] = await Promise.all([
      listReceivables({ clinicId, statusList: ['open', 'pending'], dueStart: now, limit: 1000 }),
      listReceivables({ clinicId, statusList: ['partial'], dueStart: now, limit: 1000 }),
      listReceivables({ clinicId, statusList: ['overdue'], limit: 1000 }),
    ]);

    const amountData = [
      { status: RECEIVABLE_STATUS.PENDING, total: pendingRows.reduce((sum, row) => sum + balanceOfReceivable(row), 0) },
      { status: RECEIVABLE_STATUS.PARTIAL, total: partialRows.reduce((sum, row) => sum + balanceOfReceivable(row), 0) },
      { status: RECEIVABLE_STATUS.OVERDUE, total: overdueRows.reduce((sum, row) => sum + balanceOfReceivable(row), 0) },
    ];

    return {
      pending: { count: pendingRows.length },
      partial: { count: partialRows.length },
      overdue: { count: overdueRows.length },
      amountByStatus: amountData,
      source: 'ar_invoices',
    };
  } catch (err) {
    console.error('[getReceivableSummary] Error:', err);
    return { error: err.message };
  }
}

/**
 * Auto-mark overdue receivables
 * Should be called periodically (e.g., daily cron job)
 * 
 * @param {string} clinicId
 * @returns {Promise<{updated}>}
 */
export async function markOverdueReceivables(clinicId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const rows = await listReceivables({
      clinicId,
      statusList: ['open', 'pending', 'partial'],
      dueEnd: today,
      limit: 1000,
    });

    const overdueRows = rows.filter((row) => row.due_date && String(row.due_date).split('T')[0] < today);
    await Promise.all(overdueRows.map((row) => updateReceivable(row.id, { status: 'overdue' })));

    console.log('[markOverdueReceivables] Marked', overdueRows.length, 'as overdue in ar_invoices');

    return { success: true, updated: overdueRows.length, source: 'ar_invoices' };
  } catch (err) {
    console.error('[markOverdueReceivables] Error:', err);
    return { success: false, error: err.message };
  }
}

export default {
  RECEIVABLE_STATUS,
  PAYMENT_METHODS,
  INSTALLMENT_OPTIONS,
  createReceivableWithInstallments,
  registerPartialPayment,
  registerSplitPayment,
  calculateCharges,
  listReceivablesWithFilters,
  getReceivableSummary,
  markOverdueReceivables,
};
