-- ============================================================================
-- MIGRATION: 20260626_fix_list_ar_invoices_security_definer.sql
-- PURPOSE: Allow clinic-scoped Accounts Receivable listing through an RPC when
--          direct ar_invoices reads are blocked by RLS.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_ar_invoices(
  p_clinic_id uuid,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_user_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS SETOF public.ar_invoices
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ai.*
  FROM public.ar_invoices ai
  WHERE ai.clinic_id = p_clinic_id
    AND (
      public.current_user_has_clinic_access(p_clinic_id)
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE p_user_id IS NOT NULL
          AND u.id = p_user_id
          AND u.clinic_id = p_clinic_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_clinic_roles ucr
        WHERE p_user_id IS NOT NULL
          AND ucr.user_id = p_user_id
          AND ucr.clinic_id = p_clinic_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE p_email IS NOT NULL
          AND lower(u.email) = lower(p_email)
          AND u.clinic_id = p_clinic_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_clinic_roles ucr
        JOIN public.users u ON u.id = ucr.user_id
        WHERE p_email IS NOT NULL
          AND lower(u.email) = lower(p_email)
          AND ucr.clinic_id = p_clinic_id
      )
    )
  ORDER BY ai.created_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 20000)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.list_ar_invoices(uuid, int, int, uuid, text) TO anon, authenticated, service_role;