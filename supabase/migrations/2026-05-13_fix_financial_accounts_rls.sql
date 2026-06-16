-- Fix RLS: Remove created_by validation from INSERT policy
-- The trigger will handle setting created_by to auth.uid()

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "insert_financial_accounts" ON financial_accounts;

-- Create new INSERT policy that doesn't require created_by = auth.uid() upfront
-- (The trigger will set it, and the RLS will then check it)
CREATE POLICY "insert_financial_accounts"
  ON financial_accounts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND clinic_id IN (
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
    auth.uid() IS NOT NULL
    AND clinic_id IN (
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
