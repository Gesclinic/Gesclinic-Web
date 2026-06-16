-- ============================================================================
-- Migration: Create Financial Cost Centers Module
-- Date: 2026-05-12
-- Purpose: Hierarchical cost centers for financial tracking and allocation
-- ============================================================================

-- ============================================================================
-- 1. CREATE MAIN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    parent_id UUID REFERENCES financial_cost_centers(id) ON DELETE RESTRICT,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_clinic_id CHECK (clinic_id IS NOT NULL),
    CONSTRAINT valid_code CHECK (code ~ '^\d+(\.\d+)*$'),
    UNIQUE(clinic_id, code)
);

-- ============================================================================
-- 2. CREATE AUDIT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_cost_centers_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_center_id UUID NOT NULL,
    clinic_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL,
    changed_fields JSONB,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT valid_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cost_centers_clinic_id ON financial_cost_centers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_id ON financial_cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_code ON financial_cost_centers(code);
CREATE INDEX IF NOT EXISTS idx_cost_centers_is_active ON financial_cost_centers(is_active);
CREATE INDEX IF NOT EXISTS idx_cost_centers_created_by ON financial_cost_centers(created_by);
CREATE INDEX IF NOT EXISTS idx_cost_centers_clinic_code ON financial_cost_centers(clinic_id, code);
CREATE INDEX IF NOT EXISTS idx_cost_centers_audit_clinic_id ON financial_cost_centers_audit(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_audit_cost_center_id ON financial_cost_centers_audit(cost_center_id);

-- ============================================================================
-- 4. CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE financial_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_cost_centers_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view cost centers from their clinic" ON financial_cost_centers;
DROP POLICY IF EXISTS "Users can create cost centers in their clinic" ON financial_cost_centers;
DROP POLICY IF EXISTS "Users can update cost centers in their clinic" ON financial_cost_centers;
DROP POLICY IF EXISTS "Only admins can delete cost centers" ON financial_cost_centers;
DROP POLICY IF EXISTS "Users can view cost center audit logs from their clinic" ON financial_cost_centers_audit;
DROP POLICY IF EXISTS "System can insert cost center audit logs" ON financial_cost_centers_audit;

-- SELECT: Users can view cost centers from their clinic
CREATE POLICY "Users can view cost centers from their clinic"
ON financial_cost_centers FOR SELECT
USING (
    clinic_id IN (
        SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
);

-- INSERT: Only admin and financeiro roles can create cost centers
CREATE POLICY "Users can create cost centers in their clinic"
ON financial_cost_centers FOR INSERT
WITH CHECK (
    clinic_id IN (
        SELECT ur.clinic_id FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'financeiro')
    )
);

-- UPDATE: Only admin and financeiro roles can update cost centers
CREATE POLICY "Users can update cost centers in their clinic"
ON financial_cost_centers FOR UPDATE
USING (
    clinic_id IN (
        SELECT ur.clinic_id FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'financeiro')
    )
)
WITH CHECK (
    clinic_id IN (
        SELECT ur.clinic_id FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'financeiro')
    )
);

-- DELETE: Only admins can delete cost centers
CREATE POLICY "Only admins can delete cost centers"
ON financial_cost_centers FOR DELETE
USING (
    clinic_id IN (
        SELECT ur.clinic_id FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
);

-- Audit table policies
CREATE POLICY "Users can view cost center audit logs from their clinic"
ON financial_cost_centers_audit FOR SELECT
USING (
    clinic_id IN (
        SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "System can insert cost center audit logs"
ON financial_cost_centers_audit FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- 5. CREATE AUDIT TRIGGER
-- ============================================================================
DROP FUNCTION IF EXISTS financial_cost_centers_audit_trigger() CASCADE;

CREATE FUNCTION financial_cost_centers_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO financial_cost_centers_audit (
            cost_center_id, clinic_id, action, new_values, changed_by, changed_at
        ) VALUES (
            NEW.id, NEW.clinic_id, 'INSERT', row_to_json(NEW), auth.uid(), now()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO financial_cost_centers_audit (
            cost_center_id, clinic_id, action, old_values, new_values, changed_by, changed_at
        ) VALUES (
            NEW.id, NEW.clinic_id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid(), now()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO financial_cost_centers_audit (
            cost_center_id, clinic_id, action, old_values, changed_by, changed_at
        ) VALUES (
            OLD.id, OLD.clinic_id, 'DELETE', row_to_json(OLD), auth.uid(), now()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_financial_cost_centers_audit ON financial_cost_centers;

CREATE TRIGGER trigger_financial_cost_centers_audit
AFTER INSERT OR UPDATE OR DELETE ON financial_cost_centers
FOR EACH ROW
EXECUTE FUNCTION financial_cost_centers_audit_trigger();

-- ============================================================================
-- 6. CREATE RPC FUNCTIONS
-- ============================================================================

-- Get hierarchical cost centers for a clinic
DROP FUNCTION IF EXISTS get_cost_centers_tree(UUID);

CREATE FUNCTION get_cost_centers_tree(p_clinic_id UUID)
RETURNS TABLE (
    id UUID,
    clinic_id UUID,
    parent_id UUID,
    code VARCHAR,
    name VARCHAR,
    description TEXT,
    manager_id UUID,
    is_active BOOLEAN,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    child_count INTEGER
) AS $$
    WITH RECURSIVE cost_center_tree AS (
        -- Base case: root cost centers (no parent)
        SELECT 
            a.id, a.clinic_id, a.parent_id, a.code, a.name, a.description,
            a.manager_id, a.is_active, a.created_by, a.created_at, a.updated_at,
            (SELECT COUNT(*) FROM financial_cost_centers b WHERE b.parent_id = a.id)::INTEGER as child_count
        FROM financial_cost_centers a
        WHERE a.clinic_id = p_clinic_id AND a.parent_id IS NULL

        UNION ALL

        -- Recursive case: child cost centers
        SELECT 
            a.id, a.clinic_id, a.parent_id, a.code, a.name, a.description,
            a.manager_id, a.is_active, a.created_by, a.created_at, a.updated_at,
            (SELECT COUNT(*) FROM financial_cost_centers b WHERE b.parent_id = a.id)::INTEGER as child_count
        FROM financial_cost_centers a
        INNER JOIN cost_center_tree cct ON a.parent_id = cct.id
    )
    SELECT * FROM cost_center_tree;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if a cost center can be deleted
DROP FUNCTION IF EXISTS can_delete_cost_center(UUID);

CREATE FUNCTION can_delete_cost_center(p_cost_center_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_children BOOLEAN;
    v_has_transactions BOOLEAN;
BEGIN
    -- Check for child cost centers
    SELECT EXISTS (
        SELECT 1 FROM financial_cost_centers WHERE parent_id = p_cost_center_id
    ) INTO v_has_children;

    IF v_has_children THEN
        RETURN false;
    END IF;

    -- Future: Check for transactions/movements when those tables exist
    -- For now, we only check for structural constraints
    v_has_transactions := false;

    RETURN NOT v_has_children AND NOT v_has_transactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE
-- ============================================================================
