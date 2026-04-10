-- ============================================
-- 💳 CRIAR TABELAS PARA SISTEMA DE PAGAMENTO
-- Com rastreabilidade completa
-- Data: 7 de março de 2026
-- ============================================

-- 1️⃣ TABELA: accounts_receivable (Contas a Receber)
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
  receivable_type VARCHAR(50) CHECK (receivable_type IN ('CASH', 'CREDIT_CARD', 'PIX', 'CHECK', 'BOLETO')),
  payment_method VARCHAR(50),
  
  -- Rastreabilidade
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_details JSONB, -- Armazena todo o paymentData
  
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

-- 2️⃣ TABELA: journal_entries (Plano de Contas / Diário)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Conta contábil
  chart_account VARCHAR(20) NOT NULL, -- ex: 1.1.1.01, 1.1.2.01, etc
  
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

-- 3️⃣ TABELA: cash_register_sessions (Caixas do Dia)
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT clinic_date_unique UNIQUE(clinic_id, session_date, status)
);

CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_clinic ON cash_register_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_date ON cash_register_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_status ON cash_register_sessions(status);

-- 4️⃣ TABELA: cash_register_movements (Movimentos do Caixa)
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

-- 5️⃣ TABELA: financial_audits (Auditoria Financeira)
CREATE TABLE IF NOT EXISTS financial_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  
  -- Ação realizada
  action VARCHAR(50) NOT NULL, -- PAYMENT_RECORDED, PAYMENT_EDITED, etc
  
  -- Dados da ação
  amount DECIMAL(10, 2),
  payment_method VARCHAR(50),
  object_data JSONB, -- Snapshot dos dados antes/depois
  
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

-- 6️⃣ TABELA: chart_of_accounts (Plano de Contas - Cadastro)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Código e nome
  code VARCHAR(20) NOT NULL, -- ex: 1.1.1.01, 1.1.2.01
  name VARCHAR(255) NOT NULL,
  
  -- Estrutura
  account_type VARCHAR(20) CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  parent_code VARCHAR(20), -- Hierarquia (ex: 1.1.1.01 tem parent 1.1.1)
  
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
-- 📊 INSERIR PLANO DE CONTAS PADRÃO
-- ============================================

-- Para cada clínica, estabelecer o plano de contas
-- Este é um exemplo que pode ser expandido
INSERT INTO chart_of_accounts (clinic_id, code, name, account_type, parent_code) VALUES
  ('{CLINIC_ID}', '1', 'ATIVO', 'ASSET', NULL),
  ('{CLINIC_ID}', '1.1', 'Circulante', 'ASSET', '1'),
  ('{CLINIC_ID}', '1.1.1', 'Disponibilidades', 'ASSET', '1.1'),
  ('{CLINIC_ID}', '1.1.1.01', 'Caixa', 'ASSET', '1.1.1'),
  ('{CLINIC_ID}', '1.1.2', 'Direitos', 'ASSET', '1.1'),
  ('{CLINIC_ID}', '1.1.2.01', 'Cartões a Receber', 'ASSET', '1.1.2'),
  ('{CLINIC_ID}', '1.1.2.02', 'PIX a Receber', 'ASSET', '1.1.2'),
  ('{CLINIC_ID}', '1.1.2.03', 'Cheques a Receber', 'ASSET', '1.1.2'),
  ('{CLINIC_ID}', '1.1.2.04', 'Boletos a Receber', 'ASSET', '1.1.2'),
  
  ('{CLINIC_ID}', '4', 'RECEITAS', 'INCOME', NULL),
  ('{CLINIC_ID}', '4.1', 'Receita Operacional', 'INCOME', '4'),
  ('{CLINIC_ID}', '4.1.1', 'Serviços Médicos', 'INCOME', '4.1'),
  ('{CLINIC_ID}', '4.1.2', 'Atendimentos Particular', 'INCOME', '4.1'),
  ('{CLINIC_ID}', '4.1.3', 'Atendimentos Convênio', 'INCOME', '4.1')
ON CONFLICT (clinic_id, code) DO NOTHING;

-- ============================================
-- 🔐 POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Apenas usuários da clínica podem ver seus dados
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem dados da sua clínica
CREATE POLICY accounts_receivable_clinic_policy
  ON accounts_receivable
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY journal_entries_clinic_policy
  ON journal_entries
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY cash_register_sessions_clinic_policy
  ON cash_register_sessions
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY cash_register_movements_clinic_policy
  ON cash_register_movements
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY financial_audits_clinic_policy
  ON financial_audits
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY chart_of_accounts_clinic_policy
  ON chart_of_accounts
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- ✅ TESTES / VERIFICAÇÃO
-- ============================================

-- Verificar se tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'accounts_receivable',
  'journal_entries', 
  'cash_register_sessions',
  'cash_register_movements',
  'financial_audits',
  'chart_of_accounts'
);

-- Consultar plano de contas
SELECT code, name, account_type 
FROM chart_of_accounts 
WHERE clinic_id = '{CLINIC_ID}'
ORDER BY code;

-- FIM DO SCRIPT
