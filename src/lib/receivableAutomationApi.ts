/**
 * Receivable Automation Service - ETAPA 2
 * 
 * Handles automatic receivable generation with installments, payment methods,
 * status tracking, aging analysis, and cash flow integration.
 */

import { customSupabaseClient } from '@/lib/customSupabaseClient';
import { registerReceivablePayment as registerArInvoicePayment } from '@/lib/receivablesApi';
import { Database } from '@/types/database.types';

// Types
export type ReceivableInstallment = Record<string, any>;
export type ReceivablePayment = Database['public']['Tables']['receivable_payments']['Row'];
export type ReceivableReconciliation = Database['public']['Tables']['receivable_reconciliation']['Row'];

interface SplitReceivableRequest {
  receivableId: string | number;
  clinicId: string;
  numInstallments: number;
  firstDueDate?: string;
}

interface RegisterPaymentRequest {
  receivableId: string | number;
  clinicId: string;
  amountPaid: number;
  paymentMethod: string;
  paymentReference?: string;
  createdBy?: string;
}

interface AgingBucket {
  aging_bucket: string;
  count_receivables: number;
  total_amount: number;
  average_days_overdue: number;
}

function mapArInvoiceToInstallment(invoice: Record<string, any>): ReceivableInstallment {
  const amount = Number(invoice.net_value ?? invoice.amount ?? 0);
  const paid = Number(invoice.paid_total ?? invoice.received_value ?? 0);
  return {
    id: invoice.id,
    receivable_id: invoice.id,
    ar_invoice_id: invoice.id,
    clinic_id: invoice.clinic_id,
    installment_number: 1,
    value_gross: Number(invoice.gross_amount ?? invoice.amount ?? 0),
    value_net: Math.max(0, amount - paid),
    amount,
    amount_paid: paid,
    due_date: invoice.due_date,
    status: invoice.status,
    description: invoice.description || invoice.service_description || invoice.patient_name,
    patient_name: invoice.patient_name,
    created_at: invoice.created_at,
    updated_at: invoice.updated_at,
  };
}

function getAgingBucket(daysOverdue: number): string {
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

/**
 * Split receivable into installments
 */
export async function splitReceivableIntoInstallments(
  request: SplitReceivableRequest
): Promise<any> {
  try {
    const patch: Record<string, any> = {
      total_parcelas: request.numInstallments,
    };

    if (request.firstDueDate) {
      patch.due_date = request.firstDueDate;
    }

    const { data, error } = await customSupabaseClient
      .from('ar_invoices')
      .update(patch)
      .eq('id', request.receivableId)
      .eq('clinic_id', request.clinicId)
      .select()
      .single();

    if (error) throw error;
    return {
      success: true,
      source: 'ar_invoices',
      receivable_id: request.receivableId,
      installments_count: request.numInstallments,
      receivable: data,
    };
  } catch (err) {
    console.error('[splitReceivableIntoInstallments] Error:', err);
    throw err;
  }
}

/**
 * Register receivable payment
 */
export async function registerReceivablePayment(
  request: RegisterPaymentRequest
): Promise<any> {
  try {
    return registerArInvoicePayment({
      clinicId: request.clinicId,
      receivableId: request.receivableId,
      amount: request.amountPaid,
      payments: [{
        method: request.paymentMethod,
        amount: request.amountPaid,
        reference: request.paymentReference || null,
      }],
      createdBy: request.createdBy || 'system',
    });
  } catch (err) {
    console.error('[registerReceivablePayment] Error:', err);
    throw err;
  }
}

/**
 * Get receivable installments
 */
export async function getReceivableInstallments(
  receivableId: string | number,
  clinicId?: string
): Promise<ReceivableInstallment[]> {
  try {
    let query = customSupabaseClient
      .from('ar_invoices')
      .select('*')
      .eq('id', receivableId);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapArInvoiceToInstallment);
  } catch (err) {
    console.error('[getReceivableInstallments] Error:', err);
    throw err;
  }
}

/**
 * Get installment details
 */
export async function getInstallmentDetails(
  installmentId: string | number
): Promise<ReceivableInstallment | null> {
  try {
    const { data, error } = await customSupabaseClient
      .from('ar_invoices')
      .select('*')
      .eq('id', installmentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapArInvoiceToInstallment(data as Record<string, any>) : null;
  } catch (err) {
    console.error('[getInstallmentDetails] Error:', err);
    throw err;
  }
}

/**
 * Get receivable payments
 */
export async function getReceivablePayments(
  receivableId: string | number,
  clinicId?: string
): Promise<ReceivablePayment[]> {
  try {
    let query = customSupabaseClient
      .from('receivable_payments')
      .select('*')
      .eq('ar_invoice_id', receivableId);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query.order('payment_date', {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getReceivablePayments] Error:', err);
    throw err;
  }
}

/**
 * Get payment history for period
 */
export async function getPaymentHistory(
  clinicId: string,
  fromDate?: string,
  toDate?: string,
  paymentMethod?: string
): Promise<ReceivablePayment[]> {
  try {
    let query = customSupabaseClient
      .from('receivable_payments')
      .select('*')
      .eq('clinic_id', clinicId);

    if (fromDate) {
      query = query.gte('payment_date', fromDate);
    }
    if (toDate) {
      query = query.lte('payment_date', toDate);
    }
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }

    const { data, error } = await query.order('payment_date', {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getPaymentHistory] Error:', err);
    throw err;
  }
}

/**
 * Get receivables aging report
 */
export async function getReceivablesAging(
  clinicId: string
): Promise<AgingBucket[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('ar_invoices')
      .select('id, due_date, amount, net_value, paid_total, received_value, status')
      .eq('clinic_id', clinicId)
      .in('status', ['open', 'planned', 'partial', 'overdue', 'pending', 'billed'])
      .lt('due_date', new Date().toISOString().split('T')[0]);

    if (error) throw error;
    const today = new Date();
    const grouped = new Map<string, { count: number; total: number; days: number }>();

    (data || []).forEach((receivable) => {
      if (!receivable.due_date) return;
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - new Date(receivable.due_date).getTime()) / 86400000));
      const bucket = getAgingBucket(daysOverdue);
      const amount = Math.max(
        0,
        Number(receivable.net_value ?? receivable.amount ?? 0) - Number(receivable.paid_total ?? receivable.received_value ?? 0),
      );
      const current = grouped.get(bucket) || { count: 0, total: 0, days: 0 };
      grouped.set(bucket, {
        count: current.count + 1,
        total: current.total + amount,
        days: current.days + daysOverdue,
      });
    });

    return Array.from(grouped.entries()).map(([aging_bucket, values]) => ({
      aging_bucket,
      count_receivables: values.count,
      total_amount: values.total,
      average_days_overdue: values.count > 0 ? values.days / values.count : 0,
    }));
  } catch (err) {
    console.error('[getReceivablesAging] Error:', err);
    throw err;
  }
}

/**
 * Get overdue receivables
 */
export async function getOverdueReceivables(
  clinicId: string
): Promise<ReceivableInstallment[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('ar_invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .in('status', ['open', 'planned', 'partial', 'overdue', 'pending', 'billed'])
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapArInvoiceToInstallment);
  } catch (err) {
    console.error('[getOverdueReceivables] Error:', err);
    throw err;
  }
}

/**
 * Get pending payments
 */
export async function getPendingPayments(
  clinicId: string
): Promise<ReceivableInstallment[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('ar_invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .in('status', ['open', 'planned', 'pending', 'billed'])
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapArInvoiceToInstallment);
  } catch (err) {
    console.error('[getPendingPayments] Error:', err);
    throw err;
  }
}

/**
 * Get partially paid receivables
 */
export async function getPartiallyPaidReceivables(
  clinicId: string
): Promise<{
  installments: ReceivableInstallment[];
  totalPending: number;
}> {
  try {
    const { data: installments, error } = await customSupabaseClient
      .from('ar_invoices')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'partial')
      .order('due_date', { ascending: true });

    if (error) throw error;

    const totalPending = (installments || []).reduce(
      (acc, receivable) => acc + Math.max(
        0,
        Number(receivable.net_value ?? receivable.amount ?? 0) - Number(receivable.paid_total ?? receivable.received_value ?? 0),
      ),
      0
    );

    return {
      installments: (installments || []).map(mapArInvoiceToInstallment),
      totalPending,
    };
  } catch (err) {
    console.error('[getPartiallyPaidReceivables] Error:', err);
    throw err;
  }
}

/**
 * Get payment statistics for period
 */
export async function getPaymentStats(
  clinicId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  total_payments: number;
  total_amount: number;
  average_payment: number;
  by_method: Record<string, number>;
  by_status: Record<string, number>;
}> {
  try {
    let query = customSupabaseClient
      .from('receivable_payments')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId);

    if (fromDate) {
      query = query.gte('payment_date', fromDate);
    }
    if (toDate) {
      query = query.lte('payment_date', toDate);
    }

    const { data: payments, count, error } = await query;

    if (error) throw error;

    const totalAmount = (payments || []).reduce(
      (acc, p) => acc + (p.amount_paid || 0),
      0
    );

    const byMethod = (payments || []).reduce(
      (acc, p) => ({
        ...acc,
        [p.payment_method]: (acc[p.payment_method] || 0) + (p.amount_paid || 0),
      }),
      {} as Record<string, number>
    );

    const byStatus = (payments || []).reduce(
      (acc, p) => ({
        ...acc,
        [p.status]: (acc[p.status] || 0) + 1,
      }),
      {} as Record<string, number>
    );

    return {
      total_payments: count || 0,
      total_amount: totalAmount,
      average_payment: (count || 0) > 0 ? totalAmount / (count || 1) : 0,
      by_method: byMethod,
      by_status: byStatus,
    };
  } catch (err) {
    console.error('[getPaymentStats] Error:', err);
    throw err;
  }
}

/**
 * Refund payment
 */
export async function refundPayment(
  paymentId: number,
  clinicId: string,
  refundAmount?: number
): Promise<any> {
  try {
    // Get payment details
    const { data: payment, error: fetchError } = await customSupabaseClient
      .from('receivable_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('clinic_id', clinicId)
      .single();

    if (fetchError) throw fetchError;

    const amount = refundAmount || payment.amount_paid;

    // Mark payment as refunded
    const { error: updateError } = await customSupabaseClient
      .from('receivable_payments')
      .update({ status: 'refunded' })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    // Create cash flow movement for refund (saída)
    await customSupabaseClient.from('fluxo_caixa_movimentos').insert({
      clinic_id: clinicId,
      date: new Date().toISOString().split('T')[0],
      type: 'saida',
      amount: amount,
      description: `Reembolso de pagamento #${paymentId}`,
      category: 'reembolso',
      reference_type: 'payment_refund',
      status: 'paid',
    });

    return { success: true, payment_id: paymentId };
  } catch (err) {
    console.error('[refundPayment] Error:', err);
    throw err;
  }
}

/**
 * Update installment status manually
 */
export async function updateInstallmentStatus(
  installmentId: string | number,
  newStatus: string
): Promise<ReceivableInstallment> {
  try {
    const { data, error } = await customSupabaseClient
      .from('ar_invoices')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', installmentId)
      .select()
      .single();

    if (error) throw error;
    return mapArInvoiceToInstallment(data as Record<string, any>);
  } catch (err) {
    console.error('[updateInstallmentStatus] Error:', err);
    throw err;
  }
}

/**
 * Get reconciliation records
 */
export async function getReconciliationRecords(
  clinicId: string,
  reconciled?: boolean
): Promise<ReceivableReconciliation[]> {
  try {
    let query = customSupabaseClient
      .from('receivable_reconciliation')
      .select('*')
      .eq('clinic_id', clinicId);

    if (reconciled !== undefined) {
      query = query.eq('reconciled', reconciled);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getReconciliationRecords] Error:', err);
    throw err;
  }
}

/**
 * Get pending reconciliations
 */
export async function getPendingReconciliations(
  clinicId: string
): Promise<ReceivableReconciliation[]> {
  try {
    const { data, error } = await customSupabaseClient
      .from('receivable_reconciliation')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('reconciled', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[getPendingReconciliations] Error:', err);
    throw err;
  }
}

export default {
  splitReceivableIntoInstallments,
  registerReceivablePayment,
  getReceivableInstallments,
  getInstallmentDetails,
  getReceivablePayments,
  getPaymentHistory,
  getReceivablesAging,
  getOverdueReceivables,
  getPendingPayments,
  getPartiallyPaidReceivables,
  getPaymentStats,
  refundPayment,
  updateInstallmentStatus,
  getReconciliationRecords,
  getPendingReconciliations,
};
