/**
 * Financial Transactions Types
 * Definições de tipos para o motor financeiro enterprise
 * 
 * ⚠️ ATENÇÃO: Estes tipos devem corresponder exatamente à estrutura da tabela financial_transactions no Supabase
 * Schema: https://github.com/gesclinic/gesclinic-web/blob/main/supabase/migrations/2026-05-13_create_financial_transactions.sql
 */

// =====================================================
// ENUMS - Correspondem aos tipos ENUM do Supabase (UPPERCASE)
// =====================================================

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
  REVERSAL = 'REVERSAL',
  FEE = 'FEE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  OPEN = 'OPEN',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  CANCELED = 'CANCELED',
  PARTIAL = 'PARTIAL',
}

export enum MovementType {
  REALIZED = 'REALIZED',
  PREDICTED = 'PREDICTED',
}

export enum TransactionCategory {
  APPOINTMENT = 'appointment',
  MEDICAL_SERVICE = 'medical_service',
  EXAM = 'exam',
  PROCEDURE = 'procedure',
  SURGERY = 'surgery',
  TELEMEDICINE = 'telemedicine',
  PAYROLL = 'payroll',
  MATERIALS = 'materials',
  MAINTENANCE = 'maintenance',
  UTILITIES = 'utilities',
  RENT = 'rent',
  TAX = 'tax',
  COMMISSION = 'commission',
  MARKETING = 'marketing',
  SOFTWARE = 'software',
  EQUIPMENT = 'equipment',
  OTHER = 'other',
}

// =====================================================
// TIPOS PRINCIPAIS - Correspondem ao schema do Supabase
// =====================================================

export interface FinancialTransaction {
  // IDs
  id: string;
  clinic_id: string;
  
  // Account - OLD schema uses 'account_id', NEW schema uses 'financial_account_id'
  account_id?: string; // OLD schema
  financial_account_id?: string; // NEW schema
  
  // Transaction Type - OLD schema uses 'type', NEW schema uses 'transaction_type'
  type?: string; // OLD schema: 'revenue', 'expense', 'transfer', etc
  transaction_type?: TransactionType; // NEW schema: INCOME, EXPENSE, etc
  
  // Movement - only in NEW schema
  movement_type?: MovementType; // REALIZED, PREDICTED
  
  // Category - OLD schema uses 'category' (text), NEW schema uses 'category_id'
  category?: string; // OLD schema: direct text value
  category_id?: string; // NEW schema: UUID reference
  
  // Cost Center - only in NEW schema
  cost_center_id?: string;
  centro_custo_id?: string;
  
  // Amount and description
  description: string;
  amount: number;
  document_number?: string; // NEW schema uses this
  reference_document?: string; // OLD schema uses this
  balance_after?: number;
  
  // Status
  status: TransactionStatus | string; // Can be 'PENDING' or 'pending' depending on schema
  
  // Dates - OLD schema uses 'created_at', NEW schema uses 'transaction_date'
  transaction_date?: string; // NEW schema: DATE
  created_at?: string; // Can be either schema's created_at or OLD schema's transaction date
  due_date?: string; // DATE
  competency_date?: string; // DATE
  scheduled_date?: string; // OLD schema field
  
  // Origins/References
  origin_module?: string;
  origin_id?: string;
  appointment_id?: string; // OLD schema field
  professional_id?: string; // OLD schema field
  supplier_id?: string; // OLD schema field
  
  // Reconciliation - only in NEW schema  
  is_reconciled?: boolean;
  reconciliation_date?: string;
  
  // Notes
  notes?: string;
  metadata?: Record<string, any>;
  
  // Audit
  created_by: string;
  updated_by?: string;
  updated_at?: string;
  
  // Expanded relations
  financial_account?: any;
  category_obj?: FinancialCategory;
  cost_center?: CostCenter;
}

export interface FinancialTransactionCreateInput {
  financial_account_id: string;
  transaction_type: TransactionType;
  movement_type?: MovementType;
  category_id?: string;
  cost_center_id?: string;
  description: string;
  document_number?: string;
  amount: number;
  status?: TransactionStatus;
  transaction_date: string;
  due_date?: string;
  competency_date?: string;
  origin_module?: string;
  origin_id?: string;
  notes?: string;
}

export interface FinancialTransactionUpdateInput {
  transaction_type?: TransactionType;
  movement_type?: MovementType;
  category_id?: string;
  cost_center_id?: string;
  description?: string;
  document_number?: string;
  amount?: number;
  status?: TransactionStatus;
  transaction_date?: string;
  due_date?: string;
  competency_date?: string;
  notes?: string;
  is_reconciled?: boolean;
}

// =====================================================
// TIPOS DE SUPORTE
// =====================================================

export interface FinancialCategory {
  id: string;
  clinic_id: string;
  name: string;
  description?: string;
  category_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostCenter {
  id: string;
  clinic_id: string;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TIPOS PARA FILTROS E BUSCA
// =====================================================

export interface TransactionFilters {
  search?: string;
  financial_account_id?: string;
  transaction_type?: TransactionType;
  status?: TransactionStatus;
  category_id?: string;
  cost_center_id?: string;
  date_from?: string;
  date_to?: string;
  movement_type?: MovementType;
  is_reconciled?: boolean;
}

export interface TransactionQueryOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// =====================================================
// TIPOS PARA DASHBOARD E RELATÓRIOS
// =====================================================

export interface FinancialMetrics {
  total_income: number;
  total_expense: number;
  total_realized: number;
  total_predicted: number;
  predicted_income?: number;
  predicted_expense?: number;
  ap_open_total?: number;
  net_balance: number;
  pending_count: number;
  paid_count: number;
  income_paid_count?: number;
  expense_paid_count?: number;
  reconciled_count: number;
  unreconciled_count: number;
}

export interface PeriodMetrics {
  period_start: string;
  period_end: string;
  income: number;
  expense: number;
  net: number;
  transaction_count: number;
}

export interface TransactionTimeline {
  date: string;
  transactions: FinancialTransaction[];
  daily_total: number;
  daily_balance: number;
}

// =====================================================
// CONSTANTES E MAPEAMENTOS
// =====================================================

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'Receita',
  [TransactionType.EXPENSE]: 'Despesa',
  [TransactionType.TRANSFER]: 'Transferência',
  [TransactionType.REVERSAL]: 'Reversão',
  [TransactionType.FEE]: 'Taxa',
  [TransactionType.ADJUSTMENT]: 'Ajuste',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  [MovementType.REALIZED]: 'Realizado',
  [MovementType.PREDICTED]: 'Previsto',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  [TransactionStatus.PENDING]: 'Pendente',
  [TransactionStatus.SCHEDULED]: 'Agendada',
  [TransactionStatus.OPEN]: 'Em aberto',
  [TransactionStatus.OVERDUE]: 'Vencida',
  [TransactionStatus.PAID]: 'Paga',
  [TransactionStatus.RECEIVED]: 'Recebida',
  [TransactionStatus.PROCESSED]: 'Processada',
  [TransactionStatus.CANCELED]: 'Cancelada',
  [TransactionStatus.PARTIAL]: 'Parcial',
};

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  [TransactionCategory.APPOINTMENT]: 'Atendimento',
  [TransactionCategory.MEDICAL_SERVICE]: 'Serviço Médico',
  [TransactionCategory.EXAM]: 'Exame',
  [TransactionCategory.PROCEDURE]: 'Procedimento',
  [TransactionCategory.SURGERY]: 'Cirurgia',
  [TransactionCategory.TELEMEDICINE]: 'Telemedicina',
  [TransactionCategory.PAYROLL]: 'Folha/Repasse',
  [TransactionCategory.MATERIALS]: 'Materiais',
  [TransactionCategory.MAINTENANCE]: 'Manutenção',
  [TransactionCategory.UTILITIES]: 'Utilidades',
  [TransactionCategory.RENT]: 'Aluguel',
  [TransactionCategory.TAX]: 'Impostos',
  [TransactionCategory.COMMISSION]: 'Comissão',
  [TransactionCategory.MARKETING]: 'Marketing',
  [TransactionCategory.SOFTWARE]: 'Software',
  [TransactionCategory.EQUIPMENT]: 'Equipamento',
  [TransactionCategory.OTHER]: 'Outro',
};

// Status colors para UI
export const STATUS_COLORS: Record<TransactionStatus, string> = {
  [TransactionStatus.PENDING]: 'yellow',
  [TransactionStatus.SCHEDULED]: 'blue',
  [TransactionStatus.OPEN]: 'yellow',
  [TransactionStatus.OVERDUE]: 'red',
  [TransactionStatus.PAID]: 'green',
  [TransactionStatus.RECEIVED]: 'green',
  [TransactionStatus.PROCESSED]: 'green',
  [TransactionStatus.CANCELED]: 'red',
  [TransactionStatus.PARTIAL]: 'orange',
};

// Tipos de transação com cores
export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'green',
  [TransactionType.EXPENSE]: 'red',
  [TransactionType.TRANSFER]: 'blue',
  [TransactionType.REVERSAL]: 'purple',
  [TransactionType.FEE]: 'yellow',
  [TransactionType.ADJUSTMENT]: 'orange',
};
