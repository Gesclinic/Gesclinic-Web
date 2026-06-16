-- ════════════════════════════════════════════════════════════════════════════════
-- ETAPA 9: MELHORIA 1 - EMAIL INTEGRATION
-- ════════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 1. TABELA: email_logs                                                        │
-- │    Rastreia todos os emails de alerta enviados                               │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES alert_notifications(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_name VARCHAR(100) NOT NULL, -- 'alert_critical', 'alert_high', etc
  sent_at TIMESTAMP DEFAULT NOW(),
  delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_clinic_notification (clinic_id, notification_id),
  INDEX idx_status_date (delivery_status, sent_at),
  INDEX idx_recipient (recipient_email)
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view email logs for their clinic" ON email_logs
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 2. TABELA: email_templates                                                   │
-- │    Armazena templates de email para diferentes tipos de alerta               │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  subject_template VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- ['alert_type', 'severity', 'title', 'message', 'clinic_name', 'date']
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
    OR clinic_id IS NULL -- Global templates
  );

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 3. FUNÇÃO: build_email_content()                                             │
-- │    Constrói conteúdo de email a partir de template + variáveis               │
-- └─────────────────────────────────────────────────────────────────────────────┘

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
  -- Substituir variáveis no template
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := REPLACE(v_subject, '{{' || v_key || '}}', v_value);
    v_body := REPLACE(v_body, '{{' || v_key || '}}', v_value);
  END LOOP;

  RETURN QUERY SELECT v_subject, v_body;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 4. FUNÇÃO: queue_alert_email()                                               │
-- │    Enfileira email de alerta para envio via Edge Function                    │
-- └─────────────────────────────────────────────────────────────────────────────┘

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
  -- Determinar template baseado na severidade
  SELECT id, subject_template, body_html INTO v_template_record
  FROM email_templates
  WHERE clinic_id IS NULL
    AND template_name = 'alert_' || LOWER(p_severity)
    AND is_active = TRUE
  LIMIT 1;

  -- Se não encontrar, usar template padrão
  IF v_template_record IS NULL THEN
    SELECT id, subject_template, body_html INTO v_template_record
    FROM email_templates
    WHERE clinic_id IS NULL
      AND template_name = 'alert_default'
      AND is_active = TRUE
    LIMIT 1;
  END IF;

  -- Se ainda não encontrar, usar valores padrão
  IF v_template_record IS NULL THEN
    v_subject := '[{{severity}}] {{alert_type}} - {{clinic_name}}';
    v_body := '<p>Alerta: {{title}}</p><p>{{message}}</p>';
  ELSE
    v_subject := v_template_record.subject_template;
    v_body := v_template_record.body_html;
  END IF;

  -- Construir variáveis
  v_variables := jsonb_build_object(
    'alert_type', p_alert_type,
    'severity', p_severity,
    'title', p_title,
    'message', p_message,
    'clinic_name', p_clinic_name,
    'date', to_char(NOW(), 'DD/MM/YYYY HH24:MI:SS'),
    'recipient', p_recipient_email
  );

  -- Substituir variáveis nos templates
  SELECT subject, body_html INTO v_subject, v_body
  FROM build_email_content(v_subject, v_body, v_variables);

  -- Inserir log de email
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

  -- Disparar evento para Edge Function via http
  -- A Edge Function lerá status 'pending' e enviará o email
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

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 5. TRIGGER: on_alert_notification_send_email                                 │
-- │    Dispara quando novo alerta é criado e email está habilitado               │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION on_alert_notification_send_email()
RETURNS TRIGGER AS $$
DECLARE
  v_config RECORD;
  v_clinic_name VARCHAR;
  v_recipient VARCHAR;
BEGIN
  -- Obter configuração de alerta
  SELECT * INTO v_config
  FROM alert_configs
  WHERE clinic_id = NEW.clinic_id
    AND alert_type = NEW.alert_type
    AND is_enabled = TRUE;

  -- Se email não está habilitado, sair
  IF v_config IS NULL OR NOT (v_config.notify_channels->'email')::BOOLEAN THEN
    RETURN NEW;
  END IF;

  -- Obter nome da clínica
  SELECT brand_name INTO v_clinic_name
  FROM clinics
  WHERE id = NEW.clinic_id;

  -- Enviar para cada destinatário
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

-- Criar trigger apenas uma vez
DROP TRIGGER IF EXISTS trg_alert_notification_send_email ON alert_notifications;
CREATE TRIGGER trg_alert_notification_send_email
AFTER INSERT ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION on_alert_notification_send_email();

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 6. FUNÇÃO: update_email_delivery_status()                                    │
-- │    Atualiza status de entrega do email                                       │
-- └─────────────────────────────────────────────────────────────────────────────┘

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

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 7. VIEW: v_pending_emails                                                    │
-- │    Emails pendentes de envio (para processar via Edge Function)              │
-- └─────────────────────────────────────────────────────────────────────────────┘

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

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 8. INSERTS: Default Email Templates                                          │
-- └─────────────────────────────────────────────────────────────────────────────┘

INSERT INTO email_templates (template_name, subject_template, body_html, is_active)
VALUES
(
  'alert_critical',
  '[🔴 CRÍTICO] {{alert_type}} - {{clinic_name}}',
  '<html><body style="font-family: Arial, sans-serif;">
    <h2 style="color: #dc2626;">🔴 Alerta Crítico</h2>
    <p><strong>Clínica:</strong> {{clinic_name}}</p>
    <p><strong>Tipo:</strong> {{alert_type}}</p>
    <p><strong>Data/Hora:</strong> {{date}}</p>
    <hr/>
    <h3>{{title}}</h3>
    <p>{{message}}</p>
    <hr/>
    <p style="font-size: 12px; color: #666;">
      Este é um alerta automático do Gesclinic. Acesse o sistema para mais detalhes.
    </p>
  </body></html>',
  TRUE
),
(
  'alert_high',
  '[🟠 ALTO] {{alert_type}} - {{clinic_name}}',
  '<html><body style="font-family: Arial, sans-serif;">
    <h2 style="color: #f97316;">🟠 Alerta Alto</h2>
    <p><strong>Clínica:</strong> {{clinic_name}}</p>
    <p><strong>Tipo:</strong> {{alert_type}}</p>
    <p><strong>Data/Hora:</strong> {{date}}</p>
    <hr/>
    <h3>{{title}}</h3>
    <p>{{message}}</p>
    <hr/>
    <p style="font-size: 12px; color: #666;">
      Este é um alerta automático do Gesclinic.
    </p>
  </body></html>',
  TRUE
),
(
  'alert_medium',
  '[🟡 MÉDIO] {{alert_type}} - {{clinic_name}}',
  '<html><body style="font-family: Arial, sans-serif;">
    <h2 style="color: #eab308;">🟡 Alerta Médio</h2>
    <p><strong>Clínica:</strong> {{clinic_name}}</p>
    <p><strong>Tipo:</strong> {{alert_type}}</p>
    <p><strong>Data/Hora:</strong> {{date}}</p>
    <hr/>
    <h3>{{title}}</h3>
    <p>{{message}}</p>
  </body></html>',
  TRUE
),
(
  'alert_default',
  '[ALERTA] {{alert_type}} - {{clinic_name}}',
  '<html><body style="font-family: Arial, sans-serif;">
    <h2>Alerta {{severity}}</h2>
    <p><strong>Clínica:</strong> {{clinic_name}}</p>
    <p><strong>Tipo:</strong> {{alert_type}}</p>
    <p><strong>Severidade:</strong> {{severity}}</p>
    <p><strong>Data/Hora:</strong> {{date}}</p>
    <hr/>
    <h3>{{title}}</h3>
    <p>{{message}}</p>
  </body></html>',
  TRUE
)
ON CONFLICT (template_name) DO NOTHING;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 9. ÍNDICES DE PERFORMANCE                                                    │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_email_logs_pending
  ON email_logs(delivery_status, next_retry_at)
  WHERE delivery_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_email_templates_active
  ON email_templates(template_name)
  WHERE is_active = TRUE AND clinic_id IS NULL;
