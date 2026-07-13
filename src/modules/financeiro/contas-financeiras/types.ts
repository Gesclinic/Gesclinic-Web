/**
 * Financial Accounts Types
 * Enterprise module for managing bank accounts, cash, digital wallets, etc.
 */

/**
 * Account type enum
 */
export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CASH = 'CASH',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  INVESTMENT = 'INVESTMENT',
  CREDIT_CARD = 'CREDIT_CARD',
}

/**
 * Account type labels in Portuguese
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.CHECKING]: 'Conta Corrente',
  [AccountType.SAVINGS]: 'Conta Poupança',
  [AccountType.CASH]: 'Caixa',
  [AccountType.DIGITAL_WALLET]: 'Carteira Digital',
  [AccountType.INVESTMENT]: 'Aplicação',
  [AccountType.CREDIT_CARD]: 'Cartão de Crédito',
};

/**
 * Account type icons (using emoji/unicode)
 */
export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  [AccountType.CHECKING]: '🏦',
  [AccountType.SAVINGS]: '🏧',
  [AccountType.CASH]: '💵',
  [AccountType.DIGITAL_WALLET]: '📱',
  [AccountType.INVESTMENT]: '📈',
  [AccountType.CREDIT_CARD]: '💳',
};

/**
 * Financial Account Database Model
 */
export interface FinancialAccount {
  id: string;
  source_table?: 'financial_accounts' | 'finance_accounts';
  clinic_id: string;
  bank_code?: string;
  bank_name: string;
  account_name: string;
  account_type: AccountType;
  agency?: string;
  account_number: string;
  pix_key?: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  account_chart_code?: string;
  account_chart_name?: string;
  default_cost_center?: string;
  participates_cashflow?: boolean;
  allows_reconciliation?: boolean;
  balance_date?: string;
  credit_limit?: number;
  reconciliation_status?: ReconciliationStatus;
  last_reconciliation_at?: string;
  last_movement_at?: string;
  balance_reconciled?: number;
  balance_pending?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Financial Account Create Input
 */
export interface FinancialAccountCreateInput {
  bank_code?: string;
  bank_name: string;
  account_name: string;
  account_type: AccountType;
  agency?: string;
  account_number: string;
  pix_key?: string;
  initial_balance: number;
  currency?: string;
  is_default?: boolean;
  account_chart_code?: string;
  account_chart_name?: string;
  balance_date?: string;
  credit_limit?: number;
  participates_cashflow?: boolean;
  allows_reconciliation?: boolean;
}

/**
 * Financial Account Update Input
 */
export interface FinancialAccountUpdateInput {
  bank_code?: string;
  bank_name?: string;
  account_name?: string;
  account_type?: AccountType;
  agency?: string;
  account_number?: string;
  pix_key?: string;
  initial_balance?: number;
  is_default?: boolean;
  is_active?: boolean;
  account_chart_code?: string;
  account_chart_name?: string;
  balance_date?: string;
  credit_limit?: number;
  participates_cashflow?: boolean;
  allows_reconciliation?: boolean;
}

/**
 * Financial Account Audit Record
 */
export interface FinancialAccountAudit {
  id: string;
  clinic_id: string;
  account_id: string;
  action: 'CREATE' | 'UPDATE';
  changed_fields?: Record<string, boolean>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_by: string;
  changed_at: string;
}

/**
 * Balance Summary by Account Type
 */
export interface BalanceSummary {
  type: AccountType;
  label: string;
  icon: string;
  count: number;
  total_balance: number;
  default_account?: FinancialAccount;
}

/**
 * Consolidated Balance Summary
 */
export interface ConsolidatedBalanceSummary {
  total_balance: number;
  by_account_type: BalanceSummary[];
  total_by_bank: Record<string, number>;
  default_account?: FinancialAccount;
  active_account_count: number;
}

/**
 * Financial Accounts Filter Options
 */
export interface FinancialAccountsFilterOptions {
  search?: string;
  account_type?: AccountType;
  is_active?: boolean;
  bank_name?: string;
  sortBy?: 'account_name' | 'bank_name' | 'current_balance' | 'account_type' | 'created_at' | 'name' | 'balance' | 'type';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Financial Accounts List Response
 */
export interface FinancialAccountsListResponse {
  accounts: FinancialAccount[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * ENTERPRISE TYPES
 */

/**
 * Reconciliation Status Enum
 */
export enum ReconciliationStatus {
  RECONCILED = 'conciliado',
  PENDING = 'pendente',
  DIVERGENT = 'divergente',
}

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatus, string> = {
  [ReconciliationStatus.RECONCILED]: 'Estável',
  [ReconciliationStatus.PENDING]: 'Atenção',
  [ReconciliationStatus.DIVERGENT]: 'Crítico',
};

export const RECONCILIATION_STATUS_COLORS: Record<ReconciliationStatus, string> = {
  [ReconciliationStatus.RECONCILED]: 'bg-green-100 text-green-800',
  [ReconciliationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [ReconciliationStatus.DIVERGENT]: 'bg-red-100 text-red-800',
};

/**
 * Movement Type Enum
 */
export enum MovementType {
  ENTRY = 'entrada',
  EXIT = 'saida',
}

/**
 * Account Movement (Recent Transaction)
 */
export interface AccountMovement {
  id: string;
  clinic_id: string;
  account_id: string;
  movement_date: string;
  description: string;
  amount: number;
  movement_type: MovementType;
  origin?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Account Reconciliation Record
 */
export interface AccountReconciliation {
  id: string;
  clinic_id: string;
  account_id: string;
  reconciliation_date: string;
  balance_statement: number;
  balance_system: number;
  difference: number;
  status: ReconciliationStatus;
  notes?: string;
  reconciled_by?: string;
  reconciled_at?: string;
  created_at: string;
}

/**
 * Enterprise Financial Account (Extended)
 */
export interface FinancialAccountEnterprise extends FinancialAccount {
  bank_code?: string;
  account_chart_code?: string;
  default_cost_center?: string;
  participates_cashflow?: boolean;
  allows_reconciliation?: boolean;
  balance_date?: string;
  credit_limit?: number;
  reconciliation_status?: ReconciliationStatus;
  last_reconciliation_at?: string;
  last_movement_at?: string;
  balance_reconciled?: number;
  balance_pending?: number;
}

/**
 * Dashboard Metrics
 */
export interface DashboardMetrics {
  total_balance: number;
  reconciled_balance: number;
  entries_today: number;
  exits_today: number;
  forecast_7_days: number;
  projected_balance: number;
}

/**
 * Account Card Rich Data
 */
export interface FinancialAccountCardData extends FinancialAccountEnterprise {
  movements_count: number;
  last_movement?: AccountMovement;
  reconciliation_info?: AccountReconciliation;
}
