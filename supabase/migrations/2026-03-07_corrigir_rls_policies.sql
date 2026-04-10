-- ============================================
-- 🔐 CORRIGIR RLS POLICIES - TABELAS DE PAGAMENTO
-- Adicionar INSERT e UPDATE às tabelas existentes
-- Data: 7 de março de 2026
-- ============================================

-- ============================================
-- 1️⃣ accounts_receivable
-- ============================================

DROP POLICY IF EXISTS accounts_receivable_clinic_policy ON accounts_receivable;
DROP POLICY IF EXISTS accounts_receivable_insert_policy ON accounts_receivable;
DROP POLICY IF EXISTS accounts_receivable_update_policy ON accounts_receivable;

CREATE POLICY accounts_receivable_select_policy
  ON accounts_receivable
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY accounts_receivable_insert_policy
  ON accounts_receivable
  FOR INSERT
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY accounts_receivable_update_policy
  ON accounts_receivable
  FOR UPDATE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 2️⃣ journal_entries
-- ============================================

DROP POLICY IF EXISTS journal_entries_clinic_policy ON journal_entries;
DROP POLICY IF EXISTS journal_entries_insert_policy ON journal_entries;
DROP POLICY IF EXISTS journal_entries_update_policy ON journal_entries;

CREATE POLICY journal_entries_select_policy
  ON journal_entries
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY journal_entries_insert_policy
  ON journal_entries
  FOR INSERT
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY journal_entries_update_policy
  ON journal_entries
  FOR UPDATE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 3️⃣ cash_register_sessions
-- ============================================

DROP POLICY IF EXISTS cash_register_sessions_clinic_policy ON cash_register_sessions;
DROP POLICY IF EXISTS cash_register_sessions_insert_policy ON cash_register_sessions;
DROP POLICY IF EXISTS cash_register_sessions_update_policy ON cash_register_sessions;

CREATE POLICY cash_register_sessions_select_policy
  ON cash_register_sessions
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY cash_register_sessions_insert_policy
  ON cash_register_sessions
  FOR INSERT
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY cash_register_sessions_update_policy
  ON cash_register_sessions
  FOR UPDATE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 4️⃣ cash_register_movements
-- ============================================

DROP POLICY IF EXISTS cash_register_movements_clinic_policy ON cash_register_movements;
DROP POLICY IF EXISTS cash_register_movements_insert_policy ON cash_register_movements;
DROP POLICY IF EXISTS cash_register_movements_update_policy ON cash_register_movements;

CREATE POLICY cash_register_movements_select_policy
  ON cash_register_movements
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY cash_register_movements_insert_policy
  ON cash_register_movements
  FOR INSERT
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY cash_register_movements_update_policy
  ON cash_register_movements
  FOR UPDATE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 5️⃣ financial_audits
-- ============================================

DROP POLICY IF EXISTS financial_audits_clinic_policy ON financial_audits;
DROP POLICY IF EXISTS financial_audits_insert_policy ON financial_audits;
DROP POLICY IF EXISTS financial_audits_update_policy ON financial_audits;

CREATE POLICY financial_audits_select_policy
  ON financial_audits
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY financial_audits_insert_policy
  ON financial_audits
  FOR INSERT
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY financial_audits_update_policy
  ON financial_audits
  FOR UPDATE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 6️⃣ chart_of_accounts
-- ============================================

DROP POLICY IF EXISTS chart_of_accounts_clinic_policy ON chart_of_accounts;
DROP POLICY IF EXISTS chart_of_accounts_insert_policy ON chart_of_accounts;
DROP POLICY IF EXISTS chart_of_accounts_update_policy ON chart_of_accounts;

CREATE POLICY chart_of_accounts_select_policy
  ON chart_of_accounts
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY chart_of_accounts_insert_policy
  ON chart_of_accounts
  FOR INSERT
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY chart_of_accounts_update_policy
  ON chart_of_accounts
  FOR UPDATE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================

-- Listar todas as policies
SELECT schemaname, tablename, policyname
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
