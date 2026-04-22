-- ========================================
-- CASH DRAWERS & TRANSFERS - PHASE 2
-- ========================================

-- 1. Finance Accounts (Master table)
CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('DINHEIRO', 'CARTAO', 'PIX', 'BANCO', 'CHEQUE')),
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(100),
  agency_code VARCHAR(10),
  account_holder VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, account_name, account_type)
);

-- 2. Cash Drawers (One per operator per day)
CREATE TABLE IF NOT EXISTS cash_drawers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_opened DATE NOT NULL,
  opening_balance NUMERIC(12,2) DEFAULT 0,
  closing_balance NUMERIC(12,2),
  expected_balance NUMERIC(12,2),
  status VARCHAR(20) CHECK (status IN ('open', 'closed_partial', 'closed_full')) DEFAULT 'open',
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, operator_id, date_opened)
);

-- 3. Drawer Movements (Each payment in drawer)
CREATE TABLE IF NOT EXISTS drawer_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawer_id UUID NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('DINHEIRO', 'CARTAO', 'PIX', 'BANCO', 'CHEQUE')),
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('entrada', 'saida')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  reference_document VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Cash Transfers (Between accounts)
CREATE TABLE IF NOT EXISTS cash_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  to_account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('DINHEIRO', 'CARTAO', 'PIX', 'BANCO', 'CHEQUE')),
  amount NUMERIC(12,2) NOT NULL,
  transfer_date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'reversed')) DEFAULT 'pending',
  reference_document VARCHAR(100),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT different_accounts CHECK (from_account_id != to_account_id)
);

-- 5. Bank Reconciliation
CREATE TABLE IF NOT EXISTS bank_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  bank_statement_date DATE NOT NULL,
  bank_balance NUMERIC(12,2) NOT NULL,
  system_balance NUMERIC(12,2) NOT NULL,
  difference NUMERIC(12,2) GENERATED ALWAYS AS (bank_balance - system_balance) STORED,
  status VARCHAR(20) CHECK (status IN ('pending', 'reconciled', 'needs_adjustment')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, account_id, bank_statement_date)
);

-- Indexes for performance
CREATE INDEX idx_cash_drawers_clinic_operator ON cash_drawers(clinic_id, operator_id);
CREATE INDEX idx_cash_drawers_date_opened ON cash_drawers(clinic_id, date_opened);
CREATE INDEX idx_drawer_movements_drawer ON drawer_movements(drawer_id);
CREATE INDEX idx_drawer_movements_payment_method ON drawer_movements(payment_method);
CREATE INDEX idx_cash_transfers_clinic ON cash_transfers(clinic_id);
CREATE INDEX idx_cash_transfers_status ON cash_transfers(status);
CREATE INDEX idx_bank_reconciliation_account ON bank_reconciliation(account_id);

-- RLS Policies
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawer_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation ENABLE ROW LEVEL SECURITY;

-- Finance Accounts Policies
CREATE POLICY "finance_accounts_clinic_access" ON finance_accounts
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Cash Drawers Policies
CREATE POLICY "cash_drawers_clinic_access" ON cash_drawers
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Drawer Movements Policies
CREATE POLICY "drawer_movements_clinic_access" ON drawer_movements
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Cash Transfers Policies
CREATE POLICY "cash_transfers_clinic_access" ON cash_transfers
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Bank Reconciliation Policies
CREATE POLICY "bank_reconciliation_clinic_access" ON bank_reconciliation
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
