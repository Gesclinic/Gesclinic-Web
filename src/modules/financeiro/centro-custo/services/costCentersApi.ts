// src/modules/financeiro/centro-custo/services/costCentersApi.ts

import { supabase } from '@/lib/customSupabaseClient';
import type {
  CostCenter,
  CostCenterNode,
  CostCenterAudit,
  CostCenterFilters,
  CreateCostCenterPayload,
  UpdateCostCenterPayload,
} from '../types';

/**
 * List all cost centers for a clinic with optional filters
 */
export async function listCostCenters(
  clinicId: string,
  filters?: CostCenterFilters
): Promise<CostCenter[]> {
  let query = supabase
    .from('financial_cost_centers')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('code', { ascending: true });

  if (filters?.is_active !== null && filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters?.search) {
    query = query.or(
      `code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  if (filters?.parent_id !== undefined) {
    if (filters.parent_id === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', filters.parent_id);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get hierarchical tree of cost centers
 */
export async function getCostCentersTree(clinicId: string): Promise<CostCenterNode[]> {
  const { data, error } = await supabase.rpc('get_cost_centers_tree', {
    p_clinic_id: clinicId,
  });

  if (error) throw error;

  // Build tree structure from flat data
  const buildTree = (items: CostCenterNode[], parentId: string | null = null): CostCenterNode[] => {
    return items
      .filter((item) => item.parent_id === parentId)
      .map((item) => ({
        ...item,
        children: buildTree(items, item.id),
      }));
  };

  return buildTree(data || []);
}

/**
 * Get a single cost center by ID
 */
export async function getCostCenter(id: string): Promise<CostCenter | null> {
  const { data, error } = await supabase
    .from('financial_cost_centers')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Create a new cost center
 */
export async function createCostCenter(
  clinicId: string,
  payload: CreateCostCenterPayload
): Promise<CostCenter> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('financial_cost_centers')
    .insert({
      clinic_id: clinicId,
      code: payload.code,
      name: payload.name,
      description: payload.description || null,
      center_type: payload.center_type || 'OPERACOES',
      unit_name: payload.unit_name || null,
      responsible_name: payload.responsible_name || null,
      color: payload.color || null,
      icon: payload.icon || null,
      metadata: payload.metadata || null,
      parent_id: payload.parent_id || null,
      manager_id: payload.manager_id || null,
      is_active: payload.is_active !== false,
      created_by: user.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a cost center
 */
export async function updateCostCenter(
  id: string,
  payload: UpdateCostCenterPayload
): Promise<CostCenter> {
  // Build update object, excluding undefined values
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.code !== undefined) updates.code = payload.code;
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.center_type !== undefined) updates.center_type = payload.center_type;
  if (payload.unit_name !== undefined) updates.unit_name = payload.unit_name;
  if (payload.responsible_name !== undefined) updates.responsible_name = payload.responsible_name;
  if (payload.color !== undefined) updates.color = payload.color;
  if (payload.icon !== undefined) updates.icon = payload.icon;
  if (payload.metadata !== undefined) updates.metadata = payload.metadata;
  if (payload.parent_id !== undefined) updates.parent_id = payload.parent_id;
  if (payload.manager_id !== undefined) updates.manager_id = payload.manager_id;
  if (payload.is_active !== undefined) updates.is_active = payload.is_active;

  const { data, error } = await supabase
    .from('financial_cost_centers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a cost center (only if no children and no transactions)
 */
export async function deleteCostCenter(id: string): Promise<void> {
  // Check if deletion is allowed
  const canDelete = await checkCanDeleteCostCenter(id);
  if (!canDelete) {
    throw new Error('Não é possível excluir um centro de custo com sub-centros ou movimentações.');
  }

  const { error } = await supabase
    .from('financial_cost_centers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Check if a cost center can be deleted
 */
export async function checkCanDeleteCostCenter(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_delete_cost_center', {
    p_cost_center_id: id,
  });

  if (error) throw error;
  return data === true;
}

/**
 * Toggle cost center active status
 */
export async function toggleCostCenterStatus(id: string, isActive: boolean): Promise<CostCenter> {
  const { data, error } = await supabase
    .from('financial_cost_centers')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get audit logs for a cost center
 */
export async function getCostCenterAuditLogs(
  clinicId: string,
  costCenterId?: string
): Promise<CostCenterAudit[]> {
  let query = supabase
    .from('financial_cost_centers_audit')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('changed_at', { ascending: false });

  if (costCenterId) {
    query = query.eq('cost_center_id', costCenterId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get cost centers for a manager
 */
export async function getCostCentersByManager(
  clinicId: string,
  managerId: string
): Promise<CostCenter[]> {
  const { data, error } = await supabase
    .from('financial_cost_centers')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('manager_id', managerId)
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Export cost centers to CSV
 */
export function exportToCsv(costCenters: CostCenter[]): string {
  const headers = ['Código', 'Nome', 'Descrição', 'Responsável', 'Ativo', 'Criado em'];
  const rows = costCenters.map((cc) => [
    cc.code,
    cc.name,
    cc.description || '',
    cc.manager_id || '',
    cc.is_active ? 'Sim' : 'Não',
    new Date(cc.created_at).toLocaleDateString('pt-BR'),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}

/**
 * Validate cost center code format
 */
export function validateCostCenterCode(code: string): boolean {
  // Format: digits separated by dots, e.g., "1", "1.1", "1.1.1", "1.1.1.1"
  if (!/^\d+(\.\d+)*$/.test(code)) return false;
  const level = String(code).split('.').length;
  return level >= 1 && level <= 4;
}

/**
 * Get next available code for a cost center level
 */
export async function getNextCostCenterCode(
  clinicId: string,
  parentId?: string | null
): Promise<string> {
  const { data, error } = await supabase
    .from('financial_cost_centers')
    .select('code')
    .eq('clinic_id', clinicId)
    .eq('parent_id', parentId || null)
    .order('code', { ascending: false })
    .limit(1);

  if (error) throw error;

  if (!data || data.length === 0) {
    // First code at this level
    const parentCode = parentId
      ? (await getCostCenter(parentId))?.code
      : '';
    const baseNumber = parentCode ? `${parentCode}.` : '';
    return `${baseNumber}1`;
  }

  // Increment the last code
  const lastCode = data[0].code;
  const parts = lastCode.split('.');
  const lastNumber = parseInt(parts[parts.length - 1], 10);
  parts[parts.length - 1] = String(lastNumber + 1);

  return parts.join('.');
}

/**
 * List active allocation rules (rateio) for a clinic
 */
export async function listCostCenterAllocations(clinicId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('financial_cost_center_allocations')
    .select('*, items:financial_cost_center_allocation_items(*)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create or replace a rateio rule for one source center
 */
export async function saveCostCenterAllocation(
  clinicId: string,
  sourceCostCenterId: string,
  items: Array<{ target_cost_center_id: string; percentage?: number | null; fixed_amount?: number | null }>,
  options?: { description?: string; allocation_method?: 'PERCENT' | 'VALUE' | 'MIXED' },
): Promise<any> {
  const { data: user } = await supabase.auth.getUser();
  const actorId = user?.user?.id;
  if (!actorId) throw new Error('Usuário não autenticado');

  const { data: existing, error: existingError } = await supabase
    .from('financial_cost_center_allocations')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('source_cost_center_id', sourceCostCenterId)
    .maybeSingle();

  if (existingError) throw existingError;

  let allocationId = existing?.id;

  if (!allocationId) {
    const { data: created, error: createError } = await supabase
      .from('financial_cost_center_allocations')
      .insert({
        clinic_id: clinicId,
        source_cost_center_id: sourceCostCenterId,
        description: options?.description || null,
        allocation_method: options?.allocation_method || 'PERCENT',
        is_active: true,
        created_by: actorId,
      })
      .select('id')
      .single();
    if (createError) throw createError;
    allocationId = created.id;
  } else {
    const { error: updateError } = await supabase
      .from('financial_cost_center_allocations')
      .update({
        description: options?.description || null,
        allocation_method: options?.allocation_method || 'PERCENT',
        updated_at: new Date().toISOString(),
      })
      .eq('id', allocationId);
    if (updateError) throw updateError;

    const { error: cleanError } = await supabase
      .from('financial_cost_center_allocation_items')
      .delete()
      .eq('allocation_id', allocationId);
    if (cleanError) throw cleanError;
  }

  if (items.length) {
    const rows = items.map((item) => ({
      allocation_id: allocationId,
      target_cost_center_id: item.target_cost_center_id,
      percentage: item.percentage ?? null,
      fixed_amount: item.fixed_amount ?? null,
    }));

    const { error: insertItemsError } = await supabase
      .from('financial_cost_center_allocation_items')
      .insert(rows);
    if (insertItemsError) throw insertItemsError;
  }

  const { data, error } = await supabase
    .from('financial_cost_center_allocations')
    .select('*, items:financial_cost_center_allocation_items(*)')
    .eq('id', allocationId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an allocation rule by id
 */
export async function deleteCostCenterAllocation(allocationId: string): Promise<void> {
  const { error } = await supabase
    .from('financial_cost_center_allocations')
    .delete()
    .eq('id', allocationId);

  if (error) throw error;
}
