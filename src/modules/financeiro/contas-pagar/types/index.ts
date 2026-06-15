/**
 * 💰 Types for Contas a Pagar (Accounts Payable) Module
 * Enterprise financial payables management
 */

// ============================================================
// ENUMS
// ============================================================

export enum PayableStatus {
  OPEN = 'OPEN',
  APPROVING = 'APPROVING',
  APPROVED = 'APPROVED',
  OVERDUE = 'OVERDUE',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  BLOCKED = 'BLOCKED',
  CANCELED = 'CANCELED',
  NEGOTIATED = 'NEGOTIATED',
  REVERSED = 'REVERSED',
}

export enum ApprovalStage {
  LAUNCHED = 'LAUNCHED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  RELEASED = 'RELEASED',
  PAID = 'PAID',
}

export enum PayableType {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
  TAX = 'TAX',
  PAYROLL = 'PAYROLL',
  SUPPLIER = 'SUPPLIER',
  SERVICE = 'SERVICE',
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
}

export enum PaymentMethodType {
  PIX = 'PIX',
  TED = 'TED',
  DOC = 'DOC',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_SLIP = 'BANK_SLIP',
  OTHER = 'OTHER',
}

export enum DreClassification {
  OPERATIONAL = 'OPERATIONAL',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  ASSISTENTIAL = 'ASSISTENTIAL',
  FINANCIAL = 'FINANCIAL',
  TAX = 'TAX',
  MEDICAL_REPASS = 'MEDICAL_REPASS',
}

export enum RecurrenceType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUAL = 'SEMIANNUAL',
  ANNUAL = 'ANNUAL',
}

export enum AttachmentType {
  INVOICE = 'invoice',
  PROOF = 'proof',
  NFE = 'nfe',
  CONTRACT = 'contract',
  OTHER = 'other',
}

export enum PayableApprovalAction {
  SEND_TO_APPROVAL = 'SEND_TO_APPROVAL',
  CHECK = 'CHECK',
  APPROVE = 'APPROVE',
  RELEASE = 'RELEASE',
  BLOCK = 'BLOCK',
  REVERSE = 'REVERSE',
}

// ============================================================
// CORE TYPES
// ============================================================

export interface Payable {
  id: string;
  clinic_id: string;
  
  // Supplier info
  supplier_id?: string;
  supplier_name: string;
  supplier_document?: string;
  
  // Document info
  document_number?: string;
  invoice_number?: string;
  invoice_series?: string;
  
  // Description
  description: string;
  observations?: string;
  
  // Classification
  type: PayableType;
  category?: string;
  subcategory?: string;
  unit_id?: string;
  unit_name?: string;
  
  // Dates
  issue_date?: string;
  competency_date?: string;
  due_date: string;
  payment_date?: string;
  paid_at?: string;
  
  // Amounts
  amount: number;
  interest_amount: number;
  fine_amount: number;
  discount_amount: number;
  paid_value: number;
  net_amount: number;
  balance_amount: number;
  
  // Status
  status: PayableStatus;
  
  // Recurrence
  is_recurring: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  
  // Installments
  installments: number;
  installment_number: number;
  parent_installment_id?: string;
  
  // Invoice
  has_invoice: boolean;
  invoice_xml_url?: string;
  invoice_pdf_url?: string;
  attachment_url?: string;
  document_taxes?: Record<string, number>;
  document_items?: Array<Record<string, any>>;
  medication_traceability?: Array<Record<string, any>>;
  
  // Payment details
  payment_method?: PaymentMethodType;
  payment_bank?: string;
  payment_reference?: string;
  
  // Accounting
  chart_account_id?: string;
  cost_center_id?: string;
  financial_account_id?: string;
  dre_classification?: DreClassification;
  cost_allocations?: Array<{
    cost_center_id: string;
    cost_center_name?: string;
    percentage: number;
    amount?: number;
  }>;
  
  // Approval
  approved_by?: string;
  approved_at?: string;
  approval_stage?: ApprovalStage;
  approval_reason?: string;
  checked_by?: string;
  checked_at?: string;
  released_by?: string;
  released_at?: string;
  
  // Payment
  paid_by?: string;
  reversed_by?: string;
  reversed_at?: string;
  canceled_by?: string;
  canceled_at?: string;
  
  // Flags
  is_forecast: boolean;
  is_manual: boolean;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Audit
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PayableRecurringConfig {
  id: string;
  clinic_id: string;
  name: string;
  description?: string;
  
  template_ap_bill_id?: string;
  
  recurrence_type: RecurrenceType;
  recurrence_interval: number;
  recurrence_end_date?: string;
  
  is_active: boolean;
  last_generated_date?: string;
  next_generation_date?: string;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PayableAttachment {
  id: string;
  clinic_id: string;
  ap_bill_id: string;
  
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  
  attachment_type: AttachmentType;
  
  created_by?: string;
  created_at: string;
}

export interface PayableAudit {
  id: string;
  clinic_id: string;
  ap_bill_id: string;
  
  action: 'created' | 'updated' | 'paid' | 'canceled' | 'deleted';
  
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  
  changed_by?: string;
  changed_at: string;
  
  metadata?: Record<string, any>;
}

export interface PayableReconciliationMatch {
  payable_id: string;
  bank_transaction_id: string;
  transaction_date: string;
  amount: number;
  description: string;
  match_type: 'auto_exact' | 'auto_fuzzy' | 'auto_partial' | 'manual';
  confidence: number;
  status: 'matched' | 'review' | 'unmatched';
  score_reason: string;
}

export interface PayableReconciliationSummary {
  total_candidates: number;
  matched: number;
  review: number;
  unmatched: number;
  matches: PayableReconciliationMatch[];
}

export interface PayablesSummary {
  clinic_id: string;
  total_payables: number;
  open_amount: number;
  approving_amount?: number;
  approved_amount?: number;
  overdue_amount: number;
  paid_amount: number;
  partial_amount: number;
  due_today_amount?: number;
  due_next_7_days_amount?: number;
  due_next_30_days_amount?: number;
  operational_amount?: number;
  administrative_amount?: number;
  assistential_amount?: number;
  forecast_outflow_amount?: number;
  realized_outflow_amount?: number;
  blocked_amount?: number;
  overdue_count: number;
  due_today_count: number;
  due_next_7_days_count?: number;
  due_next_30_days_count: number;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface PayableCreateInput {
  supplier_name: string;
  supplier_id?: string;
  supplier_document?: string;
  
  document_number?: string;
  invoice_number?: string;
  invoice_series?: string;
  
  description: string;
  observations?: string;
  
  type: PayableType;
  category?: string;
  subcategory?: string;
  unit_id?: string;
  unit_name?: string;
  
  issue_date?: string;
  competency_date?: string;
  due_date: string;
  
  amount: number;
  interest_amount?: number;
  fine_amount?: number;
  discount_amount?: number;
  
  payment_method?: PaymentMethodType;
  payment_bank?: string;
  payment_reference?: string;
  
  chart_account_id?: string;
  cost_center_id?: string;
  financial_account_id?: string;
  dre_classification?: DreClassification;
  cost_allocations?: Payable['cost_allocations'];
  
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  
  installments?: number;
  installment_number?: number;
  installment_total?: number;
  parent_payable_id?: string;
  
  has_invoice?: boolean;
  invoice_xml_url?: string;
  invoice_pdf_url?: string;
  attachment_url?: string;
  document_taxes?: Record<string, number>;
  document_items?: Array<Record<string, any>>;
  medication_traceability?: Array<Record<string, any>>;
  
  is_forecast?: boolean;
  is_manual?: boolean;
  
  metadata?: Record<string, any>;
}

export interface PayableUpdateInput extends Partial<PayableCreateInput> {
  id: string;
  status?: PayableStatus;
  paid_value?: number;
  paid_by?: string;
  payment_date?: string;
  approved_by?: string;
  approved_at?: string;
  approval_stage?: ApprovalStage;
  approval_reason?: string;
  checked_by?: string;
  checked_at?: string;
  released_by?: string;
  released_at?: string;
  reversed_by?: string;
  reversed_at?: string;
  canceled_by?: string;
  canceled_at?: string;
}

export interface PayableFilterParams {
  clinic_id: string;
  status?: PayableStatus[];
  type?: PayableType[];
  supplier_id?: string;
  supplier_name?: string;
  chart_account_id?: string;
  cost_center_id?: string;
  financial_account_id?: string;
  category?: string;
  subcategory?: string;
  payment_method?: PaymentMethodType[];
  unit_id?: string;
  competency_date_start?: string;
  competency_date_end?: string;
  
  due_date_start?: string;
  due_date_end?: string;

  issue_date_start?: string;
  issue_date_end?: string;
  
  payment_date_start?: string;
  payment_date_end?: string;
  
  amount_min?: number;
  amount_max?: number;
  
  search?: string;
  
  is_recurring?: boolean;
  is_overdue?: boolean;
  
  limit?: number;
  offset?: number;
  order_by?: string;
}

export interface PayablePaymentInput {
  id: string;
  paid_value: number;
  payment_method: PaymentMethodType;
  payment_bank?: string;
  payment_date: string;
  paid_by: string;
  notes?: string;
}

export interface PayableInstallmentPlanInput {
  id: string;
  installments: number;
  interval_type: RecurrenceType;
  interval_days?: number;
  start_date: string;
}

// ============================================================
// RESPONSE TYPES
// ============================================================

export interface PayablesPageResponse {
  payables: Payable[];
  total: number;
  has_more: boolean;
}

export interface PayableResponse {
  success: boolean;
  data?: Payable;
  error?: string;
}

export interface PayablesListResponse {
  success: boolean;
  data?: Payable[];
  total?: number;
  error?: string;
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface PayablesDashboard {
  summary: PayablesSummary;
  upcoming_due: Payable[];
  overdue: Payable[];
  recent_payments: Payable[];
  by_category: Record<string, number>;
  by_supplier: Record<string, number>;
  monthly_trend: Array<{
    month: string;
    open: number;
    paid: number;
    overdue: number;
  }>;
}

// ============================================================
// EXPORT/PRINT TYPES
// ============================================================

export interface PayableExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  filters: PayableFilterParams;
  include_attachments?: boolean;
  include_audit?: boolean;
}

export interface PayablePrintOptions {
  payables: Payable[];
  include_details?: boolean;
  include_attachments?: boolean;
  include_summary?: boolean;
}
