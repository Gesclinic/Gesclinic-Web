/**
 * Financial Accounts API Service
 * Handles all API calls for financial account management
 */

import { supabase } from '@/lib/customSupabaseClient';
import {
  FinancialAccount,
  FinancialAccountCreateInput,
  FinancialAccountUpdateInput,
  FinancialAccountAudit,
  ConsolidatedBalanceSummary,
  BalanceSummary,
  FinancialAccountsFilterOptions,
  FinancialAccountsListResponse,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ICONS,
  AccountType,
} from '../types';

const FINANCIAL_ACCOUNT_SORT_COLUMNS: Record<string, string> = {
  name: 'account_name',
  account_name: 'account_name',
  bank_name: 'bank_name',
  balance: 'current_balance',
  current_balance: 'current_balance',
  type: 'account_type',
  account_type: 'account_type',
  created_at: 'created_at',
};

/**
 * List financial accounts with filters
 * ⚠️ SECURITY: clinic_id is required and enforced
 */
export async function listFinancialAccounts(
  clinicId: string,
  options?: FinancialAccountsFilterOptions
): Promise<FinancialAccountsListResponse> {
  // ⚠️ SECURITY: Validate clinic_id is provided
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }

  try {
    let query = supabase
      .from('financial_accounts')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId); // ⚠️ SECURITY: Filter by clinic_id first

    // Apply filters
    if (options?.search) {
      query = query.or(
        `bank_name.ilike.%${options.search}%,account_name.ilike.%${options.search}%,account_number.ilike.%${options.search}%`
      );
    }

    if (options?.account_type) {
      query = query.eq('account_type', options.account_type);
    }

    if (options?.is_active !== undefined) {
      query = query.eq('is_active', options.is_active);
    }

    if (options?.bank_name) {
      query = query.eq('bank_name', options.bank_name);
    }

    // Apply sorting
    const sortBy = FINANCIAL_ACCOUNT_SORT_COLUMNS[options?.sortBy || 'account_name'] || 'account_name';
    const sortOrder = options?.sortOrder || 'asc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      accounts: data as FinancialAccount[],
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      page_size: limit,
    };
  } catch (error) {
    console.error('Error listing financial accounts:', error);
    throw error;
  }
}

/**
 * Get single financial account
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function getFinancialAccount(
  clinicId: string,
  accountId: string
): Promise<FinancialAccount> {
  // ⚠️ SECURITY: Validate inputs
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }
  if (!accountId || accountId.trim() === '') {
    throw new Error('accountId is required');
  }

  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('clinic_id', clinicId) // ⚠️ SECURITY: Enforce clinic_id filter
      .eq('id', accountId)
      .single();

    if (error) throw error;
    return data as FinancialAccount;
  } catch (error) {
    console.error('Error fetching financial account:', error);
    throw error;
  }
}

/**
 * Create new financial account
 * ⚠️ SECURITY: clinic_id is validated and enforced
 * Note: created_by is set automatically by database trigger to auth.uid()
 */
export async function createFinancialAccount(
  clinicId: string,
  input: FinancialAccountCreateInput,
  userId?: string
): Promise<FinancialAccount> {
  // ⚠️ SECURITY: Validate clinic_id
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }

  try {
    const newAccount: any = {
      clinic_id: clinicId, // ⚠️ SECURITY: Always set clinic_id from parameter
      ...input,
      // DO NOT set created_by here - let database trigger set it to auth.uid()
      // This ensures RLS policies work correctly
      currency: input.currency || 'BRL',
      is_default: input.is_default || false,
    };

    const { data, error } = await supabase
      .from('financial_accounts')
      .insert([newAccount])
      .select()
      .single();

    if (error) throw error;
    return data as FinancialAccount;
  } catch (error) {
    console.error('Error creating financial account:', error);
    throw error;
  }
}

/**
 * Update financial account
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function updateFinancialAccount(
  clinicId: string,
  accountId: string,
  input: FinancialAccountUpdateInput
): Promise<FinancialAccount> {
  // ⚠️ SECURITY: Validate inputs
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }
  if (!accountId || accountId.trim() === '') {
    throw new Error('accountId is required');
  }

  try {
    // ⚠️ SECURITY: First verify the account belongs to the clinic
    const existing = await getFinancialAccount(clinicId, accountId);
    if (existing.clinic_id !== clinicId) {
      throw new Error('Unauthorized: Account does not belong to this clinic');
    }

    const updateData: any = { ...input };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(
      key => updateData[key] === undefined && delete updateData[key]
    );

    const { data, error } = await supabase
      .from('financial_accounts')
      .update(updateData)
      .eq('id', accountId)
      .eq('clinic_id', clinicId) // ⚠️ SECURITY: Enforce clinic_id in WHERE clause
      .select()
      .single();

    if (error) throw error;
    return data as FinancialAccount;
  } catch (error) {
    console.error('Error updating financial account:', error);
    throw error;
  }
}

/**
 * Deactivate financial account (soft delete)
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function deactivateFinancialAccount(
  clinicId: string,
  accountId: string
): Promise<FinancialAccount> {
  // ⚠️ SECURITY: Validate inputs
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }
  if (!accountId || accountId.trim() === '') {
    throw new Error('accountId is required');
  }

  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .update({ is_active: false })
      .eq('id', accountId)
      .eq('clinic_id', clinicId) // ⚠️ SECURITY: Enforce clinic_id
      .select()
      .single();

    if (error) throw error;
    return data as FinancialAccount;
  } catch (error) {
    console.error('Error deactivating financial account:', error);
    throw error;
  }
}

/**
 * Set account as default for clinic
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function setDefaultFinancialAccount(
  clinicId: string,
  accountId: string
): Promise<FinancialAccount> {
  // ⚠️ SECURITY: Validate inputs
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }
  if (!accountId || accountId.trim() === '') {
    throw new Error('accountId is required');
  }

  try {
    // ⚠️ SECURITY: Verify account belongs to clinic
    const account = await getFinancialAccount(clinicId, accountId);
    if (account.clinic_id !== clinicId) {
      throw new Error('Unauthorized: Account does not belong to this clinic');
    }
    
    // This will trigger the ensure_single_default_account trigger
    const { data, error } = await supabase
      .from('financial_accounts')
      .update({ is_default: true })
      .eq('id', accountId)
      .eq('clinic_id', clinicId) // ⚠️ SECURITY: Enforce clinic_id
      .select()
      .single();

    if (error) throw error;
    return data as FinancialAccount;
  } catch (error) {
    console.error('Error setting default financial account:', error);
    throw error;
  }
}

/**
 * Get consolidated balance summary
 */
export async function getConsolidatedBalanceSummary(
  clinicId: string
): Promise<ConsolidatedBalanceSummary> {
  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (error) throw error;

    const accounts = data as FinancialAccount[];
    
    let totalBalance = 0;
    const byAccountType: Record<AccountType, BalanceSummary> = {} as any;
    const byBank: Record<string, number> = {};
    let defaultAccount: FinancialAccount | undefined;

    // Initialize summaries by account type
    Object.values(AccountType).forEach(type => {
      byAccountType[type] = {
        type,
        label: ACCOUNT_TYPE_LABELS[type],
        icon: ACCOUNT_TYPE_ICONS[type],
        count: 0,
        total_balance: 0,
      };
    });

    // Process accounts
    accounts.forEach(account => {
      totalBalance += account.current_balance;
      
      // By account type
      byAccountType[account.account_type].count += 1;
      byAccountType[account.account_type].total_balance += account.current_balance;

      // By bank
      if (!byBank[account.bank_name]) {
        byBank[account.bank_name] = 0;
      }
      byBank[account.bank_name] += account.current_balance;

      // Default account
      if (account.is_default) {
        defaultAccount = account;
        byAccountType[account.account_type].default_account = account;
      }
    });

    return {
      total_balance: totalBalance,
      by_account_type: Object.values(byAccountType).filter(s => s.count > 0 || s.total_balance > 0),
      total_by_bank: byBank,
      default_account: defaultAccount,
      active_account_count: accounts.length,
    };
  } catch (error) {
    console.error('Error getting consolidated balance summary:', error);
    throw error;
  }
}

/**
 * Get default financial account for clinic
 */
export async function getDefaultFinancialAccount(
  clinicId: string
): Promise<FinancialAccount | null> {
  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows returned
      return null;
    }

    if (error) throw error;
    return data as FinancialAccount;
  } catch (error) {
    console.error('Error getting default financial account:', error);
    throw error;
  }
}

/**
 * Get financial account audit history
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function getFinancialAccountAuditHistory(
  clinicId: string,
  accountId: string,
  limit: number = 50
): Promise<FinancialAccountAudit[]> {
  // ⚠️ SECURITY: Validate inputs
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }
  if (!accountId || accountId.trim() === '') {
    throw new Error('accountId is required');
  }

  try {
    const { data, error } = await supabase
      .from('financial_accounts_audit')
      .select('*')
      .eq('clinic_id', clinicId) // ⚠️ SECURITY: Enforce clinic_id filter
      .eq('account_id', accountId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as FinancialAccountAudit[];
  } catch (error) {
    console.error('Error fetching audit history:', error);
    throw error;
  }
}

/**
 * Get total balance by account type for clinic
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function getBalanceByAccountType(
  clinicId: string,
  accountType: AccountType
): Promise<number> {
  // ⚠️ SECURITY: Validate clinic_id
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }

  try {
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('current_balance')
      .eq('clinic_id', clinicId) // ⚠️ SECURITY: Enforce clinic_id filter
      .eq('account_type', accountType)
      .eq('is_active', true);

    if (error) throw error;

    const total = (data as any[]).reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
    return total;
  } catch (error) {
    console.error('Error getting balance by account type:', error);
    throw error;
  }
}

/**
 * ENTERPRISE FUNCTIONS
 */

/**
 * List account movements with pagination
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function listAccountMovements(
  clinicId: string,
  accountId?: string,
  limit: number = 50,
  offset: number = 0
) {
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }

  try {
    let query = supabase
      .from('account_movements')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('movement_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { movements: data || [], total: count || 0 };
  } catch (error) {
    console.error('Error listing account movements:', error);
    throw error;
  }
}

/**
 * Create account movement
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function createAccountMovement(
  clinicId: string,
  accountId: string,
  data: {
    movement_date: string;
    description: string;
    amount: number;
    movement_type: 'entrada' | 'saida';
    origin?: string;
    notes?: string;
  }
) {
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }

  try {
    const { data: result, error } = await supabase
      .from('account_movements')
      .insert([
        {
          clinic_id: clinicId,
          account_id: accountId,
          ...data,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error creating account movement:', error);
    throw error;
  }
}

/**
 * Get dashboard metrics
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function getDashboardMetrics(clinicId: string) {
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }

  try {
    const toNumber = (value: unknown) => Number(value || 0);

    const { data: accounts, error: accountsError } = await supabase
      .from('financial_accounts')
      .select('current_balance, balance_reconciled, balance_pending')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (accountsError) throw accountsError;

    const totalBalance = (accounts || []).reduce(
      (sum: number, account: any) => sum + toNumber(account.current_balance),
      0
    );
    const reconciledBalance = (accounts || []).reduce(
      (sum: number, account: any) => sum + toNumber(account.balance_reconciled),
      0
    );
    const pendingBalance = (accounts || []).reduce(
      (sum: number, account: any) => sum + toNumber(account.balance_pending),
      0
    );

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: movements, error: movementsError } = await supabase
      .from('account_movements')
      .select('movement_date, amount, movement_type')
      .eq('clinic_id', clinicId)
      .gte('movement_date', today)
      .lte('movement_date', sevenDaysFromNow);

    if (movementsError) {
      console.warn('Account movements unavailable for dashboard metrics:', movementsError);
    }

    const accountMovements = movementsError ? [] : movements || [];
    const todayMovements = accountMovements.filter((movement: any) => movement.movement_date === today);

    const entriesTotal = todayMovements
      .filter((movement: any) => movement.movement_type === 'entrada')
      .reduce((sum: number, movement: any) => sum + toNumber(movement.amount), 0);

    const exitsTotal = todayMovements
      .filter((movement: any) => movement.movement_type === 'saida')
      .reduce((sum: number, movement: any) => sum + toNumber(movement.amount), 0);

    const forecast7Days = accountMovements.reduce((sum: number, movement: any) => {
      const amount = toNumber(movement.amount);
      return movement.movement_type === 'entrada' ? sum + amount : sum - amount;
    }, 0);

    return {
      total_balance: totalBalance,
      reconciled_balance: reconciledBalance,
      entries_today: entriesTotal,
      exits_today: exitsTotal,
      forecast_7_days: forecast7Days || pendingBalance,
      projected_balance: totalBalance + (forecast7Days || pendingBalance),
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    throw error;
  }
}

/**
 * Get reconciliation records for account
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function getAccountReconciliationHistory(
  clinicId: string,
  accountId: string,
  limit: number = 50
) {
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }

  try {
    const { data, error } = await supabase
      .from('account_reconciliation')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('account_id', accountId)
      .order('reconciliation_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting reconciliation history:', error);
    throw error;
  }
}

/**
 * Create reconciliation record
 * ⚠️ SECURITY: clinic_id is required and validated
 */
export async function createReconciliation(
  clinicId: string,
  accountId: string,
  data: {
    reconciliation_date: string;
    balance_statement: number;
    balance_system: number;
    status: 'conciliado' | 'pendente' | 'divergente';
    notes?: string;
  }
) {
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }

  try {
    const { data: result, error } = await supabase
      .from('account_reconciliation')
      .insert([
        {
          clinic_id: clinicId,
          account_id: accountId,
          ...data,
          reconciled_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Update account reconciliation status
    if (result) {
      await supabase
        .from('financial_accounts')
        .update({ reconciliation_status: result.status })
        .eq('id', accountId)
        .eq('clinic_id', clinicId);
    }

    return result;
  } catch (error) {
    console.error('Error creating reconciliation:', error);
    throw error;
  }
}
