-- ============================================
-- 🔧 FIX RLS: Remover tudo e reconstruir
-- ============================================

-- 1️⃣ REMOVER TODAS AS POLICIES ANTIGAS

DROP POLICY IF EXISTS accounts_receivable_select ON accounts_receivable CASCADE;
DROP POLICY IF EXISTS accounts_receivable_insert ON accounts_receivable CASCADE;
DROP POLICY IF EXISTS accounts_receivable_update ON accounts_receivable CASCADE;

DROP POLICY IF EXISTS journal_entries_select ON journal_entries CASCADE;
DROP POLICY IF EXISTS journal_entries_insert ON journal_entries CASCADE;
DROP POLICY IF EXISTS journal_entries_update ON journal_entries CASCADE;

DROP POLICY IF EXISTS cash_register_sessions_select ON cash_register_sessions CASCADE;
DROP POLICY IF EXISTS cash_register_sessions_insert ON cash_register_sessions CASCADE;
DROP POLICY IF EXISTS cash_register_sessions_update ON cash_register_sessions CASCADE;

DROP POLICY IF EXISTS cash_register_movements_select ON cash_register_movements CASCADE;
DROP POLICY IF EXISTS cash_register_movements_insert ON cash_register_movements CASCADE;
DROP POLICY IF EXISTS cash_register_movements_update ON cash_register_movements CASCADE;

DROP POLICY IF EXISTS financial_audits_select ON financial_audits CASCADE;
DROP POLICY IF EXISTS financial_audits_insert ON financial_audits CASCADE;
DROP POLICY IF EXISTS financial_audits_update ON financial_audits CASCADE;

DROP POLICY IF EXISTS chart_of_accounts_select ON chart_of_accounts CASCADE;
DROP POLICY IF EXISTS chart_of_accounts_insert ON chart_of_accounts CASCADE;
DROP POLICY IF EXISTS chart_of_accounts_update ON chart_of_accounts CASCADE;

DROP POLICY IF EXISTS discount_authorizations_select ON discount_authorizations CASCADE;
DROP POLICY IF EXISTS discount_authorizations_insert ON discount_authorizations CASCADE;
DROP POLICY IF EXISTS discount_authorizations_update ON discount_authorizations CASCADE;

-- 2️⃣ GARANTIR QUE RLS ESTÁ HABILITADO

ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_authorizations ENABLE ROW LEVEL SECURITY;

-- 3️⃣ CRIAR POLICIES SIMPLES E FUNCIONA VEIS

-- accounts_receivable: PERMISSIVO
CREATE POLICY accounts_receivable_all ON accounts_receivable FOR ALL USING (true) WITH CHECK (true);

-- journal_entries: PERMISSIVO
CREATE POLICY journal_entries_all ON journal_entries FOR ALL USING (true) WITH CHECK (true);

-- cash_register_sessions: PERMISSIVO
CREATE POLICY cash_register_sessions_all ON cash_register_sessions FOR ALL USING (true) WITH CHECK (true);

-- cash_register_movements: PERMISSIVO
CREATE POLICY cash_register_movements_all ON cash_register_movements FOR ALL USING (true) WITH CHECK (true);

-- financial_audits: PERMISSIVO
CREATE POLICY financial_audits_all ON financial_audits FOR ALL USING (true) WITH CHECK (true);

-- chart_of_accounts: PERMISSIVO
CREATE POLICY chart_of_accounts_all ON chart_of_accounts FOR ALL USING (true) WITH CHECK (true);

-- discount_authorizations: PERMISSIVO
CREATE POLICY discount_authorizations_all ON discount_authorizations FOR ALL USING (true) WITH CHECK (true);

-- 4️⃣ VERIFICAÇÃO

SELECT 
  schemaname,
  tablename,
  policyname,
  qual
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

-- ✅ FIM
