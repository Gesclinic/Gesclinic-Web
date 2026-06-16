-- ═════════════════════════════════════════════════════════════════════════
-- FINAL FIX: Correct trigger changed_by type mismatch
-- ═════════════════════════════════════════════════════════════════════════
-- Problem: Trigger was inserting TEXT value to UUID column
-- Solution: Drop old trigger function and recreate with proper UUID casting
-- Date: May 7, 2026
-- ═════════════════════════════════════════════════════════════════════════

-- Step 1: Drop existing triggers
DROP TRIGGER IF EXISTS audit_appointments_insert ON appointments CASCADE;
DROP TRIGGER IF EXISTS audit_appointments_update ON appointments CASCADE;
DROP TRIGGER IF EXISTS audit_appointments_delete ON appointments CASCADE;

-- Step 2: Drop existing function
DROP FUNCTION IF EXISTS audit_appointment_changes_fixed();

-- Step 3: Recreate function with CORRECT changed_by type handling
CREATE OR REPLACE FUNCTION audit_appointment_changes_fixed()
RETURNS TRIGGER AS $$
DECLARE
  v_operation VARCHAR(10);
  v_before_snapshot JSONB;
  v_after_snapshot JSONB;
  v_clinic_id UUID;
  v_changed_fields TEXT[];
  v_changed_by UUID;
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

  -- Extract changed_by from JWT claims and convert to UUID
  -- If JWT sub is not a valid UUID or doesn't exist, set to NULL
  BEGIN
    v_changed_by := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_changed_by := NULL;
  END;

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
    v_changed_by,
    v_before_snapshot,
    v_after_snapshot,
    CASE WHEN array_length(v_changed_fields, 1) > 0 THEN v_changed_fields ELSE ARRAY[]::TEXT[] END,
    'trigger',
    NULL,
    NULL
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate all three triggers
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

-- Verification
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
AND trigger_schema = 'public'
ORDER BY trigger_name;
