/**
 * 💰 Payables API Service
 * Complete CRUD operations for Contas a Pagar
 */

import { supabase } from '@/lib/customSupabaseClient';
import {
  Payable,
  PayableCreateInput,
  PayableUpdateInput,
  PayableFilterParams,
  PayablesPageResponse,
  PayableRecurringConfig,
  PayableAttachment,
  PayableAudit,
  PayablesSummary,
  PayableStatus,
  PayableType,
  PaymentMethodType,
} from '../types';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Normalize status from various formats to enum
 */
function normalizePayableStatus(status: string): PayableStatus {
  const statusMap: Record<string, PayableStatus> = {
    'open': PayableStatus.OPEN,
    'aberto': PayableStatus.OPEN,
    'pending': PayableStatus.OPEN,
    'overdue': PayableStatus.OVERDUE,
    'vencido': PayableStatus.OVERDUE,
    'partial': PayableStatus.PARTIAL,
    'parcial': PayableStatus.PARTIAL,
    'paid': PayableStatus.PAID,
    'pago': PayableStatus.PAID,
    'canceled': PayableStatus.CANCELED,
    'cancelado': PayableStatus.CANCELED,
    'negotiated': PayableStatus.NEGOTIATED,
    'negociado': PayableStatus.NEGOTIATED,
  };
  
  return statusMap[status?.toLowerCase() || ''] || PayableStatus.OPEN;
}

/**
 * Transform database record to typed Payable
 */
function transformPayable(data: any): Payable {
  return {
    ...data,
    status: normalizePayableStatus(data.status),
    type: data.type as PayableType,
    payment_method: data.payment_method as PaymentMethodType,
  };
}

// ============================================================
// MAIN CRUD OPERATIONS
// ============================================================

/**
 * List all payables with advanced filtering
 */
export async function listPayables(
  params: PayableFilterParams
): Promise<PayablesPageResponse> {
  try {
    let query = supabase
      .from('ap_bills')
      .select('*', { count: 'exact' })
      .eq('clinic_id', params.clinic_id);

    // Status filter
    if (params.status && params.status.length > 0) {
      query = query.in('status', params.status);
    }

    // Type filter
    if (params.type && params.type.length > 0) {
      query = query.in('type', params.type);
    }

    // Supplier filter
    if (params.supplier_id) {
      query = query.eq('supplier_id', params.supplier_id);
    }
    if (params.supplier_name) {
      query = query.ilike('supplier_name', `%${params.supplier_name}%`);
    }

    // Chart account filter
    if (params.chart_account_id) {
      query = query.eq('chart_account_id', params.chart_account_id);
    }

    // Cost center filter
    if (params.cost_center_id) {
      query = query.eq('cost_center_id', params.cost_center_id);
    }

    // Date range filters
    if (params.due_date_start) {
      query = query.gte('due_date', params.due_date_start);
    }
    if (params.due_date_end) {
      query = query.lte('due_date', params.due_date_end);
    }

    if (params.payment_date_start) {
      query = query.gte('payment_date', params.payment_date_start);
    }
    if (params.payment_date_end) {
      query = query.lte('payment_date', params.payment_date_end);
    }

    // Amount filters
    if (params.amount_min !== undefined) {
      query = query.gte('net_amount', params.amount_min);
    }
    if (params.amount_max !== undefined) {
      query = query.lte('net_amount', params.amount_max);
    }

    // Search filter
    if (params.search) {
      query = query.or(
        `description.ilike.%${params.search}%,supplier_name.ilike.%${params.search}%,document_number.ilike.%${params.search}%`
      );
    }

    // Recurring filter
    if (params.is_recurring !== undefined) {
      query = query.eq('is_recurring', params.is_recurring);
    }

    // Overdue filter
    if (params.is_overdue !== undefined) {
      if (params.is_overdue) {
        query = query.lt('due_date', new Date().toISOString().split('T')[0])
          .neq('status', 'PAID');
      }
    }

    // Exclude canceled
    query = query.neq('status', 'CANCELED');

    // Pagination
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Ordering
    const orderBy = params.order_by || 'due_date.asc';
    query = query.order(...orderBy.split('.'));

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      payables: (data || []).map(transformPayable),
      total: count || 0,
      has_more: (count || 0) > offset + limit,
    };
  } catch (error) {
    console.error('Error listing payables:', error);
    throw error;
  }
}

/**
 * Get single payable by ID
 */
export async function getPayable(id: string): Promise<Payable | null> {
  try {
    const { data, error } = await supabase
      .from('ap_bills')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? transformPayable(data) : null;
  } catch (error) {
    console.error('Error getting payable:', error);
    throw error;
  }
}

/**
 * Create new payable
 */
export async function createPayable(
  clinicId: string,
  input: PayableCreateInput
): Promise<Payable> {
  try {
    const { data, error } = await supabase
      .from('ap_bills')
      .insert({
        clinic_id: clinicId,
        supplier_name: input.supplier_name,
        supplier_id: input.supplier_id || null,
        document_number: input.document_number || null,
        invoice_number: input.invoice_number || null,
        invoice_series: input.invoice_series || null,
        description: input.description,
        observations: input.observations || null,
        type: input.type || 'SUPPLIER',
        category: input.category || null,
        issue_date: input.issue_date || null,
        competency_date: input.competency_date || null,
        due_date: input.due_date,
        amount: input.amount,
        interest_amount: input.interest_amount || 0,
        fine_amount: input.fine_amount || 0,
        discount_amount: input.discount_amount || 0,
        payment_method: input.payment_method || null,
        payment_bank: input.payment_bank || null,
        chart_account_id: input.chart_account_id || null,
        cost_center_id: input.cost_center_id || null,
        is_recurring: input.is_recurring || false,
        recurrence_type: input.recurrence_type || null,
        recurrence_interval: input.recurrence_interval || 1,
        recurrence_end_date: input.recurrence_end_date || null,
        installments: input.installments || 1,
        installment_number: 1,
        has_invoice: input.has_invoice || false,
        invoice_xml_url: input.invoice_xml_url || null,
        invoice_pdf_url: input.invoice_pdf_url || null,
        is_forecast: input.is_forecast || false,
        is_manual: input.is_manual !== false,
        metadata: input.metadata || {},
        status: 'OPEN',
        paid_value: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return transformPayable(data);
  } catch (error) {
    console.error('Error creating payable:', error);
    throw error;
  }
}

/**
 * Update payable
 */
export async function updatePayable(
  input: PayableUpdateInput
): Promise<Payable> {
  try {
    const { id, ...updateData } = input;

    // Normalize status if provided
    if (updateData.status) {
      (updateData as any).status = normalizePayableStatus(updateData.status);
    }

    const { data, error } = await supabase
      .from('ap_bills')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformPayable(data);
  } catch (error) {
    console.error('Error updating payable:', error);
    throw error;
  }
}

/**
 * Delete payable
 */
export async function deletePayable(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ap_bills')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting payable:', error);
    throw error;
  }
}

// ============================================================
// PAYMENT OPERATIONS
// ============================================================

/**
 * Mark payable as paid (full or partial)
 */
export async function payPayable(
  id: string,
  paidValue: number,
  paymentMethod: PaymentMethodType,
  paidBy: string,
  paymentDate?: string
): Promise<Payable> {
  try {
    const payable = await getPayable(id);
    if (!payable) throw new Error('Payable not found');

    const totalPaid = payable.paid_value + paidValue;
    const newStatus =
      totalPaid >= payable.net_amount ? 'PAID' : 'PARTIAL';

    const { data, error } = await supabase
      .from('ap_bills')
      .update({
        paid_value: totalPaid,
        status: newStatus,
        payment_method: paymentMethod,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        paid_by: paidBy,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformPayable(data);
  } catch (error) {
    console.error('Error paying payable:', error);
    throw error;
  }
}

/**
 * Cancel payable
 */
export async function cancelPayable(id: string): Promise<Payable> {
  try {
    const { data, error } = await supabase
      .from('ap_bills')
      .update({
        status: 'CANCELED',
        paid_value: 0,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformPayable(data);
  } catch (error) {
    console.error('Error canceling payable:', error);
    throw error;
  }
}

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * Bulk update multiple payables
 */
export async function bulkUpdatePayables(
  ids: string[],
  updateData: Partial<PayableUpdateInput>
): Promise<Payable[]> {
  try {
    const { data, error } = await supabase
      .from('ap_bills')
      .update(updateData)
      .in('id', ids)
      .select();

    if (error) throw error;
    return (data || []).map(transformPayable);
  } catch (error) {
    console.error('Error bulk updating payables:', error);
    throw error;
  }
}

/**
 * Bulk delete payables
 */
export async function bulkDeletePayables(ids: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('ap_bills')
      .delete()
      .in('id', ids);

    if (error) throw error;
  } catch (error) {
    console.error('Error bulk deleting payables:', error);
    throw error;
  }
}

// ============================================================
// RECURRING PAYABLES
// ============================================================

/**
 * Create recurring config
 */
export async function createRecurringConfig(
  clinicId: string,
  config: Omit<PayableRecurringConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<PayableRecurringConfig> {
  try {
    const { data, error } = await supabase
      .from('payable_recurring_configs')
      .insert({
        clinic_id: clinicId,
        ...config,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating recurring config:', error);
    throw error;
  }
}

/**
 * List recurring configs
 */
export async function listRecurringConfigs(
  clinicId: string
): Promise<PayableRecurringConfig[]> {
  try {
    const { data, error } = await supabase
      .from('payable_recurring_configs')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error listing recurring configs:', error);
    throw error;
  }
}

// ============================================================
// ATTACHMENTS
// ============================================================

/**
 * Add attachment to payable
 */
export async function addPayableAttachment(
  clinicId: string,
  apBillId: string,
  attachment: Omit<PayableAttachment, 'id' | 'clinic_id' | 'ap_bill_id' | 'created_at'>
): Promise<PayableAttachment> {
  try {
    const { data, error } = await supabase
      .from('payable_attachments')
      .insert({
        clinic_id: clinicId,
        ap_bill_id: apBillId,
        ...attachment,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding attachment:', error);
    throw error;
  }
}

/**
 * List payable attachments
 */
export async function listPayableAttachments(
  apBillId: string
): Promise<PayableAttachment[]> {
  try {
    const { data, error } = await supabase
      .from('payable_attachments')
      .select('*')
      .eq('ap_bill_id', apBillId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error listing attachments:', error);
    throw error;
  }
}

/**
 * Delete attachment
 */
export async function deletePayableAttachment(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('payable_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting attachment:', error);
    throw error;
  }
}

// ============================================================
// AUDIT LOG
// ============================================================

/**
 * Get audit trail for payable
 */
export async function getPayableAudit(apBillId: string): Promise<PayableAudit[]> {
  try {
    const { data, error } = await supabase
      .from('payables_audit')
      .select('*')
      .eq('ap_bill_id', apBillId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting audit:', error);
    throw error;
  }
}

// ============================================================
// DASHBOARD/SUMMARY
// ============================================================

/**
 * Get payables summary for dashboard
 */
export async function getPayablesSummary(
  clinicId: string
): Promise<PayablesSummary | null> {
  try {
    const { data, error } = await supabase
      .from('payables_summary')
      .select('*')
      .eq('clinic_id', clinicId)
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting payables summary:', error);
    throw error;
  }
}

/**
 * Get overdue payables count
 */
export async function getOverdueCount(clinicId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('ap_bills')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('status', 'OVERDUE');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting overdue count:', error);
    return 0;
  }
}

export default {
  listPayables,
  getPayable,
  createPayable,
  updatePayable,
  deletePayable,
  payPayable,
  cancelPayable,
  bulkUpdatePayables,
  bulkDeletePayables,
  createRecurringConfig,
  listRecurringConfigs,
  addPayableAttachment,
  listPayableAttachments,
  deletePayableAttachment,
  getPayableAudit,
  getPayablesSummary,
  getOverdueCount,
};
