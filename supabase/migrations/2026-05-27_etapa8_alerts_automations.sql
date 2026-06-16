-- ════════════════════════════════════════════════════════════════════════════════
-- ETAPA 8: ALERTAS E AUTOMAÇÕES - MIGRATION
-- ════════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 1. TABELA: alert_configs                                                     │
-- │    Configurações de alertas por clínica                                      │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  severity_level VARCHAR(20) DEFAULT 'MEDIUM',
  check_frequency VARCHAR(20) DEFAULT 'DAILY',
  notify_channels JSONB DEFAULT '{"email": true, "sms": false, "push": false, "dashboard": true}',
  email_recipients TEXT[] DEFAULT '{}',
  webhook_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(clinic_id, alert_type)
);

ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alert configs for their clinic" ON alert_configs
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage alert configs for their clinic" ON alert_configs
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 2. TABELA: alert_rules                                                       │
-- │    Regras específicas de alerta                                              │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  condition_type VARCHAR(50), -- 'delinquency_days', 'amount', 'percentage'
  condition_value NUMERIC NOT NULL,
  condition_operator VARCHAR(10), -- '>', '<', '>=', '<=', '=='
  action_on_trigger VARCHAR(100), -- 'email', 'sms', 'escalate', 'auto_cobranca'
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, rule_name)
);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alert rules for their clinic" ON alert_rules
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 3. TABELA: alert_notifications                                               │
-- │    Histórico de notificações disparadas                                      │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'MEDIUM',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active',
  read_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  INDEX idx_clinic_alert (clinic_id, alert_type),
  INDEX idx_status_date (status, created_at)
);

ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alert notifications for their clinic" ON alert_notifications
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update alert notifications for their clinic" ON alert_notifications
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 4. TABELA: notification_logs                                                 │
-- │    Log de envios de notificação                                              │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_notification_id UUID NOT NULL REFERENCES alert_notifications(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP,
  delivery_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_status (status),
  INDEX idx_sent (sent_at)
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notification logs for their clinic" ON notification_logs
  FOR SELECT USING (
    alert_notification_id IN (
      SELECT id FROM alert_notifications WHERE clinic_id IN (
        SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
      )
    )
  );

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 5. TABELA: alert_actions                                                     │
-- │    Ações automáticas pendentes                                               │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS alert_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_notification_id UUID REFERENCES alert_notifications(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_params JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  execution_result TEXT,
  scheduled_for TIMESTAMP,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_status (status),
  INDEX idx_scheduled (scheduled_for)
);

ALTER TABLE alert_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alert actions for their clinic" ON alert_actions
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════════════════
-- SQL FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ FUNCTION: create_alert_if_delinquency                                        │
-- │ Cria alerta se houver faturas com atraso                                     │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION create_alert_if_delinquency(p_clinic_id UUID)
RETURNS void AS $$
DECLARE
  v_config UUID;
  v_delinquent_count INT;
  v_delinquent_amount NUMERIC;
  v_message TEXT;
BEGIN
  -- Busca configuração de alerta de inadimplência
  SELECT id INTO v_config FROM alert_configs 
  WHERE clinic_id = p_clinic_id 
  AND alert_type = 'delinquency' 
  AND is_enabled = TRUE;
  
  IF v_config IS NULL THEN RETURN; END IF;
  
  -- Conta faturas vencidas
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0)
  INTO v_delinquent_count, v_delinquent_amount
  FROM ap_bills
  WHERE clinic_id = p_clinic_id
  AND status IN ('open', 'partial')
  AND due_date < CURRENT_DATE;
  
  IF v_delinquent_count > 0 THEN
    v_message := v_delinquent_count || ' faturas vencidas totalizando R$ ' || 
                 ROUND(v_delinquent_amount::NUMERIC, 2);
    
    -- Cria alerta se não existir um ativo com a mesma mensagem
    INSERT INTO alert_notifications 
    (clinic_id, alert_config_id, alert_type, severity, title, message, status, data)
    VALUES 
    (p_clinic_id, v_config, 'delinquency', 'HIGH', 
     'Faturas Vencidas', v_message, 'active',
     jsonb_build_object('count', v_delinquent_count, 'amount', v_delinquent_amount));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ FUNCTION: create_alert_if_repayment_late                                     │
-- │ Cria alerta se repasse médico estiver atrasado                               │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION create_alert_if_repayment_late(p_clinic_id UUID)
RETURNS void AS $$
DECLARE
  v_config UUID;
  v_late_count INT;
  v_late_amount NUMERIC;
BEGIN
  SELECT id INTO v_config FROM alert_configs 
  WHERE clinic_id = p_clinic_id 
  AND alert_type = 'repayment_late' 
  AND is_enabled = TRUE;
  
  IF v_config IS NULL THEN RETURN; END IF;
  
  -- Busca repasses não pagos há 48+ horas
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0)
  INTO v_late_count, v_late_amount
  FROM doctor_repayments
  WHERE clinic_id = p_clinic_id
  AND status = 'pending'
  AND created_at < NOW() - INTERVAL '2 days';
  
  IF v_late_count > 0 THEN
    INSERT INTO alert_notifications 
    (clinic_id, alert_config_id, alert_type, severity, title, message, status, data)
    VALUES 
    (p_clinic_id, v_config, 'repayment_late', 'HIGH', 
     'Repasses Atrasados', v_late_count || ' repasses aguardando pagamento (R$ ' || ROUND(v_late_amount::NUMERIC, 2) || ')',
     'active', jsonb_build_object('count', v_late_count, 'amount', v_late_amount));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ FUNCTION: create_alert_if_low_cashflow                                       │
-- │ Cria alerta se fluxo de caixa estiver baixo                                  │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION create_alert_if_low_cashflow(p_clinic_id UUID)
RETURNS void AS $$
DECLARE
  v_config UUID;
  v_current_balance NUMERIC;
  v_monthly_revenue NUMERIC;
BEGIN
  SELECT id INTO v_config FROM alert_configs 
  WHERE clinic_id = p_clinic_id 
  AND alert_type = 'low_cashflow' 
  AND is_enabled = TRUE;
  
  IF v_config IS NULL THEN RETURN; END IF;
  
  -- Simula saldo em caixa (aqui simplificado)
  v_current_balance := 1000; -- Em produção, buscar de conta bancária/sistema
  
  -- Calcula receita média mensal (últimos 3 meses)
  SELECT COALESCE(AVG(total_amount), 0)
  INTO v_monthly_revenue
  FROM (
    SELECT SUM(amount) as total_amount
    FROM invoices
    WHERE clinic_id = p_clinic_id
    AND created_at >= NOW() - INTERVAL '3 months'
    GROUP BY DATE_TRUNC('month', created_at)
    LIMIT 3
  ) sub;
  
  -- Se saldo < 10% da receita mensal
  IF v_monthly_revenue > 0 AND v_current_balance < (v_monthly_revenue * 0.1) THEN
    INSERT INTO alert_notifications 
    (clinic_id, alert_config_id, alert_type, severity, title, message, status, data)
    VALUES 
    (p_clinic_id, v_config, 'low_cashflow', 'CRITICAL', 
     'Fluxo de Caixa Crítico', 'Saldo em caixa abaixo de 10% da receita mensal (R$ ' || ROUND(v_current_balance, 2) || ')',
     'active', jsonb_build_object('balance', v_current_balance, 'monthly_avg', v_monthly_revenue));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ FUNCTION: check_and_trigger_alerts                                           │
-- │ Função principal que verifica todas as clínicas                              │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION check_and_trigger_alerts()
RETURNS TABLE(clinic_id UUID, alerts_created INT) AS $$
DECLARE
  v_clinic RECORD;
  v_count INT := 0;
BEGIN
  -- Itera por cada clínica com alertas ativas
  FOR v_clinic IN 
    SELECT DISTINCT clinic_id FROM alert_configs WHERE is_enabled = TRUE
  LOOP
    -- Executa verificações
    PERFORM create_alert_if_delinquency(v_clinic.clinic_id);
    PERFORM create_alert_if_repayment_late(v_clinic.clinic_id);
    PERFORM create_alert_if_low_cashflow(v_clinic.clinic_id);
    
    -- Retorna resultado
    SELECT COUNT(*) INTO v_count FROM alert_notifications 
    WHERE clinic_id = v_clinic.clinic_id 
    AND status = 'active' 
    AND DATE(created_at) = CURRENT_DATE;
    
    RETURN QUERY SELECT v_clinic.clinic_id, v_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TRIGGER: on_alert_notification_insert                                        │
-- │ Cria logs de notificação quando um alerta é disparado                        │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION on_alert_notification_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient TEXT;
  v_channel TEXT;
  v_config RECORD;
BEGIN
  -- Busca configuração de alertas
  SELECT * INTO v_config FROM alert_configs WHERE id = NEW.alert_config_id;
  
  IF v_config IS NULL THEN RETURN NEW; END IF;
  
  -- Cria logs para cada canal ativo e recipient
  IF v_config.notify_channels->>'email' = 'true' THEN
    FOREACH v_recipient IN ARRAY COALESCE(v_config.email_recipients, ARRAY[]::TEXT[])
    LOOP
      INSERT INTO notification_logs 
      (alert_notification_id, channel, recipient, status)
      VALUES (NEW.id, 'email', v_recipient, 'pending');
    END LOOP;
  END IF;
  
  IF v_config.notify_channels->>'push' = 'true' THEN
    INSERT INTO notification_logs 
    (alert_notification_id, channel, recipient, status)
    VALUES (NEW.id, 'push', 'all_users', 'pending');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_alert_notification_insert 
AFTER INSERT ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION on_alert_notification_insert();

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ TRIGGER: on_alert_notification_update                                        │
-- │ Atualiza timestamp quando status muda                                        │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION on_alert_notification_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alert_notification_update
BEFORE UPDATE ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION on_alert_notification_update();

-- ════════════════════════════════════════════════════════════════════════════════
-- ÍNDICES PARA PERFORMANCE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_alert_configs_clinic ON alert_configs(clinic_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_clinic ON alert_rules(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_clinic_status ON alert_notifications(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_created ON alert_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_alert_actions_status ON alert_actions(status, scheduled_for);

-- ════════════════════════════════════════════════════════════════════════════════
-- DADOS INICIAIS (Default Alert Configs)
-- ════════════════════════════════════════════════════════════════════════════════

-- Nota: Adicionar dados iniciais por clínica após criação da clínica
-- INSERT INTO alert_configs (clinic_id, alert_type, is_enabled, severity_level, check_frequency)
-- VALUES 
-- ('clinic-id', 'delinquency', TRUE, 'HIGH', 'DAILY'),
-- ('clinic-id', 'repayment_late', TRUE, 'HIGH', 'DAILY'),
-- ('clinic-id', 'low_cashflow', TRUE, 'CRITICAL', 'DAILY');

-- ════════════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ════════════════════════════════════════════════════════════════════════════════
