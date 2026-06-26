-- ============================================================================
-- Migration: Upgrade Financial Cost Centers to ERP Hospitalar Enterprise
-- Date: 2026-06-19
-- ============================================================================

-- 1) Expand existing financial_cost_centers (no new duplicate table)
ALTER TABLE IF EXISTS financial_cost_centers
  ADD COLUMN IF NOT EXISTS center_type VARCHAR(40),
  ADD COLUMN IF NOT EXISTS unit_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(180),
  ADD COLUMN IF NOT EXISTS color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS icon VARCHAR(80),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Keep center_type consistent with enterprise taxonomy
ALTER TABLE IF EXISTS financial_cost_centers
  DROP CONSTRAINT IF EXISTS financial_cost_centers_center_type_valid;

ALTER TABLE IF EXISTS financial_cost_centers
  ADD CONSTRAINT financial_cost_centers_center_type_valid
  CHECK (
    center_type IS NULL OR center_type IN (
      'ASSISTENCIAL',
      'ESPECIALIDADE',
      'PRODUCAO_MEDICA',
      'CONVENIO',
      'UNIDADE',
      'ADMINISTRATIVO',
      'TECNOLOGIA',
      'OPERACOES',
      'SUPORTE'
    )
  );

-- Useful indexes for enterprise filters
CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_type
  ON financial_cost_centers(clinic_id, center_type);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_unit
  ON financial_cost_centers(clinic_id, unit_name);

CREATE INDEX IF NOT EXISTS idx_financial_cost_centers_responsible
  ON financial_cost_centers(clinic_id, responsible_name);

-- 2) Automatic allocation (rateio) - reusable integration table
CREATE TABLE IF NOT EXISTS financial_cost_center_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  source_cost_center_id UUID NOT NULL REFERENCES financial_cost_centers(id) ON DELETE CASCADE,
  description TEXT,
  allocation_method VARCHAR(20) NOT NULL DEFAULT 'PERCENT',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_cost_center_allocations_method_ck CHECK (allocation_method IN ('PERCENT', 'VALUE', 'MIXED'))
);

CREATE TABLE IF NOT EXISTS financial_cost_center_allocation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID NOT NULL REFERENCES financial_cost_center_allocations(id) ON DELETE CASCADE,
  target_cost_center_id UUID NOT NULL REFERENCES financial_cost_centers(id) ON DELETE RESTRICT,
  percentage NUMERIC(7,4),
  fixed_amount NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_cost_center_allocation_items_percentage_ck CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  CONSTRAINT financial_cost_center_allocation_items_amount_ck CHECK (fixed_amount IS NULL OR fixed_amount >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_financial_cost_center_allocation_target
  ON financial_cost_center_allocation_items(allocation_id, target_cost_center_id);

CREATE INDEX IF NOT EXISTS idx_financial_cost_center_allocations_clinic
  ON financial_cost_center_allocations(clinic_id, source_cost_center_id, is_active);

CREATE INDEX IF NOT EXISTS idx_financial_cost_center_allocation_items_alloc
  ON financial_cost_center_allocation_items(allocation_id);

-- 3) RLS for rateio tables (same clinic boundary)
ALTER TABLE financial_cost_center_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_cost_center_allocation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_financial_cost_center_allocations_select ON financial_cost_center_allocations;
CREATE POLICY p_financial_cost_center_allocations_select
ON financial_cost_center_allocations FOR SELECT
USING (
  clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS p_financial_cost_center_allocations_write ON financial_cost_center_allocations;
CREATE POLICY p_financial_cost_center_allocations_write
ON financial_cost_center_allocations FOR ALL
USING (
  clinic_id IN (
    SELECT ur.clinic_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'financeiro')
  )
)
WITH CHECK (
  clinic_id IN (
    SELECT ur.clinic_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'financeiro')
  )
);

DROP POLICY IF EXISTS p_financial_cost_center_allocation_items_select ON financial_cost_center_allocation_items;
CREATE POLICY p_financial_cost_center_allocation_items_select
ON financial_cost_center_allocation_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM financial_cost_center_allocations a
    WHERE a.id = allocation_id
      AND a.clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS p_financial_cost_center_allocation_items_write ON financial_cost_center_allocation_items;
CREATE POLICY p_financial_cost_center_allocation_items_write
ON financial_cost_center_allocation_items FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM financial_cost_center_allocations a
    JOIN user_roles ur ON ur.clinic_id = a.clinic_id
    JOIN roles r ON r.id = ur.role_id
    WHERE a.id = allocation_id
      AND ur.user_id = auth.uid()
      AND r.name IN ('admin', 'financeiro')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM financial_cost_center_allocations a
    JOIN user_roles ur ON ur.clinic_id = a.clinic_id
    JOIN roles r ON r.id = ur.role_id
    WHERE a.id = allocation_id
      AND ur.user_id = auth.uid()
      AND r.name IN ('admin', 'financeiro')
  )
);
