-- CANDIDATE ONLY. Do not run against production without inspecting the actual
-- schema/policies, backing up, and exercising the security test matrix.
-- Requires public.companies and public.user_companies from the multi-company migration.
BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_login_throttle (
  key_hash text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);
REVOKE ALL ON public.auth_login_throttle FROM PUBLIC, anon, authenticated;
ALTER TABLE public.auth_login_throttle ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.gesclinic_consume_login_attempt(p_key_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE next_attempts integer;
BEGIN
  IF auth.role() <> 'service_role' OR length(p_key_hash) <> 64 THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.auth_login_throttle (key_hash, window_start, attempts)
    VALUES (p_key_hash, now(), 1)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_start = CASE WHEN public.auth_login_throttle.window_start < now() - interval '15 minutes'
      THEN now() ELSE public.auth_login_throttle.window_start END,
    attempts = CASE WHEN public.auth_login_throttle.window_start < now() - interval '15 minutes'
      THEN 1 ELSE public.auth_login_throttle.attempts + 1 END
  RETURNING attempts INTO next_attempts;
  RETURN next_attempts <= 10;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.gesclinic_consume_login_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gesclinic_consume_login_attempt(text) TO service_role;

CREATE OR REPLACE FUNCTION public.current_app_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT auth.uid() $$;

CREATE OR REPLACE FUNCTION public.gesclinic_can_access_clinic(p_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.status IS NULL OR u.status IN ('ativo', 'active'))
      AND (
        EXISTS (
          SELECT 1 FROM public.user_companies uc
          JOIN public.companies co ON co.id = uc.company_id
          WHERE uc.user_id = u.id AND uc.is_active AND co.clinic_id = p_clinic_id
        )
        OR (u.clinic_id = p_clinic_id AND NOT EXISTS (
          SELECT 1 FROM public.user_companies uc
          JOIN public.companies co ON co.id = uc.company_id
          WHERE uc.user_id = u.id AND co.clinic_id = p_clinic_id
        ))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.gesclinic_can_admin_clinic(p_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.gesclinic_can_access_clinic(p_clinic_id) AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.user_companies uc
        JOIN public.companies co ON co.id = uc.company_id
        WHERE uc.user_id = u.id AND uc.is_active AND uc.role = 'admin'
          AND co.clinic_id = p_clinic_id
      ) OR (u.clinic_id = p_clinic_id AND u.role = 'admin' AND NOT EXISTS (
        SELECT 1 FROM public.user_companies uc
        JOIN public.companies co ON co.id = uc.company_id
        WHERE uc.user_id = u.id AND co.clinic_id = p_clinic_id
      ))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_company_access(p_user_id uuid, p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.companies co WHERE co.id = p_company_id
      AND public.gesclinic_can_access_clinic(co.clinic_id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.gesclinic_can_access_clinic(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.gesclinic_can_admin_clinic(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_company_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gesclinic_can_access_clinic(uuid),
  public.gesclinic_can_admin_clinic(uuid),
  public.user_has_company_access(uuid, uuid) TO authenticated;

-- Existing permissive policies are OR-combined in PostgreSQL. Remove every
-- policy on these audited tables before creating the replacement set.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN
      ('clinics', 'users', 'patients', 'appointments',
       'appointment_payer_rules', 'tax_configurations', 'user_companies')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_payer_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinics_read ON public.clinics FOR SELECT TO authenticated
  USING (public.gesclinic_can_access_clinic(id));
CREATE POLICY clinics_update ON public.clinics FOR UPDATE TO authenticated
  USING (public.gesclinic_can_admin_clinic(id))
  WITH CHECK (public.gesclinic_can_admin_clinic(id));

CREATE POLICY users_read ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.gesclinic_can_access_clinic(clinic_id));
CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.gesclinic_can_admin_clinic(clinic_id))
  WITH CHECK (id = auth.uid() OR public.gesclinic_can_admin_clinic(clinic_id));
CREATE POLICY users_delete ON public.users FOR DELETE TO authenticated
  USING (public.gesclinic_can_admin_clinic(clinic_id));

-- A user may edit their own display name, but never grant themselves a role,
-- move clinics, reactivate an account, or change the legacy password column.
CREATE OR REPLACE FUNCTION public.gesclinic_guard_user_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.id IS DISTINCT FROM OLD.id OR
      NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    RAISE EXCEPTION 'user update denied' USING ERRCODE = '42501';
  END IF;
  IF NOT public.gesclinic_can_admin_clinic(OLD.clinic_id) THEN
    IF OLD.id IS DISTINCT FROM auth.uid() OR
      (to_jsonb(NEW) - 'name' - 'full_name' - 'updated_at') IS DISTINCT FROM
      (to_jsonb(OLD) - 'name' - 'full_name' - 'updated_at') THEN
      RAISE EXCEPTION 'user update denied' USING ERRCODE = '42501';
    END IF;
  ELSIF NOT public.gesclinic_can_admin_clinic(NEW.clinic_id) THEN
    RAISE EXCEPTION 'clinic change denied' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS gesclinic_guard_user_update ON public.users;
CREATE TRIGGER gesclinic_guard_user_update BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.gesclinic_guard_user_update();

-- Table-level SELECT would override column revocation. Replace it with an
-- explicit column grant so PostgREST cannot return password_hash, even for *.
REVOKE SELECT, UPDATE ON public.users FROM PUBLIC, anon, authenticated;
DO $$ DECLARE cols text; BEGIN
  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
    INTO cols FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name <> 'password_hash';
  EXECUTE 'GRANT SELECT (' || cols || ') ON public.users TO authenticated';
  EXECUTE 'GRANT UPDATE (' || cols || ') ON public.users TO authenticated';
END $$;

CREATE POLICY patients_access ON public.patients FOR ALL TO authenticated
  USING (public.gesclinic_can_access_clinic(clinic_id))
  WITH CHECK (public.gesclinic_can_access_clinic(clinic_id));
CREATE POLICY appointments_access ON public.appointments FOR ALL TO authenticated
  USING (public.gesclinic_can_access_clinic(clinic_id))
  WITH CHECK (public.gesclinic_can_access_clinic(clinic_id));
CREATE POLICY payer_rules_access ON public.appointment_payer_rules FOR ALL TO authenticated
  USING (public.gesclinic_can_access_clinic(clinic_id))
  WITH CHECK (public.gesclinic_can_access_clinic(clinic_id));
CREATE POLICY tax_config_access ON public.tax_configurations FOR ALL TO authenticated
  USING (public.gesclinic_can_access_clinic(clinic_id))
  WITH CHECK (public.gesclinic_can_access_clinic(clinic_id));
CREATE POLICY user_companies_read ON public.user_companies FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.gesclinic_can_admin_clinic(
    (SELECT clinic_id FROM public.companies WHERE id = company_id)));
CREATE POLICY user_companies_manage ON public.user_companies FOR ALL TO authenticated
  USING (public.gesclinic_can_admin_clinic(
    (SELECT clinic_id FROM public.companies WHERE id = company_id)))
  WITH CHECK (public.gesclinic_can_admin_clinic(
    (SELECT clinic_id FROM public.companies WHERE id = company_id)));

COMMIT;
