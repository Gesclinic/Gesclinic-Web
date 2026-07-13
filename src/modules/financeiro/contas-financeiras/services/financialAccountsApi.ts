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

const ACCOUNT_TYPE_LABEL_TO_ENUM: Record<string, AccountType> = {
  'CONTA CORRENTE': AccountType.CHECKING,
  'CONTA POUPANCA': AccountType.SAVINGS,
  'CAIXA': AccountType.CASH,
  'CARTEIRA DIGITAL': AccountType.DIGITAL_WALLET,
  'APLICACAO': AccountType.INVESTMENT,
  'CARTAO DE CREDITO': AccountType.CREDIT_CARD,
};

function normalizeAccountType(value: unknown): AccountType {
  const raw = String(value || '').trim().toUpperCase();
  if (Object.values(AccountType).includes(raw as AccountType)) {
    return raw as AccountType;
  }

  const withoutAccents = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ACCOUNT_TYPE_LABEL_TO_ENUM[withoutAccents] || AccountType.CHECKING;
}

function legacyAccountTypeFromFinancial(type: AccountType): string {
  if ([AccountType.CHECKING, AccountType.SAVINGS, AccountType.INVESTMENT].includes(type)) return 'BANCO';
  if (type === AccountType.CASH) return 'DINHEIRO';
  if (type === AccountType.DIGITAL_WALLET) return 'PIX';
  if (type === AccountType.CREDIT_CARD) return 'CARTAO';
  return 'BANCO';
}

const LEGACY_META_PREFIX = 'GESCLINIC_META:';

function buildLegacyMetadata(input: FinancialAccountCreateInput | FinancialAccountUpdateInput) {
  return `${LEGACY_META_PREFIX}${JSON.stringify({
    pix_key: input.pix_key || null,
    initial_balance: input.initial_balance ?? null,
    current_balance: input.initial_balance ?? null,
    account_chart_code: input.account_chart_code || null,
    account_chart_name: input.account_chart_name || null,
    balance_date: input.balance_date || null,
    credit_limit: input.credit_limit ?? null,
    participates_cashflow: input.participates_cashflow ?? null,
    allows_reconciliation: input.allows_reconciliation ?? null,
  })}`;
}

function parseLegacyMetadata(account: any) {
  const raw = String(account.account_holder || '');
  if (!raw.startsWith(LEGACY_META_PREFIX)) {
    return {};
  }

  try {
    return JSON.parse(raw.slice(LEGACY_META_PREFIX.length));
  } catch {
    return {};
  }
}

function buildLegacyFinancialAccountUpdate(input: FinancialAccountUpdateInput) {
  const legacyType = input.account_type ? legacyAccountTypeFromFinancial(normalizeAccountType(input.account_type)) : undefined;
  const legacyUpdate: any = {
    account_name: input.account_name,
    account_type: legacyType,
    bank_name: input.bank_name,
    bank_code: input.bank_code,
    agency_code: input.agency,
    account_number: input.account_number,
    pix_key: input.pix_key,
    initial_balance: input.initial_balance,
    current_balance: input.initial_balance,
    account_chart_code: input.account_chart_code,
    account_chart_name: input.account_chart_name,
    balance_date: input.balance_date,
    credit_limit: input.credit_limit,
    participates_cashflow: input.participates_cashflow,
    allows_reconciliation: input.allows_reconciliation,
    account_holder: buildLegacyMetadata(input),
    is_active: input.is_active,
    updated_at: new Date().toISOString(),
  };

  Object.keys(legacyUpdate).forEach(
    key => legacyUpdate[key] === undefined && delete legacyUpdate[key]
  );

  return legacyUpdate;
}

function buildLegacyFinancialAccountInsert(clinicId: string, input: FinancialAccountCreateInput) {
  const legacyType = legacyAccountTypeFromFinancial(normalizeAccountType(input.account_type));
  const balance = Number(input.initial_balance || 0);

  return {
    clinic_id: clinicId,
    account_name: input.account_name,
    account_type: legacyType,
    bank_name: input.bank_name || null,
    bank_code: input.bank_code || null,
    agency_code: input.agency || null,
    account_number: input.account_number || null,
    pix_key: input.pix_key || null,
    initial_balance: balance,
    current_balance: balance,
    account_chart_code: input.account_chart_code || null,
    account_chart_name: input.account_chart_name || null,
    balance_date: input.balance_date || null,
    credit_limit: Number(input.credit_limit || 0),
    participates_cashflow: input.participates_cashflow !== false,
    allows_reconciliation: input.allows_reconciliation !== false,
    account_holder: buildLegacyMetadata(input),
    is_active: true,
  };
}

function removeUnsupportedLegacyColumn(update: Record<string, any>, error: any) {
  const fallback = { ...update };
  const message = String(error?.message || '');
  const match = message.match(/Could not find the '([^']+)' column/i);
  const missingColumn = match?.[1];

  if (missingColumn && missingColumn in fallback) {
    delete fallback[missingColumn];
    if (missingColumn === 'initial_balance') {
      delete fallback.current_balance;
    }
  } else {
    delete fallback.initial_balance;
    delete fallback.current_balance;
    delete fallback.bank_code;
    delete fallback.pix_key;
    delete fallback.account_chart_code;
    delete fallback.balance_date;
    delete fallback.credit_limit;
    delete fallback.participates_cashflow;
    delete fallback.allows_reconciliation;
  }

  return fallback;
}

function normalizeLegacyFinancialAccount(account: any): FinancialAccount {
  const metadata: any = parseLegacyMetadata(account);
  const accountType = normalizeAccountType(account.account_type || account.type);
  const currentBalance = Number(account.current_balance ?? metadata.current_balance ?? account.balance ?? account.initial_balance ?? metadata.initial_balance ?? 0);
  const initialBalance = Number(account.initial_balance ?? metadata.initial_balance ?? account.opening_balance ?? account.balance ?? account.current_balance ?? metadata.current_balance ?? 0);

  return {
    ...account,
    id: account.id,
    source_table: 'finance_accounts',
    clinic_id: account.clinic_id,
    bank_code: account.bank_code || undefined,
    bank_name: account.bank_name || account.bank || account.name || 'Conta financeira',
    account_name: account.account_name || account.name || account.bank_name || 'Conta financeira',
    account_type: accountType,
    agency: account.agency || account.agency_code || undefined,
    account_number: account.account_number || account.number || '',
    pix_key: account.pix_key || metadata.pix_key || undefined,
    initial_balance: initialBalance,
    current_balance: currentBalance,
    currency: account.currency || 'BRL',
    is_default: Boolean(account.is_default),
    is_active: account.is_active !== false,
    participates_cashflow: account.participates_cashflow ?? metadata.participates_cashflow ?? true,
    allows_reconciliation: account.allows_reconciliation ?? metadata.allows_reconciliation ?? true,
    account_chart_code: account.account_chart_code || metadata.account_chart_code || undefined,
    account_chart_name: account.account_chart_name || metadata.account_chart_name || undefined,
    balance_date: account.balance_date || metadata.balance_date || undefined,
    credit_limit: Number(account.credit_limit ?? metadata.credit_limit ?? 0),
    created_by: account.created_by || '',
    created_at: account.created_at || new Date().toISOString(),
    updated_at: account.updated_at || account.created_at || new Date().toISOString(),
  } as FinancialAccount;
}

function normalizePrimaryFinancialAccount(account: any): FinancialAccount {
  return {
    ...account,
    source_table: 'financial_accounts',
  } as FinancialAccount;
}

async function enrichAccountsWithTransferBalances(clinicId: string, accounts: FinancialAccount[]): Promise<FinancialAccount[]> {
  if (accounts.length === 0) {
    return accounts;
  }

  const accountIds = accounts
    .filter((account) => account.source_table === 'finance_accounts')
    .map((account) => account.id);

  if (accountIds.length === 0) {
    return accounts;
  }

  const { data, error } = await supabase
    .from('cash_transfers')
    .select('from_account_id, to_account_id, amount, status')
    .eq('clinic_id', clinicId)
    .eq('status', 'confirmed')
    .or(`from_account_id.in.(${accountIds.join(',')}),to_account_id.in.(${accountIds.join(',')})`);

  if (error) {
    console.warn('Error enriching account transfer balances:', error.message);
    return accounts;
  }

  const balanceByAccountId = (data || []).reduce<Record<string, number>>((acc, transfer: any) => {
    const amount = Number(transfer.amount || 0);
    if (transfer.to_account_id) {
      acc[transfer.to_account_id] = Number(((acc[transfer.to_account_id] || 0) + amount).toFixed(2));
    }
    if (transfer.from_account_id) {
      acc[transfer.from_account_id] = Number(((acc[transfer.from_account_id] || 0) - amount).toFixed(2));
    }
    return acc;
  }, {});

  return accounts.map((account) => {
    if (account.source_table !== 'finance_accounts') {
      return account;
    }

    const transferBalance = Number(balanceByAccountId[account.id] || 0);
    if (!transferBalance) {
      return account;
    }

    return {
      ...account,
      current_balance: Number((Number(account.current_balance || 0) + transferBalance).toFixed(2)),
    };
  });
}

function accountMatchesFilters(account: FinancialAccount, options?: FinancialAccountsFilterOptions): boolean {
  if (options?.search) {
    const search = options.search.toLowerCase();
    const haystack = [account.bank_name, account.account_name, account.account_number]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(search)) return false;
  }

  if (options?.account_type && account.account_type !== options.account_type) return false;
  if (options?.is_active !== undefined && account.is_active !== options.is_active) return false;
  if (options?.bank_name && account.bank_name !== options.bank_name) return false;

  return true;
}

function isRowLevelSecurityError(error: any): boolean {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return message.includes('row-level security') || message.includes('violates row-level security policy');
}

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

    const { data: legacyData, error: legacyError } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('clinic_id', clinicId);

    if (legacyError) {
      console.warn('Error listing legacy finance_accounts:', legacyError.message);
    }

    const legacyAccounts = (legacyData || [])
      .map(normalizeLegacyFinancialAccount)
      .filter((account) => accountMatchesFilters(account, options));

    const accounts = [
      ...((data || []).map(normalizePrimaryFinancialAccount)),
      ...legacyAccounts,
    ];

    const uniqueAccounts = Array.from(
      new Map(accounts.map((account) => [`${account.source_table || 'financial_accounts'}:${account.id}:${account.account_name}`, account])).values(),
    );
    const accountsWithBalances = await enrichAccountsWithTransferBalances(clinicId, uniqueAccounts);

    return {
      accounts: accountsWithBalances,
      total: (count || 0) + legacyAccounts.length,
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
      .limit(1);

    if (error) {
      if (!isRowLevelSecurityError(error)) throw error;
    } else if ((data || []).length > 0) {
      return normalizePrimaryFinancialAccount(data[0]);
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('id', accountId)
      .limit(1);

    if (legacyError) throw legacyError;
    if ((legacyData || []).length === 0) {
      throw new Error('Conta financeira não encontrada');
    }

    return normalizeLegacyFinancialAccount(legacyData[0]);
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
      account_type: normalizeAccountType(input.account_type),
      // DO NOT set created_by here - let database trigger set it to auth.uid()
      // This ensures RLS policies work correctly
      currency: input.currency || 'BRL',
      is_default: input.is_default || false,
    };

    const { data, error } = await supabase
      .from('financial_accounts')
      .insert([newAccount])
      .select()
      .limit(1);

    if (error) {
      if (!isRowLevelSecurityError(error)) throw error;

      let legacyPayload = buildLegacyFinancialAccountInsert(clinicId, input);
      let legacyData: any[] | null = null;
      let legacyError: any = null;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const result = await supabase
          .from('finance_accounts')
          .insert([legacyPayload])
          .select()
          .limit(1);

        legacyData = result.data;
        legacyError = result.error;

        if (!legacyError) {
          break;
        }

        const nextPayload = removeUnsupportedLegacyColumn(legacyPayload, legacyError);
        if (Object.keys(nextPayload).length === Object.keys(legacyPayload).length) {
          break;
        }
        legacyPayload = nextPayload as ReturnType<typeof buildLegacyFinancialAccountInsert>;
      }

      if (legacyError) {
        throw legacyError;
      }
      return normalizeLegacyFinancialAccount((legacyData || [])[0] || legacyPayload);
    }
    return normalizePrimaryFinancialAccount((data || [])[0]);
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
      .limit(1);

    if (!error && (data || []).length > 0) {
      return normalizePrimaryFinancialAccount(data[0]);
    }

    if (error && !isRowLevelSecurityError(error)) {
      console.warn('financial_accounts update failed, trying legacy finance_accounts:', error.message);
    }

    const legacyUpdate = buildLegacyFinancialAccountUpdate(input);

    let legacyUpdateToApply = legacyUpdate;
    let legacyData: any[] | null = null;
    let legacyError: any = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = await supabase
      .from('finance_accounts')
        .update(legacyUpdateToApply)
      .eq('id', accountId)
      .eq('clinic_id', clinicId)
      .select()
      .limit(1);

      legacyData = result.data;
      legacyError = result.error;

      if (!legacyError) {
        break;
      }

      const nextUpdate = removeUnsupportedLegacyColumn(legacyUpdateToApply, legacyError);
      if (Object.keys(nextUpdate).length === Object.keys(legacyUpdateToApply).length) {
        break;
      }
      legacyUpdateToApply = nextUpdate;
    }

    if (legacyError) {
      throw legacyError;
    }

    return normalizeLegacyFinancialAccount((legacyData || [])[0] || { id: accountId, clinic_id: clinicId, ...legacyUpdateToApply });
  } catch (error) {
    console.error('Error updating financial account:', error);
    throw error;
  }
}

/**
 * Deactivate financial account (soft delete)
 * ⚠️ SECURITY: clinic_id is required and validated
 */
type AccountStorageTable = 'financial_accounts' | 'finance_accounts';

async function countAccountLinks(tableName: string, clinicId: string, accountId: string, columnName: string) {
  const { count, error } = await supabase
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .eq(columnName, accountId);

  if (error) throw error;
  return count || 0;
}

async function countTransferLinks(clinicId: string, accountId: string) {
  const { count, error } = await supabase
    .from('cash_transfers')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);

  if (error) throw error;
  return count || 0;
}

async function accountHasMovementLinks(clinicId: string, accountId: string) {
  const [movements, reconciliations, bankReconciliations, financialTransactions, transfers] = await Promise.all([
    countAccountLinks('account_movements', clinicId, accountId, 'account_id'),
    countAccountLinks('account_reconciliation', clinicId, accountId, 'account_id'),
    countAccountLinks('bank_reconciliation', clinicId, accountId, 'account_id'),
    countAccountLinks('financial_transactions', clinicId, accountId, 'account_id'),
    countTransferLinks(clinicId, accountId),
  ]);

  return movements + reconciliations + bankReconciliations + financialTransactions + transfers > 0;
}

async function deleteAccountById(tableName: AccountStorageTable, clinicId: string, accountId: string) {
  const { data, error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', accountId)
    .eq('clinic_id', clinicId)
    .select('id');

  return { deleted: data || [], error };
}

async function deleteAccountByIdentity(tableName: AccountStorageTable, clinicId: string, account: FinancialAccount) {
  if (!account.account_name) return { deleted: [], error: null };

  let query = supabase
    .from(tableName)
    .delete()
    .eq('clinic_id', clinicId)
    .eq('account_name', account.account_name);

  if (account.bank_name) query = query.eq('bank_name', account.bank_name);
  if (account.account_number) query = query.eq('account_number', account.account_number);

  const { data, error } = await query.select('id');
  return { deleted: data || [], error };
}

async function deactivateAccountById(tableName: AccountStorageTable, clinicId: string, accountId: string) {
  const updates = tableName === 'financial_accounts'
    ? {
        is_active: false,
        is_default: false,
        updated_at: new Date().toISOString(),
      }
    : {
        is_active: false,
        updated_at: new Date().toISOString(),
      };

  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', accountId)
    .eq('clinic_id', clinicId)
    .select('id');

  return { updated: data || [], error };
}

async function deactivateAccountByIdentity(tableName: AccountStorageTable, clinicId: string, account: FinancialAccount) {
  if (!account.account_name) return { updated: [], error: null };
  const updates = tableName === 'financial_accounts'
    ? {
        is_active: false,
        is_default: false,
        updated_at: new Date().toISOString(),
      }
    : {
        is_active: false,
        updated_at: new Date().toISOString(),
      };

  let query = supabase
    .from(tableName)
    .update(updates)
    .eq('clinic_id', clinicId)
    .eq('account_name', account.account_name);

  if (account.bank_name) query = query.eq('bank_name', account.bank_name);
  if (account.account_number) query = query.eq('account_number', account.account_number);

  const { data, error } = await query.select('id');
  return { updated: data || [], error };
}

export async function deactivateFinancialAccount(
  clinicId: string,
  account: string | FinancialAccount
): Promise<FinancialAccount> {
  // ⚠️ SECURITY: Validate inputs
  if (!clinicId || clinicId.trim() === '') {
    throw new Error('clinic_id is required');
  }
  const accountId = typeof account === 'string' ? account : account.id;
  if (!accountId || accountId.trim() === '') {
    throw new Error('accountId is required');
  }

  try {
    const requestedSource = typeof account === 'string' ? undefined : account.source_table;
    const tableOrder: AccountStorageTable[] = requestedSource
      ? [requestedSource, requestedSource === 'financial_accounts' ? 'finance_accounts' : 'financial_accounts']
      : ['financial_accounts', 'finance_accounts'];

    const errors: string[] = [];
    const hasLinks = await accountHasMovementLinks(clinicId, accountId);

    if (!hasLinks) {
      let deletedCount = 0;

      for (const tableName of tableOrder) {
        const { deleted, error } = await deleteAccountById(tableName, clinicId, accountId);
        if (error) {
          errors.push(`${tableName}: ${error.message}`);
        }
        deletedCount += deleted.length;
      }

      if (deletedCount === 0 && typeof account !== 'string') {
        for (const tableName of tableOrder) {
          const { deleted, error } = await deleteAccountByIdentity(tableName, clinicId, account);
          if (error) {
            errors.push(`${tableName} identity: ${error.message}`);
          }
          deletedCount += deleted.length;
        }
      }

      if (deletedCount > 0) {
        return normalizeLegacyFinancialAccount({ id: accountId, clinic_id: clinicId, is_active: false, source_table: requestedSource });
      }
    }

    let updatedCount = 0;

    for (const tableName of tableOrder) {
      const { updated, error } = await deactivateAccountById(tableName, clinicId, accountId);
      if (error) {
        errors.push(`${tableName}: ${error.message}`);
      }
      updatedCount += updated.length;
    }

    if (updatedCount === 0 && typeof account !== 'string') {
      for (const tableName of tableOrder) {
        const { updated, error } = await deactivateAccountByIdentity(tableName, clinicId, account);
        if (error) {
          errors.push(`${tableName} identity: ${error.message}`);
        }
        updatedCount += updated.length;
      }
    }

    if (updatedCount === 0) {
      throw new Error(errors.length > 0 ? errors.join(' | ') : 'Nenhuma conta financeira foi desativada');
    }

    return normalizeLegacyFinancialAccount({ id: accountId, clinic_id: clinicId, is_active: false, source_table: requestedSource });
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
      .limit(1);

    if (!error && (data || []).length > 0) {
      return data[0] as FinancialAccount;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('finance_accounts')
      .update({ is_default: true })
      .eq('id', accountId)
      .eq('clinic_id', clinicId)
      .select()
      .limit(1);

    if (legacyError) throw legacyError;
    return normalizeLegacyFinancialAccount((legacyData || [])[0] || { id: accountId, clinic_id: clinicId, is_default: true });
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
    const { accounts } = await listFinancialAccounts(clinicId, { is_active: true, limit: 500, offset: 0 });
    
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
      .limit(1);

    if (error) throw error;
    if ((data || []).length > 0) {
      return data[0] as FinancialAccount;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_default', true)
      .limit(1);

    if (legacyError) return null;
    return (legacyData || []).length > 0 ? normalizeLegacyFinancialAccount(legacyData[0]) : null;
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

    const { accounts } = await listFinancialAccounts(clinicId, { is_active: true, limit: 500, offset: 0 });

    const totalBalance = accounts.reduce(
      (sum: number, account: any) => sum + toNumber(account.current_balance),
      0
    );
    const reconciledBalance = accounts.reduce(
      (sum: number, account: any) => sum + toNumber(account.balance_reconciled),
      0
    );
    const pendingBalance = accounts.reduce(
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
