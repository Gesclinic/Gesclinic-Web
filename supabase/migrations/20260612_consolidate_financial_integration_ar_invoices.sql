-- ============================================
-- Consolida integracao financeira em ar_invoices
-- ============================================
-- Data: 2026-06-12
-- Objetivo:
-- - Remover automacoes legadas que criavam/observavam ar_receivables.
-- - Manter o motor Faturamento 360 como caminho unico para criar recebiveis.
-- - Reapontar resumo e views operacionais para ar_invoices.

DROP TRIGGER IF EXISTS create_receivable_on_appointment_attended ON public.appointments;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ar_receivables'
  ) THEN
    DROP TRIGGER IF EXISTS sync_cashflow_on_receivable_update ON public.ar_receivables;
    DROP TRIGGER IF EXISTS on_ar_receivable_paid_trg ON public.ar_receivables;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_receivable_from_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_receivable_from_appointment IS
  'Compatibilidade: trigger legado desativado. Recebiveis de agenda sao criados pelo motor Faturamento 360 em ar_invoices.';

CREATE OR REPLACE FUNCTION public.cashflow_summary(
  p_clinic_id uuid,
  p_start date,
  p_end date
)
RETURNS TABLE (
  ap_open numeric,
  ap_paid numeric,
  ar_open numeric,
  ar_received numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ap AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN LOWER(status) IN ('open', 'scheduled', 'partial', 'approved', 'overdue')
          AND due_date BETWEEN p_start AND p_end
        THEN amount
      END), 0) AS open,
      COALESCE(SUM(CASE
        WHEN LOWER(status) IN ('paid', 'received')
          AND COALESCE(paid_at::date, due_date) BETWEEN p_start AND p_end
        THEN amount
      END), 0) AS paid
    FROM public.ap_bills
    WHERE clinic_id = p_clinic_id
  ), ar AS (
    SELECT
      COALESCE(SUM(CASE
        WHEN LOWER(status) IN ('open', 'planned', 'partial', 'overdue', 'pending', 'billed')
          AND due_date BETWEEN p_start AND p_end
        THEN COALESCE(net_value, amount, 0)
      END), 0) AS open,
      COALESCE(SUM(CASE
        WHEN LOWER(status) IN ('received', 'paid')
          AND COALESCE(received_date, received_at::date, updated_at::date, due_date) BETWEEN p_start AND p_end
        THEN COALESCE(paid_total, received_value, net_value, amount, 0)
      END), 0) AS received
    FROM public.ar_invoices
    WHERE clinic_id = p_clinic_id
  )
  SELECT ap.open, ap.paid, ar.open, ar.received
  FROM ap CROSS JOIN ar;
END;
$$;

COMMENT ON FUNCTION public.cashflow_summary IS
  'Resumo de fluxo de caixa com recebiveis canonicos em ar_invoices e contas a pagar em ap_bills.';

CREATE OR REPLACE VIEW public.vw_billing_report AS
SELECT
  ast.plan_id,
  COALESCE(ast.plan_name, 'Particular') AS plan_name,
  COUNT(DISTINCT a.id) AS total_appointments,
  COUNT(DISTINCT ast.id) AS total_services,
  COALESCE(SUM(ast.value), 0) AS gross_amount,
  COALESCE(SUM(ast.discount), 0) AS total_discount,
  COALESCE(SUM(ast.value - COALESCE(ast.discount, 0)), 0) AS net_amount,
  COUNT(ai.id) AS total_receivables,
  SUM(CASE WHEN LOWER(ai.status) IN ('received', 'paid') THEN 1 ELSE 0 END) AS received_count,
  a.clinic_id
FROM public.appointments a
LEFT JOIN public.appointment_services ast ON a.id = ast.appointment_id
LEFT JOIN public.ar_invoices ai ON a.id = ai.appointment_id
WHERE a.status IN ('attended', 'confirmed')
GROUP BY ast.plan_id, ast.plan_name, a.clinic_id;

CREATE OR REPLACE VIEW public.vw_receivables_report AS
SELECT
  ai.id,
  ai.appointment_id,
  a.scheduled_date,
  NULLIF(to_jsonb(ai)->>'payer_id', '')::uuid AS payer_id,
  COALESCE(ai.net_value, ai.amount, 0) AS amount,
  ai.status,
  ai.due_date,
  CURRENT_DATE - ai.due_date AS days_overdue,
  CASE
    WHEN LOWER(ai.status) IN ('received', 'paid') THEN 'Recebido'
    WHEN ai.due_date IS NOT NULL AND CURRENT_DATE > ai.due_date THEN 'Atrasado'
    ELSE 'Pendente'
  END AS status_label,
  ai.clinic_id
FROM public.ar_invoices ai
LEFT JOIN public.appointments a ON ai.appointment_id = a.id
ORDER BY ai.due_date ASC;

COMMENT ON VIEW public.vw_billing_report IS
  'Relatorio de faturamento por convenio baseado em appointment_services e ar_invoices.';

COMMENT ON VIEW public.vw_receivables_report IS
  'Relatorio de recebiveis baseado na fonte canonica ar_invoices.';