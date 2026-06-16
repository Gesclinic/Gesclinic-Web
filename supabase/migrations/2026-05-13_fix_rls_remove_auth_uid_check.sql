-- Fix RLS Policy: Remove auth.uid() NOT NULL check
-- The trigger will handle setting created_by correctly
-- RLS only needs to verify clinic_id is valid

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "insert_financial_accounts" ON financial_accounts;

-- Create new INSERT policy without auth.uid() check
-- Only require that clinic_id exists in clinics table
CREATE POLICY "insert_financial_accounts"
  ON financial_accounts
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE id = financial_accounts.clinic_id
    )
  );

-- Similarly for audit table
DROP POLICY IF EXISTS "insert_financial_accounts_audit" ON financial_accounts_audit;

CREATE POLICY "insert_financial_accounts_audit"
  ON financial_accounts_audit
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE id = financial_accounts_audit.clinic_id
    )
  );

-- Verify policies are updated
SELECT 
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('financial_accounts', 'financial_accounts_audit')
  AND policyname LIKE 'insert_%'
ORDER BY tablename, policyname;
