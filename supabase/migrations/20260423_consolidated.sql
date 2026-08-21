-- ============================================================================
-- Consolidated from 20260423_add_appointment_audit_logging.sql
-- ============================================================================

-- filepath: supabase/migrations/20260423_add_appointment_audit_logging.sql
-- Implementar auditoria completa de agendamentos (LGPD compliant)
-- Registra todas altera├º├Áes: create, update, delete

BEGIN;

-- ============================================================
-- 1. CRIAR TABELA DE AUDITORIA
-- ============================================================

CREATE TABLE IF NOT EXISTS appointment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Refer├¬ncia ao agendamento
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,

  -- Quem fez a altera├º├úo
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role VARCHAR(50), -- admin, gestor, profissional, recepcao
  user_email TEXT, -- Para auditoria mesmo ap├│s usu├írio ser deletado

  -- Tipo de a├º├úo
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),

  -- Dados antes e depois
  old_data JSONB,
  new_data JSONB,

  -- Mudan├ºas espec├¡ficas importantes
  status_changed_from VARCHAR(50),
  status_changed_to VARCHAR(50),

  -- Contexto
  ip_address TEXT,
  user_agent TEXT,
  change_reason TEXT, -- Campo opcional para motivo da altera├º├úo

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- ├ìndices para buscas r├ípidas
  CONSTRAINT check_action_valid CHECK (action IN ('create', 'update', 'delete'))
);

-- ============================================================
-- 2. CRIAR ├ìNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_appointment_id
  ON appointment_audit_logs(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_clinic_id
  ON appointment_audit_logs(clinic_id);

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_user_id
  ON appointment_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_action
  ON appointment_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_created_at
  ON appointment_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_clinic_created
  ON appointment_audit_logs(clinic_id, created_at DESC);

-- ============================================================
-- 3. CRIAR FUN├ç├âO PARA REGISTRAR AUDITORIA
-- ============================================================

CREATE OR REPLACE FUNCTION audit_appointment_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR(50);
  v_old_data JSONB;
  v_new_data JSONB;
  v_clinic_id UUID;
  v_status_from VARCHAR(50);
  v_status_to VARCHAR(50);
BEGIN
  -- Determinar a├º├úo baseado no tipo de evento
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_clinic_id := (to_jsonb(NEW)->>'clinic_id')::UUID;
    v_status_from := NULL;
    v_status_to := (to_jsonb(NEW)->>'status')::TEXT;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_clinic_id := (to_jsonb(NEW)->>'clinic_id')::UUID;
    v_status_from := (to_jsonb(OLD)->>'status')::TEXT;
    v_status_to := (to_jsonb(NEW)->>'status')::TEXT;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
    v_clinic_id := (to_jsonb(OLD)->>'clinic_id')::UUID;
    v_status_from := (to_jsonb(OLD)->>'status')::TEXT;
    v_status_to := NULL;
  END IF;

  -- Inserir registro de auditoria
  INSERT INTO appointment_audit_logs (
    appointment_id,
    clinic_id,
    user_id,
    user_role,
    user_email,
    action,
    old_data,
    new_data,
    status_changed_from,
    status_changed_to,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    v_clinic_id,
    NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'role', ''),
    NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'email', ''),
    v_action,
    v_old_data,
    v_new_data,
    v_status_from,
    v_status_to,
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    current_setting('request.headers', true)::jsonb->>'user-agent',
    CURRENT_TIMESTAMP
  );

  -- Retornar linha (obrigat├│rio para AFTER triggers)
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. CRIAR TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS audit_appointments_insert ON appointments;
CREATE TRIGGER audit_appointments_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes();

DROP TRIGGER IF EXISTS audit_appointments_update ON appointments;
CREATE TRIGGER audit_appointments_update
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes();

DROP TRIGGER IF EXISTS audit_appointments_delete ON appointments;
CREATE TRIGGER audit_appointments_delete
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes();

-- ============================================================
-- 5. CONFIGURAR ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin e gestor podem VER logs de auditoria
CREATE POLICY "Gestores e admins podem ver logs de auditoria"
  ON appointment_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.clinic_id = appointment_audit_logs.clinic_id
        AND u.role IN ('admin', 'gestor', 'gerente')
    )
  );

-- Ningu├®m pode INSERT (apenas triggers)
CREATE POLICY "Ningu├®m pode inserir logs de auditoria"
  ON appointment_audit_logs
  FOR INSERT
  WITH CHECK (false);

-- Ningu├®m pode UPDATE (apenas triggers)
CREATE POLICY "Ningu├®m pode atualizar logs de auditoria"
  ON appointment_audit_logs
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Ningu├®m pode DELETE (apenas triggers)
CREATE POLICY "Ningu├®m pode deletar logs de auditoria"
  ON appointment_audit_logs
  FOR DELETE
  USING (false);

COMMIT;

-- ============================================================================
-- Consolidated from 20260423_add_concurrent_update_function.sql
-- ============================================================================

-- filepath: supabase/migrations/20260423_add_concurrent_update_function.sql
-- Implementar controle de concorr├¬ncia (Optimistic Locking) para agendamentos
-- Evita que m├║ltiplos usu├írios sobrescrevam dados uns dos outros

BEGIN;

-- ============================================================
-- 1. CRIAR FUN├ç├âO RPC PARA ATUALIZAR COM VALIDA├ç├âO
-- ============================================================

CREATE OR REPLACE FUNCTION update_appointment_safe(
  p_appointment_id UUID,
  p_updated_at TIMESTAMP WITH TIME ZONE,
  p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_current_updated_at TIMESTAMP WITH TIME ZONE;
  v_result JSONB;
BEGIN
  -- Buscar updated_at atual do registro
  SELECT updated_at INTO v_current_updated_at
  FROM appointments
  WHERE id = p_appointment_id
  FOR UPDATE; -- Lock para evitar race condition

  -- Validar: se updated_at no payload ├® diferente do BD, ├® conflito!
  IF v_current_updated_at IS NOT NULL AND v_current_updated_at != p_updated_at THEN
    -- Retornar erro de conflito
    RETURN jsonb_build_object(
      'success', false,
      'error', 'conflict_detected',
      'message', 'Este agendamento foi atualizado por outro usu├írio',
      'current_updated_at', v_current_updated_at,
      'expected_updated_at', p_updated_at
    );
  END IF;

  -- Se passou na valida├º├úo, fazer update seguro
  UPDATE appointments
  SET
    patient_id = COALESCE((p_payload->>'patient_id')::UUID, patient_id),
    professional_id = COALESCE((p_payload->>'professional_id')::UUID, professional_id),
    service_id = COALESCE((p_payload->>'service_id')::UUID, service_id),
    room_id = COALESCE((p_payload->>'room_id')::UUID, room_id),
    start_time = COALESCE((p_payload->>'start_time')::TIMESTAMP WITH TIME ZONE, start_time),
    end_time = COALESCE((p_payload->>'end_time')::TIMESTAMP WITH TIME ZONE, end_time),
    status = COALESCE((p_payload->>'status'), status),
    notes = COALESCE((p_payload->>'notes'), notes),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_appointment_id;

  -- Retornar sucesso com novo updated_at
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Agendamento atualizado com sucesso',
    'updated_at', CURRENT_TIMESTAMP
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. GRANT EXECUTE PARA USU├üRIOS AUTENTICADOS
-- ============================================================

GRANT EXECUTE ON FUNCTION update_appointment_safe(UUID, TIMESTAMP WITH TIME ZONE, JSONB)
  TO authenticated;

-- ============================================================
-- 3. CRIAR ├ìNDICE PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_updated_at
  ON appointments(updated_at DESC);

COMMIT;
