-- Server-side delete for Contas a Pagar.
-- Keeps the client from chaining multiple RLS-protected deletes and lets the
-- audit trigger record the deletion in the same database-side flow.

CREATE OR REPLACE FUNCTION public.delete_ap_bill_cascade(p_ap_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_clinic_id uuid;
BEGIN
  SELECT clinic_id
    INTO v_clinic_id
    FROM public.ap_bills
   WHERE id = p_ap_bill_id;

  IF v_clinic_id IS NULL THEN
    RETURN;
  END IF;

  IF auth.role() <> 'service_role'
     AND NOT public.current_user_has_clinic_access(v_clinic_id) THEN
    RAISE EXCEPTION 'Not authorized to delete this payable'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.financial_transactions
   WHERE origin_id = p_ap_bill_id
     AND origin_module IN ('accounts_payable', 'contas_pagar', 'ap_bills');

  DELETE FROM public.payable_attachments
   WHERE ap_bill_id = p_ap_bill_id;

  DELETE FROM public.ap_items
   WHERE ap_bill_id = p_ap_bill_id;

  UPDATE public.payable_recurring_configs
     SET template_ap_bill_id = NULL,
         is_active = FALSE
   WHERE template_ap_bill_id = p_ap_bill_id;

  UPDATE public.ap_bills
     SET parent_payable_id = NULL
   WHERE parent_payable_id = p_ap_bill_id;

  UPDATE public.ap_bills
     SET parent_installment_id = NULL
   WHERE parent_installment_id = p_ap_bill_id;

  DELETE FROM public.ap_bills
   WHERE id = p_ap_bill_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_ap_bill_cascade(uuid) TO authenticated, service_role;