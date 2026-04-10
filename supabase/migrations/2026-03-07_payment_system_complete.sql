-- ============================================
-- 🎯 MIGRAÇÃO COMPLETA (ALL-IN-ONE)
-- Sistema de Pagamento + Desconto + RLS
-- Data: 7 de março de 2026
-- ============================================

-- ============================================
-- ⚠️ DROP TABELAS ANTIGAS (se existirem)
-- ============================================

DROP TABLE IF EXISTS discount_authorizations CASCADE;
DROP TABLE IF EXISTS financial_audits CASCADE;
DROP TABLE IF EXISTS cash_register_movements CASCADE;
DROP TABLE IF EXISTS cash_register_sessions CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS accounts_receivable CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;

-- ============================================
-- 1️⃣ TABELA: accounts_receivable (Contas a Receber)
-- ============================================

CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  
  -- Valores
  amount DECIMAL(10, 2) NOT NULL,
  amount_received DECIMAL(10, 2) DEFAULT 0,
  amount_remaining DECIMAL(10, 2),
  
  -- Status e tipo
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'partial', 'received', 'overdue', 'canceled')),
  receivable_type VARCHAR(50) CHECK (receivable_type IN ('CASH', 'CREDIT_CARD', 'PIX', 'CHECK', 'BOLETO', 'DOC', 'TED', 'DEPOSIT')),
  payment_method VARCHAR(50),
  
  -- Desconto
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_reason VARCHAR(50),
  discount_authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  discount_authorized_at TIMESTAMP,
  discount_observation TEXT,
  
  -- Rastreabilidade
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_details JSONB,
  
  -- Datas
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT clinic_appointment_unique UNIQUE(clinic_id, appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_clinic ON accounts_receivable(clinic_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_appointment ON accounts_receivable(appointment_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_patient ON accounts_receivable(patient_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_received_by ON accounts_receivable(received_by);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_discount_reason ON accounts_receivable(discount_reason) WHERE discount > 0;
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_discount_authorized_by ON accounts_receivable(discount_authorized_by) WHERE discount > 0;

-- ============================================
-- 2️⃣ TABELA: journal_entries (Plano de Contas / Diário)
-- ============================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Conta contábil
  chart_account VARCHAR(20) NOT NULL,
  
  -- Débito/Crédito
  debit_amount DECIMAL(10, 2) DEFAULT 0,
  credit_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Descrição
  description TEXT,
  
  -- Tipo
  entry_type VARCHAR(20) CHECK (entry_type IN ('RECEIPT', 'EXPENSE', 'ADJUSTMENT')),
  payment_method VARCHAR(50),
  
  -- Referências
  cash_register_id UUID,
  
  -- Data
  entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_clinic ON journal_entries(clinic_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_appointment ON journal_entries(appointment_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_chart_account ON journal_entries(chart_account);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);

-- ============================================
-- 3️⃣ TABELA: cash_register_sessions (Caixas do Dia)
-- ============================================

CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Data e status
  session_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  
  -- Saldos
  opening_balance DECIMAL(10, 2) DEFAULT 0,
  current_balance DECIMAL(10, 2) DEFAULT 0,
  
  -- Encerramento
  closed_at TIMESTAMP,
  closed_by UUID REFERENCES users(id),
  discrepancy DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  
  -- Timing
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_clinic ON cash_register_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_date ON cash_register_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_status ON cash_register_sessions(status);

-- ============================================
-- 4️⃣ TABELA: cash_register_movements (Movimentos do Caixa)
-- ============================================

CREATE TABLE IF NOT EXISTS cash_register_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id UUID NOT NULL REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Tipo de movimento
  movement_type VARCHAR(20) CHECK (movement_type IN ('INCOME', 'EXPENSE', 'ADJUSTMENT')),
  
  -- Valores
  amount DECIMAL(10, 2) NOT NULL,
  
  -- Forma de pagamento
  payment_method VARCHAR(50),
  
  -- Rastreabilidade
  received_by UUID REFERENCES users(id),
  
  -- Descrição
  description TEXT,
  notes TEXT,
  
  -- Timing
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_register_movements_session ON cash_register_movements(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_clinic ON cash_register_movements(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_type ON cash_register_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_recorded_by ON cash_register_movements(received_by);

-- ============================================
-- 5️⃣ TABELA: financial_audits (Auditoria Financeira)
-- ============================================

CREATE TABLE IF NOT EXISTS financial_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  
  -- Ação realizada
  action VARCHAR(50) NOT NULL,
  
  -- Dados da ação
  amount DECIMAL(10, 2),
  payment_method VARCHAR(50),
  object_data JSONB,
  
  -- Quem fez
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Rastreamento de source
  ip_address INET,
  user_agent TEXT,
  
  -- Timing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_audits_clinic ON financial_audits(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_audits_appointment ON financial_audits(appointment_id);
CREATE INDEX IF NOT EXISTS idx_financial_audits_action ON financial_audits(action);
CREATE INDEX IF NOT EXISTS idx_financial_audits_performed_by ON financial_audits(performed_by);
CREATE INDEX IF NOT EXISTS idx_financial_audits_performed_at ON financial_audits(performed_at);

-- ============================================
-- 6️⃣ TABELA: chart_of_accounts (Plano de Contas - Cadastro)
-- ============================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Código e nome
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Estrutura
  account_type VARCHAR(20) CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  parent_code VARCHAR(20),
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Timing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT clinic_code_unique UNIQUE(clinic_id, code)
);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_clinic ON chart_of_accounts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);

-- ============================================
-- 7️⃣ TABELA: discount_authorizations
-- Para auditoria e workflow de aprovação
-- ============================================

CREATE TABLE IF NOT EXISTS discount_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  accounts_receivable_id UUID REFERENCES accounts_receivable(id) ON DELETE SET NULL,
  
  -- Informações do desconto
  discount_amount DECIMAL(10, 2) NOT NULL,
  discount_reason VARCHAR(50) NOT NULL CHECK (discount_reason IN ('cortesia', 'promocao', 'primeira_consulta', 'indicacao', 'fidelidade', 'erro_cobranca', 'dificuldade_financeira', 'outros')),
  discount_observation TEXT,
  
  -- Quem solicitou
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Aprovação/Rejeição
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  authorized_at TIMESTAMP,
  authorization_notes TEXT,
  
  -- Timing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discount_authorizations_clinic ON discount_authorizations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_discount_authorizations_appointment ON discount_authorizations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_discount_authorizations_status ON discount_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_discount_authorizations_requested_by ON discount_authorizations(requested_by);
CREATE INDEX IF NOT EXISTS idx_discount_authorizations_authorized_by ON discount_authorizations(authorized_by);
CREATE INDEX IF NOT EXISTS idx_discount_authorizations_created_at ON discount_authorizations(created_at);

-- ============================================
-- 8️⃣ RLS POLICIES (Permissivas)
-- ============================================

ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_authorizations ENABLE ROW LEVEL SECURITY;

-- accounts_receivable
CREATE POLICY accounts_receivable_select ON accounts_receivable FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY accounts_receivable_insert ON accounts_receivable FOR INSERT WITH CHECK (true);
CREATE POLICY accounts_receivable_update ON accounts_receivable FOR UPDATE USING (true) WITH CHECK (true);

-- journal_entries
CREATE POLICY journal_entries_select ON journal_entries FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY journal_entries_insert ON journal_entries FOR INSERT WITH CHECK (true);
CREATE POLICY journal_entries_update ON journal_entries FOR UPDATE USING (true) WITH CHECK (true);

-- cash_register_sessions
CREATE POLICY cash_register_sessions_select ON cash_register_sessions FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY cash_register_sessions_insert ON cash_register_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY cash_register_sessions_update ON cash_register_sessions FOR UPDATE USING (true) WITH CHECK (true);

-- cash_register_movements
CREATE POLICY cash_register_movements_select ON cash_register_movements FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY cash_register_movements_insert ON cash_register_movements FOR INSERT WITH CHECK (true);
CREATE POLICY cash_register_movements_update ON cash_register_movements FOR UPDATE USING (true) WITH CHECK (true);

-- financial_audits
CREATE POLICY financial_audits_select ON financial_audits FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY financial_audits_insert ON financial_audits FOR INSERT WITH CHECK (true);
CREATE POLICY financial_audits_update ON financial_audits FOR UPDATE USING (true) WITH CHECK (true);

-- chart_of_accounts
CREATE POLICY chart_of_accounts_select ON chart_of_accounts FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY chart_of_accounts_insert ON chart_of_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY chart_of_accounts_update ON chart_of_accounts FOR UPDATE USING (true) WITH CHECK (true);

-- discount_authorizations
CREATE POLICY discount_authorizations_select ON discount_authorizations FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));
CREATE POLICY discount_authorizations_insert ON discount_authorizations FOR INSERT WITH CHECK (true);
CREATE POLICY discount_authorizations_update ON discount_authorizations FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- 9️⃣ TRIGGER: Atualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_discount_authorizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_discount_authorizations_updated_at ON discount_authorizations;
CREATE TRIGGER update_discount_authorizations_updated_at
  BEFORE UPDATE ON discount_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_authorizations_updated_at();

-- ============================================
-- 📊 VIEW: vw_discount_summary
-- ============================================

CREATE OR REPLACE VIEW vw_discount_summary AS
SELECT 
  da.clinic_id,
  da.discount_reason,
  COUNT(*) as total_discounts,
  SUM(da.discount_amount) as total_amount,
  COUNT(CASE WHEN da.status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN da.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN da.status = 'rejected' THEN 1 END) as rejected_count,
  DATE_TRUNC('day', da.requested_at) as discount_date
FROM discount_authorizations da
GROUP BY da.clinic_id, da.discount_reason, DATE_TRUNC('day', da.requested_at)
ORDER BY discount_date DESC;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'accounts_receivable',
  'journal_entries',
  'cash_register_sessions',
  'cash_register_movements',
  'financial_audits',
  'chart_of_accounts',
  'discount_authorizations'
)
ORDER BY table_name;

-- FIM DO SCRIPT
