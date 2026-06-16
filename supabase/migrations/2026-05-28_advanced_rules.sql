-- ETAPA 9: MELHORIA 7 - ADVANCED ALERT RULES ENGINE

-- Tabela redesenhada com suporte a regras complexas
CREATE TABLE IF NOT EXISTS advanced_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Estrutura de condições aninhadas
  conditions JSONB NOT NULL,
  -- Exemplo:
  -- {
  --   "operator": "AND",
  --   "conditions": [
  --     { "field": "severity", "operator": "=", "value": "CRITICAL" },
  --     { "field": "days_delinquent", "operator": ">", "value": 30 },
  --     {
  --       "operator": "OR",
  --       "conditions": [
  --         { "field": "amount", "operator": ">", "value": 5000 },
  --         { "field": "customer_type", "operator": "=", "value": "corporate" }
  --       ]
  --     }
  --   ]
  -- }
  
  actions JSONB NOT NULL, -- [{"type": "alert", "params": {...}}, {"type": "email", "params": {...}}]
  priority INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(clinic_id, rule_name)
);

ALTER TABLE advanced_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage rules for their clinic" ON advanced_alert_rules
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_rules WHERE user_id = auth.uid() AND role IN ('admin', 'gestor'))
  );

-- FUNÇÃO: evaluate_condition()
CREATE OR REPLACE FUNCTION evaluate_condition(
  p_condition JSONB,
  p_context JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_operator VARCHAR;
  v_field VARCHAR;
  v_condition_op VARCHAR;
  v_value TEXT;
  v_field_value TEXT;
  v_sub_condition JSONB;
  v_result BOOLEAN := TRUE;
BEGIN
  v_operator := p_condition->>'operator';
  
  -- Condição simples
  IF v_operator IS NULL THEN
    v_field := p_condition->>'field';
    v_condition_op := p_condition->>'operator';
    v_value := p_condition->>'value';
    v_field_value := p_context->>v_field;
    
    CASE v_condition_op
      WHEN '=' THEN RETURN v_field_value = v_value;
      WHEN '!=' THEN RETURN v_field_value != v_value;
      WHEN '>' THEN RETURN (v_field_value::NUMERIC) > (v_value::NUMERIC);
      WHEN '<' THEN RETURN (v_field_value::NUMERIC) < (v_value::NUMERIC);
      WHEN '>=' THEN RETURN (v_field_value::NUMERIC) >= (v_value::NUMERIC);
      WHEN '<=' THEN RETURN (v_field_value::NUMERIC) <= (v_value::NUMERIC);
      WHEN 'IN' THEN RETURN v_field_value = ANY(string_to_array(v_value, ','));
      ELSE RETURN FALSE;
    END CASE;
  END IF;
  
  -- Condições compostas
  IF v_operator = 'AND' THEN
    FOR v_sub_condition IN SELECT * FROM jsonb_array_elements(p_condition->'conditions')
    LOOP
      IF NOT evaluate_condition(v_sub_condition, p_context) THEN
        RETURN FALSE;
      END IF;
    END LOOP;
    RETURN TRUE;
  END IF;
  
  IF v_operator = 'OR' THEN
    FOR v_sub_condition IN SELECT * FROM jsonb_array_elements(p_condition->'conditions')
    LOOP
      IF evaluate_condition(v_sub_condition, p_context) THEN
        RETURN TRUE;
      END IF;
    END LOOP;
    RETURN FALSE;
  END IF;
  
  IF v_operator = 'NOT' THEN
    RETURN NOT evaluate_condition(p_condition->'condition', p_context);
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO: apply_advanced_rules()
CREATE OR REPLACE FUNCTION apply_advanced_rules(
  p_clinic_id UUID,
  p_alert_notification_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_rule RECORD;
  v_alert RECORD;
  v_context JSONB;
  v_rule_matches BOOLEAN;
BEGIN
  SELECT * INTO v_alert FROM alert_notifications WHERE id = p_alert_notification_id;
  
  -- Construir contexto do alerta para avaliação
  v_context := jsonb_build_object(
    'severity', v_alert.severity,
    'alert_type', v_alert.alert_type,
    'title', v_alert.title,
    'message', v_alert.message
  );
  
  -- Processar cada regra
  FOR v_rule IN
    SELECT * FROM advanced_alert_rules
    WHERE clinic_id = p_clinic_id
      AND is_active = TRUE
    ORDER BY priority DESC
  LOOP
    -- Avaliar condições da regra
    v_rule_matches := evaluate_condition(v_rule.conditions, v_context);
    
    IF v_rule_matches THEN
      -- Executar ações
      PERFORM execute_rule_actions(v_rule.id, p_alert_notification_id, v_rule.actions);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- FUNÇÃO: execute_rule_actions()
CREATE OR REPLACE FUNCTION execute_rule_actions(
  p_rule_id UUID,
  p_alert_notification_id UUID,
  p_actions JSONB
)
RETURNS VOID AS $$
DECLARE
  v_action JSONB;
BEGIN
  FOR v_action IN SELECT jsonb_array_elements(p_actions)
  LOOP
    -- Executar cada ação (email, escalate, etc)
    CASE v_action->>'type'
      WHEN 'email' THEN
        -- Enviar email
        NULL;
      WHEN 'escalate' THEN
        -- Escalar alerta
        NULL;
      WHEN 'ticket' THEN
        -- Criar ticket
        NULL;
      ELSE
        NULL;
    END CASE;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: aplicar regras avançadas
CREATE OR REPLACE FUNCTION on_alert_apply_advanced_rules()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM apply_advanced_rules(NEW.clinic_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alert_apply_advanced_rules ON alert_notifications;
CREATE TRIGGER trg_alert_apply_advanced_rules
AFTER INSERT ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION on_alert_apply_advanced_rules();
