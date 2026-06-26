-- ============================================================================
-- MIGRATION: 20260626_fix_current_user_clinic_access_auth_metadata.sql
-- PURPOSE: Make AP/AR RLS recognize users synced from the custom login flow.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_has_clinic_access(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_clinic_roles ucr
      WHERE ucr.user_id = auth.uid()
        AND ucr.clinic_id = p_clinic_id
    ),
    false
  )
  OR COALESCE(
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.clinic_id = p_clinic_id
    ),
    false
  )
  OR COALESCE(
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE lower(u.email) = lower(auth.email())
        AND u.clinic_id = p_clinic_id
    ),
    false
  )
  OR COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_clinic_roles ucr
      JOIN public.users u ON u.id = ucr.user_id
      WHERE lower(u.email) = lower(auth.email())
        AND ucr.clinic_id = p_clinic_id
    ),
    false
  )
  OR p_clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
  OR p_clinic_id::text = nullif(auth.jwt() -> 'user_metadata' ->> 'clinic_id', '')
  OR p_clinic_id::text = nullif(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '');
$$;

GRANT EXECUTE ON FUNCTION public.current_user_has_clinic_access(uuid) TO authenticated, service_role;