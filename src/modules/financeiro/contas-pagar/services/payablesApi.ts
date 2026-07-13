/**
 * 💰 Payables API Service
 * Complete CRUD operations for Contas a Pagar
 */

import { supabase } from '@/lib/customSupabaseClient';
import { stockMovementsApi } from '@/lib/stockApi';
import { listAP, syncAPFinancialTransactions } from '@/lib/financeApi';
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
  ApprovalStage,
  PayableApprovalAction,
  PayableReconciliationSummary,
  PayableReconciliationMatch,
} from '../types';

function invalidateFinanceCaches(clinicId?: string | null) {
  if (!clinicId) return;
  import('@/services/dashboardDataService')
    .then(({ invalidateDashboardDataCache }) => invalidateDashboardDataCache(clinicId))
    .catch(() => {});
}

function isOptionalSchemaError(error: any): boolean {
  const text = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01'
    || error?.code === '42703'
    || text.includes('does not exist')
    || text.includes('could not find');
}

async function ignoreOptionalDelete(promise: PromiseLike<{ error: any }>) {
  const { error } = await promise;
  if (error && !isOptionalSchemaError(error)) throw error;
}

async function ignoreOptionalUpdate(promise: PromiseLike<{ error: any }>) {
  const { error } = await promise;
  if (error && !isOptionalSchemaError(error)) throw error;
}

function getMissingColumnFromSchemaError(error: any): string | null {
  if (!isOptionalSchemaError(error)) return null;
  const text = String(error?.message || error?.details || '');
  return text.match(/'([^']+)' column/i)?.[1]
    || text.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i)?.[1]
    || null;
}

async function updateApBillWithSchemaFallback(id: string, updateData: Record<string, any>) {
  const payload = { ...updateData };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from('ap_bills')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error) return data;

    const missingColumn = getMissingColumnFromSchemaError(error);
    if (!missingColumn || !(missingColumn in payload)) {
      throw error;
    }

    delete payload[missingColumn];
  }

  throw new Error('Nao foi possivel atualizar a conta a pagar: muitas colunas opcionais ausentes no schema.');
}

async function insertApBillsWithSchemaFallback(rows: Array<Record<string, any>>) {
  let payload = rows.map((row) => ({ ...row }));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from('ap_bills')
      .insert(payload)
      .select()
      .order('installment_number', { ascending: true });

    if (!error) return data;

    const missingColumn = getMissingColumnFromSchemaError(error);
    if (!missingColumn || !payload.some((row) => missingColumn in row)) {
      throw error;
    }

    payload = payload.map((row) => {
      const next = { ...row };
      delete next[missingColumn];
      return next;
    });
  }

  throw new Error('Nao foi possivel criar a conta a pagar: muitas colunas opcionais ausentes no schema.');
}

async function cleanupPayableDependencies(ids: string[]) {
  const payableIds = ids.filter(Boolean);
  if (!payableIds.length) return;

  await ignoreOptionalDelete(
    supabase
      .from('financial_transactions')
      .delete()
      .in('origin_module', ['accounts_payable', 'contas_pagar', 'ap_bills'])
      .in('origin_id', payableIds)
  );

  await ignoreOptionalDelete(
    supabase
      .from('payable_attachments')
      .delete()
      .in('ap_bill_id', payableIds)
  );

  await ignoreOptionalDelete(
    supabase
      .from('ap_items')
      .delete()
      .in('ap_bill_id', payableIds)
  );

  await ignoreOptionalDelete(
    supabase
      .from('ap_items')
      .delete()
      .in('bill_id', payableIds)
  );

  await ignoreOptionalUpdate(
    supabase
      .from('payable_recurring_configs')
      .update({ template_ap_bill_id: null, is_active: false })
      .in('template_ap_bill_id', payableIds)
  );

  await ignoreOptionalUpdate(
    supabase
      .from('ap_bills')
      .update({ parent_payable_id: null })
      .in('parent_payable_id', payableIds)
  );

  await ignoreOptionalUpdate(
    supabase
      .from('ap_bills')
      .update({ parent_installment_id: null })
      .in('parent_installment_id', payableIds)
  );
}

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
    'approving': PayableStatus.APPROVING,
    'aprovando': PayableStatus.APPROVING,
    'approved': PayableStatus.APPROVED,
    'aprovado': PayableStatus.APPROVED,
    'overdue': PayableStatus.OVERDUE,
    'vencido': PayableStatus.OVERDUE,
    'partial': PayableStatus.PARTIAL,
    'parcial': PayableStatus.PARTIAL,
    'paid': PayableStatus.PAID,
    'pago': PayableStatus.PAID,
    'blocked': PayableStatus.BLOCKED,
    'bloqueado': PayableStatus.BLOCKED,
    'canceled': PayableStatus.CANCELED,
    'cancelado': PayableStatus.CANCELED,
    'negotiated': PayableStatus.NEGOTIATED,
    'negociado': PayableStatus.NEGOTIATED,
    'reversed': PayableStatus.REVERSED,
    'estornado': PayableStatus.REVERSED,
  };

  return statusMap[status?.toLowerCase() || ''] || PayableStatus.OPEN;
}

function getStatusQueryVariants(status: PayableStatus): string[] {
  const variants: Record<PayableStatus, string[]> = {
    [PayableStatus.OPEN]: ['OPEN', 'open', 'aberto', 'PENDING', 'pending'],
    [PayableStatus.APPROVING]: ['APPROVING', 'approving', 'aprovando'],
    [PayableStatus.APPROVED]: ['APPROVED', 'approved', 'aprovado'],
    [PayableStatus.OVERDUE]: ['OVERDUE', 'overdue', 'vencido'],
    [PayableStatus.PARTIAL]: ['PARTIAL', 'partial', 'parcial'],
    [PayableStatus.PAID]: ['PAID', 'paid', 'pago'],
    [PayableStatus.BLOCKED]: ['BLOCKED', 'blocked', 'bloqueado'],
    [PayableStatus.CANCELED]: ['CANCELED', 'canceled', 'cancelado'],
    [PayableStatus.NEGOTIATED]: ['NEGOTIATED', 'negotiated', 'negociado'],
    [PayableStatus.REVERSED]: ['REVERSED', 'reversed', 'estornado'],
  };

  return variants[status] || [status];
}

function expandStatusFilter(statuses?: PayableStatus[]): string[] {
  if (!statuses?.length) return [];
  return Array.from(new Set(statuses.flatMap((status) => getStatusQueryVariants(status))));
}

function isUuid(value?: string | null): boolean {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function addMonths(dateString: string, months: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

function createClientId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stripInstallmentSuffix(description?: string | null): string {
  return String(description || 'Conta a pagar').replace(/\s+-\s+Parcela\s+\d+\/\d+$/i, '');
}

function buildInstallmentMetadata(payable: any, installmentGroupId: string, installmentNumber: number, installmentTotal: number) {
  const metadata = payable.metadata || {};
  return {
    ...metadata,
    enterprise: {
      ...(metadata.enterprise || {}),
      installment_group_id: installmentGroupId,
      installment_number: installmentNumber,
      installment_total: installmentTotal,
    },
  };
}

async function syncEditedPayableInstallments(updatedPayable: any, input: PayableUpdateInput): Promise<Payable> {
  const desiredInstallments = Math.max(1, Number(input.installments || updatedPayable.installments || 1));
  if (desiredInstallments <= 1) return transformPayable(updatedPayable);

  const { data: rows, error: rowsError } = await supabase
    .from('ap_bills')
    .select('*')
    .or(`id.eq.${updatedPayable.id},parent_payable_id.eq.${updatedPayable.id},parent_installment_id.eq.${updatedPayable.id}`)
    .order('installment_number', { ascending: true });

  if (rowsError) throw rowsError;

  const installmentRows = rows || [];
  const hasCompleteGroup = installmentRows.length >= desiredInstallments
    && installmentRows.every((row) => Number(row.installment_total || row.installments || 1) === desiredInstallments);
  if (hasCompleteGroup) return transformPayable(updatedPayable);

  if (installmentRows.some((row) => Number(row.paid_value || 0) > 0)) {
    throw new Error('Nao e possivel alterar o parcelamento de titulos com pagamento registrado.');
  }

  const totalAmount = Number(input.amount ?? updatedPayable.amount ?? 0);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return transformPayable(updatedPayable);

  const totalDiscount = Number(input.discount_amount ?? updatedPayable.discount_amount ?? 0);
  const installmentAmount = Number((totalAmount / desiredInstallments).toFixed(2));
  const installmentDiscount = Number((totalDiscount / desiredInstallments).toFixed(2));
  const baseDueDate = input.due_date || updatedPayable.due_date;
  const baseDescription = stripInstallmentSuffix(input.description || updatedPayable.description);
  const installmentGroupId = updatedPayable.metadata?.enterprise?.installment_group_id || createClientId();

  const firstAmount = desiredInstallments === 1
    ? totalAmount
    : Number((totalAmount - installmentAmount * (desiredInstallments - 1)).toFixed(2));
  const firstDiscount = desiredInstallments === 1
    ? totalDiscount
    : Number((totalDiscount - installmentDiscount * (desiredInstallments - 1)).toFixed(2));

  const { data: firstRow, error: firstError } = await supabase
    .from('ap_bills')
    .update({
      amount: firstAmount,
      discount_amount: firstDiscount,
      due_date: baseDueDate,
      description: `${baseDescription} - Parcela 1/${desiredInstallments}`,
      installments: desiredInstallments,
      installment_number: 1,
      installment_total: desiredInstallments,
      parent_payable_id: null,
      parent_installment_id: null,
      metadata: buildInstallmentMetadata(updatedPayable, installmentGroupId, 1, desiredInstallments),
    })
    .eq('id', updatedPayable.id)
    .select()
    .single();

  if (firstError) throw firstError;

  const existingNumbers = new Set(installmentRows.map((row) => Number(row.installment_number || 1)));
  const rowsToInsert = [];

  for (let installmentNumber = 2; installmentNumber <= desiredInstallments; installmentNumber += 1) {
    if (existingNumbers.has(installmentNumber)) continue;

    rowsToInsert.push({
      clinic_id: updatedPayable.clinic_id,
      supplier_name: updatedPayable.supplier_name,
      supplier_id: updatedPayable.supplier_id || null,
      supplier_document: updatedPayable.supplier_document || null,
      document_number: updatedPayable.document_number || null,
      invoice_number: updatedPayable.invoice_number || null,
      invoice_series: updatedPayable.invoice_series || null,
      description: `${baseDescription} - Parcela ${installmentNumber}/${desiredInstallments}`,
      observations: updatedPayable.observations || null,
      type: updatedPayable.type || 'SUPPLIER',
      category: updatedPayable.category || null,
      subcategory: updatedPayable.subcategory || null,
      unit_id: updatedPayable.unit_id || null,
      unit_name: updatedPayable.unit_name || null,
      issue_date: updatedPayable.issue_date || null,
      competency_date: updatedPayable.competency_date || null,
      due_date: addMonths(baseDueDate, installmentNumber - 1),
      amount: installmentNumber === desiredInstallments
        ? Number((totalAmount - firstAmount - installmentAmount * (desiredInstallments - 2)).toFixed(2))
        : installmentAmount,
      interest_amount: Number(updatedPayable.interest_amount || 0),
      fine_amount: Number(updatedPayable.fine_amount || 0),
      discount_amount: installmentNumber === desiredInstallments
        ? Number((totalDiscount - firstDiscount - installmentDiscount * (desiredInstallments - 2)).toFixed(2))
        : installmentDiscount,
      paid_value: 0,
      payment_method: updatedPayable.payment_method || null,
      payment_bank: updatedPayable.payment_bank || null,
      payment_reference: updatedPayable.payment_reference || null,
      chart_account_id: updatedPayable.chart_account_id || null,
      cost_center_id: updatedPayable.cost_center_id || null,
      financial_account_id: updatedPayable.financial_account_id || null,
      dre_classification: updatedPayable.dre_classification || null,
      cost_allocations: updatedPayable.cost_allocations || [],
      is_recurring: updatedPayable.is_recurring || false,
      recurrence_type: updatedPayable.recurrence_type || null,
      recurrence_interval: updatedPayable.recurrence_interval || 1,
      recurrence_end_date: updatedPayable.recurrence_end_date || null,
      installments: desiredInstallments,
      installment_number: installmentNumber,
      installment_total: desiredInstallments,
      parent_payable_id: updatedPayable.id,
      parent_installment_id: updatedPayable.id,
      has_invoice: updatedPayable.has_invoice || false,
      invoice_xml_url: updatedPayable.invoice_xml_url || null,
      invoice_pdf_url: updatedPayable.invoice_pdf_url || null,
      attachment_url: updatedPayable.attachment_url || null,
      document_taxes: updatedPayable.document_taxes || {},
      document_items: updatedPayable.document_items || [],
      medication_traceability: updatedPayable.medication_traceability || [],
      is_forecast: updatedPayable.is_forecast !== false,
      is_manual: updatedPayable.is_manual !== false,
      approval_stage: updatedPayable.approval_stage || 'LAUNCHED',
      status: updatedPayable.status || 'OPEN',
      created_by: updatedPayable.created_by || null,
      metadata: buildInstallmentMetadata(updatedPayable, installmentGroupId, installmentNumber, desiredInstallments),
    });
  }

  if (rowsToInsert.length) {
    const { error: insertError } = await supabase
      .from('ap_bills')
      .insert(rowsToInsert);

    if (insertError) throw insertError;
  }

  return transformPayable(firstRow);
}

function buildEnterpriseMetadata(input: PayableCreateInput | PayableUpdateInput, patch: Record<string, any> = {}) {
  const baseMetadata = input.metadata || {};
  return {
    ...baseMetadata,
    enterprise: {
      ...(baseMetadata.enterprise || {}),
      approval_stage: patch.approval_stage || baseMetadata.enterprise?.approval_stage || 'LAUNCHED',
      cash_flow: {
        expected_entry_type: 'OUTFLOW',
        projection_status: patch.status === PayableStatus.PAID ? 'REALIZED' : 'FORECAST',
        source: 'accounts_payable',
      },
      dre: {
        classification: input.dre_classification || baseMetadata.enterprise?.dre?.classification || null,
        competency_date: input.competency_date || baseMetadata.enterprise?.dre?.competency_date || null,
        chart_account_id: input.chart_account_id || baseMetadata.enterprise?.dre?.chart_account_id || null,
        cost_center_id: input.cost_center_id || baseMetadata.enterprise?.dre?.cost_center_id || null,
      },
      reconciliation: {
        method: input.payment_method || baseMetadata.enterprise?.reconciliation?.method || null,
        status: patch.status === PayableStatus.PAID ? 'PENDING_MATCH' : 'NOT_DUE',
      },
      medical_repass: {
        prepared: input.type === PayableType.PAYROLL || input.dre_classification === 'MEDICAL_REPASS',
      },
      cost_allocations: input.cost_allocations || baseMetadata.enterprise?.cost_allocations || [],
    },
  };
}

function mergeEnterpriseMetadata(payable: Payable, enterprisePatch: Record<string, any>) {
  const currentMetadata = payable.metadata || {};
  return {
    ...currentMetadata,
    enterprise: {
      ...(currentMetadata.enterprise || {}),
      ...enterprisePatch,
    },
  };
}

function getDocumentInstallments(input: PayableCreateInput | PayableUpdateInput): Array<{ number: number; due_date?: string; amount?: number }> {
  const rawInstallments = input.metadata?.document_installments
    || input.metadata?.document_extraction?.installments
    || input.metadata?.nfe?.installments
    || [];

  if (!Array.isArray(rawInstallments)) return [];

  return rawInstallments
    .map((item: any, index: number) => ({
      number: Number(item?.number || item?.nDup || index + 1) || index + 1,
      due_date: item?.due_date || item?.dueDate || item?.dVenc || undefined,
      amount: item?.amount !== undefined && item?.amount !== null ? Number(item.amount) : undefined,
    }))
    .filter((item) => item.due_date || Number.isFinite(item.amount));
}

function normalizeText(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeDocument(value?: string | null): string {
  return String(value || '').replace(/\D/g, '');
}

function hasClassification(row: any): boolean {
  const dreClassification = String(row?.dre_classification || '').toUpperCase();
  return !!(
    row?.chart_account_id
    || row?.cost_center_id
    || row?.financial_account_id
    || (dreClassification && dreClassification !== 'OPERATIONAL')
    || row?.category
    || row?.subcategory
    || (Array.isArray(row?.cost_allocations) && row.cost_allocations.length)
  );
}

function isDocumentBackedPayableInput(input: PayableCreateInput): boolean {
  return !!(
    input.has_invoice
    || input.invoice_xml_url
    || input.invoice_pdf_url
    || input.attachment_url
    || input.document_items?.length
    || input.medication_traceability?.length
    || input.metadata?.document_upload
    || input.metadata?.document_extraction
    || input.metadata?.nfe
    || input.metadata?.source_file_name
  );
}

async function findHistoricalPayableClassification(clinicId: string, input: PayableCreateInput): Promise<Partial<PayableCreateInput> | null> {
  const document = normalizeDocument(input.supplier_document || input.document_number);
  const supplierName = normalizeText(input.supplier_name);
  const selectColumns = 'category,subcategory,chart_account_id,cost_center_id,financial_account_id,dre_classification,cost_allocations,updated_at,created_at';

  const fetchRows = async (query: any) => {
    const { data, error } = await query
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) {
      if (isOptionalSchemaError(error)) return [];
      throw error;
    }

    return data || [];
  };

  const documentRows = document.length >= 8
    ? await fetchRows(
      supabase
        .from('ap_bills')
        .select(selectColumns)
        .eq('clinic_id', clinicId)
        .eq('supplier_document', document)
    )
    : [];

  let match = documentRows.find(hasClassification);

  if (!match && supplierName.length >= 4) {
    const supplierRows = await fetchRows(
      supabase
        .from('ap_bills')
        .select(selectColumns)
        .eq('clinic_id', clinicId)
        .ilike('supplier_name', `%${input.supplier_name.trim().slice(0, 80)}%`)
    );

    match = supplierRows.find((row: any) => hasClassification(row));
  }

  if (!match) return null;

  return {
    category: match.category || undefined,
    subcategory: match.subcategory || undefined,
    chart_account_id: match.chart_account_id || undefined,
    cost_center_id: match.cost_center_id || undefined,
    financial_account_id: match.financial_account_id || undefined,
    dre_classification: match.dre_classification || undefined,
    cost_allocations: Array.isArray(match.cost_allocations) && match.cost_allocations.length ? match.cost_allocations : undefined,
  };
}

async function applyHistoricalPayableClassification(clinicId: string, input: PayableCreateInput): Promise<PayableCreateInput> {
  const historical = await findHistoricalPayableClassification(clinicId, input);
  if (!historical) return input;

  const documentBacked = isDocumentBackedPayableInput(input);
  const shouldUseHistoricalDre = !input.dre_classification
    || (documentBacked && String(input.dre_classification).toUpperCase() === 'OPERATIONAL' && !!historical.dre_classification);

  return {
    ...input,
    category: input.category || historical.category,
    subcategory: input.subcategory || historical.subcategory,
    chart_account_id: input.chart_account_id || historical.chart_account_id,
    cost_center_id: input.cost_center_id || historical.cost_center_id,
    financial_account_id: input.financial_account_id || historical.financial_account_id,
    dre_classification: shouldUseHistoricalDre ? historical.dre_classification as any : input.dre_classification,
    cost_allocations: input.cost_allocations?.length ? input.cost_allocations : historical.cost_allocations,
    metadata: {
      ...(input.metadata || {}),
      auto_classification: {
        ...(input.metadata?.auto_classification || {}),
        source: 'payable_history',
        applied_at: new Date().toISOString(),
      },
    },
  };
}

function dateDiffDays(first?: string | null, second?: string | null): number {
  if (!first || !second) return 999;
  const a = new Date(`${first}T00:00:00`).getTime();
  const b = new Date(`${second}T00:00:00`).getTime();
  return Math.abs(Math.round((a - b) / 86400000));
}

function scorePayableTransaction(payable: Payable, transaction: any): { score: number; reason: string } {
  const payableAmount = Number(payable.net_amount || payable.balance_amount || payable.amount || 0);
  const transactionAmount = Math.abs(Number(transaction.amount || 0));
  const amountDiff = Math.abs(payableAmount - transactionAmount);
  const amountTolerance = Math.max(0.05, payableAmount * 0.01);
  const days = dateDiffDays(payable.payment_date || payable.due_date, transaction.transaction_date);
  const payableText = normalizeText(`${payable.supplier_name} ${payable.description} ${payable.document_number || ''}`);
  const transactionText = normalizeText(transaction.description);
  const textTokens = payableText.split(' ').filter((token) => token.length >= 4);
  const tokenHits = textTokens.filter((token) => transactionText.includes(token)).length;

  let score = 0;
  const reasons: string[] = [];

  if (amountDiff <= amountTolerance) {
    score += 55;
    reasons.push('valor exato');
  } else if (amountDiff <= Math.max(5, payableAmount * 0.05)) {
    score += 30;
    reasons.push('valor aproximado');
  }

  if (days <= 1) {
    score += 25;
    reasons.push('data D+1');
  } else if (days <= 7) {
    score += 15;
    reasons.push('data em 7 dias');
  }

  if (tokenHits >= 2) {
    score += 20;
    reasons.push('texto compatível');
  } else if (tokenHits === 1) {
    score += 10;
    reasons.push('texto parcial');
  }

  if (transactionAmount === 0 || payableAmount === 0) {
    score = 0;
  }

  return { score: Math.min(score, 100), reason: reasons.join(', ') || 'sem evidência suficiente' };
}

/**
 * Transform database record to typed Payable
 */
function transformPayable(data: any): Payable {
  const amount = Number(data.amount ?? data.value ?? data.valor ?? 0);
  const rawStatus = normalizePayableStatus(data.status);
  const isPaidStatus = rawStatus === PayableStatus.PAID;
  const isCashDrawerSettled = Boolean(
    data?.metadata?.drawer_movement_id
    || data?.metadata?.origem === 'Caixa Diario'
    || String(data?.notes || '').includes('Movimento do caixa:')
    || String(data?.description || '').toLowerCase().includes('despesa manual do caixa')
  );
  const discountAmount = Number(data.discount_amount ?? data.discount ?? 0);
  const interestAmount = Number(data.interest_amount ?? data.interest ?? 0);
  const fineAmount = Number(data.fine_amount ?? data.fine ?? 0);
  const netAmount = Number(data.net_amount ?? Math.max(0, amount + interestAmount + fineAmount - discountAmount));
  const paidValue = isCashDrawerSettled
    ? netAmount
    : Number(data.paid_value ?? data.paid_amount ?? (isPaidStatus ? netAmount : 0));
  const balanceAmount = isCashDrawerSettled ? 0 : Number(data.balance_amount ?? Math.max(0, netAmount - paidValue));
  const paymentDate = data.payment_date
    || (data.paid_at ? String(data.paid_at).split('T')[0] : undefined)
    || (isCashDrawerSettled ? String(data.due_date || data.issue_date || data.created_at || '').split('T')[0] : undefined);

  return {
    ...data,
    supplier_name: data.supplier_name || data.vendor_name || data.fornecedor || 'Fornecedor não informado',
    description: data.description || data.notes || data.observations || 'Conta a pagar',
    amount,
    interest_amount: interestAmount,
    fine_amount: fineAmount,
    discount_amount: discountAmount,
    paid_value: paidValue,
    net_amount: netAmount,
    balance_amount: balanceAmount,
    payment_date: paymentDate,
    status: isCashDrawerSettled || isPaidStatus || balanceAmount <= 0 && paidValue > 0 ? PayableStatus.PAID : rawStatus,
    type: data.type as PayableType,
    payment_method: data.payment_method as PaymentMethodType,
  };
}

function payableText(...values: unknown[]): string {
  return values.filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function payableDate(value: unknown): string {
  return String(value || '').split('T')[0];
}

function getPayableComparableAmount(payable: Payable): number {
  return Number(payable.net_amount ?? payable.amount ?? 0);
}

function matchesPayableClientFilters(payable: Payable, params: PayableFilterParams): boolean {
  if (params.status?.length && !params.status.includes(payable.status)) return false;
  if (params.type?.length && !params.type.includes(payable.type)) return false;
  if (params.supplier_id && payable.supplier_id !== params.supplier_id) return false;
  if (params.supplier_name && !payableText(payable.supplier_name).includes(payableText(params.supplier_name))) return false;
  if (params.category && !payableText(payable.category).includes(payableText(params.category))) return false;
  if (params.subcategory && !payableText(payable.subcategory).includes(payableText(params.subcategory))) return false;
  if (params.chart_account_id && payable.chart_account_id !== params.chart_account_id) return false;
  if (params.cost_center_id && payable.cost_center_id !== params.cost_center_id) return false;
  if (params.financial_account_id && payable.financial_account_id !== params.financial_account_id) return false;
  if (params.payment_method?.length && (!payable.payment_method || !params.payment_method.includes(payable.payment_method))) return false;
  if (params.unit_id && payable.unit_id !== params.unit_id) return false;

  const dueDate = payableDate(payable.due_date);
  const issueDate = payableDate(payable.issue_date);
  const paymentDate = payableDate(payable.payment_date || payable.paid_at);
  const competencyDate = payableDate(payable.competency_date);
  if (params.due_date_start && dueDate < params.due_date_start) return false;
  if (params.due_date_end && dueDate > params.due_date_end) return false;
  if (params.issue_date_start && issueDate < params.issue_date_start) return false;
  if (params.issue_date_end && issueDate > params.issue_date_end) return false;
  if (params.payment_date_start && paymentDate < params.payment_date_start) return false;
  if (params.payment_date_end && paymentDate > params.payment_date_end) return false;
  if (params.competency_date_start && competencyDate < params.competency_date_start) return false;
  if (params.competency_date_end && competencyDate > params.competency_date_end) return false;

  const amount = getPayableComparableAmount(payable);
  if (params.amount_min !== undefined && amount < params.amount_min) return false;
  if (params.amount_max !== undefined && amount > params.amount_max) return false;
  if (params.is_recurring !== undefined && Boolean(payable.is_recurring) !== params.is_recurring) return false;
  if (params.is_overdue) {
    const today = new Date().toISOString().split('T')[0];
    if (!dueDate || dueDate >= today || payable.status === PayableStatus.PAID) return false;
  }
  if (params.search) {
    const haystack = payableText(payable.description, payable.supplier_name, payable.document_number, payable.invoice_number, payable.observations);
    if (!haystack.includes(payableText(params.search))) return false;
  }
  return true;
}

function sortPayables(payables: Payable[], orderBy = 'due_date.asc'): Payable[] {
  const [field, direction = 'asc'] = orderBy.split('.');
  const multiplier = direction.toLowerCase() === 'desc' ? -1 : 1;
  return [...payables].sort((left: any, right: any) => String(left?.[field] || '').localeCompare(String(right?.[field] || '')) * multiplier);
}

function payableAmount(payable: Payable): number {
  return Number(payable.balance_amount ?? payable.net_amount ?? payable.amount ?? 0) || 0;
}

function isPayableSettled(payable: Payable): boolean {
  return payable.status === PayableStatus.PAID
    || payable.status === PayableStatus.CANCELED
    || payable.status === PayableStatus.REVERSED
    || Number(payable.balance_amount || 0) <= 0;
}

function payableDueDate(payable: Payable): string {
  return String(payable.due_date || '').split('T')[0];
}

function buildNormalizedPayablesSummary(clinicId: string, rows: any[]): PayablesSummary {
  const payables = (rows || []).map(transformPayable);
  const today = new Date().toISOString().split('T')[0];
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const next7Date = next7.toISOString().split('T')[0];
  const next30 = new Date();
  next30.setDate(next30.getDate() + 30);
  const next30Date = next30.toISOString().split('T')[0];

  const activePayables = payables.filter((payable) => !isPayableSettled(payable));
  const paidThisMonthPrefix = today.slice(0, 7);
  const paidThisMonth = payables.filter((payable) => {
    const paymentDate = String(payable.payment_date || payable.paid_at || '').slice(0, 10);
    return payable.status === PayableStatus.PAID && paymentDate.startsWith(paidThisMonthPrefix);
  });
  const dueToday = activePayables.filter((payable) => payableDueDate(payable) === today);
  const overdue = activePayables.filter((payable) => {
    const dueDate = payableDueDate(payable);
    return dueDate && dueDate < today;
  });
  const dueNext7 = activePayables.filter((payable) => {
    const dueDate = payableDueDate(payable);
    return dueDate && dueDate >= today && dueDate <= next7Date;
  });
  const dueNext30 = activePayables.filter((payable) => {
    const dueDate = payableDueDate(payable);
    return dueDate && dueDate >= today && dueDate <= next30Date;
  });

  const sumBalance = (items: Payable[]) => items.reduce((sum, payable) => sum + payableAmount(payable), 0);
  const sumPaid = (items: Payable[]) => items.reduce((sum, payable) => sum + Number(payable.paid_value || payable.net_amount || payable.amount || 0), 0);
  const byStatus = (status: PayableStatus) => activePayables.filter((payable) => payable.status === status);

  return {
    clinic_id: clinicId,
    total_payables: payables.length,
    open_amount: sumBalance(byStatus(PayableStatus.OPEN)),
    approving_amount: sumBalance(byStatus(PayableStatus.APPROVING)),
    approved_amount: sumBalance(byStatus(PayableStatus.APPROVED)),
    overdue_amount: sumBalance(overdue),
    paid_amount: sumPaid(paidThisMonth),
    partial_amount: sumBalance(byStatus(PayableStatus.PARTIAL)),
    due_today_amount: sumBalance(dueToday),
    due_next_7_days_amount: sumBalance(dueNext7),
    due_next_30_days_amount: sumBalance(dueNext30),
    forecast_outflow_amount: sumBalance(activePayables),
    realized_outflow_amount: sumPaid(payables.filter((payable) => payable.status === PayableStatus.PAID)),
    operational_amount: sumBalance(activePayables.filter((payable) => String(payable.dre_classification || payable.category || '').toUpperCase().includes('OPER'))),
    administrative_amount: sumBalance(activePayables.filter((payable) => String(payable.dre_classification || payable.category || '').toUpperCase().includes('ADMIN'))),
    assistential_amount: sumBalance(activePayables.filter((payable) => String(payable.dre_classification || payable.category || '').toUpperCase().includes('ASSIST'))),
    blocked_amount: sumBalance(byStatus(PayableStatus.BLOCKED)),
    overdue_count: overdue.length,
    due_today_count: dueToday.length,
    due_next_7_days_count: dueNext7.length,
    due_next_30_days_count: dueNext30.length,
  };
}

async function listPayablesViaRpc(params: PayableFilterParams): Promise<PayablesPageResponse> {
  const rows = await listAP({ clinicId: params.clinic_id, limit: 20000, offset: 0 });
  const filtered = sortPayables(
    (rows || []).map(transformPayable).filter((payable) => matchesPayableClientFilters(payable, params)),
    params.order_by || 'due_date.asc',
  );
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  return {
    payables: filtered.slice(offset, offset + limit),
    total: filtered.length,
    has_more: filtered.length > offset + limit,
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
    const normalizedStatusFilter = expandStatusFilter(params.status);

    let query = supabase
      .from('ap_bills')
      .select('*', { count: 'exact' })
      .eq('clinic_id', params.clinic_id);

    // Status filter
    if (normalizedStatusFilter.length > 0) {
      query = query.in('status', normalizedStatusFilter);
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

    if (params.category) {
      query = query.ilike('category', `%${params.category}%`);
    }

    if (params.subcategory) {
      query = query.ilike('subcategory', `%${params.subcategory}%`);
    }

    // Chart account filter
    if (params.chart_account_id) {
      query = query.eq('chart_account_id', params.chart_account_id);
    }

    // Cost center filter
    if (params.cost_center_id) {
      query = query.eq('cost_center_id', params.cost_center_id);
    }

    if (params.financial_account_id) {
      query = query.eq('financial_account_id', params.financial_account_id);
    }

    if (params.payment_method && params.payment_method.length > 0) {
      query = query.in('payment_method', params.payment_method);
    }

    if (params.unit_id) {
      query = query.eq('unit_id', params.unit_id);
    }

    // Date range filters
    if (params.due_date_start) {
      query = query.gte('due_date', params.due_date_start);
    }
    if (params.due_date_end) {
      query = query.lte('due_date', params.due_date_end);
    }

    if (params.issue_date_start) {
      query = query.gte('issue_date', params.issue_date_start);
    }

    if (params.issue_date_end) {
      query = query.lte('issue_date', params.issue_date_end);
    }

    if (params.payment_date_start) {
      query = query.gte('paid_at', params.payment_date_start);
    }
    if (params.payment_date_end) {
      query = query.lte('paid_at', `${params.payment_date_end}T23:59:59`);
    }

    if (params.competency_date_start) {
      query = query.gte('competency_date', params.competency_date_start);
    }

    if (params.competency_date_end) {
      query = query.lte('competency_date', params.competency_date_end);
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
          .neq('status', 'PAID')
          .neq('status', 'paid')
          .neq('status', 'pago');
      }
    }

    // Exclude canceled only if explicit filters are applied
    // This ensures that without filters, all records are shown (including CANCELED for visibility)
    // but when user applies filters, CANCELED is excluded by default
    const hasExplicitFilters = normalizedStatusFilter.length > 0 
      || params.supplier_id 
      || params.supplier_name 
      || params.category 
      || params.subcategory 
      || params.chart_account_id 
      || params.cost_center_id 
      || params.financial_account_id 
      || (params.payment_method && params.payment_method.length > 0)
      || params.unit_id 
      || params.due_date_start 
      || params.due_date_end 
      || params.issue_date_start 
      || params.issue_date_end 
      || params.payment_date_start 
      || params.payment_date_end 
      || params.competency_date_start 
      || params.competency_date_end 
      || params.search;

    if (hasExplicitFilters) {
      query = query
        .neq('status', 'CANCELED')
        .neq('status', 'canceled')
        .neq('status', 'cancelado');
    }

    // Pagination
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Ordering
    const [orderColumn, orderDirection = 'asc'] = (params.order_by || 'due_date.asc').split('.');
    query = query.order(orderColumn, { ascending: orderDirection.toLowerCase() !== 'desc' });

    const { data, count, error } = await query;

    if (error) throw error;

    if ((count || 0) === 0) {
      try {
        const rpcResult = await listPayablesViaRpc(params);
        if (rpcResult.total > 0) return rpcResult;
      } catch (rpcError) {
        console.warn('listPayables RPC fallback failed:', rpcError);
      }
    }

    const normalizedPayables = (data || [])
      .map(transformPayable)
      .filter((payable) => matchesPayableClientFilters(payable, params));

    return {
      payables: normalizedPayables,
      total: normalizedPayables.length < (data || []).length ? normalizedPayables.length : count || 0,
      has_more: normalizedPayables.length === (data || []).length && (count || 0) > offset + limit,
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
    const payableInput = await applyHistoricalPayableClassification(clinicId, input);
    const documentInstallments = getDocumentInstallments(payableInput);
    const installmentsCount = Math.max(1, documentInstallments.length || Number(payableInput.installments || 1));
    const installmentGroupId = installmentsCount > 1 ? createClientId() : null;
    const grossAmount = Number(payableInput.amount || 0);
    const installmentAmount = installmentsCount > 1
      ? Number((grossAmount / installmentsCount).toFixed(2))
      : grossAmount;

    const rows = Array.from({ length: installmentsCount }, (_, index) => {
      const installmentNumber = index + 1;
      const documentInstallment = documentInstallments[index];
      const amount = Number.isFinite(documentInstallment?.amount)
        ? Number(documentInstallment.amount)
        : installmentNumber === installmentsCount
        ? Number((grossAmount - installmentAmount * (installmentsCount - 1)).toFixed(2))
        : installmentAmount;

      return {
        clinic_id: clinicId,
        supplier_name: payableInput.supplier_name,
        supplier_id: payableInput.supplier_id || null,
        supplier_document: payableInput.supplier_document || null,
        document_number: payableInput.document_number || null,
        invoice_number: payableInput.invoice_number || null,
        guide_number: payableInput.guide_number || payableInput.invoice_number || null,
        invoice_series: payableInput.invoice_series || null,
        description: installmentsCount > 1
          ? `${payableInput.description} - Parcela ${installmentNumber}/${installmentsCount}`
          : payableInput.description,
        observations: payableInput.observations || null,
        type: payableInput.type || 'SUPPLIER',
        category: payableInput.category || null,
        subcategory: payableInput.subcategory || null,
        unit_id: payableInput.unit_id || null,
        unit_name: payableInput.unit_name || null,
        issue_date: payableInput.issue_date || null,
        competency_date: payableInput.competency_date || null,
        due_date: documentInstallment?.due_date || (installmentsCount > 1 ? addMonths(payableInput.due_date, index) : payableInput.due_date),
        amount,
        interest_amount: payableInput.interest_amount || 0,
        fine_amount: payableInput.fine_amount || 0,
        discount_amount: installmentsCount > 1 ? Number(((payableInput.discount_amount || 0) / installmentsCount).toFixed(2)) : payableInput.discount_amount || 0,
        payment_method: payableInput.payment_method || null,
        payment_bank: payableInput.payment_bank || null,
        payment_reference: payableInput.payment_reference || null,
        chart_account_id: payableInput.chart_account_id || null,
        cost_center_id: payableInput.cost_center_id || null,
        financial_account_id: payableInput.financial_account_id || null,
        dre_classification: payableInput.dre_classification || null,
        cost_allocations: payableInput.cost_allocations || null,
        is_recurring: payableInput.is_recurring || false,
        recurrence_type: payableInput.recurrence_type || null,
        recurrence_interval: payableInput.recurrence_interval || 1,
        recurrence_end_date: payableInput.recurrence_end_date || null,
        installments: installmentsCount,
        installment_number: installmentNumber,
        installment_total: installmentsCount,
        parent_payable_id: payableInput.parent_payable_id || null,
        has_invoice: payableInput.has_invoice || false,
        invoice_xml_url: payableInput.invoice_xml_url || null,
        invoice_pdf_url: payableInput.invoice_pdf_url || null,
        attachment_url: payableInput.attachment_url || null,
        document_taxes: payableInput.document_taxes || {},
        document_items: payableInput.document_items || [],
        medication_traceability: payableInput.medication_traceability || [],
        is_forecast: payableInput.is_forecast !== false,
        is_manual: payableInput.is_manual !== false,
        approval_stage: 'LAUNCHED',
        metadata: buildEnterpriseMetadata(payableInput, {
          installment_group_id: installmentGroupId,
          installment_number: installmentNumber,
          installment_total: installmentsCount,
        }),
        status: 'OPEN',
        paid_value: 0,
      };
    });

    const data = await insertApBillsWithSchemaFallback(rows);
    if (!data?.length) throw new Error('Payable was not created');

    // Keep AP creation from the module aligned with legacy flow by syncing
    // allocation-aware financial transactions right after ap_bills insertion.
    await Promise.all((data || []).map((row) => syncAPFinancialTransactions(row)));

    try {
      await stockMovementsApi.createEntriesFromPayableDocument(data[0].clinic_id, data[0], {
        items: payableInput.document_items || [],
        supplierName: payableInput.supplier_name,
        invoiceNumber: payableInput.invoice_number || payableInput.document_number,
        issueDate: payableInput.issue_date || payableInput.competency_date || payableInput.due_date,
      });
    } catch (stockError: any) {
      console.warn('Payable created, but XML stock entry integration failed:', stockError?.message || stockError);
    }
    invalidateFinanceCaches(data[0].clinic_id);
    return transformPayable(data[0]);
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

    (updateData as any).metadata = buildEnterpriseMetadata(input, {
      status: (updateData as any).status,
      approval_stage: input.approval_stage,
    });

    const data = await updateApBillWithSchemaFallback(id, updateData as Record<string, any>);
    invalidateFinanceCaches(data.clinic_id);
    return await syncEditedPayableInstallments(data, input);
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
    const { data: existing } = await supabase
      .from('ap_bills')
      .select('clinic_id')
      .eq('id', id)
      .maybeSingle();

    await cleanupPayableDependencies([id]);

    const { error } = await supabase
      .from('ap_bills')
      .delete()
      .eq('id', id);

    if (error) {
      const { error: rpcError } = await supabase.rpc('delete_ap_bill_cascade', { p_ap_bill_id: id });
      if (rpcError) throw rpcError;
    }
    invalidateFinanceCaches(existing?.clinic_id);
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
  paidBy?: string,
  paymentDate?: string,
  paymentBank?: string,
  notes?: string
): Promise<Payable> {
  try {
    const payable = await getPayable(id);
    if (!payable) throw new Error('Payable not found');

    const totalPaid = payable.paid_value + paidValue;
    const newStatus =
      totalPaid >= payable.net_amount ? 'PAID' : 'PARTIAL';
    const paymentPatch: Record<string, any> = {
      paid_value: totalPaid,
      status: newStatus,
      payment_method: paymentMethod,
      payment_bank: paymentBank || payable.payment_bank || null,
      paid_at: `${paymentDate || new Date().toISOString().split('T')[0]}T12:00:00`,
      approval_stage: newStatus === 'PAID' ? 'PAID' : payable.approval_stage || 'RELEASED',
      metadata: buildEnterpriseMetadata(payable, {
        status: newStatus,
        approval_stage: newStatus === 'PAID' ? 'PAID' : payable.approval_stage || 'RELEASED',
      }),
    };

    if (isUuid(paidBy)) {
      paymentPatch.paid_by = paidBy;
    }

    if (notes) {
      paymentPatch.payment_reference = notes;
    }

    const { data, error } = await supabase
      .from('ap_bills')
      .update(paymentPatch)
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
    const payable = await getPayable(id);
    if (!payable) throw new Error('Payable not found');

    const { data, error } = await supabase
      .from('ap_bills')
      .update({
        status: 'CANCELED',
        paid_value: 0,
        canceled_at: new Date().toISOString(),
        metadata: buildEnterpriseMetadata(payable, { status: PayableStatus.CANCELED }),
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
// APPROVAL WORKFLOW
// ============================================================

export async function applyPayableApprovalAction(
  id: string,
  action: PayableApprovalAction,
  actorId?: string,
  reason?: string
): Promise<Payable> {
  const payable = await getPayable(id);
  if (!payable) throw new Error('Payable not found');

  const now = new Date().toISOString();
  const patch: Record<string, any> = {
    approval_reason: reason || payable.approval_reason || null,
  };
  const workflowEvent = { action, actor_id: actorId || null, reason: reason || null, at: now };
  const workflow = [
    ...(payable.metadata?.enterprise?.workflow || []),
    workflowEvent,
  ];

  if (action === PayableApprovalAction.SEND_TO_APPROVAL) {
    patch.status = PayableStatus.APPROVING;
    patch.approval_stage = ApprovalStage.REVIEWED;
  }
  if (action === PayableApprovalAction.CHECK) {
    patch.status = PayableStatus.APPROVING;
    patch.approval_stage = ApprovalStage.REVIEWED;
    if (isUuid(actorId)) patch.checked_by = actorId;
    patch.checked_at = now;
  }
  if (action === PayableApprovalAction.APPROVE) {
    patch.status = PayableStatus.APPROVED;
    patch.approval_stage = ApprovalStage.APPROVED;
    if (isUuid(actorId)) patch.approved_by = actorId;
    patch.approved_at = now;
  }
  if (action === PayableApprovalAction.RELEASE) {
    patch.status = PayableStatus.APPROVED;
    patch.approval_stage = ApprovalStage.RELEASED;
    if (isUuid(actorId)) patch.released_by = actorId;
    patch.released_at = now;
  }
  if (action === PayableApprovalAction.BLOCK) {
    patch.status = PayableStatus.BLOCKED;
    patch.approval_stage = payable.approval_stage || ApprovalStage.LAUNCHED;
  }
  if (action === PayableApprovalAction.REVERSE) {
    patch.status = PayableStatus.REVERSED;
    patch.approval_stage = payable.approval_stage || ApprovalStage.PAID;
    if (isUuid(actorId)) patch.reversed_by = actorId;
    patch.reversed_at = now;
  }

  patch.metadata = mergeEnterpriseMetadata(payable, { workflow });

  const { data, error } = await supabase
    .from('ap_bills')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return transformPayable(data);
}

// ============================================================
// INTELLIGENT RECONCILIATION
// ============================================================

export async function runPayablesSmartReconciliation(
  clinicId: string,
  actorId?: string
): Promise<PayableReconciliationSummary> {
  try {
    const { data, error } = await supabase.rpc('match_payables_to_bank_transactions', {
      p_clinic_id: clinicId,
      p_actor_id: isUuid(actorId) ? actorId : null,
    });

    if (!error && data) {
      const rows = Array.isArray(data) ? data : [];
      const matches = rows.map((row: any) => ({
        payable_id: row.payable_id,
        bank_transaction_id: row.bank_transaction_id,
        transaction_date: row.transaction_date,
        amount: Number(row.amount || 0),
        description: row.description || '',
        match_type: row.match_type || 'auto_fuzzy',
        confidence: Number(row.confidence || 0),
        status: row.status || 'review',
        score_reason: row.score_reason || 'RPC',
      })) as PayableReconciliationMatch[];
      return {
        total_candidates: matches.length,
        matched: matches.filter((match) => match.status === 'matched').length,
        review: matches.filter((match) => match.status === 'review').length,
        unmatched: matches.filter((match) => match.status === 'unmatched').length,
        matches,
      };
    }
  } catch (error) {
    console.warn('RPC reconciliation unavailable, using client fallback:', error);
  }

  const { data: payablesData, error: payablesError } = await supabase
    .from('ap_bills')
    .select('*')
    .eq('clinic_id', clinicId)
    .in('status', ['PAID', 'PARTIAL', 'APPROVED', 'OPEN'])
    .neq('status', 'CANCELED')
    .order('due_date', { ascending: false })
    .limit(500);

  if (payablesError) throw payablesError;

  const { data: statements, error: statementsError } = await supabase
    .from('bank_statements')
    .select('id')
    .eq('clinic_id', clinicId)
    .order('statement_date', { ascending: false })
    .limit(100);

  if (statementsError) throw statementsError;
  const statementIds = (statements || []).map((statement: any) => statement.id);
  if (!statementIds.length) {
    return { total_candidates: 0, matched: 0, review: 0, unmatched: 0, matches: [] };
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from('bank_transactions')
    .select('*')
    .in('statement_id', statementIds)
    .is('matched_to_id', null)
    .order('transaction_date', { ascending: false })
    .limit(1000);

  if (transactionsError) throw transactionsError;

  const payables = (payablesData || []).map(transformPayable);
  const usedTransactions = new Set<string>();
  const matches: PayableReconciliationMatch[] = [];

  for (const payable of payables) {
    let best: any = null;
    let bestScore = { score: 0, reason: '' };

    for (const transaction of transactions || []) {
      if (usedTransactions.has(transaction.id)) continue;
      const score = scorePayableTransaction(payable, transaction);
      if (score.score > bestScore.score) {
        best = transaction;
        bestScore = score;
      }
    }

    if (!best || bestScore.score < 60) continue;

    usedTransactions.add(best.id);
    const status = bestScore.score >= 85 ? 'matched' : 'review';
    const matchType = bestScore.score >= 95 ? 'auto_exact' : bestScore.score >= 75 ? 'auto_fuzzy' : 'auto_partial';
    const reconciliation = {
      status: status === 'matched' ? 'MATCHED' : 'AWAITING_REVIEW',
      bank_transaction_id: best.id,
      confidence: bestScore.score,
      match_type: matchType,
      matched_at: new Date().toISOString(),
      matched_by: isUuid(actorId) ? actorId : null,
      score_reason: bestScore.reason,
    };

    await supabase
      .from('bank_transactions')
      .update({
        matched_to_id: payable.id,
        match_type: matchType,
        match_confidence: bestScore.score,
        status,
        notes: `Contas a Pagar: ${bestScore.reason}`,
      })
      .eq('id', best.id);

    await supabase
      .from('ap_bills')
      .update({ metadata: mergeEnterpriseMetadata(payable, { reconciliation }) })
      .eq('id', payable.id);

    matches.push({
      payable_id: payable.id,
      bank_transaction_id: best.id,
      transaction_date: best.transaction_date,
      amount: Number(best.amount || 0),
      description: best.description || '',
      match_type: matchType,
      confidence: bestScore.score,
      status,
      score_reason: bestScore.reason,
    });
  }

  return {
    total_candidates: matches.length,
    matched: matches.filter((match) => match.status === 'matched').length,
    review: matches.filter((match) => match.status === 'review').length,
    unmatched: Math.max(0, (transactions || []).length - matches.length),
    matches,
  };
}

export async function approvePayableReconciliationMatch(input: {
  payableId: string;
  bankTransactionId: string;
  actorId?: string;
  confidence?: number;
  matchType?: PayableReconciliationMatch['match_type'];
  scoreReason?: string;
}): Promise<Payable> {
  const { data: payableData, error: payableError } = await supabase
    .from('ap_bills')
    .select('*')
    .eq('id', input.payableId)
    .single();

  if (payableError) throw payableError;

  const payable = transformPayable(payableData);
  const approvedAt = new Date().toISOString();
  const reconciliation = {
    status: 'MATCHED',
    bank_transaction_id: input.bankTransactionId,
    confidence: Number(input.confidence || payable.metadata?.enterprise?.reconciliation?.confidence || 100),
    match_type: input.matchType || payable.metadata?.enterprise?.reconciliation?.match_type || 'manual_approved',
    approved_at: approvedAt,
    approved_by: isUuid(input.actorId) ? input.actorId : null,
    score_reason: input.scoreReason || payable.metadata?.enterprise?.reconciliation?.score_reason || null,
  };

  const { error: transactionError } = await supabase
    .from('bank_transactions')
    .update({
      matched_to_id: input.payableId,
      status: 'matched',
      notes: `Match AP aprovado em ${approvedAt}`,
    })
    .eq('id', input.bankTransactionId);

  if (transactionError) throw transactionError;

  const { data, error } = await supabase
    .from('ap_bills')
    .update({ metadata: mergeEnterpriseMetadata(payable, { reconciliation }) })
    .eq('id', input.payableId)
    .select()
    .single();

  if (error) throw error;
  return transformPayable(data);
}

export async function rejectPayableReconciliationMatch(input: {
  payableId: string;
  bankTransactionId: string;
  actorId?: string;
  scoreReason?: string;
}): Promise<Payable> {
  const { data: payableData, error: payableError } = await supabase
    .from('ap_bills')
    .select('*')
    .eq('id', input.payableId)
    .single();

  if (payableError) throw payableError;

  const payable = transformPayable(payableData);
  const rejectedAt = new Date().toISOString();
  const reconciliation = {
    ...(payable.metadata?.enterprise?.reconciliation || {}),
    status: 'REJECTED',
    rejected_at: rejectedAt,
    rejected_by: isUuid(input.actorId) ? input.actorId : null,
    rejection_reason: input.scoreReason || 'Rejeitado na revisão manual',
  };

  const { error: transactionError } = await supabase
    .from('bank_transactions')
    .update({
      matched_to_id: null,
      status: 'rejected',
      notes: reconciliation.rejection_reason,
    })
    .eq('id', input.bankTransactionId);

  if (transactionError) throw transactionError;

  const { data, error } = await supabase
    .from('ap_bills')
    .update({ metadata: mergeEnterpriseMetadata(payable, { reconciliation }) })
    .eq('id', input.payableId)
    .select()
    .single();

  if (error) throw error;
  return transformPayable(data);
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
  invalidateFinanceCaches(data?.[0]?.clinic_id);
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
    const { data: existing } = await supabase
      .from('ap_bills')
      .select('clinic_id')
      .in('id', ids)
      .limit(1);

    await cleanupPayableDependencies(ids);

    const { error } = await supabase
      .from('ap_bills')
      .delete()
      .in('id', ids);

    if (error) {
      for (const id of ids) {
        const { error: rpcError } = await supabase.rpc('delete_ap_bill_cascade', { p_ap_bill_id: id });
        if (rpcError) throw rpcError;
      }
    }
    invalidateFinanceCaches(existing?.[0]?.clinic_id);
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
      .from('ap_bills')
      .select('*')
      .eq('clinic_id', clinicId)
      .limit(20000);

    if (error) throw error;
    return buildNormalizedPayablesSummary(clinicId, data || []);
  } catch (error) {
    console.error('Error getting payables summary:', error);
    // Retorna null ao invés de lançar erro - permite que a página continue funcionando
    return null;
  }
}

/**
 * Get overdue payables count
 */
export async function getOverdueCount(clinicId: string): Promise<number> {
  try {
    const summary = await getPayablesSummary(clinicId);
    return Number(summary?.overdue_count || 0);
  } catch (error) {
    console.error('Error getting overdue count:', error);
    return 0;
  }
}

// ============================================================
// INSTALLMENTS OPERATIONS
// ============================================================

/**
 * Create multiple payables from a single payable split into installments
 * @param clinicId Clinic ID
 * @param payableId Original payable ID
 * @param installmentsCount Number of installments to create
 * @returns Array of created payable IDs
 */
export async function splitPayableIntoInstallments(
  clinicId: string,
  payableId: string,
  installmentsCount: number
): Promise<string[]> {
  try {
    if (installmentsCount < 2) {
      throw new Error('Must have at least 2 installments');
    }

    // Get the original payable
    const original = await getPayable(payableId);
    if (!original) {
      throw new Error('Payable not found');
    }

    // Calculate installment details
    const amountPerInstallment = original.amount / installmentsCount;
    const baseDate = new Date(original.due_date);
    const createdIds: string[] = [];

    // Create each installment
    for (let i = 1; i <= installmentsCount; i++) {
      // Calculate due date for this installment (add months)
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      const installmentData = {
        clinic_id: clinicId,
        supplier_name: `${original.supplier_name} (Parcela ${i}/${installmentsCount})`,
        supplier_id: original.supplier_id || null,
        supplier_document: original.supplier_document || null,
        document_number: original.document_number || null,
        description: original.description,
        amount: amountPerInstallment,
        status: 'OPEN',
        type: original.type,
        category: original.category,
        subcategory: original.subcategory || null,
        due_date: dueDate.toISOString().split('T')[0],
        competency_date: original.competency_date,
        chart_account_id: original.chart_account_id,
        cost_center_id: original.cost_center_id,
        financial_account_id: original.financial_account_id || null,
        dre_classification: original.dre_classification || null,
        cost_allocations: original.cost_allocations || null,
        created_by: original.created_by,
        installments: 1,
        is_recurring: false,
        installment_number: i,
        installment_total: installmentsCount,
        parent_payable_id: payableId,
        approval_stage: 'LAUNCHED',
        metadata: buildEnterpriseMetadata(original, {
          installment_number: i,
          installment_total: installmentsCount,
        }),
      };

      const { data, error } = await supabase
        .from('ap_bills')
        .insert([installmentData])
        .select();

      if (error) throw error;
      if (data?.[0]) {
        createdIds.push(data[0].id);
      }
    }

    // Mark original as split
    const { error: updateError } = await supabase
      .from('ap_bills')
      .update({ installments: installmentsCount })
      .eq('id', payableId);

    if (updateError) throw updateError;

    return createdIds;
  } catch (error) {
    console.error('Error splitting payable into installments:', error);
    throw error;
  }
}

// ============================================================
// RECURRENCE OPERATIONS
// ============================================================

/**
 * Setup recurring payment for a payable
 * Creates a recurring configuration template
 */
export async function setupRecurringPayable(
  clinicId: string,
  payableId: string,
  recurrenceType: string,
  recurrenceInterval: number,
  recurrenceEndDate?: string
): Promise<PayableRecurringConfig> {
  try {
    const payable = await getPayable(payableId);
    if (!payable) {
      throw new Error('Payable not found');
    }

    const config = {
      clinic_id: clinicId,
      name: `${payable.supplier_name} - ${payable.description}`.slice(0, 180),
      description: payable.description,
      template_ap_bill_id: payableId,
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceInterval,
      recurrence_end_date: recurrenceEndDate || null,
      is_active: true,
      next_generation_date: payable.due_date,
      created_by: payable.created_by,
    };

    const { data, error } = await supabase
      .from('payable_recurring_configs')
      .insert([config])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error setting up recurring payable:', error);
    throw error;
  }
}

/**
 * Generate next occurrences for recurring payables
 * This should be called periodically (e.g., daily cron job)
 */
export async function generateRecurringPayables(
  clinicId: string
): Promise<string[]> {
  try {
    // Get all active recurring configs
    const { data: configs, error: configError } = await supabase
      .from('payable_recurring_configs')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (configError) throw configError;
    if (!configs || configs.length === 0) return [];

    const createdIds: string[] = [];
    const today = new Date();

    for (const config of configs) {
      // Check if end date has passed
      if (config.recurrence_end_date && new Date(config.recurrence_end_date) < today) {
        // Deactivate this config
        await supabase
          .from('payable_recurring_configs')
          .update({ is_active: false })
          .eq('id', config.id);
        continue;
      }

      // Get original payable
      const templatePayableId = config.template_ap_bill_id || config.payable_id;
      const original = await getPayable(templatePayableId);
      if (!original) continue;

      // Calculate next occurrence date
      const nextDate = new Date(`${config.next_generation_date || config.next_occurrence_date}T00:00:00`);
      const interval = config.recurrence_interval || 1;

      switch (config.recurrence_type) {
        case 'DAILY':
          nextDate.setDate(nextDate.getDate() + interval);
          break;
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + 7 * interval);
          break;
        case 'BIWEEKLY':
          nextDate.setDate(nextDate.getDate() + 14 * interval);
          break;
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + interval);
          break;
        case 'QUARTERLY':
          nextDate.setMonth(nextDate.getMonth() + 3 * interval);
          break;
        case 'SEMIANNUAL':
          nextDate.setMonth(nextDate.getMonth() + 6 * interval);
          break;
        case 'ANNUAL':
          nextDate.setFullYear(nextDate.getFullYear() + interval);
          break;
      }

      // If next occurrence is today or in future, create it
      if (nextDate <= new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)) {
        const newPayable = {
          clinic_id: clinicId,
          supplier_name: original.supplier_name,
          description: original.description,
          amount: original.amount,
          status: 'OPEN',
          type: original.type,
          category: original.category,
          subcategory: original.subcategory || null,
          due_date: nextDate.toISOString().split('T')[0],
          competency_date: nextDate.toISOString().split('T')[0],
          chart_account_id: original.chart_account_id,
          cost_center_id: original.cost_center_id,
          financial_account_id: original.financial_account_id || null,
          dre_classification: original.dre_classification || null,
          created_by: original.created_by,
          is_recurring: true,
          recurrence_type: config.recurrence_type,
          parent_payable_id: templatePayableId,
          approval_stage: 'LAUNCHED',
          metadata: buildEnterpriseMetadata(original, { recurrence_config_id: config.id }),
        };

        const { data: newData, error: insertError } = await supabase
          .from('ap_bills')
          .insert([newPayable])
          .select();

        if (!insertError && newData?.[0]) {
          createdIds.push(newData[0].id);

          // Update config with new next occurrence date
          await supabase
            .from('payable_recurring_configs')
            .update({
              last_generated_date: new Date().toISOString().split('T')[0],
              next_generation_date: nextDate.toISOString().split('T')[0],
            })
            .eq('id', config.id);
        }
      }
    }

    return createdIds;
  } catch (error) {
    console.error('Error generating recurring payables:', error);
    throw error;
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
