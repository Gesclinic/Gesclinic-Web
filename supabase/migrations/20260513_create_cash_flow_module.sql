-- ═══════════════════════════════════════════════════════════════════════════════
-- 💰 MIGRATION: Fluxo de Caixa Enterprise - Tabelas e Funções
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Data: 13/05/2026
-- Versão: 1.0
-- Objetivo: Criar infraestrutura completa de fluxo de caixa realizado e previsto
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABELA: cash_flow_snapshots
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cash_flow_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  financial_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  
  -- Realizado
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_income NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_expense NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Previsto
  projected_income NUMERIC(15,2) NOT NULL DEFAULT 0,
  projected_expense NUMERIC(15,2) NOT NULL DEFAULT 0,
  projected_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_snapshot_per_day_account UNIQUE(clinic_id, snapshot_date, financial_account_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cash_flow_snapshots_clinic_date 
  ON public.cash_flow_snapshots(clinic_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_cash_flow_snapshots_account_date 
  ON public.cash_flow_snapshots(financial_account_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_cash_flow_snapshots_period 
  ON public.cash_flow_snapshots(clinic_id, snapshot_date DESC, financial_account_id);

-- Comentário
COMMENT ON TABLE public.cash_flow_snapshots IS 
  'Snapshots diários de fluxo de caixa com realizado vs previsto por clínica e conta';

--- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TABELA: cash_flow_predictions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cash_flow_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  financial_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  
  prediction_date DATE NOT NULL,
  prediction_type VARCHAR(20) NOT NULL, -- 'income', 'expense'
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'canceled'
  
  -- Rastreamento
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT cash_flow_predictions_amount_check CHECK (amount >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cash_flow_predictions_clinic_date 
  ON public.cash_flow_predictions(clinic_id, prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_cash_flow_predictions_account 
  ON public.cash_flow_predictions(financial_account_id, prediction_date DESC);

COMMENT ON TABLE public.cash_flow_predictions IS 
  'Previsões de fluxo de caixa para projeções futuras';

--- ═══════════════════════════════════════════════════════════════════════════════
-- 3. VIEW: Realizado vs Previsto - Diário
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_cash_flow_daily_analysis AS
SELECT
  cfs.clinic_id,
  cfs.snapshot_date as analysis_date,
  cfs.financial_account_id,
  fa.account_name,
  
  -- Realizado
  cfs.opening_balance as realized_opening,
  cfs.total_income as realized_income,
  cfs.total_expense as realized_expense,
  cfs.closing_balance as realized_closing,
  
  -- Previsto
  cfs.projected_income,
  cfs.projected_expense,
  cfs.projected_balance,
  
  -- Diferenças
  (cfs.projected_income - cfs.total_income) as income_variance,
  (cfs.projected_expense - cfs.total_expense) as expense_variance,
  (cfs.projected_balance - cfs.closing_balance) as balance_variance,
  
  cfs.created_at
FROM public.cash_flow_snapshots cfs
LEFT JOIN public.financial_accounts fa ON cfs.financial_account_id = fa.id
WHERE cfs.snapshot_date <= CURRENT_DATE;

--- ═══════════════════════════════════════════════════════════════════════════════
-- 4. VIEW: Fluxo Consolidado por Período
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_cash_flow_period_summary AS
SELECT
  cfs.clinic_id,
  DATE_TRUNC('month', cfs.snapshot_date)::DATE as period_start,
  (DATE_TRUNC('month', cfs.snapshot_date)::DATE + INTERVAL '1 month' - INTERVAL '1 day')::DATE as period_end,
  cfs.financial_account_id,
  fa.account_name,
  
  -- Realizado Consolidado
  MIN(cfs.opening_balance) as period_opening_balance,
  SUM(cfs.total_income) as period_total_income,
  SUM(cfs.total_expense) as period_total_expense,
  MAX(cfs.closing_balance) as period_closing_balance,
  
  -- Previsto Consolidado
  SUM(cfs.projected_income) as period_projected_income,
  SUM(cfs.projected_expense) as period_projected_expense,
  MAX(cfs.projected_balance) as period_projected_balance,
  
  -- Líquido
  (SUM(cfs.total_income) - SUM(cfs.total_expense)) as period_net_realized,
  (SUM(cfs.projected_income) - SUM(cfs.projected_expense)) as period_net_projected,
  
  COUNT(*) as days_in_period
FROM public.cash_flow_snapshots cfs
LEFT JOIN public.financial_accounts fa ON cfs.financial_account_id = fa.id
GROUP BY cfs.clinic_id, DATE_TRUNC('month', cfs.snapshot_date), cfs.financial_account_id, fa.account_name;

--- ═══════════════════════════════════════════════════════════════════════════════
-- 5. FUNÇÃO: Calcular Fluxo de Caixa Diário
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.calculate_cash_flow_snapshot(
  p_clinic_id UUID,
  p_snapshot_date DATE,
  p_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
  snapshot_id UUID,
  clinic_id UUID,
  snapshot_date DATE,
  account_id UUID,
  opening_balance NUMERIC,
  total_income NUMERIC,
  total_expense NUMERIC,
  closing_balance NUMERIC,
  projected_income NUMERIC,
  projected_expense NUMERIC,
  projected_balance NUMERIC
) AS $$
DECLARE
  v_opening_balance NUMERIC(15,2);
  v_total_income NUMERIC(15,2);
  v_total_expense NUMERIC(15,2);
  v_closing_balance NUMERIC(15,2);
  v_projected_income NUMERIC(15,2);
  v_projected_expense NUMERIC(15,2);
  v_projected_balance NUMERIC(15,2);
  v_account_id UUID;
  v_snapshot_id UUID;
BEGIN
  -- Se account_id não fornecido, usar NULL (consolidado)
  v_account_id := p_account_id;

  -- Calcular saldo de abertura (closing do dia anterior)
  SELECT COALESCE(cfs.closing_balance, 0) INTO v_opening_balance
  FROM public.cash_flow_snapshots cfs
  WHERE cfs.clinic_id = p_clinic_id
    AND (v_account_id IS NULL OR cfs.financial_account_id = v_account_id)
    AND cfs.snapshot_date = p_snapshot_date - INTERVAL '1 day'
  ORDER BY cfs.snapshot_date DESC
  LIMIT 1;

  -- Se não houver snapshot anterior, usar saldo inicial das contas
  IF v_opening_balance IS NULL THEN
    SELECT COALESCE(SUM(fa.balance), 0) INTO v_opening_balance
    FROM public.financial_accounts fa
    WHERE fa.clinic_id = p_clinic_id
      AND (v_account_id IS NULL OR fa.id = v_account_id);
  END IF;

  -- Calcular REALIZADO (status = 'processed', 'paid', 'partial')
  SELECT
    COALESCE(SUM(CASE WHEN ft.transaction_type IN ('INCOME', 'FEE') THEN ft.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ft.transaction_type IN ('EXPENSE', 'ADJUSTMENT') THEN ft.amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expense
  FROM public.financial_transactions ft
  WHERE ft.clinic_id = p_clinic_id
    AND (v_account_id IS NULL OR ft.financial_account_id = v_account_id)
    AND DATE(ft.transaction_date) = p_snapshot_date
    AND ft.status IN ('processed', 'paid', 'partial')
    AND ft.status != 'canceled';

  -- Calcular PREVISTO (status = 'pending', 'scheduled')
  SELECT
    COALESCE(SUM(CASE WHEN ft.transaction_type IN ('INCOME', 'FEE') THEN ft.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ft.transaction_type IN ('EXPENSE', 'ADJUSTMENT') THEN ft.amount ELSE 0 END), 0)
  INTO v_projected_income, v_projected_expense
  FROM public.financial_transactions ft
  WHERE ft.clinic_id = p_clinic_id
    AND (v_account_id IS NULL OR ft.financial_account_id = v_account_id)
    AND DATE(ft.transaction_date) >= p_snapshot_date
    AND ft.status IN ('pending', 'scheduled');

  -- Calcular saldos
  v_closing_balance := v_opening_balance + v_total_income - v_total_expense;
  v_projected_balance := v_closing_balance + v_projected_income - v_projected_expense;

  -- Inserir ou atualizar snapshot
  INSERT INTO public.cash_flow_snapshots (
    clinic_id,
    snapshot_date,
    financial_account_id,
    opening_balance,
    total_income,
    total_expense,
    closing_balance,
    projected_income,
    projected_expense,
    projected_balance
  ) VALUES (
    p_clinic_id,
    p_snapshot_date,
    v_account_id,
    v_opening_balance,
    v_total_income,
    v_total_expense,
    v_closing_balance,
    v_projected_income,
    v_projected_expense,
    v_projected_balance
  )
  ON CONFLICT (clinic_id, snapshot_date, financial_account_id)
  DO UPDATE SET
    opening_balance = EXCLUDED.opening_balance,
    total_income = EXCLUDED.total_income,
    total_expense = EXCLUDED.total_expense,
    closing_balance = EXCLUDED.closing_balance,
    projected_income = EXCLUDED.projected_income,
    projected_expense = EXCLUDED.projected_expense,
    projected_balance = EXCLUDED.projected_balance,
    updated_at = NOW()
  RETURNING 
    id, clinic_id, snapshot_date, financial_account_id,
    opening_balance, total_income, total_expense, closing_balance,
    projected_income, projected_expense, projected_balance
  INTO v_snapshot_id, clinic_id, snapshot_date, account_id,
    opening_balance, total_income, total_expense, closing_balance,
    projected_income, projected_expense, projected_balance;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.calculate_cash_flow_snapshot IS 
  'Calcula snapshot diário de fluxo de caixa com realizado e previsto';

--- ═══════════════════════════════════════════════════════════════════════════════
-- 6. FUNÇÃO: Atualizar Fluxo de Caixa para Período
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.refresh_cash_flow_period(
  p_clinic_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  processed_dates INT,
  processed_accounts INT,
  total_snapshots_created INT
) AS $$
DECLARE
  v_current_date DATE;
  v_account_id UUID;
  v_date_count INT := 0;
  v_account_count INT := 0;
  v_snapshot_count INT := 0;
  v_rec RECORD;
BEGIN
  -- Processar cada dia do período
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    -- Processar consolidado (NULL account)
    PERFORM * FROM public.calculate_cash_flow_snapshot(p_clinic_id, v_current_date, NULL);
    v_date_count := v_date_count + 1;

    -- Processar por conta
    FOR v_rec IN 
      SELECT DISTINCT fa.id
      FROM public.financial_accounts fa
      WHERE fa.clinic_id = p_clinic_id
    LOOP
      PERFORM * FROM public.calculate_cash_flow_snapshot(p_clinic_id, v_current_date, v_rec.id);
      v_account_count := v_account_count + 1;
    END LOOP;

    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  -- Contar snapshots criados
  SELECT COUNT(*) INTO v_snapshot_count
  FROM public.cash_flow_snapshots
  WHERE clinic_id = p_clinic_id
    AND snapshot_date >= p_start_date
    AND snapshot_date <= p_end_date;

  processed_dates := v_date_count;
  processed_accounts := v_account_count;
  total_snapshots_created := v_snapshot_count;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--- ═══════════════════════════════════════════════════════════════════════════════
-- 7. RLS: Row-Level Security para cash_flow_snapshots
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.cash_flow_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_clinic_cash_flow" ON public.cash_flow_snapshots;
CREATE POLICY "users_can_view_own_clinic_cash_flow"
  ON public.cash_flow_snapshots
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT DISTINCT ur.clinic_id 
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_can_insert_cash_flow" ON public.cash_flow_snapshots;
CREATE POLICY "users_can_insert_cash_flow"
  ON public.cash_flow_snapshots
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT DISTINCT ur.clinic_id 
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- RLS para cash_flow_predictions
ALTER TABLE public.cash_flow_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_clinic_predictions" ON public.cash_flow_predictions;
CREATE POLICY "users_can_view_own_clinic_predictions"
  ON public.cash_flow_predictions
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT DISTINCT ur.clinic_id 
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_can_manage_own_clinic_predictions" ON public.cash_flow_predictions;
CREATE POLICY "users_can_manage_own_clinic_predictions"
  ON public.cash_flow_predictions
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT DISTINCT ur.clinic_id 
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

--- ═══════════════════════════════════════════════════════════════════════════════
-- 8. VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  'MIGRATION COMPLETA' as status,
  COUNT(*) as tabelas_criadas
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('cash_flow_snapshots', 'cash_flow_predictions');

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════════
