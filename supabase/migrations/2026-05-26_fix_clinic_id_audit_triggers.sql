-- =====================================================================
-- 2026-05-26_fix_clinic_id_audit_triggers.sql
-- =====================================================================
-- FIX: Triggers weren't capturing clinic_id from appointments
-- Solution: Update all 3 triggers to extract clinic_id from appointment row
-- =====================================================================

-- =====================================================================
-- DROP EXISTING TRIGGERS
-- =====================================================================
DROP TRIGGER IF EXISTS trigger_audit_appointment_insert ON public.appointments;
DROP TRIGGER IF EXISTS trigger_audit_appointment_update ON public.appointments;
DROP TRIGGER IF EXISTS trigger_audit_appointment_delete ON public.appointments;

-- =====================================================================
-- 1️⃣ INSERT TRIGGER FUNCTION (capture clinic_id)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.audit_appointment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  SELECT role INTO v_user_role 
  FROM user_clinic_roles 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  v_user_role := COALESCE(v_user_role, 'system');

  INSERT INTO public.appointment_audit_logs(
    appointment_id,
    action_type,
    performed_by,
    performed_by_role,
    context,
    clinic_id
  )
  VALUES(
    NEW.id,
    'CREATED',
    v_user_id,
    v_user_role,
    jsonb_build_object('new', row_to_json(NEW)),
    NEW.clinic_id
  );
  
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 2️⃣ UPDATE TRIGGER FUNCTION (capture clinic_id)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.audit_appointment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  SELECT role INTO v_user_role 
  FROM user_clinic_roles 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  v_user_role := COALESCE(v_user_role, 'system');

  INSERT INTO public.appointment_audit_logs(
    appointment_id,
    action_type,
    performed_by,
    performed_by_role,
    context,
    old_status,
    new_status,
    clinic_id
  )
  VALUES(
    NEW.id,
    'UPDATED',
    v_user_id,
    v_user_role,
    jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)),
    OLD.status,
    NEW.status,
    NEW.clinic_id
  );
  
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 3️⃣ DELETE TRIGGER FUNCTION (capture clinic_id)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.audit_appointment_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  SELECT role INTO v_user_role 
  FROM user_clinic_roles 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  v_user_role := COALESCE(v_user_role, 'system');

  INSERT INTO public.appointment_audit_logs(
    appointment_id,
    action_type,
    performed_by,
    performed_by_role,
    context,
    clinic_id
  )
  VALUES(
    OLD.id,
    'DELETED',
    v_user_id,
    v_user_role,
    jsonb_build_object('old', row_to_json(OLD)),
    OLD.clinic_id
  );
  
  RETURN OLD;
END;
$$;

-- =====================================================================
-- CREATE TRIGGERS
-- =====================================================================
CREATE TRIGGER trigger_audit_appointment_insert
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.audit_appointment_insert();

CREATE TRIGGER trigger_audit_appointment_update
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.audit_appointment_update();

CREATE TRIGGER trigger_audit_appointment_delete
BEFORE DELETE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.audit_appointment_delete();

-- =====================================================================
-- CLEAN UP: Update existing audit logs to extract clinic_id from context
-- =====================================================================
UPDATE public.appointment_audit_logs
SET clinic_id = (context->'new'->>'clinic_id')::uuid
WHERE clinic_id IS NULL AND context->'new'->>'clinic_id' IS NOT NULL;

UPDATE public.appointment_audit_logs
SET clinic_id = (context->'old'->>'clinic_id')::uuid
WHERE clinic_id IS NULL AND context->'old'->>'clinic_id' IS NOT NULL;

-- =====================================================================
-- VERIFY
-- =====================================================================
SELECT action_type, COUNT(*), COUNT(clinic_id) as with_clinic_id
FROM appointment_audit_logs
GROUP BY action_type;
