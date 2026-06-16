-- ============================================
-- Consolida views de caixa/AR em ar_invoices
-- ============================================
-- Data: 2026-06-12
-- Objetivo:
-- - Corrigir views antigas que projetavam fluxo de caixa a partir da tabela legada.
-- - Preservar nomes de compatibilidade usados por rotas e artefatos antigos.

DROP VIEW IF EXISTS public.cash_flow CASCADE;
CREATE OR REPLACE VIEW public.cash_flow AS
SELECT
  'entrada' AS type,
  ai.id,
  ai.clinic_id,
  COALESCE(ai.received_date, ai.received_at::date, ai.due_date, CURRENT_DATE) AS date,
  COALESCE(ai.description, ai.service_description, ai.patient_name, 'Recebimento') AS description,
  COALESCE(ai.paid_total, ai.received_value, ai.net_value, ai.amount, 0) AS amount,
  NULLIF(to_jsonb(ai)->>'centro_custo_id', '')::uuid AS cost_center_id,
  ai.chart_account_id AS category_id,
  NULL::uuid AS account_id,
  COALESCE(ai.status, 'open') AS status,
  'ar_invoices' AS source_table,
  COALESCE(NULLIF(to_jsonb(ai)->>'origem', ''), 'system') AS origin,
  false AS is_reconciled,
  ai.created_at
FROM public.ar_invoices ai
WHERE COALESCE(ai.status, 'open') IN ('open', 'planned', 'partial', 'overdue', 'pending', 'billed', 'received', 'paid')

UNION ALL

SELECT
  'saida' AS type,
  ab.id,
  ab.clinic_id,
  COALESCE(ab.paid_at::date, ab.due_date, CURRENT_DATE) AS date,
  COALESCE(ab.description, ab.vendor_name, 'Conta a pagar') AS description,
  COALESCE(ab.amount, 0) AS amount,
  NULL::uuid AS cost_center_id,
  ab.category_id,
  NULL::uuid AS account_id,
  COALESCE(ab.status, 'open') AS status,
  'ap_bills' AS source_table,
  'system' AS origin,
  false AS is_reconciled,
  ab.created_at
FROM public.ap_bills ab
WHERE COALESCE(ab.status, 'open') IN ('open', 'partial', 'scheduled', 'approved', 'overdue', 'paid');

COMMENT ON VIEW public.cash_flow IS
  'View consolidada de fluxo de caixa: entradas em ar_invoices e saidas em ap_bills.';

DROP VIEW IF EXISTS public.view_ar_receivables_v1 CASCADE;
CREATE OR REPLACE VIEW public.view_ar_receivables_v1 AS
SELECT
  ai.id,
  ai.clinic_id,
  COALESCE(NULLIF(to_jsonb(ai)->>'origem', ''), 'Manual') AS origem,
  COALESCE(ai.description, ai.service_description) AS descricao,
  ai.patient_name AS pagador,
  ai.patient_id AS paciente_id,
  NULLIF(to_jsonb(ai)->>'convenio_id', '')::uuid AS convenio_id,
  NULLIF(to_jsonb(ai)->>'company_id', '')::uuid AS empresa_id,
  NULLIF(to_jsonb(ai)->>'professional_id', '')::uuid AS profissional_id,
  NULLIF(to_jsonb(ai)->>'centro_custo_id', '')::uuid AS centro_custo_id,
  ai.chart_account_id AS plano_contas_id,
  COALESCE(ai.gross_amount, ai.amount, 0) AS valor_bruto,
  COALESCE(ai.discount_value, 0) AS descontos,
  COALESCE(ai.net_value, ai.amount, 0) AS valor_liquido,
  ai.payment_method AS forma_prevista,
  ai.invoice_date AS data_emissao,
  ai.due_date AS data_vencimento,
  COALESCE(ai.received_date, ai.received_at::date) AS data_recebimento,
  COALESCE(ai.status, 'open') AS status,
  COALESCE(ai.total_parcelas, 1) > 1 AS parcelado,
  1::integer AS parcela_atual,
  COALESCE(ai.total_parcelas, 1)::integer AS total_parcelas,
  NULL::uuid AS grupo_parcelamento_id,
  ai.created_at
FROM public.ar_invoices ai;

COMMENT ON VIEW public.view_ar_receivables_v1 IS
  'Compatibilidade: view legada exposta a partir da fonte canonica ar_invoices.';