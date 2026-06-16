-- ETAPA 9: MELHORIA 4 - AUTOMATIONS

CREATE TABLE IF NOT EXISTS automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_config_id UUID REFERENCES alert_configs(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL, -- 'create_ticket', 'escalate', 'auto_resolution', 'send_reminder'
  action_name VARCHAR(100) NOT NULL,
  trigger_condition JSONB NOT NULL, -- {"severity": "CRITICAL", "after_days": 0}
  action_params JSONB NOT NULL, -- {"ticket_type": "collection", "assign_to": "uuid"}
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE automation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage automations for their clinic" ON automation_actions
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() AND role IN ('admin', 'gestor'))
  );

CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_notification_id UUID NOT NULL REFERENCES alert_notifications(id) ON DELETE CASCADE,
  automation_action_id UUID NOT NULL REFERENCES automation_actions(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_result JSONB, -- {"status": "success", "ticket_id": "123"}
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_clinic_alert (clinic_id, alert_notification_id),
  INDEX idx_action_type (action_type)
);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation logs for their clinic" ON automation_logs
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

-- FUNÇÃO: execute_automation_action()
CREATE OR REPLACE FUNCTION execute_automation_action(
  p_clinic_id UUID,
  p_alert_notification_id UUID,
  p_automation_action_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_action RECORD;
  v_alert RECORD;
  v_result JSONB;
  v_log_id UUID;
  v_error_msg TEXT;
BEGIN
  -- Obter detalhes da ação
  SELECT * INTO v_action FROM automation_actions WHERE id = p_automation_action_id;
  SELECT * INTO v_alert FROM alert_notifications WHERE id = p_alert_notification_id;

  IF v_action IS NULL OR v_alert IS NULL THEN
    RAISE EXCEPTION 'Action or alert not found';
  END IF;

  -- Executar ação conforme tipo
  BEGIN
    CASE v_action.action_type
      WHEN 'create_ticket' THEN
        v_result := create_automation_ticket(p_clinic_id, v_alert, v_action.action_params);
      
      WHEN 'escalate' THEN
        v_result := escalate_alert(p_clinic_id, v_alert, v_action.action_params);
      
      WHEN 'auto_resolution' THEN
        v_result := auto_resolve_alert(p_alert_notification_id, v_action.action_params);
      
      WHEN 'send_reminder' THEN
        v_result := send_reminder(p_clinic_id, v_alert, v_action.action_params);
      
      ELSE
        RAISE EXCEPTION 'Unknown action type: %', v_action.action_type;
    END CASE;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
  END;

  -- Log da execução
  INSERT INTO automation_logs (
    clinic_id,
    alert_notification_id,
    automation_action_id,
    action_type,
    action_result,
    error_message
  )
  VALUES (
    p_clinic_id,
    p_alert_notification_id,
    p_automation_action_id,
    v_action.action_type,
    v_result,
    v_error_msg
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Placeholder functions para cada tipo de ação
CREATE OR REPLACE FUNCTION create_automation_ticket(
  p_clinic_id UUID,
  p_alert alert_notifications,
  p_params JSONB
)
RETURNS JSONB AS $$
BEGIN
  -- TODO: Integrar com sistema de tickets
  RETURN jsonb_build_object(
    'status', 'success',
    'ticket_id', gen_random_uuid(),
    'type', p_params->>'ticket_type'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION escalate_alert(
  p_clinic_id UUID,
  p_alert alert_notifications,
  p_params JSONB
)
RETURNS JSONB AS $$
BEGIN
  -- TODO: Enviar para gestor/diretor
  RETURN jsonb_build_object(
    'status', 'success',
    'escalated_to', p_params->>'assign_to'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_resolve_alert(
  p_alert_id UUID,
  p_params JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_hours INT;
BEGIN
  v_hours := (p_params->>'after_hours')::INT;
  
  -- Se passou X horas, resolver automaticamente
  UPDATE alert_notifications
  SET
    status = 'resolved',
    resolved_at = NOW()
  WHERE id = p_alert_id
    AND status = 'active'
    AND (NOW() - created_at) > (v_hours || ' hours')::INTERVAL;

  RETURN jsonb_build_object('status', 'success', 'auto_resolved', TRUE);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION send_reminder(
  p_clinic_id UUID,
  p_alert alert_notifications,
  p_params JSONB
)
RETURNS JSONB AS $$
BEGIN
  -- TODO: Enviar email de lembrete
  RETURN jsonb_build_object(
    'status', 'success',
    'reminder_sent', TRUE
  );
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: ao criar novo alerta, verificar automações
CREATE OR REPLACE FUNCTION on_alert_trigger_automations()
RETURNS TRIGGER AS $$
DECLARE
  v_automation RECORD;
BEGIN
  FOR v_automation IN
    SELECT * FROM automation_actions
    WHERE clinic_id = NEW.clinic_id
      AND is_enabled = TRUE
      AND (alert_config_id = (SELECT id FROM alert_configs WHERE clinic_id = NEW.clinic_id AND alert_type = NEW.alert_type) OR alert_config_id IS NULL)
  LOOP
    -- Verificar trigger condition
    IF (v_automation.trigger_condition->>'severity' IS NULL OR v_automation.trigger_condition->>'severity' = NEW.severity)
    THEN
      -- Executar action
      PERFORM execute_automation_action(NEW.clinic_id, NEW.id, v_automation.id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alert_trigger_automations ON alert_notifications;
CREATE TRIGGER trg_alert_trigger_automations
AFTER INSERT ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION on_alert_trigger_automations();
