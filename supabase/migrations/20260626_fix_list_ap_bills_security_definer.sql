-- ============================================================================
-- MIGRATION: 20260626_fix_list_ap_bills_security_definer.sql
-- PURPOSE: Allow the AP list RPC to return clinic-scoped rows when direct
--          table reads are blocked by RLS, while preserving clinic isolation.
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

DROP FUNCTION IF EXISTS public.list_ap_bills(uuid, text, int, int) CASCADE;

CREATE OR REPLACE FUNCTION public.list_ap_bills(
  p_clinic_id uuid,
  p_status_text text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  clinic_id uuid,
  category_id uuid,
  vendor_name text,
  description text,
  amount numeric,
  due_date date,
  issue_date date,
  status text,
  notes text,
  payment_method text,
  document_number text,
  document_url text,
  installments int,
  ir_pct numeric,
  csll_pct numeric,
  pis_cofins_pct numeric,
  iss_pct numeric,
  icms_pct numeric,
  taxes_retained boolean,
  repasse_doctor_name text,
  linked_invoice_id uuid,
  linked_service text,
  linked_revenue numeric,
  method_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ab.id,
    ab.clinic_id,
    ab.category_id,
    COALESCE(
      ab.vendor_name,
      ab.metadata #>> '{nfe,supplier_name}',
      ab.metadata #>> '{nfe,supplier,name}',
      ab.metadata #>> '{public_supplier_lookup,name}',
      NULLIF(regexp_replace(ab.description, '^NF\s+[^-]+-\s*', '', 'i'), ab.description)
    )::text,
    ab.description::text,
    ab.amount,
    ab.due_date,
    ab.issue_date,
    ab.status::text,
    ab.notes::text,
    ab.payment_method::text,
    ab.document_number::text,
    COALESCE(ab.attachment_url, ab.invoice_pdf_url, ab.invoice_xml_url)::text,
    ab.installments,
    NULL::numeric,
    NULL::numeric,
    NULL::numeric,
    NULL::numeric,
    NULL::numeric,
    NULL::boolean,
    NULL::text,
    NULL::uuid,
    NULL::text,
    NULL::numeric,
    NULL::uuid,
    ab.created_at
  FROM public.ap_bills ab
  WHERE ab.clinic_id = p_clinic_id
    AND (p_status_text IS NULL OR ab.status = p_status_text)
  ORDER BY ab.due_date ASC NULLS LAST, ab.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 20000)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_ap_bills(uuid, text, int, int) TO authenticated, service_role;