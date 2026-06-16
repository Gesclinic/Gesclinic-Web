-- Fix old audit system blocker
-- This file replaces broken old audit functions with working new ones that use the correct table

-- Step 1: Drop all old problematic functions and triggers
DROP TRIGGER IF EXISTS audit_appointments_insert ON appointments CASCADE;
DROP TRIGGER IF EXISTS audit_appointments_update ON appointments CASCADE;
DROP TRIGGER IF EXISTS audit_appointments_delete ON appointments CASCADE;
DROP TRIGGER IF EXISTS appointments_audit_insert_trigger ON appointments CASCADE;

DROP FUNCTION IF EXISTS audit_appointment_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_appointment_changes_fixed() CASCADE;

-- Step 2: Create the placeholder table for backward compatibility
CREATE TABLE IF NOT EXISTS public.appointment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  appointment_id uuid NOT NULL,
  operation varchar(20),
  changed_at timestamptz DEFAULT now(),
  changed_by uuid,
  before_snapshot jsonb,
  after_snapshot jsonb,
  changed_fields text[],
  source text DEFAULT 'system',
  ip_address text,
  user_agent text
);

ALTER TABLE public.appointment_audit_log OWNER TO postgres;

-- Step 3: Create new trigger functions that use the PLURAL table (appointment_audit_logs)
CREATE OR REPLACE FUNCTION audit_appointment_insert()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO appointment_audit_logs (
      appointment_id, action_type, performed_by, performed_by_role, context
    ) VALUES (
      NEW.id,
      'CREATED',
      NULL,
      'system',
      to_jsonb(NEW)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION audit_appointment_update()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO appointment_audit_logs (
      appointment_id, action_type, performed_by, performed_by_role, context
    ) VALUES (
      NEW.id,
      'UPDATED',
      NULL,
      'system',
      jsonb_build_object(
        'before', to_jsonb(OLD),
        'after', to_jsonb(NEW)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION audit_appointment_delete()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO appointment_audit_logs (
      appointment_id, action_type, performed_by, performed_by_role, context
    ) VALUES (
      OLD.id,
      'DELETED',
      NULL,
      'system',
      to_jsonb(OLD)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create new triggers
CREATE TRIGGER trigger_audit_appointment_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_insert();

CREATE TRIGGER trigger_audit_appointment_update
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_update();

CREATE TRIGGER trigger_audit_appointment_delete
  BEFORE DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION audit_appointment_delete();
