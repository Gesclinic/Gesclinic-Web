-- ============================================================================
-- Migration: Fix Financial Plan Accounts RLS
-- Date: 2026-07-20
-- Purpose: Allow financial plan management using the users.clinic_id/role model
--          already used by the finance module, while keeping RBAC support.
-- ============================================================================

ALTER TABLE financial_plan_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view financial plan accounts from their clinic" ON financial_plan_accounts;
DROP POLICY IF EXISTS "Users can insert financial plan accounts in their clinic" ON financial_plan_accounts;
DROP POLICY IF EXISTS "Users can update financial plan accounts in their clinic" ON financial_plan_accounts;
DROP POLICY IF EXISTS "Users can delete financial plan accounts in their clinic" ON financial_plan_accounts;

CREATE POLICY "Users can view financial plan accounts from their clinic"
  ON financial_plan_accounts
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
    OR clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert financial plan accounts in their clinic"
  ON financial_plan_accounts
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT ur.clinic_id
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'gestor', 'financeiro')
    )
    OR clinic_id IN (
      SELECT clinic_id
      FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'gestor', 'financeiro')
    )
  );

CREATE POLICY "Users can update financial plan accounts in their clinic"
  ON financial_plan_accounts
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT ur.clinic_id
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'gestor', 'financeiro')
    )
    OR clinic_id IN (
      SELECT clinic_id
      FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'gestor', 'financeiro')
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT ur.clinic_id
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'gestor', 'financeiro')
    )
    OR clinic_id IN (
      SELECT clinic_id
      FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'gestor', 'financeiro')
    )
  );

CREATE POLICY "Users can delete financial plan accounts in their clinic"
  ON financial_plan_accounts
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT ur.clinic_id
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'gestor')
    )
    OR clinic_id IN (
      SELECT clinic_id
      FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'gestor')
    )
  );
