-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Fix Audit Trigger - Action Column Issue
-- ═══════════════════════════════════════════════════════════════════════════════
-- Problem: Trigger trying to insert into appointment_audit_log (singular) with 
--          "action" column, but table has "operation" column
-- Solution: Drop old trigger and create new one that uses correct table schema
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DROP OLD TRIGGER AND FUNCTION (from migration 20260423)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS audit_appointments_insert ON appointments;
DROP TRIGGER IF EXISTS audit_appointments_update ON appointments;
DROP TRIGGER IF EXISTS audit_appointments_delete ON appointments;
DROP FUNCTION IF EXISTS audit_appointment_changes();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CREATE NEW AUDIT FUNCTION using appointment_audit_log (singular)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_appointment_changes_fixed()
RETURNS TRIGGER AS $$
DECLARE
  v_operation VARCHAR(10);
  v_before_snapshot JSONB;
  v_after_snapshot JSONB;
  v_clinic_id UUID;
  v_changed_fields TEXT[];
BEGIN
  -- Determine operation based on trigger event
  IF TG_OP = 'INSERT' THEN
    v_operation := 'CREATE';
    v_before_snapshot := NULL;
    v_after_snapshot := to_jsonb(NEW);
    v_clinic_id := NEW.clinic_id;
    
    -- All fields considered "changed" for INSERT
    v_changed_fields := ARRAY(
      SELECT key FROM jsonb_object_keys(to_jsonb(NEW)) AS key
      WHERE key NOT IN ('id', 'created_at', 'updated_at')
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_operation := 'UPDATE';
    v_before_snapshot := to_jsonb(OLD);
    v_after_snapshot := to_jsonb(NEW);
    v_clinic_id := NEW.clinic_id;
    
    -- Only include fields that actually changed
    v_changed_fields := ARRAY(
      SELECT key FROM jsonb_object_keys(v_before_snapshot) AS key
      WHERE v_before_snapshot->key != v_after_snapshot->key
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    v_operation := 'DELETE';
    v_before_snapshot := to_jsonb(OLD);
    v_after_snapshot := NULL;
    v_clinic_id := OLD.clinic_id;
    
    -- All fields considered "changed" for DELETE
    v_changed_fields := ARRAY(
      SELECT key FROM jsonb_object_keys(v_before_snapshot) AS key
      WHERE key NOT IN ('id', 'created_at', 'updated_at')
    );
  END IF;

  -- Insert audit log entry into appointment_audit_log (SINGULAR) with operation column
  INSERT INTO appointment_audit_log (
    clinic_id,
    appointment_id,
    operation,
    changed_at,
    changed_by,
    before_snapshot,
    after_snapshot,
    changed_fields,
    source,
    ip_address,
    user_agent
  ) VALUES (
    v_clinic_id,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    v_operation,
    CURRENT_TIMESTAMP,
    NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'sub', ''),
    v_before_snapshot,
    v_after_snapshot,
    CASE WHEN array_length(v_changed_fields, 1) > 0 THEN v_changed_fields ELSE ARRAY[]::TEXT[] END,
    'api',
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );

  -- Return appropriate row (required for AFTER triggers)
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CREATE NEW TRIGGERS using fixed function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER audit_appointments_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes_fixed();

CREATE TRIGGER audit_appointments_update
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes_fixed();

CREATE TRIGGER audit_appointments_delete
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_changes_fixed();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DROP OLD AUDIT_LOGS TABLE (if it exists and is not being used)
-- ─────────────────────────────────────────────────────────────────────────────
-- Note: Only drop if migration 20260506 is already applied and using appointment_audit_log (singular)
-- DROP TABLE IF EXISTS appointment_audit_logs CASCADE;

COMMIT;
