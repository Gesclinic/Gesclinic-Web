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
  COALESCE(ab.description, ab.vendor_name) AS description,
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
