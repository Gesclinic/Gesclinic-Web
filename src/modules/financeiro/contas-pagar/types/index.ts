/**
 * 💰 Types for Contas a Pagar (Accounts Payable) Module
 * Enterprise financial payables management
 */

// ============================================================
// ENUMS
// ============================================================

export enum PayableStatus {
  OPEN = 'OPEN',
  OVERDUE = 'OVERDUE',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
  NEGOTIATED = 'NEGOTIATED',
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

// ============================================================
// CORE TYPES
// ============================================================

export interface Payable {
  id: string;
  clinic_id: string;
  
  // Supplier info
  supplier_id?: string;
  supplier_name: string;
  
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
  
  // Dates
  issue_date?: string;
  competency_date?: string;
  due_date: string;
  payment_date?: string;
  
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
  
  // Payment details
  payment_method?: PaymentMethodType;
  payment_bank?: string;
  
  // Accounting
  chart_account_id?: string;
  cost_center_id?: string;
  
  // Approval
  approved_by?: string;
  approved_at?: string;
  
  // Payment
  paid_by?: string;
  
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

export interface PayablesSummary {
  clinic_id: string;
  total_payables: number;
  open_amount: number;
  overdue_amount: number;
  paid_amount: number;
  partial_amount: number;
  overdue_count: number;
  due_today_count: number;
  due_next_30_days_count: number;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface PayableCreateInput {
  supplier_name: string;
  supplier_id?: string;
  
  document_number?: string;
  invoice_number?: string;
  invoice_series?: string;
  
  description: string;
  observations?: string;
  
  type: PayableType;
  category?: string;
  
  issue_date?: string;
  competency_date?: string;
  due_date: string;
  
  amount: number;
  interest_amount?: number;
  fine_amount?: number;
  discount_amount?: number;
  
  payment_method?: PaymentMethodType;
  payment_bank?: string;
  
  chart_account_id?: string;
  cost_center_id?: string;
  
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  
  installments?: number;
  
  has_invoice?: boolean;
  invoice_xml_url?: string;
  invoice_pdf_url?: string;
  
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
}

export interface PayableFilterParams {
  clinic_id: string;
  status?: PayableStatus[];
  type?: PayableType[];
  supplier_id?: string;
  supplier_name?: string;
  chart_account_id?: string;
  cost_center_id?: string;
  
  due_date_start?: string;
  due_date_end?: string;
  
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
