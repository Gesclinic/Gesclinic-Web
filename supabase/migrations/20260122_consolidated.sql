-- ============================================================================
-- Consolidated from 20260122_add_parent_id_to_account_plans.sql
-- ============================================================================

-- ============================================================
-- FIX ACCOUNT_PLANS - Adicionar coluna parent_id
-- ============================================================

ALTER TABLE IF EXISTS public.account_plans
  ADD COLUMN IF NOT EXISTS parent_id uuid;

-- Criar ├¡ndice para performance
CREATE INDEX IF NOT EXISTS idx_account_plans_parent_id ON public.account_plans (parent_id);

SELECT 'account_plans.parent_id added successfully!' AS status;

-- ============================================================================
-- Consolidated from 20260122_fix_cash_flow_view.sql
-- ============================================================================

-- ============================================================
-- FIX CASH_FLOW VIEW - Corrigir nomes de coluna
-- ============================================================

DROP VIEW IF EXISTS public.cash_flow CASCADE;
CREATE OR REPLACE VIEW public.cash_flow AS
SELECT
  'entrada' AS type,
  r.id,
  r.clinic_id,
  COALESCE(r.due_date, CURRENT_DATE) AS date,
  COALESCE(r.description, r.patient_name) AS description,
  COALESCE(r.received_value, r.amount, 0) AS amount,
  NULL::UUID AS cost_center_id,
  NULL::UUID AS category_id,
  NULL::UUID AS account_id,
  COALESCE(r.status, 'open') AS status,
  'ar_receivables' AS source_table,
  'system' AS origin,
  false AS is_reconciled,
  r.created_at
FROM public.ar_receivables r
WHERE COALESCE(r.status, 'open') = 'open'

UNION ALL

SELECT
  'saida' AS type,
  ab.id,
  ab.clinic_id,
  COALESCE(ab.due_date, CURRENT_DATE) AS date,
  COALESCE(ab.description, ab.supplier_name) AS description,
  COALESCE(ab.amount, 0) AS amount,
  NULL::UUID AS cost_center_id,
  COALESCE(ab.category_id, NULL::UUID) AS category_id,
  NULL::UUID AS account_id,
  COALESCE(ab.status, 'open') AS status,
  'ap_bills' AS source_table,
  'system' AS origin,
  false AS is_reconciled,
  ab.created_at
FROM public.ap_bills ab
WHERE COALESCE(ab.status, 'open') IN ('open', 'partial', 'scheduled');

SELECT 'cash_flow view fixed!' AS status;

-- ============================================================================
-- Consolidated from 20260122_fix_invoices_table.sql
-- ============================================================================

-- ============================================================
-- FIX INVOICES TABLE - Adicionar colunas faltantes
-- ============================================================

-- Adicionar colunas faltantes que a API espera
ALTER TABLE IF EXISTS public.invoices
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS issued_date DATE,
  ADD COLUMN IF NOT EXISTS paid_date DATE;

-- Sincronizar colunas derivadas
UPDATE public.invoices
SET
  total = amount
WHERE total IS NULL;

-- Criar ├¡ndices para performance
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- Criar view para compatibilidade com queries legadas
CREATE OR REPLACE VIEW public.view_invoices_v1 AS
SELECT
  id,
  clinic_id,
  invoice_number,
  COALESCE(description, '') AS description,
  amount,
  COALESCE(total, amount) AS total,
  patient_id,
  issued_date,
  due_date,
  paid_date,
  status,
  created_at,
  updated_at
FROM public.invoices;

SELECT 'invoices table fixed!' AS status;

-- ============================================================================
-- Consolidated from 20260122_fix_repasse_medico.sql
-- ============================================================================

-- ============================================================
-- FIX REPASSE_MEDICO - Adicionar colunas faltantes e fun├º├Áes
-- ============================================================

-- Adicionar colunas faltantes
ALTER TABLE IF EXISTS public.repasse_medico
  ADD COLUMN IF NOT EXISTS periodo_mes VARCHAR(7),  -- Format: YYYY-MM
  ADD COLUMN IF NOT EXISTS ano INTEGER,
  ADD COLUMN IF NOT EXISTS mes INTEGER,
  ADD COLUMN IF NOT EXISTS tipo_geracao VARCHAR(50) DEFAULT 'manual';

-- Sincronizar dados de ano/mes a partir de period_start
UPDATE public.repasse_medico
SET
  ano = EXTRACT(YEAR FROM period_start)::INTEGER,
  mes = EXTRACT(MONTH FROM period_start)::INTEGER,
  periodo_mes = TO_CHAR(period_start, 'YYYY-MM')
WHERE ano IS NULL OR mes IS NULL OR periodo_mes IS NULL;

-- Criar ├¡ndices
CREATE INDEX IF NOT EXISTS idx_repasse_medico_ano_mes ON public.repasse_medico(ano, mes);
CREATE INDEX IF NOT EXISTS idx_repasse_medico_periodo_mes ON public.repasse_medico(periodo_mes);

-- Criar fun├º├úo gerar_repasse_medico
DROP FUNCTION IF EXISTS public.gerar_repasse_medico(INTEGER, UUID, INTEGER, VARCHAR);

CREATE OR REPLACE FUNCTION public.gerar_repasse_medico(
  p_ano INTEGER,
  p_clinic_id UUID,
  p_mes INTEGER,
  p_tipo_geracao VARCHAR
)
RETURNS TABLE (
  id UUID,
  professional_id UUID,
  professional_name TEXT,
  total_appointments INT,
  total_revenue DECIMAL,
  amount_due DECIMAL,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rm.id,
    rm.professional_id,
    rm.professional_name,
    rm.total_appointments,
    rm.total_revenue,
    rm.amount_due,
    rm.status
  FROM public.repasse_medico rm
  WHERE
    rm.clinic_id = p_clinic_id
    AND rm.ano = p_ano
    AND rm.mes = p_mes
  ORDER BY rm.professional_name;
END;
$$ LANGUAGE plpgsql;

-- Criar fun├º├úo dashboard_repasse_medico
DROP FUNCTION IF EXISTS public.dashboard_repasse_medico(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.dashboard_repasse_medico(
  p_clinic_id UUID,
  p_mes INTEGER,
  p_ano INTEGER
)
RETURNS TABLE (
  total_repasses INT,
  total_due DECIMAL,
  total_paid DECIMAL,
  pending_count INT,
  paid_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT as total_repasses,
    COALESCE(SUM(amount_due), 0::DECIMAL) as total_due,
    COALESCE(SUM(amount_paid), 0::DECIMAL) as total_paid,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::INT as pending_count,
    COUNT(CASE WHEN status = 'paid' THEN 1 END)::INT as paid_count
  FROM public.repasse_medico
  WHERE
    clinic_id = p_clinic_id
    AND ano = p_ano
    AND mes = p_mes;
END;
$$ LANGUAGE plpgsql;

SELECT 'repasse_medico table and functions fixed!' AS status;
