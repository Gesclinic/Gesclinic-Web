-- =====================================================
-- Financial Transactions - Motor Financeiro Enterprise
-- =====================================================

-- Criar enum para transaction_type
CREATE TYPE public.transaction_type_enum AS ENUM (
  'INCOME',
  'EXPENSE',
  'TRANSFER',
  'REVERSAL',
  'FEE',
  'ADJUSTMENT'
);

-- Criar enum para movement_type
CREATE TYPE public.movement_type_enum AS ENUM (
  'REALIZED',
  'PREDICTED'
);

-- Criar enum para transaction_status
CREATE TYPE public.transaction_status_enum AS ENUM (
  'PENDING',
  'PAID',
  'CANCELED',
  'PARTIAL'
);

-- =====================================================
-- Tabela principal: financial_transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  
  -- Tipologia
  transaction_type public.transaction_type_enum NOT NULL,
  movement_type public.movement_type_enum NOT NULL DEFAULT 'REALIZED',
  
  -- Categorização
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  
  -- Dados do lançamento
  description TEXT NOT NULL,
  document_number VARCHAR(255),
  amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  balance_after NUMERIC(15,2),
  
  -- Datas
  transaction_date DATE NOT NULL,
  due_date DATE,
  competency_date DATE,
  
  -- Status
  status public.transaction_status_enum NOT NULL DEFAULT 'PENDING',
  
  -- Rastreabilidade
  origin_module VARCHAR(50),  -- 'appointments', 'payable_bills', 'receivable_bills', 'manual'
  origin_id UUID,  -- ID do documento origem
  
  -- Conciliação
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciliation_date TIMESTAMPTZ,
  
  -- Auditoria
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- Índices para performance
-- =====================================================
CREATE INDEX idx_financial_transactions_clinic_id 
  ON public.financial_transactions(clinic_id);

CREATE INDEX idx_financial_transactions_account_id 
  ON public.financial_transactions(financial_account_id);

CREATE INDEX idx_financial_transactions_category_id 
  ON public.financial_transactions(category_id);

CREATE INDEX idx_financial_transactions_cost_center_id 
  ON public.financial_transactions(cost_center_id);

CREATE INDEX idx_financial_transactions_status 
  ON public.financial_transactions(status);

CREATE INDEX idx_financial_transactions_type 
  ON public.financial_transactions(transaction_type);

CREATE INDEX idx_financial_transactions_movement_type 
  ON public.financial_transactions(movement_type);

CREATE INDEX idx_financial_transactions_origin 
  ON public.financial_transactions(origin_module, origin_id);

CREATE INDEX idx_financial_transactions_date_range 
  ON public.financial_transactions(clinic_id, transaction_date);

CREATE INDEX idx_financial_transactions_due_date 
  ON public.financial_transactions(clinic_id, due_date, status);

CREATE INDEX idx_financial_transactions_reconciled 
  ON public.financial_transactions(clinic_id, is_reconciled);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Política: Usuários veem apenas transações de suas clínicas
CREATE POLICY "users_can_view_own_clinic_transactions"
  ON public.financial_transactions
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem criar transações em suas clínicas
CREATE POLICY "users_can_create_transactions"
  ON public.financial_transactions
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Política: Usuários podem atualizar transações da sua clínica
CREATE POLICY "users_can_update_own_clinic_transactions"
  ON public.financial_transactions
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Usuários podem deletar apenas transações PENDING de suas clínicas
CREATE POLICY "users_can_delete_own_clinic_transactions"
  ON public.financial_transactions
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
    AND status = 'PENDING'
  );

-- =====================================================
-- Tabelas de suporte (se não existirem)
-- =====================================================

-- Categorias financeiras (se não existir)
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_type VARCHAR(50),  -- 'INCOME', 'EXPENSE'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clinic_id, name)
);

-- Centros de custo (se não existir)
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clinic_id, code)
);

-- Habilitar RLS nas tabelas de suporte
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- RLS para categorias
CREATE POLICY "users_can_view_own_clinic_categories"
  ON public.financial_categories
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- RLS para centros de custo
CREATE POLICY "users_can_view_own_clinic_cost_centers"
  ON public.cost_centers
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Função para atualizar timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_financial_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER financial_transactions_updated_at_trigger
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_financial_transactions_updated_at();

-- =====================================================
-- Função para calcular saldo após transação
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_balance_after(
  p_account_id UUID,
  p_transaction_date DATE,
  p_exclude_transaction_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC(15,2);
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type IN ('INCOME', 'REVERSAL') THEN amount
      WHEN transaction_type IN ('EXPENSE', 'FEE', 'ADJUSTMENT') THEN -amount
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM public.financial_transactions
  WHERE financial_account_id = p_account_id
    AND transaction_date <= p_transaction_date
    AND status != 'CANCELED'
    AND (p_exclude_transaction_id IS NULL OR id != p_exclude_transaction_id);
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Índices para ForeignKeys de suporte
-- =====================================================
CREATE INDEX idx_financial_categories_clinic_id 
  ON public.financial_categories(clinic_id);

CREATE INDEX idx_cost_centers_clinic_id 
  ON public.cost_centers(clinic_id);
