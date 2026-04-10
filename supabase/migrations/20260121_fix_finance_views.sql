-- ============================================================
-- FIX FINANCE VIEWS - SAFE MODE - 21/01/2026
-- Apenas ADICIONA colunas faltantes e recria VIEWS
-- Não deleta dados existentes
-- ============================================================

-- ============================================================
-- 1. TABELA: ar_receivables - ADICIONAR COLUNAS FALTANTES
-- ============================================================

-- Adicionar coluna origem se não existir
ALTER TABLE IF EXISTS public.ar_receivables
  ADD COLUMN IF NOT EXISTS origem text DEFAULT 'Manual';

ALTER TABLE IF EXISTS public.ar_receivables
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS paciente_id uuid,
  ADD COLUMN IF NOT EXISTS convenio_id uuid,
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS servico_id uuid,
  ADD COLUMN IF NOT EXISTS profissional_id uuid,
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid,
  ADD COLUMN IF NOT EXISTS plano_contas_id uuid,
  ADD COLUMN IF NOT EXISTS valor_bruto numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descontos numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forma_prevista text,
  ADD COLUMN IF NOT EXISTS data_emissao date,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS data_recebimento date,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS parcelado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parcela_atual int,
  ADD COLUMN IF NOT EXISTS total_parcelas int,
  ADD COLUMN IF NOT EXISTS grupo_parcelamento_id uuid,
  ADD COLUMN IF NOT EXISTS appointment_id uuid,
  ADD COLUMN IF NOT EXISTS lote_faturamento_id uuid,
  ADD COLUMN IF NOT EXISTS numero_guia text,
  ADD COLUMN IF NOT EXISTS previsao_pagamento date,
  ADD COLUMN IF NOT EXISTS contrato_id uuid,
  ADD COLUMN IF NOT EXISTS competencia text,
  ADD COLUMN IF NOT EXISTS repasse_gerado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payer_name text;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_ar_receivables_clinic ON public.ar_receivables (clinic_id);
CREATE INDEX IF NOT EXISTS idx_ar_receivables_status ON public.ar_receivables (status);
CREATE INDEX IF NOT EXISTS idx_ar_receivables_venc ON public.ar_receivables (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_ar_receivables_receb ON public.ar_receivables (data_recebimento);

-- ============================================================
-- 2. TABELA: ap_bills - Adicionar coluna vendor_name se faltar
-- ============================================================
ALTER TABLE IF EXISTS public.ap_bills
  ADD COLUMN IF NOT EXISTS vendor_name text;

-- ============================================================
-- 3. TABELA: account_plans - Garantir colunas básicas
-- ============================================================
ALTER TABLE IF EXISTS public.account_plans
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS clinic_id uuid;

-- ============================================================
-- 4. VIEW: view_ar_receivables_v1
-- ============================================================
DROP VIEW IF EXISTS public.view_ar_receivables_v1 CASCADE;
CREATE OR REPLACE VIEW public.view_ar_receivables_v1 AS
SELECT
  r.id,
  r.clinic_id,
  COALESCE(r.origem, 'Manual') as origem,
  r.descricao,
  r.payer_name AS pagador,
  r.paciente_id,
  r.convenio_id,
  r.empresa_id,
  r.profissional_id,
  r.centro_custo_id,
  r.plano_contas_id,
  COALESCE(r.valor_bruto, 0) as valor_bruto,
  COALESCE(r.descontos, 0) as descontos,
  COALESCE(r.valor_bruto - r.descontos, 0) as valor_liquido,
  r.forma_prevista,
  r.data_emissao,
  r.data_vencimento,
  r.data_recebimento,
  COALESCE(r.status, 'open') as status,
  COALESCE(r.parcelado, false) as parcelado,
  r.parcela_atual,
  r.total_parcelas,
  r.grupo_parcelamento_id,
  r.created_at
FROM public.ar_receivables r;

-- ============================================================
-- 5. VIEW: ap_bills_with_category (para sorting)
-- ============================================================
DROP VIEW IF EXISTS public.ap_bills_with_category CASCADE;
CREATE OR REPLACE VIEW public.ap_bills_with_category AS
SELECT
  ap.*,
  COALESCE(cp.name, 'Sem categoria') AS category_name
FROM public.ap_bills ap
LEFT JOIN public.account_plans cp ON cp.id = ap.category_id;

-- ============================================================
-- 6. FUNCTION: cashflow_summary
-- ============================================================
DROP FUNCTION IF EXISTS public.cashflow_summary(UUID, DATE, DATE) CASCADE;
CREATE OR REPLACE FUNCTION public.cashflow_summary(
  p_clinic_id UUID,
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  total_entradas NUMERIC,
  total_saidas NUMERIC,
  resultado_liquido NUMERIC,
  saldo_anterior NUMERIC,
  saldo_final NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
  v_entradas NUMERIC := 0;
  v_saidas NUMERIC := 0;
BEGIN
  -- Entradas: ar_receivables com status 'received'
  BEGIN
    SELECT COALESCE(SUM(COALESCE(valor_bruto - COALESCE(descontos, 0), 0)), 0)
    INTO v_entradas
    FROM public.ar_receivables
    WHERE clinic_id = p_clinic_id
      AND COALESCE(status, 'open') = 'received'
      AND data_recebimento >= p_start
      AND data_recebimento <= p_end;
  EXCEPTION WHEN OTHERS THEN
    v_entradas := 0;
  END;

  -- Saídas: ap_bills com status 'paid'
  BEGIN
    SELECT COALESCE(SUM(COALESCE(amount, 0)), 0)
    INTO v_saidas
    FROM public.ap_bills
    WHERE clinic_id = p_clinic_id
      AND COALESCE(status, 'open') = 'paid'
      AND due_date >= p_start
      AND due_date <= p_end;
  EXCEPTION WHEN OTHERS THEN
    v_saidas := 0;
  END;

  RETURN QUERY SELECT
    v_entradas::NUMERIC,
    v_saidas::NUMERIC,
    (v_entradas - v_saidas)::NUMERIC,
    0::NUMERIC,
    (v_entradas - v_saidas)::NUMERIC;
END;
$$;

-- ============================================================
-- 7. FUNCTION: list_ap_bills
-- ============================================================
DROP FUNCTION IF EXISTS public.list_ap_bills(UUID, TEXT, INT, INT) CASCADE;
CREATE OR REPLACE FUNCTION public.list_ap_bills(
  p_clinic_id UUID,
  p_status_text TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  clinic_id UUID,
  category_id UUID,
  vendor_name TEXT,
  description TEXT,
  amount NUMERIC,
  due_date DATE,
  issue_date DATE,
  status TEXT,
  notes TEXT,
  payment_method TEXT,
  document_number TEXT,
  document_url TEXT,
  installments INT,
  ir_pct NUMERIC,
  csll_pct NUMERIC,
  pis_cofins_pct NUMERIC,
  iss_pct NUMERIC,
  icms_pct NUMERIC,
  taxes_retained BOOLEAN,
  repasse_doctor_name TEXT,
  linked_invoice_id UUID,
  linked_service TEXT,
  linked_revenue NUMERIC,
  method_id UUID,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    ab.id,
    ab.clinic_id,
    ab.category_id,
    ab.vendor_name,
    ab.description,
    ab.amount,
    ab.due_date,
    ab.issue_date,
    ab.status,
    ab.notes,
    ab.payment_method,
    ab.document_number,
    ab.document_url,
    ab.installments,
    ab.ir_pct,
    ab.csll_pct,
    ab.pis_cofins_pct,
    ab.iss_pct,
    ab.icms_pct,
    ab.taxes_retained,
    ab.repasse_doctor_name,
    ab.linked_invoice_id,
    ab.linked_service,
    ab.linked_revenue,
    ab.method_id,
    ab.created_at
  FROM public.ap_bills ab
  WHERE ab.clinic_id = p_clinic_id
    AND (p_status_text IS NULL OR ab.status = p_status_text)
  ORDER BY ab.due_date ASC
  LIMIT p_limit OFFSET p_offset;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

-- ============================================================
-- 8. VIEW: cash_flow
-- ============================================================
-- 8. VIEW: cash_flow
-- ============================================================
DROP VIEW IF EXISTS public.cash_flow CASCADE;
CREATE OR REPLACE VIEW public.cash_flow AS
SELECT
  'entrada' AS type,
  r.id,
  r.clinic_id,
  COALESCE(r.data_emissao, CURRENT_DATE) AS date,
  r.descricao AS description,
  COALESCE(r.valor_bruto - COALESCE(r.descontos, 0), 0) AS amount,
  r.centro_custo_id AS cost_center_id,
  r.plano_contas_id AS category_id,
  NULL::UUID AS account_id,
  COALESCE(r.status, 'open') AS status,
  'ar_receivables' AS source_table,
  'system' AS origin,
  false AS is_reconciled,
  r.created_at
FROM public.ar_receivables r
WHERE COALESCE(r.status, 'open') = 'received'

UNION ALL

SELECT
  'saida' AS type,
  ab.id,
  ab.clinic_id,
  COALESCE(ab.due_date, CURRENT_DATE) AS date,
  ab.description,
  COALESCE(ab.amount, 0) AS amount,
  NULL::UUID AS cost_center_id,
  ab.category_id,
  NULL::UUID AS account_id,
  COALESCE(ab.status, 'open') AS status,
  'ap_bills' AS source_table,
  'system' AS origin,
  false AS is_reconciled,
  ab.created_at
FROM public.ap_bills ab
WHERE COALESCE(ab.status, 'open') = 'paid';

-- ============================================================
-- Confirmação
-- ============================================================
SELECT 'Finance views and functions updated successfully (SAFE MODE)!' AS status;
