/**
 * Chart of Accounts Types
 * Central accounting structure for financial module
 */

export type AccountType = 'RECEITA' | 'DESPESA' | 'ATIVO' | 'PASSIVO' | 'PATRIMONIO';
export type AccountNature = 'CREDORA' | 'DEVEDORA';

export interface ChartOfAccount {
  id: string;
  clinic_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  description: string | null;
  type: AccountType;
  nature: AccountNature;
  level: number;
  is_active: boolean;
  accepts_entries: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccountCreateInput {
  clinic_id: string;
  parent_id?: string | null;
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  nature: AccountNature;
}

export interface ChartOfAccountUpdateInput {
  parent_id?: string | null;
  code?: string;
  name?: string;
  description?: string;
  type?: AccountType;
  nature?: AccountNature;
  is_active?: boolean;
  accepts_entries?: boolean;
}

export interface ChartOfAccountTreeNode extends ChartOfAccount {
  children?: ChartOfAccountTreeNode[];
  child_count?: number;
  isExpanded?: boolean;
  isLoading?: boolean;
}

export interface ChartOfAccountFilter {
  search?: string;
  type?: AccountType;
  nature?: AccountNature;
  is_active?: boolean;
  level?: number;
  accepts_entries?: boolean;
}

export interface ChartOfAccountAuditLog {
  id: string;
  account_id: string;
  clinic_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_at: string;
}

export interface ChartOfAccountsContextType {
  accounts: ChartOfAccount[];
  loading: boolean;
  error: string | null;
  selectedAccount: ChartOfAccount | null;
  filters: ChartOfAccountFilter;
  canDelete: (accountId: string) => Promise<boolean>;
}

/**
 * API Response Types
 */
export interface ChartOfAccountsTreeResponse {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  level: number;
  is_active: boolean;
  accepts_entries: boolean;
  child_count: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
