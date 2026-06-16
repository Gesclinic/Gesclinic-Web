-- ETAPA 9: MELHORIA 5 - WEBHOOK ACTIONS

CREATE TABLE IF NOT EXISTS webhook_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_notification_id UUID NOT NULL REFERENCES alert_notifications(id) ON DELETE CASCADE,
  webhook_url VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) DEFAULT 'POST',
  request_payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_clinic_alert (clinic_id, alert_notification_id)
);

ALTER TABLE webhook_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhook calls for their clinic" ON webhook_calls
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

-- FUNÇÃO: build_webhook_payload()
CREATE OR REPLACE FUNCTION build_webhook_payload(
  p_alert alert_notifications,
  p_clinic_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_clinic RECORD;
  v_config RECORD;
BEGIN
  SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id;
  SELECT * INTO v_config FROM alert_configs 
    WHERE clinic_id = p_clinic_id AND alert_type = p_alert.alert_type;

  RETURN jsonb_build_object(
    'event', 'alert.triggered',
    'alert_id', p_alert.id,
    'clinic_id', p_clinic_id,
    'clinic_name', v_clinic.brand_name,
    'alert_type', p_alert.alert_type,
    'severity', p_alert.severity,
    'title', p_alert.title,
    'message', p_alert.message,
    'data', p_alert.data,
    'timestamp', p_alert.created_at,
    'webhook_signature', gen_random_uuid()::text
  );
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO: queue_webhook_call()
CREATE OR REPLACE FUNCTION queue_webhook_call(
  p_clinic_id UUID,
  p_alert_notification_id UUID,
  p_webhook_url VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_alert RECORD;
  v_payload JSONB;
  v_webhook_id UUID;
BEGIN
  SELECT * INTO v_alert FROM alert_notifications WHERE id = p_alert_notification_id;
  v_payload := build_webhook_payload(v_alert, p_clinic_id);

  INSERT INTO webhook_calls (
    clinic_id,
    alert_notification_id,
    webhook_url,
    request_payload
  )
  VALUES (
    p_clinic_id,
    p_alert_notification_id,
    p_webhook_url,
    v_payload
  )
  RETURNING id INTO v_webhook_id;

  RETURN v_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: ao criar novo alerta com webhook configurado
CREATE OR REPLACE FUNCTION on_alert_queue_webhook()
RETURNS TRIGGER AS $$
DECLARE
  v_webhook_url VARCHAR;
BEGIN
  -- Obter webhook URL da configuração de alerta
  SELECT webhook_url INTO v_webhook_url
  FROM alert_configs
  WHERE clinic_id = NEW.clinic_id
    AND alert_type = NEW.alert_type
    AND webhook_url IS NOT NULL;

  IF v_webhook_url IS NOT NULL THEN
    PERFORM queue_webhook_call(NEW.clinic_id, NEW.id, v_webhook_url);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alert_queue_webhook ON alert_notifications;
CREATE TRIGGER trg_alert_queue_webhook
AFTER INSERT ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION on_alert_queue_webhook();

-- VIEW: v_pending_webhooks
CREATE OR REPLACE VIEW v_pending_webhooks AS
SELECT
  wc.id,
  wc.clinic_id,
  wc.webhook_url,
  wc.request_payload,
  wc.retry_count,
  wc.max_retries,
  an.title,
  an.severity
FROM webhook_calls wc
JOIN alert_notifications an ON wc.alert_notification_id = an.id
WHERE wc.response_status IS NULL
  AND (wc.next_retry_at IS NULL OR wc.next_retry_at <= NOW())
  AND wc.retry_count < wc.max_retries
ORDER BY wc.created_at ASC;
