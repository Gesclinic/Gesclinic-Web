-- ================================================
-- FIX FINANCIAL ACCOUNTS RLS WITH users FALLBACK
-- ================================================
-- Ensures access works for environments using either:
-- 1) user_clinic_roles, or
-- 2) users(clinic_id)

-- Remove permissive legacy policies
DROP POLICY IF EXISTS "allow_all_select" ON financial_accounts;
DROP POLICY IF EXISTS "allow_all_insert" ON financial_accounts;
DROP POLICY IF EXISTS "allow_all_update" ON financial_accounts;

-- Recreate account policies with fallback access logic
DROP POLICY IF EXISTS "view_financial_accounts" ON financial_accounts;
DROP POLICY IF EXISTS "insert_financial_accounts" ON financial_accounts;
DROP POLICY IF EXISTS "update_financial_accounts" ON financial_accounts;

CREATE POLICY "view_financial_accounts"
ON financial_accounts
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    clinic_id IN (
      SELECT ucr.clinic_id
      FROM user_clinic_roles ucr
      WHERE ucr.user_id = auth.uid()
    )
    OR clinic_id IN (
      SELECT u.clinic_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  )
);

CREATE POLICY "insert_financial_accounts"
ON financial_accounts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    clinic_id IN (
      SELECT ucr.clinic_id
      FROM user_clinic_roles ucr
      WHERE ucr.user_id = auth.uid()
    )
    OR clinic_id IN (
      SELECT u.clinic_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  )
);

CREATE POLICY "update_financial_accounts"
ON financial_accounts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    clinic_id IN (
      SELECT ucr.clinic_id
      FROM user_clinic_roles ucr
      WHERE ucr.user_id = auth.uid()
    )
    OR clinic_id IN (
      SELECT u.clinic_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    clinic_id IN (
      SELECT ucr.clinic_id
      FROM user_clinic_roles ucr
      WHERE ucr.user_id = auth.uid()
    )
    OR clinic_id IN (
      SELECT u.clinic_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  )
);

-- Audit table: keep insert permissive for triggers/system, secure select
DROP POLICY IF EXISTS "view_financial_accounts_audit" ON financial_accounts_audit;
DROP POLICY IF EXISTS "insert_financial_accounts_audit" ON financial_accounts_audit;

CREATE POLICY "view_financial_accounts_audit"
ON financial_accounts_audit
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    clinic_id IN (
      SELECT ucr.clinic_id
      FROM user_clinic_roles ucr
      WHERE ucr.user_id = auth.uid()
    )
    OR clinic_id IN (
      SELECT u.clinic_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  )
);

CREATE POLICY "insert_financial_accounts_audit"
ON financial_accounts_audit
FOR INSERT
WITH CHECK (true);
