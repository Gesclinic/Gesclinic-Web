-- ============================================
-- AUDITORIA DE ATENDIMENTOS
-- Tabela: appointment_audit_logs
-- ============================================

CREATE TABLE IF NOT EXISTS appointment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_role TEXT,
  performed_at TIMESTAMPTZ DEFAULT now(),
  context JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_appointment_audit_logs_appointment_id 
  ON appointment_audit_logs(appointment_id);

CREATE INDEX idx_appointment_audit_logs_performed_at 
  ON appointment_audit_logs(performed_at DESC);

CREATE INDEX idx_appointment_audit_logs_action_type 
  ON appointment_audit_logs(action_type);

-- Política RLS: Apenas admin/gestor podem VER
ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores e admins podem ver todos os logs"
  ON appointment_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'gestor', 'gerente')
    )
  );

CREATE POLICY "Apenas inserção para authenticated users"
  ON appointment_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
