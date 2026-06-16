-- ============================================================================
-- Faturamento Enterprise Hospitalar - extensoes sem duplicar tabelas
-- ============================================================================

ALTER TABLE IF EXISTS billing_guides
ADD COLUMN IF NOT EXISTS workflow_status TEXT,
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS audit_results JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS anti_glosa_alerts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS billing_rules_snapshot JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS contractual_due_date DATE,
ADD COLUMN IF NOT EXISTS negotiated_value NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS coparticipation_value NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_batch_key TEXT;

CREATE INDEX IF NOT EXISTS idx_billing_guides_workflow_status
  ON billing_guides(clinic_id, workflow_status, data_atualizacao DESC);

CREATE INDEX IF NOT EXISTS idx_billing_guides_batch_key
  ON billing_guides(clinic_id, billing_batch_key)
  WHERE billing_batch_key IS NOT NULL;

ALTER TABLE IF EXISTS appointment_payer_rules
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS requires_tuss BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS requires_cid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS monthly_limit NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS annual_limit NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS negotiated_value NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS coparticipation_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS contractual_days_to_pay INT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_appointment_payer_rules_enterprise
  ON appointment_payer_rules(clinic_id, payer_type, is_active);

ALTER TABLE IF EXISTS ar_invoices
ADD COLUMN IF NOT EXISTS negotiated_value NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS coparticipation_value NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE IF EXISTS scheduled_jobs
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS run_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS failure_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE IF EXISTS job_runs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status VARCHAR(20),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS result JSONB;

-- Jobs oficiais do ciclo automatizado. Reusa scheduled_jobs/job_runs existentes.
WITH target_clinic AS (
  SELECT id AS clinic_id
  FROM clinics
  ORDER BY created_at NULLS LAST, id
  LIMIT 1
), faturamento_jobs(job_name, job_type, cron_expression) AS (
  VALUES
    ('faturamento_validar_guias_01h', 'faturamento', '0 1 * * *'),
    ('faturamento_gerar_lotes_02h', 'faturamento', '0 2 * * *'),
    ('faturamento_enviar_xml_03h', 'faturamento', '0 3 * * *'),
    ('faturamento_consultar_retornos_04h', 'faturamento', '0 4 * * *'),
    ('faturamento_atualizar_recebiveis_05h', 'faturamento', '0 5 * * *')
)
INSERT INTO scheduled_jobs (clinic_id, job_name, job_type, cron_expression, is_active, next_run_at)
SELECT target_clinic.clinic_id, faturamento_jobs.job_name, faturamento_jobs.job_type, faturamento_jobs.cron_expression, TRUE, NOW()
FROM target_clinic
CROSS JOIN faturamento_jobs
ON CONFLICT (job_name) DO UPDATE SET
  job_type = EXCLUDED.job_type,
  cron_expression = EXCLUDED.cron_expression,
  clinic_id = COALESCE(scheduled_jobs.clinic_id, EXCLUDED.clinic_id),
  is_active = TRUE,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.execute_faturamento_scheduled_job(p_job_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job scheduled_jobs%ROWTYPE;
  v_run_id UUID;
  v_result JSONB := '{}'::jsonb;
  v_processed INT := 0;
BEGIN
  SELECT * INTO v_job
  FROM scheduled_jobs
  WHERE job_name = p_job_name
    AND job_type = 'faturamento'
  LIMIT 1;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job de faturamento nao encontrado: %', p_job_name;
  END IF;

  INSERT INTO job_runs (scheduled_job_id, started_at, status)
  VALUES (v_job.id, NOW(), 'running')
  RETURNING id INTO v_run_id;

  IF p_job_name = 'faturamento_validar_guias_01h' THEN
    UPDATE billing_guides
    SET workflow_status = CASE
        WHEN COALESCE(codigo_cbhpm, '') = '' OR COALESCE(paciente_nome, '') = '' OR COALESCE(numero_carteirinha, '') = '' THEN 'auditoria'
        ELSE 'faturavel'
      END,
      audit_results = CASE
        WHEN COALESCE(codigo_cbhpm, '') = '' THEN jsonb_build_array(jsonb_build_object('code', 'TUSS_OBRIGATORIA', 'severity', 'critical'))
        ELSE '[]'::jsonb
      END,
      data_atualizacao = NOW()
    WHERE status NOT IN ('Pago', 'Glosado');
    GET DIAGNOSTICS v_processed = ROW_COUNT;
  ELSIF p_job_name = 'faturamento_gerar_lotes_02h' THEN
    UPDATE billing_guides
    SET workflow_status = 'lote',
      billing_batch_key = COALESCE(billing_batch_key, to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || COALESCE(NULLIF(convenio, ''), 'PARTICULAR')),
      status = CASE WHEN status = 'Aguardando XML' THEN 'Faturado' ELSE status END,
      data_atualizacao = NOW()
    WHERE COALESCE(workflow_status, '') IN ('faturavel', 'pre_auditoria', '');
    GET DIAGNOSTICS v_processed = ROW_COUNT;
  ELSIF p_job_name = 'faturamento_enviar_xml_03h' THEN
    UPDATE billing_guides
    SET workflow_status = 'envio',
      status = 'Enviado',
      data_envio = COALESCE(data_envio, NOW()),
      data_atualizacao = NOW()
    WHERE status IN ('Faturado', 'XML Gerado')
      AND xml_path IS NOT NULL;
    GET DIAGNOSTICS v_processed = ROW_COUNT;
  ELSIF p_job_name = 'faturamento_consultar_retornos_04h' THEN
    UPDATE billing_guides bg
    SET workflow_status = 'retorno',
      data_processamento = COALESCE(bg.data_processamento, NOW()),
      data_atualizacao = NOW()
    WHERE EXISTS (
      SELECT 1 FROM tiss_submissions ts
      WHERE ts.guide_id = bg.id
        AND ts.status IN ('accepted', 'rejected', 'error')
    );
    GET DIAGNOSTICS v_processed = ROW_COUNT;
  ELSIF p_job_name = 'faturamento_atualizar_recebiveis_05h' THEN
    UPDATE billing_guides bg
    SET workflow_status = CASE
        WHEN ai.status IN ('received', 'paid') THEN 'recebimento'
        WHEN ai.id IS NOT NULL THEN 'recebivel'
        ELSE bg.workflow_status
      END,
      status = CASE
        WHEN ai.status IN ('received', 'paid') THEN 'Pago'
        WHEN ai.glosa_value > 0 THEN 'Glosado'
        WHEN ai.id IS NOT NULL THEN 'Faturado'
        ELSE bg.status
      END,
      data_atualizacao = NOW()
    FROM ar_invoices ai
    WHERE ai.clinic_id = bg.clinic_id
      AND ai.guide_number = bg.numero_guia;
    GET DIAGNOSTICS v_processed = ROW_COUNT;
  END IF;

  v_result := jsonb_build_object('job_name', p_job_name, 'processed', v_processed, 'completed_at', NOW());

  UPDATE job_runs
  SET status = 'success', completed_at = NOW(), result = v_result
  WHERE id = v_run_id;

  UPDATE scheduled_jobs
  SET last_run_at = NOW(), last_status = 'success', run_count = run_count + 1, success_count = success_count + 1, updated_at = NOW()
  WHERE id = v_job.id;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  IF v_run_id IS NOT NULL THEN
    UPDATE job_runs
    SET status = 'failed', completed_at = NOW(), error_message = SQLERRM
    WHERE id = v_run_id;
  END IF;
  IF v_job.id IS NOT NULL THEN
    UPDATE scheduled_jobs
    SET last_run_at = NOW(), last_status = 'failed', last_error = SQLERRM, run_count = run_count + 1, failure_count = failure_count + 1, updated_at = NOW()
    WHERE id = v_job.id;
  END IF;
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.execute_faturamento_scheduled_job(TEXT) IS
  'Executor dos jobs automatizados do Faturamento Enterprise, reutilizando billing_guides, tiss_submissions, ar_invoices e job_runs.';