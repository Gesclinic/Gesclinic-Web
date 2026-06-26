-- ================================================
-- FIX FINANCIAL ACCOUNTS RLS POLICIES
-- ================================================
-- The original RLS policies were too lenient and didn't check user access properly
-- Replace them with policies that verify user has access to the clinic via user_clinic_roles

-- Drop old broken policies
DROP POLICY IF EXISTS "view_financial_accounts" ON financial_accounts;
DROP POLICY IF EXISTS "insert_financial_accounts" ON financial_accounts;
DROP POLICY IF EXISTS "update_financial_accounts" ON financial_accounts;
DROP POLICY IF EXISTS "view_financial_accounts_audit" ON financial_accounts_audit;
DROP POLICY IF EXISTS "insert_financial_accounts_audit" ON financial_accounts_audit;

-- Create corrected RLS Policies for financial_accounts
-- ⚠️ SECURITY: All policies enforce clinic_id isolation AND user access via user_clinic_roles

-- Policy: Users can view accounts ONLY from clinics they belong to
CREATE POLICY "view_financial_accounts"
ON financial_accounts
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert accounts ONLY in clinics they belong to
CREATE POLICY "insert_financial_accounts"
ON financial_accounts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can update accounts ONLY in clinics they belong to
CREATE POLICY "update_financial_accounts"
ON financial_accounts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
);

-- Create corrected RLS Policies for audit table
-- ⚠️ SECURITY: Audit records are isolated by clinic_id AND user access

CREATE POLICY "view_financial_accounts_audit"
ON financial_accounts_audit
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: System can insert audit records (triggered by database)
-- This allows the system to insert audit records for any clinic
CREATE POLICY "insert_financial_accounts_audit"
ON financial_accounts_audit
FOR INSERT
WITH CHECK (true);
