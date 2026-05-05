-- Fix audit_appointment_insert trigger function
-- Issue: Trying to insert into non-existent columns (is_system_action, clinic_id)
-- Solution: Only use columns that actually exist in appointment_audit_logs table

DROP TRIGGER IF EXISTS appointments_audit_insert_trigger ON appointments;

CREATE OR REPLACE FUNCTION audit_appointment_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO appointment_audit_logs (
    appointment_id,
    action_type,
    performed_by,
    performed_by_role,
    context
  )
  VALUES (
    NEW.id,
    'CREATED',
    NULL,
    'system',
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER appointments_audit_insert_trigger
AFTER INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION audit_appointment_insert();
