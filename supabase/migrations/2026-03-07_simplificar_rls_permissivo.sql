-- ============================================
-- 🔐 SIMPLIFICAR RLS POLICIES - VERSÃO PERMISSIVA
-- Para debug e início rápido
-- Data: 7 de março de 2026
-- ============================================

-- ============================================
-- ⚠️ NOTA: Estas policies são mais permissivas
-- Use apenas para desenvolvimento
-- Depois restricione baseado em roles
-- ============================================

-- ============================================
-- 1️⃣ accounts_receivable
-- ============================================

DROP POLICY IF EXISTS accounts_receivable_select_policy ON accounts_receivable;
DROP POLICY IF EXISTS accounts_receivable_insert_policy ON accounts_receivable;
DROP POLICY IF EXISTS accounts_receivable_update_policy ON accounts_receivable;

-- Permitir SELECT se clinic_id matches
CREATE POLICY accounts_receivable_select_policy
  ON accounts_receivable
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Permitir INSERT (sem validações adicionais)
CREATE POLICY accounts_receivable_insert_policy
  ON accounts_receivable
  FOR INSERT
  WITH CHECK (true);

-- Permitir UPDATE
CREATE POLICY accounts_receivable_update_policy
  ON accounts_receivable
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2️⃣ journal_entries
-- ============================================

DROP POLICY IF EXISTS journal_entries_select_policy ON journal_entries;
DROP POLICY IF EXISTS journal_entries_insert_policy ON journal_entries;
DROP POLICY IF EXISTS journal_entries_update_policy ON journal_entries;

CREATE POLICY journal_entries_select_policy
  ON journal_entries
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY journal_entries_insert_policy
  ON journal_entries
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY journal_entries_update_policy
  ON journal_entries
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3️⃣ cash_register_sessions
-- ============================================

DROP POLICY IF EXISTS cash_register_sessions_select_policy ON cash_register_sessions;
DROP POLICY IF EXISTS cash_register_sessions_insert_policy ON cash_register_sessions;
DROP POLICY IF EXISTS cash_register_sessions_update_policy ON cash_register_sessions;

CREATE POLICY cash_register_sessions_select_policy
  ON cash_register_sessions
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY cash_register_sessions_insert_policy
  ON cash_register_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY cash_register_sessions_update_policy
  ON cash_register_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4️⃣ cash_register_movements
-- ============================================

DROP POLICY IF EXISTS cash_register_movements_select_policy ON cash_register_movements;
DROP POLICY IF EXISTS cash_register_movements_insert_policy ON cash_register_movements;
DROP POLICY IF EXISTS cash_register_movements_update_policy ON cash_register_movements;

CREATE POLICY cash_register_movements_select_policy
  ON cash_register_movements
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY cash_register_movements_insert_policy
  ON cash_register_movements
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY cash_register_movements_update_policy
  ON cash_register_movements
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5️⃣ financial_audits
-- ============================================

DROP POLICY IF EXISTS financial_audits_select_policy ON financial_audits;
DROP POLICY IF EXISTS financial_audits_insert_policy ON financial_audits;
DROP POLICY IF EXISTS financial_audits_update_policy ON financial_audits;

CREATE POLICY financial_audits_select_policy
  ON financial_audits
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY financial_audits_insert_policy
  ON financial_audits
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY financial_audits_update_policy
  ON financial_audits
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6️⃣ chart_of_accounts
-- ============================================

DROP POLICY IF EXISTS chart_of_accounts_select_policy ON chart_of_accounts;
DROP POLICY IF EXISTS chart_of_accounts_insert_policy ON chart_of_accounts;
DROP POLICY IF EXISTS chart_of_accounts_update_policy ON chart_of_accounts;

CREATE POLICY chart_of_accounts_select_policy
  ON chart_of_accounts
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY chart_of_accounts_insert_policy
  ON chart_of_accounts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY chart_of_accounts_update_policy
  ON chart_of_accounts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 7️⃣ discount_authorizations
-- ============================================

DROP POLICY IF EXISTS discount_authorizations_select_policy ON discount_authorizations;
DROP POLICY IF EXISTS discount_authorizations_insert_policy ON discount_authorizations;
DROP POLICY IF EXISTS discount_authorizations_update_policy ON discount_authorizations;

CREATE POLICY discount_authorizations_select_policy
  ON discount_authorizations
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY discount_authorizations_insert_policy
  ON discount_authorizations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY discount_authorizations_update_policy
  ON discount_authorizations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================

SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN (
  'accounts_receivable',
  'journal_entries',
  'cash_register_sessions',
  'cash_register_movements',
  'financial_audits',
  'chart_of_accounts',
  'discount_authorizations'
)
ORDER BY tablename, policyname;

-- FIM DO SCRIPT
