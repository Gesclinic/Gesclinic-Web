-- ============================================================================
-- ADICIONAR POLÍTICAS RLS PARA TABELAS DE ALERTAS
-- ============================================================================
-- Esta migration adiciona Row-Level Security às tabelas de alertas

-- Habilitar RLS na tabela alert_configs
ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT para usuários da mesma clínica
CREATE POLICY "Select own clinic alerts" ON alert_configs
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- Permitir INSERT para usuários da mesma clínica
CREATE POLICY "Insert own clinic alerts" ON alert_configs
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- Permitir UPDATE para usuários da mesma clínica
CREATE POLICY "Update own clinic alerts" ON alert_configs
  FOR UPDATE USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- Permitir DELETE para usuários da mesma clínica
CREATE POLICY "Delete own clinic alerts" ON alert_configs
  FOR DELETE USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- ============================================================================
-- HABILITAR RLS NAS DEMAIS TABELAS DE ALERTAS
-- ============================================================================

-- alert_rules
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own clinic rules" ON alert_rules
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Insert own clinic rules" ON alert_rules
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- alert_notifications
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own clinic notifications" ON alert_notifications
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Insert own clinic notifications" ON alert_notifications
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Update own clinic notifications" ON alert_notifications
  FOR UPDATE USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- notification_logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own clinic logs" ON notification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM alert_notifications an
      WHERE an.id = notification_logs.alert_notification_id
      AND an.clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Insert own clinic logs" ON notification_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM alert_notifications an
      WHERE an.id = notification_logs.alert_notification_id
      AND an.clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
    )
  );

-- alert_actions
ALTER TABLE alert_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own clinic actions" ON alert_actions
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Insert own clinic actions" ON alert_actions
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Update own clinic actions" ON alert_actions
  FOR UPDATE USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  ) WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );
