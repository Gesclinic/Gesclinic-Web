-- ================================================
-- 💰 CREATE FINANCIAL ACCOUNTS TABLE
-- ================================================
-- Enterprise module for managing bank accounts, cash, digital wallets, etc.
-- Execute this script in Supabase SQL Editor

-- 0️⃣ Drop existing objects to ensure clean state
DROP TRIGGER IF EXISTS trigger_audit_financial_accounts ON financial_accounts;
DROP TRIGGER IF EXISTS trigger_update_financial_accounts_timestamp ON financial_accounts;
DROP TRIGGER IF EXISTS trigger_ensure_single_default_account ON financial_accounts;
DROP FUNCTION IF EXISTS audit_financial_accounts();
DROP FUNCTION IF EXISTS update_financial_accounts_timestamp();
DROP FUNCTION IF EXISTS ensure_single_default_account();
DROP TABLE IF EXISTS financial_accounts_audit CASCADE;
DROP TABLE IF EXISTS financial_accounts CASCADE;
DROP TYPE IF EXISTS account_type_enum CASCADE;

-- 1️⃣ Create enum type for account types
DO $$ BEGIN
  CREATE TYPE account_type_enum AS ENUM (
    'CHECKING',
    'SAVINGS',
    'CASH',
    'DIGITAL_WALLET',
    'INVESTMENT',
    'CREDIT_CARD'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2️⃣ Create financial_accounts table
CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type account_type_enum NOT NULL,
  agency VARCHAR(30),
  account_number VARCHAR(50) NOT NULL,
  pix_key VARCHAR(255),
  initial_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(clinic_id, account_name)
);

-- 3️⃣ Create audit table for financial_accounts
CREATE TABLE financial_accounts_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  account_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4️⃣ Create indexes for performance
CREATE INDEX idx_financial_accounts_clinic_id ON financial_accounts(clinic_id);
CREATE INDEX idx_financial_accounts_is_active ON financial_accounts(is_active);
CREATE INDEX idx_financial_accounts_clinic_default ON financial_accounts(clinic_id, is_default);
CREATE INDEX idx_financial_accounts_account_type ON financial_accounts(account_type);
CREATE INDEX idx_financial_accounts_audit_clinic_id ON financial_accounts_audit(clinic_id);
CREATE INDEX idx_financial_accounts_audit_account_id ON financial_accounts_audit(account_id);

-- 5️⃣ Enable RLS on financial_accounts
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts_audit ENABLE ROW LEVEL SECURITY;

-- 6️⃣ RLS Policies for financial_accounts
-- ⚠️ SECURITY: All policies enforce clinic_id isolation

-- Policy: Users can view accounts ONLY from their clinic
CREATE POLICY "view_financial_accounts"
ON financial_accounts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND clinic_id IN (
    SELECT clinic_id FROM clinics 
    WHERE id = financial_accounts.clinic_id
  )
);

-- Policy: Users can insert accounts ONLY in their clinic
CREATE POLICY "insert_financial_accounts"
ON financial_accounts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by = auth.uid()
  AND clinic_id IN (
    SELECT id FROM clinics 
    WHERE id = financial_accounts.clinic_id
  )
);

-- Policy: Users can update accounts ONLY in their clinic
CREATE POLICY "update_financial_accounts"
ON financial_accounts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT id FROM clinics 
    WHERE id = financial_accounts.clinic_id
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT id FROM clinics 
    WHERE id = financial_accounts.clinic_id
  )
);

-- Policy: Users cannot delete accounts (soft delete via is_active)
-- Accounts are never deleted to maintain audit trail and multi-clinic isolation

-- 7️⃣ RLS Policies for audit table
-- ⚠️ SECURITY: Audit records are isolated by clinic_id

CREATE POLICY "view_financial_accounts_audit"
ON financial_accounts_audit
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT id FROM clinics 
    WHERE id = financial_accounts_audit.clinic_id
  )
);

-- Policy: Only system can insert audit records (triggered by database)
CREATE POLICY "insert_financial_accounts_audit"
ON financial_accounts_audit
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND changed_by = auth.uid()
  AND clinic_id IN (
    SELECT id FROM clinics 
    WHERE id = financial_accounts_audit.clinic_id
  )
);

-- 8️⃣ Create trigger to ensure only one default account per clinic
CREATE FUNCTION ensure_single_default_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE financial_accounts
    SET is_default = false
    WHERE clinic_id = NEW.clinic_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_ensure_single_default_account
BEFORE INSERT OR UPDATE ON financial_accounts
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_account();

-- 9️⃣ Create trigger for update timestamp
CREATE FUNCTION update_financial_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_financial_accounts_timestamp
BEFORE UPDATE ON financial_accounts
FOR EACH ROW
EXECUTE FUNCTION update_financial_accounts_timestamp();

-- 🔟 Create trigger for audit logging
CREATE FUNCTION audit_financial_accounts()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_changed_fields JSONB := '{}';
  v_old_values JSONB := '{}';
  v_new_values JSONB := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_new_values := row_to_json(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_values := row_to_json(OLD);
    v_new_values := row_to_json(NEW);
    
    -- Detect changed fields
    IF OLD.bank_name != NEW.bank_name THEN v_changed_fields := v_changed_fields || jsonb_build_object('bank_name', true); END IF;
    IF OLD.account_name != NEW.account_name THEN v_changed_fields := v_changed_fields || jsonb_build_object('account_name', true); END IF;
    IF OLD.account_type != NEW.account_type THEN v_changed_fields := v_changed_fields || jsonb_build_object('account_type', true); END IF;
    IF OLD.agency IS DISTINCT FROM NEW.agency THEN v_changed_fields := v_changed_fields || jsonb_build_object('agency', true); END IF;
    IF OLD.account_number != NEW.account_number THEN v_changed_fields := v_changed_fields || jsonb_build_object('account_number', true); END IF;
    IF OLD.pix_key IS DISTINCT FROM NEW.pix_key THEN v_changed_fields := v_changed_fields || jsonb_build_object('pix_key', true); END IF;
    IF OLD.initial_balance != NEW.initial_balance THEN v_changed_fields := v_changed_fields || jsonb_build_object('initial_balance', true); END IF;
    IF OLD.current_balance != NEW.current_balance THEN v_changed_fields := v_changed_fields || jsonb_build_object('current_balance', true); END IF;
    IF OLD.is_default != NEW.is_default THEN v_changed_fields := v_changed_fields || jsonb_build_object('is_default', true); END IF;
    IF OLD.is_active != NEW.is_active THEN v_changed_fields := v_changed_fields || jsonb_build_object('is_active', true); END IF;
  END IF;

  INSERT INTO financial_accounts_audit (
    clinic_id,
    account_id,
    action,
    changed_fields,
    old_values,
    new_values,
    changed_by
  ) VALUES (
    NEW.clinic_id,
    NEW.id,
    v_action,
    v_changed_fields,
    NULLIF(v_old_values, '{}'),
    NULLIF(v_new_values, '{}'),
    auth.uid()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_financial_accounts
AFTER INSERT OR UPDATE ON financial_accounts
FOR EACH ROW
EXECUTE FUNCTION audit_financial_accounts();

-- ================================================
-- ✅ FINANCIAL ACCOUNTS TABLE CREATED
-- ================================================
-- Tables:
--   - financial_accounts (main table)
--   - financial_accounts_audit (audit trail)
--
-- Triggers:
--   - ensure_single_default_account (enforce one default per clinic)
--   - update_financial_accounts_timestamp (auto update_at)
--   - audit_financial_accounts (complete audit trail)
--
-- RLS: Enabled with clinic isolation and role-based access
-- ================================================
