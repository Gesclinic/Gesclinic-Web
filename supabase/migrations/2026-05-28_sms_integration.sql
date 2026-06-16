-- ETAPA 9: MELHORIA 2 - SMS INTEGRATION (TWILIO)

-- Tabela: sms_logs (tracking de SMS enviados)
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES alert_notifications(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,
  twilio_sid VARCHAR(100), -- SID retornado por Twilio
  sent_at TIMESTAMP DEFAULT NOW(),
  delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 2,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_clinic_notification (clinic_id, notification_id),
  INDEX idx_status_date (delivery_status, sent_at)
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sms logs for their clinic" ON sms_logs
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

-- Tabela: clinic_phone_numbers (números de telefone por clínica para SMS)
CREATE TABLE IF NOT EXISTS clinic_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, phone_number)
);

ALTER TABLE clinic_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage phone numbers for their clinic" ON clinic_phone_numbers
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- VIEW: v_pending_sms (SMS pendentes de envio)
CREATE OR REPLACE VIEW v_pending_sms AS
SELECT
  sl.id,
  sl.clinic_id,
  sl.notification_id,
  sl.recipient_phone,
  sl.message_body,
  sl.retry_count,
  sl.max_retries,
  an.title as alert_title,
  an.severity
FROM sms_logs sl
JOIN alert_notifications an ON sl.notification_id = an.id
WHERE sl.delivery_status = 'pending'
  AND (sl.next_retry_at IS NULL OR sl.next_retry_at <= NOW())
  AND sl.retry_count < sl.max_retries
  AND an.severity IN ('CRITICAL', 'HIGH')
ORDER BY sl.created_at ASC;

-- Tabela: sms_throttle (rastreiar limite de SMS por clínica)
CREATE TABLE IF NOT EXISTS sms_throttle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  sms_count INT DEFAULT 0,
  hourly_limit INT DEFAULT 10,
  last_reset TIMESTAMP DEFAULT NOW()
);

-- FUNÇÃO: format_phone_number()
CREATE OR REPLACE FUNCTION format_phone_number(p_phone VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  -- Remover caracteres especiais
  p_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Adicionar código de país se não existir
  IF NOT p_phone ~ '^55' THEN
    p_phone := '55' || p_phone;
  END IF;
  
  -- Adicionar + no início
  IF NOT p_phone ~ '^\+' THEN
    p_phone := '+' || p_phone;
  END IF;
  
  RETURN p_phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- FUNÇÃO: check_sms_throttle()
CREATE OR REPLACE FUNCTION check_sms_throttle(p_clinic_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_throttle RECORD;
  v_hour_ago TIMESTAMP;
BEGIN
  v_hour_ago := NOW() - INTERVAL '1 hour';
  
  SELECT * INTO v_throttle FROM sms_throttle WHERE clinic_id = p_clinic_id;
  
  IF v_throttle IS NULL THEN
    INSERT INTO sms_throttle (clinic_id) VALUES (p_clinic_id);
    RETURN TRUE;
  END IF;
  
  -- Se passou 1 hora, resetar contador
  IF v_throttle.last_reset < v_hour_ago THEN
    UPDATE sms_throttle
    SET sms_count = 0, last_reset = NOW()
    WHERE clinic_id = p_clinic_id;
    RETURN TRUE;
  END IF;
  
  -- Se ainda dentro do limite, permitir
  IF v_throttle.sms_count < v_throttle.hourly_limit THEN
    UPDATE sms_throttle
    SET sms_count = sms_count + 1
    WHERE clinic_id = p_clinic_id;
    RETURN TRUE;
  END IF;
  
  -- Limite excedido
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO: queue_alert_sms()
CREATE OR REPLACE FUNCTION queue_alert_sms(
  p_clinic_id UUID,
  p_notification_id UUID,
  p_recipient_phone VARCHAR,
  p_alert_type VARCHAR,
  p_severity VARCHAR,
  p_title VARCHAR,
  p_message TEXT
)
RETURNS UUID AS $$
DECLARE
  v_sms_log_id UUID;
  v_formatted_phone VARCHAR;
  v_message_body TEXT;
  v_can_send BOOLEAN;
BEGIN
  -- Verificar throttle
  v_can_send := check_sms_throttle(p_clinic_id);
  IF NOT v_can_send THEN
    RAISE EXCEPTION 'SMS throttle limit exceeded for clinic %', p_clinic_id;
  END IF;
  
  -- Formatar número de telefone
  v_formatted_phone := format_phone_number(p_recipient_phone);
  
  -- Construir mensagem SMS (máx 160 chars)
  v_message_body := '[' || UPPER(p_severity) || '] ' || p_title;
  IF length(v_message_body) > 160 THEN
    v_message_body := substring(v_message_body, 1, 157) || '...';
  END IF;
  
  -- Inserir log de SMS
  INSERT INTO sms_logs (
    clinic_id,
    notification_id,
    recipient_phone,
    message_body,
    delivery_status
  )
  VALUES (
    p_clinic_id,
    p_notification_id,
    v_formatted_phone,
    v_message_body,
    'pending'
  )
  RETURNING id INTO v_sms_log_id;
  
  RETURN v_sms_log_id;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: on_alert_notification_send_sms
CREATE OR REPLACE FUNCTION on_alert_notification_send_sms()
RETURNS TRIGGER AS $$
DECLARE
  v_config RECORD;
  v_recipient VARCHAR;
BEGIN
  -- Obter configuração e verificar se SMS está habilitado
  SELECT * INTO v_config
  FROM alert_configs
  WHERE clinic_id = NEW.clinic_id
    AND alert_type = NEW.alert_type
    AND is_enabled = TRUE;
  
  IF v_config IS NULL OR NOT (v_config.notify_channels->'sms')::BOOLEAN THEN
    RETURN NEW;
  END IF;
  
  -- Apenas enviar para alertas CRITICAL ou HIGH
  IF NEW.severity NOT IN ('CRITICAL', 'HIGH') THEN
    RETURN NEW;
  END IF;
  
  -- Enviar SMS para cada número cadastrado
  FOR v_recipient IN
    SELECT phone_number FROM clinic_phone_numbers
    WHERE clinic_id = NEW.clinic_id AND is_active = TRUE
  LOOP
    PERFORM queue_alert_sms(
      NEW.clinic_id,
      NEW.id,
      v_recipient,
      NEW.alert_type,
      NEW.severity,
      NEW.title,
      NEW.message
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alert_notification_send_sms ON alert_notifications;
CREATE TRIGGER trg_alert_notification_send_sms
AFTER INSERT ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION on_alert_notification_send_sms();

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_sms_logs_pending
  ON sms_logs(delivery_status, next_retry_at)
  WHERE delivery_status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_sms_throttle_clinic
  ON sms_throttle(clinic_id, last_reset);
