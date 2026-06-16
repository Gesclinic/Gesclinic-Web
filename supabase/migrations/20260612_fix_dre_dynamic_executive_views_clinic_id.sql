-- Corrige views executivas usadas pela DRE dinamica para expor clinic_id.
-- Mantem as colunas existentes e acrescenta clinic_id no final para preservar contratos REST.

CREATE OR REPLACE VIEW v_daily_financial_summary AS
SELECT
  COALESCE(ar.invoice_date, ar.due_date, ar.created_at::date) AS data,
  COUNT(*) AS total_invoices,
  SUM(COALESCE(ar.net_value, ar.amount, 0::numeric)) AS total_amount,
  SUM(COALESCE(ar.paid_total, ar.received_value, 0::numeric)) AS total_received,
  SUM(GREATEST(COALESCE(ar.net_value, ar.amount, 0::numeric) - COALESCE(ar.paid_total, ar.received_value, 0::numeric), 0::numeric)) AS total_pending,
  COUNT(CASE WHEN ar.status::text = ANY (ARRAY['received'::text, 'paid'::text]) THEN 1 END) AS paid_count,
  COUNT(CASE WHEN ar.status::text = 'partial'::text THEN 1 END) AS partial_count,
  COUNT(CASE WHEN ar.status::text = ANY (ARRAY['open'::text, 'planned'::text, 'pending'::text, 'billed'::text, 'overdue'::text]) THEN 1 END) AS pending_count,
  COUNT(CASE WHEN ar.status::text = ANY (ARRAY['canceled'::text, 'cancelled'::text]) THEN 1 END) AS cancelled_count,
  ROUND(SUM(COALESCE(ar.paid_total, ar.received_value, 0::numeric)) / NULLIF(SUM(COALESCE(ar.net_value, ar.amount, 0::numeric)), 0::numeric) * 100::numeric, 2) AS collection_rate_percent,
  ar.clinic_id
FROM ar_invoices ar
GROUP BY ar.clinic_id, COALESCE(ar.invoice_date, ar.due_date, ar.created_at::date)
ORDER BY COALESCE(ar.invoice_date, ar.due_date, ar.created_at::date) DESC;

CREATE OR REPLACE VIEW v_monthly_financial_summary AS
SELECT
  DATE_TRUNC('month'::text, COALESCE(ar.invoice_date, ar.due_date, ar.created_at::date)::timestamp with time zone)::date AS mes,
  COUNT(*) AS total_invoices,
  SUM(COALESCE(ar.net_value, ar.amount, 0::numeric)) AS total_faturado,
  SUM(COALESCE(ar.paid_total, ar.received_value, 0::numeric)) AS total_recebido,
  SUM(GREATEST(COALESCE(ar.net_value, ar.amount, 0::numeric) - COALESCE(ar.paid_total, ar.received_value, 0::numeric), 0::numeric)) AS total_a_receber,
  COUNT(CASE WHEN ar.status::text = ANY (ARRAY['received'::text, 'paid'::text]) THEN 1 END) AS paid_count,
  COUNT(CASE WHEN ar.status::text = 'partial'::text THEN 1 END) AS partial_count,
  COUNT(CASE WHEN ar.status::text = ANY (ARRAY['open'::text, 'planned'::text, 'pending'::text, 'billed'::text, 'overdue'::text]) THEN 1 END) AS pending_count,
  ROUND(SUM(COALESCE(ar.paid_total, ar.received_value, 0::numeric)) / NULLIF(SUM(COALESCE(ar.net_value, ar.amount, 0::numeric)), 0::numeric) * 100::numeric, 2) AS taxa_recebimento_percent,
  ar.clinic_id
FROM ar_invoices ar
GROUP BY ar.clinic_id, DATE_TRUNC('month'::text, COALESCE(ar.invoice_date, ar.due_date, ar.created_at::date)::timestamp with time zone)
ORDER BY DATE_TRUNC('month'::text, COALESCE(ar.invoice_date, ar.due_date, ar.created_at::date)::timestamp with time zone)::date DESC;

CREATE OR REPLACE VIEW v_delinquency_analysis AS
SELECT
  ar.id AS invoice_id,
  ar.patient_name,
  COALESCE(ar.net_value, ar.amount, 0::numeric)::numeric(12,2) AS amount,
  COALESCE(ar.paid_total, ar.received_value, 0::numeric)::numeric(12,2) AS received_value,
  ar.status,
  ar.due_date,
  CURRENT_DATE - ar.due_date AS dias_atrasado,
  CASE
    WHEN (CURRENT_DATE - ar.due_date) <= 0 THEN 'No prazo'::text
    WHEN (CURRENT_DATE - ar.due_date) BETWEEN 1 AND 30 THEN 'Ate 30 dias'::text
    WHEN (CURRENT_DATE - ar.due_date) BETWEEN 31 AND 60 THEN '31-60 dias'::text
    WHEN (CURRENT_DATE - ar.due_date) BETWEEN 61 AND 90 THEN '61-90 dias'::text
    ELSE 'Acima de 90 dias'::text
  END AS faixa_atraso,
  GREATEST(COALESCE(ar.net_value, ar.amount, 0::numeric) - COALESCE(ar.paid_total, ar.received_value, 0::numeric), 0::numeric) AS saldo_devedor,
  CASE
    WHEN ar.status::text = ANY (ARRAY['received'::text, 'paid'::text]) THEN 0::numeric
    WHEN ar.status::text = 'partial'::text THEN GREATEST(COALESCE(ar.net_value, ar.amount, 0::numeric) - COALESCE(ar.paid_total, ar.received_value, 0::numeric), 0::numeric)
    ELSE COALESCE(ar.net_value, ar.amount, 0::numeric)
  END AS valor_pendente,
  ar.clinic_id
FROM ar_invoices ar
WHERE ar.status::text = ANY (ARRAY['open'::text, 'planned'::text, 'pending'::text, 'billed'::text, 'overdue'::text, 'partial'::text])
  AND ar.due_date < CURRENT_DATE
ORDER BY (CURRENT_DATE - ar.due_date) DESC;

CREATE OR REPLACE VIEW v_professional_contribution AS
SELECT
  pr.id AS professional_id,
  pr.name,
  COUNT(DISTINCT ap.id) AS total_atendimentos,
  SUM(ap.value) AS total_faturado,
  COUNT(DISTINCT ar.id) AS total_contas_geradas,
  SUM(COALESCE(ar.net_value, ar.amount, 0::numeric)) AS total_valor_contas,
  SUM(COALESCE(ar.paid_total, ar.received_value, 0::numeric)) AS total_recebido,
  ROUND(SUM(COALESCE(ar.paid_total, ar.received_value, 0::numeric)) / NULLIF(SUM(COALESCE(ar.net_value, ar.amount, 0::numeric)), 0::numeric) * 100::numeric, 2) AS taxa_recebimento_prof,
  pr.clinic_id
FROM professionals pr
LEFT JOIN appointments ap
  ON ap.professional_id = pr.id
  AND ap.clinic_id = pr.clinic_id
  AND ap.official_status = 'completed'::appointment_official_status
LEFT JOIN ar_invoices ar
  ON ar.appointment_id = ap.id
  AND ar.clinic_id = pr.clinic_id
GROUP BY pr.id, pr.name, pr.clinic_id
ORDER BY SUM(ap.value) DESC;

CREATE OR REPLACE VIEW v_professional_repayment_summary AS
SELECT
  prep.professional_id,
  pr.name,
  COUNT(*) AS total_repayments,
  SUM(prep.repayment_amount) AS total_repayment_amount,
  COUNT(CASE WHEN prep.status::text = 'pending'::text THEN 1 END) AS pending_count,
  SUM(CASE WHEN prep.status::text = 'pending'::text THEN prep.repayment_amount ELSE 0::numeric END) AS pending_amount,
  COUNT(CASE WHEN prep.status::text = 'approved'::text THEN 1 END) AS approved_count,
  SUM(CASE WHEN prep.status::text = 'approved'::text THEN prep.repayment_amount ELSE 0::numeric END) AS approved_amount,
  COUNT(CASE WHEN prep.status::text = 'paid'::text THEN 1 END) AS paid_count,
  SUM(CASE WHEN prep.status::text = 'paid'::text THEN prep.repayment_amount ELSE 0::numeric END) AS paid_amount,
  prep.clinic_id
FROM professional_repayments prep
LEFT JOIN professionals pr
  ON pr.id = prep.professional_id
  AND pr.clinic_id = prep.clinic_id
GROUP BY prep.professional_id, pr.name, prep.clinic_id
ORDER BY SUM(prep.repayment_amount) DESC;

CREATE OR REPLACE VIEW v_executive_kpis AS
SELECT
  'Contas a Receber'::text AS metric,
  SUM(GREATEST(COALESCE(ar.net_value, ar.amount, 0::numeric) - COALESCE(ar.paid_total, ar.received_value, 0::numeric), 0::numeric)) AS value,
  COUNT(*) AS count,
  'currency'::text AS type,
  'pending'::text AS status,
  ar.clinic_id,
  'Contas a Receber'::text AS metric_name,
  'Contas a Receber'::text AS label
FROM ar_invoices ar
WHERE ar.status::text = ANY (ARRAY['open'::text, 'planned'::text, 'pending'::text, 'billed'::text, 'overdue'::text, 'partial'::text])
GROUP BY ar.clinic_id
UNION ALL
SELECT
  'Contas Pagas'::text AS metric,
  SUM(COALESCE(ar.paid_total, ar.received_value, 0::numeric)) AS value,
  COUNT(*) AS count,
  'currency'::text AS type,
  'paid'::text AS status,
  ar.clinic_id,
  'Contas Pagas'::text AS metric_name,
  'Contas Pagas'::text AS label
FROM ar_invoices ar
WHERE ar.status::text = ANY (ARRAY['received'::text, 'paid'::text])
GROUP BY ar.clinic_id
UNION ALL
SELECT
  'Taxa de Recebimento (%)'::text AS metric,
  ROUND(SUM(COALESCE(ar.paid_total, ar.received_value, 0::numeric)) / NULLIF(SUM(COALESCE(ar.net_value, ar.amount, 0::numeric)), 0::numeric) * 100::numeric, 2) AS value,
  COUNT(*) AS count,
  'percentage'::text AS type,
  'rate'::text AS status,
  ar.clinic_id,
  'Taxa de Recebimento %'::text AS metric_name,
  'Taxa de Recebimento'::text AS label
FROM ar_invoices ar
GROUP BY ar.clinic_id
UNION ALL
SELECT
  'Repasses Pendentes'::text AS metric,
  SUM(prep.repayment_amount) AS value,
  COUNT(*) AS count,
  'currency'::text AS type,
  'pending'::text AS status,
  prep.clinic_id,
  'Repasses Pendentes'::text AS metric_name,
  'Repasses Pendentes'::text AS label
FROM professional_repayments prep
WHERE prep.status::text = ANY (ARRAY['pending'::text, 'approved'::text])
GROUP BY prep.clinic_id
UNION ALL
SELECT
  'Repasses Pagos'::text AS metric,
  SUM(prep.repayment_amount) AS value,
  COUNT(*) AS count,
  'currency'::text AS type,
  'paid'::text AS status,
  prep.clinic_id,
  'Repasses Pagos'::text AS metric_name,
  'Repasses Pagos'::text AS label
FROM professional_repayments prep
WHERE prep.status::text = 'paid'::text
GROUP BY prep.clinic_id;