/**
 * Chart of Accounts API Service
 * Handles all database operations for financial chart of accounts
 */

import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';
import {
  ChartOfAccount,
  ChartOfAccountCreateInput,
  ChartOfAccountUpdateInput,
  ChartOfAccountTreeNode,
  ChartOfAccountFilter,
  ChartOfAccountAuditLog,
  ChartOfAccountsTreeResponse,
  ListResponse,
} from '../types';

/**
 * List all accounts for a clinic with optional filters
 */
export async function listChartOfAccounts(
  clinicId: string,
  filters?: ChartOfAccountFilter,
  pagination?: { page?: number; limit?: number }
): Promise<ListResponse<ChartOfAccount>> {
  try {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 100;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase.rpc('get_chart_of_accounts_tree', {
      p_clinic_id: clinicId,
    });

    if (error) throw error;

    const flatten = (nodes: any[], parentName = ''): Array<ChartOfAccount & { parentName?: string }> =>
      (nodes || []).flatMap((node) => {
        const { children = [], ...account } = node;
        return [
          { ...account, parentName },
          ...flatten(children, node.name),
        ];
      });

    const allAccounts = flatten(data || []);

    const matchesFilters = (account: ChartOfAccount & { parentName?: string }) => {
      const search = filters?.search?.trim().toLowerCase();

      if (search) {
        const haystack = `${account.code || ''} ${account.name || ''} ${account.description || ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (filters?.type && account.type !== filters.type) return false;
      if (filters?.nature && account.nature !== filters.nature) return false;
      if (filters?.is_active !== undefined && account.is_active !== filters.is_active) return false;
      if (filters?.level && account.level !== filters.level) return false;
      if (filters?.accepts_entries !== undefined && account.accepts_entries !== filters.accepts_entries) return false;

      return true;
    };

    const filtered = allAccounts.filter(matchesFilters);
    const total = filtered.length;
    const pageItems = filtered
      .sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'))
      .slice(offset, offset + limit);

    return {
      data: pageItems as ChartOfAccount[],
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error listing chart of accounts:', error);
    throw error;
  }
}

/**
 * Get chart of accounts in hierarchical tree format
 */
export async function getChartOfAccountsTree(
  clinicId: string,
  activeOnly: boolean = true
): Promise<ChartOfAccountTreeNode[]> {
  try {
    // Use RPC function for efficient tree retrieval
    const { data, error } = await supabase.rpc('get_chart_of_accounts_tree', {
      p_clinic_id: clinicId,
    });

    if (error) throw error;

    // Build tree structure
    const accountMap = new Map<string, ChartOfAccountTreeNode>();
    const roots: ChartOfAccountTreeNode[] = [];

    // First pass: create all nodes
    (data || []).forEach((item: ChartOfAccountsTreeResponse) => {
      if (!activeOnly || item.is_active) {
        const node: ChartOfAccountTreeNode = {
          ...item,
          children: [],
          isExpanded: false,
          isLoading: false,
        };
        accountMap.set(item.id, node);
      }
    });

    // Second pass: build hierarchy
    accountMap.forEach((node) => {
      if (node.parent_id && accountMap.has(node.parent_id)) {
        const parent = accountMap.get(node.parent_id)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort children by code
    const sortByCode = (nodes: ChartOfAccountTreeNode[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'));
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortByCode(node.children);
        }
      });
    };

    sortByCode(roots);

    return roots;
  } catch (error) {
    console.error('Error getting chart of accounts tree:', error);
    throw error;
  }
}

/**
 * Get single account by ID
 */
export async function getChartOfAccountById(
  accountId: string
): Promise<ChartOfAccount> {
  try {
    const { data, error } = await supabase
      .from('financial_chart_of_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting chart of account:', error);
    throw error;
  }
}

/**
 * Create new account
 */
export async function createChartOfAccount(
  input: ChartOfAccountCreateInput,
  userId: string
): Promise<ChartOfAccount> {
  try {
    // Calculate level
    let level = 1;
    if (input.parent_id) {
      const parent = await getChartOfAccountById(input.parent_id);
      level = (parent.level || 1) + 1;
    }

    const { data, error } = await supabase
      .from('financial_chart_of_accounts')
      .insert({
        ...input,
        level,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating chart of account:', error);
    throw error;
  }
}

/**
 * Update account
 */
export async function updateChartOfAccount(
  accountId: string,
  input: ChartOfAccountUpdateInput
): Promise<ChartOfAccount> {
  try {
    const { data, error } = await supabase
      .from('financial_chart_of_accounts')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating chart of account:', error);
    throw error;
  }
}

/**
 * Toggle account active status
 */
export async function toggleChartOfAccountStatus(
  accountId: string,
  isActive: boolean
): Promise<ChartOfAccount> {
  return updateChartOfAccount(accountId, { is_active: isActive });
}

/**
 * Delete account (with validation)
 */
export async function deleteChartOfAccount(
  accountId: string
): Promise<void> {
  try {
    // Validate account can be deleted
    const canDelete = await canDeleteAccount(accountId);
    if (!canDelete) {
      throw new Error(
        'Cannot delete account: it has child accounts or active entries'
      );
    }

    const { error } = await supabase
      .from('financial_chart_of_accounts')
      .delete()
      .eq('id', accountId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting chart of account:', error);
    throw error;
  }
}

/**
 * Check if account can be deleted
 */
export async function canDeleteAccount(accountId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_delete_chart_account', {
      p_account_id: accountId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error checking if account can be deleted:', error);
    return false;
  }
}

/**
 * Get account audit logs
 */
export async function getChartOfAccountAuditLogs(
  clinicId: string,
  accountId?: string
): Promise<ChartOfAccountAuditLog[]> {
  try {
    let query = supabase
      .from('financial_chart_of_accounts_audit')
      .select('*')
      .eq('clinic_id', clinicId);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query
      .order('changed_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw error;
  }
}

/**
 * Batch create default chart of accounts for a new clinic
 */
export async function createDefaultChartOfAccounts(
  clinicId: string,
  userId: string
): Promise<ChartOfAccount[]> {
  try {
    const defaults = [
      {
        code: '1',
        name: 'RECEITAS',
        type: 'RECEITA' as const,
        nature: 'CREDORA' as const,
      },
      {
        code: '1.1',
        name: 'CONSULTAS',
        type: 'RECEITA' as const,
        nature: 'CREDORA' as const,
        parent_code: '1',
      },
      {
        code: '1.1.01',
        name: 'PARTICULAR',
        type: 'RECEITA' as const,
        nature: 'CREDORA' as const,
        parent_code: '1.1',
      },
      {
        code: '2',
        name: 'DESPESAS',
        type: 'DESPESA' as const,
        nature: 'DEVEDORA' as const,
      },
      {
        code: '2.1',
        name: 'PESSOAL',
        type: 'DESPESA' as const,
        nature: 'DEVEDORA' as const,
        parent_code: '2',
      },
      {
        code: '3',
        name: 'ATIVOS',
        type: 'ATIVO' as const,
        nature: 'DEVEDORA' as const,
      },
      {
        code: '4',
        name: 'PASSIVOS',
        type: 'PASSIVO' as const,
        nature: 'CREDORA' as const,
      },
      {
        code: '5',
        name: 'PATRIMONIO',
        type: 'PATRIMONIO' as const,
        nature: 'CREDORA' as const,
      },
    ];

    const createdAccounts: ChartOfAccount[] = [];
    const codeToIdMap = new Map<string, string>();

    for (const item of defaults) {
      const { parent_code, ...accountData } = item as any;

      const parentId = parent_code ? codeToIdMap.get(parent_code) : undefined;

      const account = await createChartOfAccount(
        {
          clinic_id: clinicId,
          parent_id: parentId,
          ...accountData,
        },
        userId
      );

      createdAccounts.push(account);
      codeToIdMap.set(item.code, account.id);
    }

    return createdAccounts;
  } catch (error) {
    console.error('Error creating default chart of accounts:', error);
    throw error;
  }
}

/**
 * Export chart of accounts to CSV format
 */
export async function exportChartOfAccountsToCSV(
  clinicId: string,
  tree: ChartOfAccountTreeNode[]
): Promise<string> {
  try {
    const csv = ['Code,Name,Type,Nature,Level,Active,Accepts Entries'];

    const processNode = (node: ChartOfAccountTreeNode) => {
      csv.push(
        `"${node.code}","${node.name}","${node.type}","${node.nature}",${node.level},${node.is_active},${node.accepts_entries}`
      );

      if (node.children && node.children.length > 0) {
        node.children.forEach(processNode);
      }
    };

    tree.forEach(processNode);

    return csv.join('\n');
  } catch (error) {
    console.error('Error exporting chart of accounts:', error);
    throw error;
  }
}
