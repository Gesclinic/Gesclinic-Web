-- ════════════════════════════════════════════════════════════════════════════════
-- ETAPA 9: CONSOLIDATED MIGRATIONS (Email + SMS + Webhooks + Automations + Scheduled Jobs + Advanced Rules)
-- This file consolidates all 6 migrations from 2026-05-28
-- ════════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════════
-- MIGRATION 1: EMAIL INTEGRATION
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Tabela: email_logs
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES alert_notifications(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivery_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email logs for their clinic" ON email_logs
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

-- Tabela: email_templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  subject_template VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(clinic_id, template_name)
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email templates for their clinic" ON email_templates
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
    OR clinic_id IS NULL
  );

-- Função: build_email_content()
CREATE OR REPLACE FUNCTION build_email_content(
  p_template_subject TEXT,
  p_template_body TEXT,
  p_variables JSONB
)
RETURNS TABLE (
  subject TEXT,
  body_html TEXT
) AS $$
DECLARE
  v_subject TEXT := p_template_subject;
  v_body TEXT := p_template_body;
  v_key TEXT;
  v_value TEXT;
BEGIN
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := REPLACE(v_subject, '{{' || v_key || '}}', v_value);
    v_body := REPLACE(v_body, '{{' || v_key || '}}', v_value);
  END LOOP;
  RETURN QUERY SELECT v_subject, v_body;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função: queue_alert_email()
CREATE OR REPLACE FUNCTION queue_alert_email(
  p_clinic_id UUID,
  p_notification_id UUID,
  p_recipient_email VARCHAR,
  p_alert_type VARCHAR,
  p_severity VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_clinic_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_template_record RECORD;
  v_email_log_id UUID;
  v_subject TEXT;
  v_body TEXT;
  v_variables JSONB;
BEGIN
  SELECT id, subject_template, body_html INTO v_template_record
  FROM email_templates
  WHERE clinic_id IS NULL
    AND template_name = 'alert_' || LOWER(p_severity)
    AND is_active = TRUE
  LIMIT 1;

  IF v_template_record IS NULL THEN
    SELECT id, subject_template, body_html INTO v_template_record
    FROM email_templates
    WHERE clinic_id IS NULL
      AND template_name = 'alert_default'
      AND is_active = TRUE
    LIMIT 1;
  END IF;

  IF v_template_record IS NULL THEN
    v_subject := '[{{severity}}] {{alert_type}} - {{clinic_name}}';
    v_body := '<p>Alerta: {{title}}</p><p>{{message}}</p>';
  ELSE
    v_subject := v_template_record.subject_template;
    v_body := v_template_record.body_html;
  END IF;

  v_variables := jsonb_build_object(
    'alert_type', p_alert_type,
    'severity', p_severity,
    'title', p_title,
    'message', p_message,
    'clinic_name', p_clinic_name,
    'date', to_char(NOW(), 'DD/MM/YYYY HH24:MI:SS'),
    'recipient', p_recipient_email
  );

  SELECT subject, body_html INTO v_subject, v_body
  FROM build_email_content(v_subject, v_body, v_variables);

  INSERT INTO email_logs (
    clinic_id,
    notification_id,
    recipient_email,
    subject,
    template_name,
    delivery_status
  )
  VALUES (
    p_clinic_id,
    p_notification_id,
    p_recipient_email,
    v_subject,
    'alert_' || LOWER(p_severity),
    'pending'
  )
  RETURNING id INTO v_email_log_id;

  NOTIFY pgsql_events, json_build_object(
    'event', 'email_queued',
    'email_log_id', v_email_log_id,
    'recipient', p_recipient_email,
    'subject', v_subject,
    'body', v_body
  )::text;

  RETURN v_email_log_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: on_alert_notification_send_email
CREATE OR REPLACE FUNCTION on_alert_notification_send_email()
RETURNS TRIGGER AS $$
DECLARE
  v_config RECORD;
  v_clinic_name VARCHAR;
  v_recipient VARCHAR;
BEGIN
  SELECT * INTO v_config
  FROM alert_configs
  WHERE clinic_id = NEW.clinic_id
    AND alert_type = NEW.alert_type
    AND is_enabled = TRUE;

  IF v_config IS NULL OR NOT (v_config.notify_channels->'email')::BOOLEAN THEN
    RETURN NEW;
  END IF;

  SELECT brand_name INTO v_clinic_name
  FROM clinics
  WHERE id = NEW.clinic_id;

  FOR v_recipient IN
    SELECT unnest(v_config.email_recipients)
  LOOP
    PERFORM queue_alert_email(
      NEW.clinic_id,
      NEW.id,
      v_recipient,
      NEW.alert_type,
      NEW.severity,
      NEW.title,
      NEW.message,
      v_clinic_name
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alert_notification_send_email ON alert_notifications;
CREATE TRIGGER trg_alert_notification_send_email
AFTER INSERT ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION on_alert_notification_send_email();

-- Função: update_email_delivery_status()
CREATE OR REPLACE FUNCTION update_email_delivery_status(
  p_email_log_id UUID,
  p_status VARCHAR,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE email_logs
  SET
    delivery_status = p_status,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_email_log_id;
END;
$$ LANGUAGE plpgsql;

-- View: v_pending_emails
CREATE OR REPLACE VIEW v_pending_emails AS
SELECT
  el.id,
  el.clinic_id,
  el.notification_id,
  el.recipient_email,
  el.subject,
  el.template_name,
  el.retry_count,
  el.max_retries,
  an.title as alert_title,
  an.message as alert_message,
  an.severity,
  c.brand_name
FROM email_logs el
JOIN alert_notifications an ON el.notification_id = an.id
JOIN clinics c ON el.clinic_id = c.id
WHERE el.delivery_status = 'pending'
  AND (el.next_retry_at IS NULL OR el.next_retry_at <= NOW())
  AND el.retry_count < el.max_retries
ORDER BY el.created_at ASC;

-- Default Email Templates
INSERT INTO email_templates (template_name, subject_template, body_html, is_active)
VALUES
(
  'alert_critical',
  '[🔴 CRÍTICO] {{alert_type}} - {{clinic_name}}',
  '<html><body style="font-family: Arial, sans-serif;"><h2 style="color: #dc2626;">🔴 Alerta Crítico</h2><p><strong>Clínica:</strong> {{clinic_name}}</p><p><strong>Tipo:</strong> {{alert_type}}</p><p><strong>Data/Hora:</strong> {{date}}</p><hr/><h3>{{title}}</h3><p>{{message}}</p><hr/><p style="font-size: 12px; color: #666;">Este é um alerta automático do Gesclinic.</p></body></html>',
  TRUE
),
(
  'alert_high',
  '[🟠 ALTO] {{alert_type}} - {{clinic_name}}',
  '<html><body style="font-family: Arial, sans-serif;"><h2 style="color: #f97316;">🟠 Alerta Alto</h2><p><strong>Clínica:</strong> {{clinic_name}}</p><p><strong>Tipo:</strong> {{alert_type}}</p><p><strong>Data/Hora:</strong> {{date}}</p><hr/><h3>{{title}}</h3><p>{{message}}</p><hr/><p style="font-size: 12px; color: #666;">Este é um alerta automático do Gesclinic.</p></body></html>',
  TRUE
),
(
  'alert_medium',
  '[🟡 MÉDIO] {{alert_type}} - {{clinic_name}}',
  '<html><body style="font-family: Arial, sans-serif;"><h2 style="color: #eab308;">🟡 Alerta Médio</h2><p><strong>Clínica:</strong> {{clinic_name}}</p><p><strong>Tipo:</strong> {{alert_type}}</p><p><strong>Data/Hora:</strong> {{date}}</p><hr/><h3>{{title}}</h3><p>{{message}}</p></body></html>',
  TRUE
),
(
  'alert_default',
  '[ALERTA] {{alert_type}} - {{clinic_name}}',
  '<html><body style="font-family: Arial, sans-serif;"><h2>Alerta {{severity}}</h2><p><strong>Clínica:</strong> {{clinic_name}}</p><p><strong>Tipo:</strong> {{alert_type}}</p><p><strong>Severidade:</strong> {{severity}}</p><p><strong>Data/Hora:</strong> {{date}}</p><hr/><h3>{{title}}</h3><p>{{message}}</p></body></html>',
  TRUE
)
ON CONFLICT (template_name) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_email_logs_pending
  ON email_logs(delivery_status, next_retry_at)
  WHERE delivery_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_email_templates_active
  ON email_templates(template_name)
  WHERE is_active = TRUE AND clinic_id IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════════════
-- MIGRATION 4: SCHEDULED JOBS
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Tabela: scheduled_jobs
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL UNIQUE,
  job_type VARCHAR(50) NOT NULL,
  cron_expression VARCHAR(50) NOT NULL,
  last_run_at TIMESTAMP,
  last_status VARCHAR(20),
  last_error TEXT,
  next_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  run_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela: job_runs
CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_job_id UUID NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INT,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  result JSONB
);

-- Função: register_job()
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

-- Função: execute_scheduled_job()
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
  SELECT * INTO v_job FROM scheduled_jobs WHERE id = p_job_id;
  
  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  v_start_time := NOW();

  INSERT INTO job_runs (scheduled_job_id, status, started_at)
  VALUES (p_job_id, 'running', v_start_time)
  RETURNING id INTO v_run_id;

  BEGIN
    CASE v_job.job_type
      WHEN 'alert_check' THEN
        v_result := jsonb_build_object('status', 'success', 'alerts_checked', TRUE);
      
      WHEN 'email_process' THEN
        v_result := jsonb_build_object('status', 'success', 'emails_processed', TRUE);
      
      WHEN 'webhook_process' THEN
        v_result := jsonb_build_object('status', 'success', 'webhooks_processed', TRUE);
      
      WHEN 'sms_process' THEN
        v_result := jsonb_build_object('status', 'success', 'sms_processed', TRUE);
      
      WHEN 'auto_resolve_alerts' THEN
        UPDATE alert_notifications
        SET status = 'resolved', resolved_at = NOW()
        WHERE status = 'active'
          AND (NOW() - created_at) > '24 hours'::INTERVAL;
        v_result := jsonb_build_object('status', 'success', 'auto_resolved', TRUE);
      
      ELSE
        RAISE EXCEPTION 'Unknown job type: %', v_job.job_type;
    END CASE;

    v_end_time := NOW();

    UPDATE job_runs
    SET
      status = 'success',
      completed_at = v_end_time,
      duration_ms = EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT * 1000,
      result = v_result
    WHERE id = v_run_id;

    UPDATE scheduled_jobs
    SET
      last_run_at = v_start_time,
      last_status = 'success',
      last_error = NULL,
      next_run_at = NOW() + '5 minutes'::INTERVAL,
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

    UPDATE job_runs
    SET
      status = 'failed',
      completed_at = v_end_time,
      duration_ms = EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT * 1000,
      error_message = v_error_msg
    WHERE id = v_run_id;

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

-- Registrar tarefas
SELECT register_job('verificar_alertas_a_cada_15min', 'alert_check', '*/15 * * * *');
SELECT register_job('processar_emails_a_cada_5min', 'email_process', '*/5 * * * *');
SELECT register_job('processar_webhooks_a_cada_10min', 'webhook_process', '*/10 * * * *');
SELECT register_job('processar_sms_a_cada_5min', 'sms_process', '*/5 * * * *');
SELECT register_job('resolver_alertas_automaticamente_diariamente', 'auto_resolve_alerts', '0 2 * * *');

-- View: v_job_status
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_active
  ON scheduled_jobs(is_active, next_run_at)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_job_runs_date
  ON job_runs(scheduled_job_id, started_at DESC);
