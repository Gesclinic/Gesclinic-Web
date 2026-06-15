// src/modules/financeiro/centro-custo/types/index.ts

/**
 * Cost Center (Centro de Custo)
 */
export interface CostCenter {
  id: string;
  clinic_id: string;
  parent_id: string | null;
  code: string; // e.g., "1", "1.1", "1.1.1"
  name: string;
  description: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cost Center with children count (for tree view)
 */
export interface CostCenterNode extends CostCenter {
  child_count: number;
  children?: CostCenterNode[];
}

/**
 * Cost Center audit log
 */
export interface CostCenterAudit {
  id: string;
  cost_center_id: string;
  clinic_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_fields?: Record<string, any>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_by: string | null;
  changed_at: string;
}

/**
 * Filters for cost center list
 */
export interface CostCenterFilters {
  search?: string;
  is_active?: boolean | null;
  parent_id?: string | null;
}

/**
 * Cost center creation payload
 */
export interface CreateCostCenterPayload {
  code: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  manager_id?: string | null;
  is_active?: boolean;
}

/**
 * Cost center update payload
 */
export interface UpdateCostCenterPayload {
  code?: string;
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  manager_id?: string | null;
  is_active?: boolean;
}

/**
 * Cost center statistics
 */
export interface CostCenterStats {
  total: number;
  active: number;
  inactive: number;
  withManager: number;
  rootLevelCount: number;
}
