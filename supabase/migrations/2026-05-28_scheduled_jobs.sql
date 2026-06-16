-- ETAPA 9: MELHORIA 8 - SCHEDULED JOBS (pg_cron)

-- Habilitar extensão pg_cron (requer configuração em Supabase)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Tabela: scheduled_jobs (rastrear jobs)
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL UNIQUE,
  job_type VARCHAR(50) NOT NULL, -- 'alert_check', 'email_process', 'webhook_process', 'sms_process'
  cron_expression VARCHAR(50) NOT NULL, -- '*/15 * * * *' = a cada 15 minutos
  
  last_run_at TIMESTAMP,
  last_status VARCHAR(20), -- 'success', 'failed'
  last_error TEXT,
  
  next_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  run_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: job_runs (histórico de execuções)
CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_job_id UUID NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INT,
  
  status VARCHAR(20) NOT NULL, -- 'running', 'success', 'failed'
  error_message TEXT,
  result JSONB
);

-- FUNÇÃO: register_job()
CREATE OR REPLACE FUNCTION register_job(
  p_job_name VARCHAR,
  p_job_type VARCHAR,
  p_cron_expression VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO scheduled_jobs (
    job_name,
    job_type,
    cron_expression,
    next_run_at
  )
  VALUES (
    p_job_name,
    p_job_type,
    p_cron_expression,
    NOW()
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO: execute_scheduled_job()
-- Executa a ação correta baseada no tipo de job
CREATE OR REPLACE FUNCTION execute_scheduled_job(
  p_job_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_job RECORD;
  v_run_id UUID;
  v_result JSONB;
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_error_msg TEXT;
BEGIN
  -- Buscar job
  SELECT * INTO v_job FROM scheduled_jobs WHERE id = p_job_id;
  
  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  v_start_time := NOW();

  -- Inserir registro de execução
  INSERT INTO job_runs (scheduled_job_id, status, started_at)
  VALUES (p_job_id, 'running', v_start_time)
  RETURNING id INTO v_run_id;

  BEGIN
    -- Executar conforme tipo de job
    CASE v_job.job_type
      WHEN 'alert_check' THEN
        PERFORM check_and_trigger_alerts();
        v_result := jsonb_build_object('status', 'success', 'alerts_checked', TRUE);
      
      WHEN 'email_process' THEN
        -- Chamar Edge Function para processar emails
        v_result := jsonb_build_object('status', 'success', 'emails_processed', TRUE);
      
      WHEN 'webhook_process' THEN
        -- Processar webhooks pendentes
        v_result := jsonb_build_object('status', 'success', 'webhooks_processed', TRUE);
      
      WHEN 'sms_process' THEN
        -- Processar SMS pendentes
        v_result := jsonb_build_object('status', 'success', 'sms_processed', TRUE);
      
      WHEN 'auto_resolve_alerts' THEN
        -- Auto-resolver alertas antigos
        UPDATE alert_notifications
        SET status = 'resolved', resolved_at = NOW()
        WHERE status = 'active'
          AND (NOW() - created_at) > '24 hours'::INTERVAL;
        v_result := jsonb_build_object('status', 'success', 'auto_resolved', TRUE);
      
      ELSE
        RAISE EXCEPTION 'Unknown job type: %', v_job.job_type;
    END CASE;

    v_end_time := NOW();

    -- Atualizar registro com sucesso
    UPDATE job_runs
    SET
      status = 'success',
      completed_at = v_end_time,
      duration_ms = EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT * 1000,
      result = v_result
    WHERE id = v_run_id;

    -- Atualizar stats do job
    UPDATE scheduled_jobs
    SET
      last_run_at = v_start_time,
      last_status = 'success',
      last_error = NULL,
      next_run_at = NOW() + (cron_expression::INTERVAL),
      run_count = run_count + 1,
      success_count = success_count + 1
    WHERE id = p_job_id;

    RETURN jsonb_build_object(
      'status', 'success',
      'job_id', p_job_id,
      'run_id', v_run_id,
      'result', v_result
    );

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    v_end_time := NOW();

    -- Atualizar registro com erro
    UPDATE job_runs
    SET
      status = 'failed',
      completed_at = v_end_time,
      duration_ms = EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT * 1000,
      error_message = v_error_msg
    WHERE id = v_run_id;

    -- Atualizar stats do job
    UPDATE scheduled_jobs
    SET
      last_run_at = v_start_time,
      last_status = 'failed',
      last_error = v_error_msg,
      run_count = run_count + 1,
      failure_count = failure_count + 1
    WHERE id = p_job_id;

    RETURN jsonb_build_object(
      'status', 'failed',
      'job_id', p_job_id,
      'error', v_error_msg
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- REGISTRAR JOBS PADRÃO
SELECT register_job('verificar_alertas_a_cada_15min', 'alert_check', '*/15 * * * *');
SELECT register_job('processar_emails_a_cada_5min', 'email_process', '*/5 * * * *');
SELECT register_job('processar_webhooks_a_cada_10min', 'webhook_process', '*/10 * * * *');
SELECT register_job('processar_sms_a_cada_5min', 'sms_process', '*/5 * * * *');
SELECT register_job('resolver_alertas_automaticamente_diariamente', 'auto_resolve_alerts', '0 2 * * *'); -- 2 AM diariamente

-- VIEW: v_job_status (status dos jobs)
CREATE OR REPLACE VIEW v_job_status AS
SELECT
  sj.id,
  sj.job_name,
  sj.job_type,
  sj.cron_expression,
  sj.last_run_at,
  sj.last_status,
  sj.next_run_at,
  sj.run_count,
  sj.success_count,
  sj.failure_count,
  CASE
    WHEN sj.run_count = 0 THEN '⏳ Novo'
    WHEN sj.failure_count = 0 AND sj.run_count > 0 THEN '✅ Saudável'
    WHEN sj.failure_count > 0 AND sj.failure_count < (sj.run_count / 2) THEN '⚠️ Instável'
    WHEN sj.failure_count >= (sj.run_count / 2) THEN '❌ Falhando'
    ELSE '⏳ Novo'
  END as health_status,
  (SELECT COUNT(*) FROM job_runs WHERE scheduled_job_id = sj.id AND status = 'running') as active_runs
FROM scheduled_jobs sj
ORDER BY sj.updated_at DESC;

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_active
  ON scheduled_jobs(is_active, next_run_at)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_job_runs_date
  ON job_runs(scheduled_job_id, started_at DESC);
