-- ============================================================================
-- Migration: Create Financial Plan Accounts
-- Date: 2026-07-20
-- Purpose: Management/operational financial plan for cash flow classification
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_plan_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES financial_plan_accounts(id) ON DELETE SET NULL,
  chart_account_id UUID REFERENCES financial_chart_of_accounts(id) ON DELETE SET NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  section_key VARCHAR(60) NOT NULL,
  type VARCHAR(40) NOT NULL CHECK (type IN ('REVENUE', 'DEDUCTION', 'EXPENSE', 'FINANCIAL_EXPENSE', 'TAX', 'MEDICAL_TRANSFER', 'INVESTMENT', 'DISTRIBUTION')),
  nature VARCHAR(20) NOT NULL CHECK (nature IN ('INFLOW', 'OUTFLOW')),
  level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  accepts_entries BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, code)
);

CREATE INDEX IF NOT EXISTS idx_financial_plan_accounts_clinic_id ON financial_plan_accounts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_plan_accounts_parent_id ON financial_plan_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_financial_plan_accounts_chart_account_id ON financial_plan_accounts(chart_account_id);
CREATE INDEX IF NOT EXISTS idx_financial_plan_accounts_section_key ON financial_plan_accounts(section_key);
CREATE INDEX IF NOT EXISTS idx_financial_plan_accounts_type ON financial_plan_accounts(type);
CREATE INDEX IF NOT EXISTS idx_financial_plan_accounts_clinic_active ON financial_plan_accounts(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_financial_plan_accounts_clinic_parent ON financial_plan_accounts(clinic_id, parent_id);

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

CREATE OR REPLACE FUNCTION update_financial_plan_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_financial_plan_accounts_updated_at ON financial_plan_accounts;
CREATE TRIGGER trigger_financial_plan_accounts_updated_at
  BEFORE UPDATE ON financial_plan_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_plan_accounts_updated_at();

COMMENT ON TABLE financial_plan_accounts IS 'Management financial plan for operational cash flow classification, separate from accounting chart and bank/cash accounts';
COMMENT ON COLUMN financial_plan_accounts.chart_account_id IS 'Optional link to formal accounting chart of accounts';

-- Recommended operational categories added by the application template:
-- 03.06 Documentos fiscais, 04.06 Consultorias, 05.04 IOF, 05.05 Descontos financeiros.
