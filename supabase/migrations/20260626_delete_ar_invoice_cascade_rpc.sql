-- ============================================================================
-- MIGRATION: 20260626_delete_ar_invoice_cascade_rpc.sql
-- PURPOSE: Allow admin users using the app custom session to delete Accounts
--          Receivable rows when direct RLS-protected DELETE returns no rows.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_ar_invoice_cascade(
  p_ar_invoice_id uuid,
  p_clinic_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS TABLE(id uuid, clinic_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
  v_authorized boolean := false;
BEGIN
  SELECT ai.clinic_id
    INTO v_clinic_id
    FROM public.ar_invoices ai
   WHERE ai.id = p_ar_invoice_id
     AND (p_clinic_id IS NULL OR ai.clinic_id = p_clinic_id);

  IF v_clinic_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.users u
     WHERE u.clinic_id = v_clinic_id
       AND lower(coalesce(u.role, '')) = 'admin'
       AND (
         (auth.uid() IS NOT NULL AND u.id = auth.uid())
         OR (p_user_id IS NOT NULL AND u.id = p_user_id)
         OR (p_email IS NOT NULL AND lower(u.email) = lower(p_email))
       )
  )
  OR EXISTS (
    SELECT 1
      FROM public.user_clinic_roles ucr
      LEFT JOIN public.users u ON u.id = ucr.user_id
     WHERE ucr.clinic_id = v_clinic_id
       AND lower(coalesce(ucr.role, '')) = 'admin'
       AND (
         (auth.uid() IS NOT NULL AND ucr.user_id = auth.uid())
         OR (p_user_id IS NOT NULL AND ucr.user_id = p_user_id)
         OR (p_email IS NOT NULL AND lower(u.email) = lower(p_email))
       )
  )
  INTO v_authorized;

  IF auth.role() <> 'service_role' AND NOT coalesce(v_authorized, false) THEN
    RAISE EXCEPTION 'Not authorized to delete this receivable'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.financial_transactions
   WHERE origin_id = p_ar_invoice_id
     AND origin_module IN ('accounts_receivable', 'contas_receber', 'ar_invoices');

  DELETE FROM public.ar_invoices
   WHERE ar_invoices.id = p_ar_invoice_id
   RETURNING ar_invoices.id, ar_invoices.clinic_id
   INTO id, clinic_id;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_ar_invoice_cascade(uuid, uuid, uuid, text) TO anon, authenticated, service_role;