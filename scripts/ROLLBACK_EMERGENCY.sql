-- ═══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK EMERGENCY - Se a migration der errado
-- ═══════════════════════════════════════════════════════════════════════════════
-- Use APENAS se a migration criar problemas
-- Restaura os triggers/functions antigos
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 1: DROP DOS NOVOS TRIGGERS (se foram criados)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS audit_appointments_insert ON appointments CASCADE;
DROP TRIGGER IF EXISTS audit_appointments_update ON appointments CASCADE;
DROP TRIGGER IF EXISTS audit_appointments_delete ON appointments CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 2: DROP DA NOVA FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS audit_appointment_changes_fixed() CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 3: RECRIAR FUNCTION ORIGINAL (from migration 20260423)
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- Determinar ação baseado no tipo de evento
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

  -- Inserir registro de auditoria na tabela appointment_audit_logs (PLURAL)
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

  -- Retornar linha (obrigatório para AFTER triggers)
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 4: RECRIAR TRIGGERS ORIGINAIS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER audit_appointments_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes();

CREATE TRIGGER audit_appointments_update
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes();

CREATE TRIGGER audit_appointments_delete
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes();

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 5: VERIFICAÇÃO
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 'ROLLBACK COMPLETED' as status,
       'Triggers and functions restored to original version' as note,
       now() as timestamp;

COMMIT;
