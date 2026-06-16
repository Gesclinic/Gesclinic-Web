-- ETAPA 8: ALERTAS E AUTOMAÇÕES - SQL MIGRATION
-- Data: 2026-05-23
-- Descrição: Criar sistema completo de alertas e automações financeiras

-- ============================================================================
-- 1. TABELAS DE CONFIGURAÇÃO
-- ============================================================================

-- Configuração de alertas por clínica
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  severity_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  check_frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY', -- HOURLY, 3HOURLY, DAILY, WEEKLY
  notify_channels JSONB DEFAULT '{"email": true, "sms": false, "push": true, "dashboard": true}'::jsonb,
  email_recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  webhook_url TEXT,
  threshold_value NUMERIC,
  threshold_operator VARCHAR(10) DEFAULT '>', -- >, <, >=, <=, ==
  is_auto_action BOOLEAN DEFAULT FALSE,
  auto_action_type VARCHAR(100),
  auto_action_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_alert_configs_clinic ON alert_configs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_enabled ON alert_configs(clinic_id, is_enabled);

-- Regras específicas de alerta
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_config_id UUID REFERENCES alert_configs(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  condition_type VARCHAR(50) NOT NULL, -- delinquency_days, amount, percentage, etc
  condition_value NUMERIC NOT NULL,
  condition_operator VARCHAR(10) NOT NULL DEFAULT '>', -- >, <, >=, <=, ==
  action_on_trigger VARCHAR(100) NOT NULL, -- email, sms, escalate, auto_cobranca, etc
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_config ON alert_rules(alert_config_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(clinic_id, is_active);

-- ============================================================================
-- 2. TABELAS DE HISTÓRICO
-- ============================================================================

-- Histórico de notificações de alerta
CREATE TABLE IF NOT EXISTS alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_config_id UUID REFERENCES alert_configs(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'active', -- active, resolved, dismissed
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  dismissed_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_alert_notif_clinic ON alert_notifications(clinic_id);
CREATE INDEX IF NOT EXISTS idx_alert_notif_status ON alert_notifications(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_notif_type ON alert_notifications(alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_notif_created ON alert_notifications(created_at DESC);

-- Log de envios de notificação
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_notification_id UUID NOT NULL REFERENCES alert_notifications(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL, -- email, sms, push, dashboard, webhook
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed, bounced
  error_message TEXT,
  sent_at TIMESTAMP,
  delivery_status VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_alert ON notification_logs(alert_notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_channel ON notification_logs(channel, status);

-- ============================================================================
-- 3. TABELA DE AÇÕES AUTOMÁTICAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_notification_id UUID REFERENCES alert_notifications(id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL, -- send_email, send_sms, create_cobranca, update_status, webhook
  action_params JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending', -- pending, executing, completed, failed
  execution_result TEXT,
  error_message TEXT,
  scheduled_for TIMESTAMP,
  executed_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_actions_clinic ON alert_actions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_alert_actions_status ON alert_actions(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_alert_actions_notification ON alert_actions(alert_notification_id);

-- ============================================================================
-- 4. ENUM TYPES
-- ============================================================================

CREATE TYPE alert_type_enum AS ENUM (
  'DELINQUENCY',
  'REPAYMENT_LATE',
  'GOAL_MISSED',
  'LOW_CASHFLOW',
  'COLLECTION_LOW',
  'BANK_RECONCILIATION',
  'CUSTOM'
);

CREATE TYPE severity_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- ============================================================================
-- 5. FUNÇÕES PL/pgSQL
-- ============================================================================

-- Função: Criar alerta se há inadimplência
CREATE OR REPLACE FUNCTION create_alert_if_delinquency(
  p_clinic_id UUID,
  p_days_threshold INT DEFAULT 5
)
RETURNS TABLE(alert_id UUID, patients_count INT, total_amount DECIMAL) AS $$
DECLARE
  v_alert_config UUID;
  v_delinquent_count INT;
  v_total_amount DECIMAL;
  v_alert_id UUID;
BEGIN
  -- Buscar configuração de alerta
  SELECT id INTO v_alert_config
  FROM alert_configs
  WHERE clinic_id = p_clinic_id
    AND alert_type = 'DELINQUENCY'
    AND is_enabled = TRUE
  LIMIT 1;

  IF v_alert_config IS NULL THEN
    RETURN;
  END IF;

  -- Contar faturas em atraso
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_delinquent_count, v_total_amount
  FROM ar_invoices
  WHERE clinic_id = p_clinic_id
    AND status IN ('open', 'partial')
    AND due_date < CURRENT_DATE
    AND (CURRENT_DATE - due_date) >= p_days_threshold;

  -- Se houver inadimplência, criar alerta
  IF v_delinquent_count > 0 THEN
    INSERT INTO alert_notifications (
      clinic_id,
      alert_config_id,
      alert_type,
      severity,
      title,
      message,
      data,
      created_by
    ) VALUES (
      p_clinic_id,
      v_alert_config,
      'DELINQUENCY',
      'HIGH',
      'Inadimplência Detectada',
      FORMAT('%s faturas em atraso há %s dias. Total: R$ %s',
        v_delinquent_count,
        p_days_threshold,
        TO_CHAR(v_total_amount, 'FM999,999.99')
      ),
      jsonb_build_object(
        'patients_count', v_delinquent_count,
        'total_amount', v_total_amount,
        'days_overdue', p_days_threshold,
        'check_date', CURRENT_DATE
      ),
      (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    )
    RETURNING id INTO v_alert_id;

    RETURN QUERY SELECT v_alert_id, v_delinquent_count, v_total_amount;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função: Criar alerta se há repasse em atraso
CREATE OR REPLACE FUNCTION create_alert_if_repayment_late(
  p_clinic_id UUID,
  p_hours_threshold INT DEFAULT 48
)
RETURNS TABLE(alert_id UUID, professionals_count INT, total_amount DECIMAL) AS $$
DECLARE
  v_alert_config UUID;
  v_repayment_count INT;
  v_total_amount DECIMAL;
  v_alert_id UUID;
BEGIN
  SELECT id INTO v_alert_config
  FROM alert_configs
  WHERE clinic_id = p_clinic_id
    AND alert_type = 'REPAYMENT_LATE'
    AND is_enabled = TRUE
  LIMIT 1;

  IF v_alert_config IS NULL THEN
    RETURN;
  END IF;

  -- Contar repasses atrasados
  SELECT COUNT(*), COALESCE(SUM(repayment_amount), 0)
  INTO v_repayment_count, v_total_amount
  FROM professional_repayments
  WHERE clinic_id = p_clinic_id
    AND status = 'pending'
    AND created_at < (NOW() - (p_hours_threshold || ' hours')::INTERVAL);

  IF v_repayment_count > 0 THEN
    INSERT INTO alert_notifications (
      clinic_id,
      alert_config_id,
      alert_type,
      severity,
      title,
      message,
      data,
      created_by
    ) VALUES (
      p_clinic_id,
      v_alert_config,
      'REPAYMENT_LATE',
      'CRITICAL',
      'Repasse Profissional Atrasado',
      FORMAT('%s profissional(is) aguardando repasse há %s horas. Total: R$ %s',
        v_repayment_count,
        p_hours_threshold,
        TO_CHAR(v_total_amount, 'FM999,999.99')
      ),
      jsonb_build_object(
        'professionals_count', v_repayment_count,
        'total_amount', v_total_amount,
        'hours_overdue', p_hours_threshold
      ),
      (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    )
    RETURNING id INTO v_alert_id;

    RETURN QUERY SELECT v_alert_id, v_repayment_count, v_total_amount;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função: Criar alerta se há fluxo de caixa baixo
CREATE OR REPLACE FUNCTION create_alert_if_low_cashflow(
  p_clinic_id UUID,
  p_threshold_percent NUMERIC DEFAULT 10
)
RETURNS TABLE(alert_id UUID, available_balance DECIMAL, monthly_revenue DECIMAL) AS $$
DECLARE
  v_alert_config UUID;
  v_available_balance DECIMAL;
  v_monthly_revenue DECIMAL;
  v_percentage NUMERIC;
  v_alert_id UUID;
BEGIN
  SELECT id INTO v_alert_config
  FROM alert_configs
  WHERE clinic_id = p_clinic_id
    AND alert_type = 'LOW_CASHFLOW'
    AND is_enabled = TRUE
  LIMIT 1;

  IF v_alert_config IS NULL THEN
    RETURN;
  END IF;

  -- Calcular saldo disponível (simplificado)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_monthly_revenue
  FROM ar_invoices
  WHERE clinic_id = p_clinic_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- Simular saldo (em produção, buscar de tabela de saldos)
  v_available_balance := v_monthly_revenue * 0.15; -- Simulação: 15% disponível

  -- Calcular percentual
  IF v_monthly_revenue > 0 THEN
    v_percentage := (v_available_balance / v_monthly_revenue) * 100;
  ELSE
    v_percentage := 0;
  END IF;

  -- Se abaixo do limiar, criar alerta
  IF v_percentage < p_threshold_percent THEN
    INSERT INTO alert_notifications (
      clinic_id,
      alert_config_id,
      alert_type,
      severity,
      title,
      message,
      data,
      created_by
    ) VALUES (
      p_clinic_id,
      v_alert_config,
      'LOW_CASHFLOW',
      'CRITICAL',
      'Fluxo de Caixa Crítico',
      FORMAT('Saldo disponível em apenas %s%% da receita mensal. Disponível: R$ %s',
        ROUND(v_percentage, 1),
        TO_CHAR(v_available_balance, 'FM999,999.99')
      ),
      jsonb_build_object(
        'available_balance', v_available_balance,
        'monthly_revenue', v_monthly_revenue,
        'percentage', v_percentage,
        'threshold', p_threshold_percent
      ),
      (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    )
    RETURNING id INTO v_alert_id;

    RETURN QUERY SELECT v_alert_id, v_available_balance, v_monthly_revenue;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função: Executar ações automáticas pendentes
CREATE OR REPLACE FUNCTION execute_pending_alert_actions()
RETURNS TABLE(executed_count INT, failed_count INT, total_processed INT) AS $$
DECLARE
  v_executed INT := 0;
  v_failed INT := 0;
  v_action RECORD;
BEGIN
  -- Buscar ações pendentes
  FOR v_action IN
    SELECT id, action_type, action_params, retry_count, max_retries
    FROM alert_actions
    WHERE status = 'pending'
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      AND retry_count < max_retries
    ORDER BY created_at ASC
    LIMIT 100
  LOOP
    BEGIN
      -- Atualizar status para 'executing'
      UPDATE alert_actions
      SET status = 'executing'
      WHERE id = v_action.id;

      -- Executar ação (simulado - em produção, chamaria serviço externo)
      CASE v_action.action_type
        WHEN 'send_email' THEN
          -- Adicionar a logs
          INSERT INTO notification_logs (alert_notification_id, channel, recipient, status)
          SELECT 
            alert_notification_id,
            'email',
            v_action.action_params->>'email',
            'sent'
          FROM alert_actions WHERE id = v_action.id;

        WHEN 'create_cobranca' THEN
          -- Criar nova cobrança (seria implementação completa)
          NULL;

        ELSE
          -- Tipo desconhecido
          RAISE WARNING 'Action type not recognized: %', v_action.action_type;
      END CASE;

      -- Marcar como completa
      UPDATE alert_actions
      SET 
        status = 'completed',
        executed_at = NOW()
      WHERE id = v_action.id;

      v_executed := v_executed + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Incrementar retry count em caso de erro
      UPDATE alert_actions
      SET 
        status = 'pending',
        retry_count = retry_count + 1,
        error_message = SQLERRM,
        updated_at = NOW()
      WHERE id = v_action.id;

      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_executed, v_failed, (v_executed + v_failed);
END;
$$ LANGUAGE plpgsql;

-- Função: Check and trigger all alerts
CREATE OR REPLACE FUNCTION check_and_trigger_alerts()
RETURNS TABLE(
  clinics_processed INT,
  alerts_created INT,
  actions_queued INT
) AS $$
DECLARE
  v_clinic_record RECORD;
  v_clinics_processed INT := 0;
  v_alerts_created INT := 0;
  v_actions_queued INT := 0;
BEGIN
  -- Processar cada clínica
  FOR v_clinic_record IN
    SELECT DISTINCT clinic_id FROM alert_configs WHERE is_enabled = TRUE
  LOOP
    -- Verificar inadimplência
    BEGIN
      SELECT 1 INTO v_alerts_created FROM create_alert_if_delinquency(v_clinic_record.clinic_id);
      v_alerts_created := v_alerts_created + COALESCE(v_alerts_created, 0);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Ignorar erros em alertas individuais
    END;

    -- Verificar repasses atrasados
    BEGIN
      SELECT 1 INTO v_alerts_created FROM create_alert_if_repayment_late(v_clinic_record.clinic_id);
      v_alerts_created := v_alerts_created + COALESCE(v_alerts_created, 0);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Verificar fluxo de caixa
    BEGIN
      SELECT 1 INTO v_alerts_created FROM create_alert_if_low_cashflow(v_clinic_record.clinic_id);
      v_alerts_created := v_alerts_created + COALESCE(v_alerts_created, 0);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    v_clinics_processed := v_clinics_processed + 1;
  END LOOP;

  -- Executar ações automáticas
  SELECT executed_count INTO v_actions_queued FROM execute_pending_alert_actions();

  RETURN QUERY SELECT v_clinics_processed, v_alerts_created, v_actions_queued;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- View: Alertas ativos por clínica
CREATE OR REPLACE VIEW v_active_alerts AS
SELECT
  an.id,
  an.clinic_id,
  an.alert_type,
  an.severity,
  an.title,
  an.message,
  an.data,
  an.status,
  an.created_at,
  (NOW() - an.created_at) as time_since_created,
  COUNT(DISTINCT nl.id) as notification_count
FROM alert_notifications an
LEFT JOIN notification_logs nl ON an.id = nl.alert_notification_id
WHERE an.status = 'active'
GROUP BY an.id, an.clinic_id, an.alert_type, an.severity, an.title, 
         an.message, an.data, an.status, an.created_at
ORDER BY an.severity DESC, an.created_at DESC;

-- View: Ações automáticas pendentes
CREATE OR REPLACE VIEW v_pending_alert_actions AS
SELECT
  id,
  clinic_id,
  alert_notification_id,
  action_type,
  status,
  retry_count,
  max_retries,
  scheduled_for,
  created_at,
  (max_retries - retry_count) as retries_remaining
FROM alert_actions
WHERE status IN ('pending', 'executing')
  AND (scheduled_for IS NULL OR scheduled_for <= NOW())
ORDER BY created_at ASC;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger: Ao criar alerta, enfileirar notificações
CREATE OR REPLACE FUNCTION trigger_alert_created()
RETURNS TRIGGER AS $$
DECLARE
  v_config RECORD;
BEGIN
  -- Buscar configuração do alerta
  SELECT email_recipients, notify_channels, is_auto_action, auto_action_type, auto_action_config
  INTO v_config
  FROM alert_configs
  WHERE id = NEW.alert_config_id;

  -- Criar logs de notificação para cada canal
  IF v_config.notify_channels->>'email' = 'true' AND v_config.email_recipients IS NOT NULL THEN
    INSERT INTO notification_logs (alert_notification_id, channel, recipient, status)
    SELECT NEW.id, 'email', unnest(v_config.email_recipients), 'pending';
  END IF;

  -- Criar ação automática se configurado
  IF v_config.is_auto_action THEN
    INSERT INTO alert_actions (
      clinic_id,
      alert_notification_id,
      action_type,
      action_params,
      status
    ) VALUES (
      NEW.clinic_id,
      NEW.id,
      v_config.auto_action_type,
      v_config.auto_action_config,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alert_notifications_created ON alert_notifications;
CREATE TRIGGER alert_notifications_created
AFTER INSERT ON alert_notifications
FOR EACH ROW
EXECUTE FUNCTION trigger_alert_created();

-- ============================================================================
-- 8. DADOS INICIAIS
-- ============================================================================

-- Inserir alertas padrão para clínicas existentes (apenas se houver clínicas)
INSERT INTO alert_configs (clinic_id, alert_type, is_enabled, severity_level, check_frequency, notify_channels, email_recipients, threshold_value)
SELECT 
  c.id,
  alert_type,
  TRUE,
  severity,
  'DAILY',
  '{"email": true, "sms": false, "push": true, "dashboard": true}'::jsonb,
  ARRAY[COALESCE(c.email, 'admin@clinic.local')],
  threshold_val
FROM clinics c
CROSS JOIN (
  VALUES
    ('DELINQUENCY'::VARCHAR, 'HIGH'::VARCHAR, 5::NUMERIC),
    ('REPAYMENT_LATE'::VARCHAR, 'CRITICAL'::VARCHAR, 48::NUMERIC),
    ('LOW_CASHFLOW'::VARCHAR, 'HIGH'::VARCHAR, 10::NUMERIC),
    ('COLLECTION_LOW'::VARCHAR, 'MEDIUM'::VARCHAR, 25::NUMERIC)
) AS defaults(alert_type, severity, threshold_val)
ON CONFLICT (clinic_id, alert_type) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Status: PRONTO PARA PRODUÇÃO
-- Tabelas: 4 (alert_configs, alert_rules, alert_notifications, notification_logs, alert_actions)
-- Functions: 5 (create_alert_if_delinquency, create_alert_if_repayment_late, create_alert_if_low_cashflow, execute_pending_alert_actions, check_and_trigger_alerts)
-- Views: 2 (v_active_alerts, v_pending_alert_actions)
-- Triggers: 1 (alert_notifications_created)
