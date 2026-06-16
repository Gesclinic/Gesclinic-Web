-- Expand financial_accounts table with enterprise fields
-- Date: 2026-05-13

-- Add new columns to financial_accounts
ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  bank_code VARCHAR(4) COMMENT 'Código banco (ex: 001, 237, 341)';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  account_chart_code VARCHAR(50) COMMENT 'Código plano de contas (contábil)';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  default_cost_center UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL COMMENT 'Centro de custo padrão';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  participates_cashflow BOOLEAN DEFAULT true COMMENT 'Participa do fluxo de caixa';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  allows_reconciliation BOOLEAN DEFAULT true COMMENT 'Permite conciliação';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  balance_date DATE COMMENT 'Data do saldo inicial';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  credit_limit DECIMAL(15, 2) DEFAULT 0 COMMENT 'Limite de crédito (se aplicável)';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  reconciliation_status VARCHAR(20) DEFAULT 'pendente' CHECK (reconciliation_status IN ('conciliado', 'pendente', 'divergente')) COMMENT 'Status de conciliação';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  last_reconciliation_at TIMESTAMP COMMENT 'Última reconciliação';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  last_movement_at TIMESTAMP COMMENT 'Última movimentação';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  balance_reconciled DECIMAL(15, 2) DEFAULT 0 COMMENT 'Saldo conciliado';

ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS
  balance_pending DECIMAL(15, 2) DEFAULT 0 COMMENT 'Saldo em conciliação (não confirmado)';

-- Create table for account movements (recent transactions)
CREATE TABLE IF NOT EXISTS public.account_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  movement_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entrada', 'saida')),
  origin VARCHAR(100) COMMENT 'Origem (fluxo_caixa, contas_receber, etc)',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT clinic_account_date_unique UNIQUE(clinic_id, account_id, movement_date, description)
);

-- Create table for reconciliation status
CREATE TABLE IF NOT EXISTS public.account_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL,
  balance_statement DECIMAL(15, 2) NOT NULL COMMENT 'Saldo do extrato',
  balance_system DECIMAL(15, 2) NOT NULL COMMENT 'Saldo do sistema',
  difference DECIMAL(15, 2) COMMENT 'Diferença (automático)',
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('conciliado', 'pendente', 'divergente')),
  notes TEXT,
  reconciled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(clinic_id, account_id, reconciliation_date)
);

-- Add indexes for performance
CREATE INDEX idx_account_movements_clinic ON public.account_movements(clinic_id);
CREATE INDEX idx_account_movements_account ON public.account_movements(account_id);
CREATE INDEX idx_account_movements_date ON public.account_movements(movement_date);
CREATE INDEX idx_account_reconciliation_clinic ON public.account_reconciliation(clinic_id);
CREATE INDEX idx_account_reconciliation_account ON public.account_reconciliation(account_id);
CREATE INDEX idx_account_reconciliation_date ON public.account_reconciliation(reconciliation_date);

-- Add computed difference column trigger for reconciliation
CREATE OR REPLACE FUNCTION compute_reconciliation_difference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.difference = NEW.balance_statement - NEW.balance_system;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reconciliation_difference_trigger
BEFORE INSERT OR UPDATE ON public.account_reconciliation
FOR EACH ROW
EXECUTE FUNCTION compute_reconciliation_difference();

-- Add update timestamp triggers
CREATE OR REPLACE FUNCTION update_account_movements_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movements_timestamp_trigger
BEFORE UPDATE ON public.account_movements
FOR EACH ROW
EXECUTE FUNCTION update_account_movements_timestamp();

-- RLS Policies for account_movements
ALTER TABLE public.account_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_account_movements" ON public.account_movements
  FOR SELECT USING (true);

CREATE POLICY "insert_account_movements" ON public.account_movements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_account_movements" ON public.account_movements
  FOR UPDATE USING (true) WITH CHECK (true);

-- RLS Policies for account_reconciliation
ALTER TABLE public.account_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_account_reconciliation" ON public.account_reconciliation
  FOR SELECT USING (true);

CREATE POLICY "insert_account_reconciliation" ON public.account_reconciliation
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_account_reconciliation" ON public.account_reconciliation
  FOR UPDATE USING (true) WITH CHECK (true);
