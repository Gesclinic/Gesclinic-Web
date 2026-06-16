-- Advanced enterprise AP phases: smart reconciliation RPC and formal RLS hardening.

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
  );
$$;

CREATE OR REPLACE FUNCTION public.match_payables_to_bank_transactions(
  p_clinic_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  payable_id uuid,
  bank_transaction_id uuid,
  transaction_date date,
  amount numeric,
  description text,
  match_type text,
  confidence numeric,
  status text,
  score_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate record;
  v_now timestamptz := now();
  v_match_type text;
  v_status text;
BEGIN
  IF p_clinic_id IS NULL THEN
    RAISE EXCEPTION 'clinic id is required';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.current_user_has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'access denied for clinic %', p_clinic_id;
  END IF;

  FOR candidate IN
    WITH payable_candidates AS (
      SELECT
        ap.id,
        ap.clinic_id,
        ap.supplier_name,
        ap.description AS payable_description,
        ap.document_number,
        ap.due_date,
        COALESCE(ap.paid_at::date, ap.due_date) AS target_date,
        COALESCE(NULLIF(ap.net_amount, 0), NULLIF(ap.balance_amount, 0), ap.amount, 0) AS target_amount,
        ap.metadata
      FROM public.ap_bills ap
      WHERE ap.clinic_id = p_clinic_id
        AND ap.status IN ('PAID', 'PARTIAL', 'APPROVED', 'OPEN')
        AND ap.status <> 'CANCELED'
      ORDER BY ap.due_date DESC
      LIMIT 500
    ),
    transaction_candidates AS (
      SELECT
        bt.id,
        bt.transaction_date,
        bt.amount,
        bt.description,
        bs.clinic_id
      FROM public.bank_transactions bt
      JOIN public.bank_statements bs ON bs.id = bt.statement_id
      WHERE bs.clinic_id = p_clinic_id
        AND bt.matched_to_id IS NULL
      ORDER BY bt.transaction_date DESC
      LIMIT 1000
    ),
    scored AS (
      SELECT DISTINCT ON (ap.id)
        ap.id AS payable_id,
        bt.id AS bank_transaction_id,
        bt.transaction_date,
        bt.amount,
        bt.description,
        (
          CASE
            WHEN abs(abs(bt.amount) - ap.target_amount) <= greatest(0.05, ap.target_amount * 0.01) THEN 55
            WHEN abs(abs(bt.amount) - ap.target_amount) <= greatest(5, ap.target_amount * 0.05) THEN 30
            ELSE 0
          END
          + CASE
            WHEN abs(bt.transaction_date - ap.target_date) <= 1 THEN 25
            WHEN abs(bt.transaction_date - ap.target_date) <= 7 THEN 15
            ELSE 0
          END
          + CASE
            WHEN lower(coalesce(bt.description, '')) LIKE '%' || lower(split_part(coalesce(ap.supplier_name, ''), ' ', 1)) || '%' THEN 12
            ELSE 0
          END
          + CASE
            WHEN ap.document_number IS NOT NULL AND lower(coalesce(bt.description, '')) LIKE '%' || lower(ap.document_number) || '%' THEN 8
            ELSE 0
          END
        )::numeric AS confidence,
        concat_ws(', ',
          CASE WHEN abs(abs(bt.amount) - ap.target_amount) <= greatest(0.05, ap.target_amount * 0.01) THEN 'valor exato' END,
          CASE WHEN abs(bt.transaction_date - ap.target_date) <= 1 THEN 'data D+1' WHEN abs(bt.transaction_date - ap.target_date) <= 7 THEN 'data em 7 dias' END,
          CASE WHEN lower(coalesce(bt.description, '')) LIKE '%' || lower(split_part(coalesce(ap.supplier_name, ''), ' ', 1)) || '%' THEN 'fornecedor no extrato' END,
          CASE WHEN ap.document_number IS NOT NULL AND lower(coalesce(bt.description, '')) LIKE '%' || lower(ap.document_number) || '%' THEN 'documento no extrato' END
        ) AS score_reason
      FROM payable_candidates ap
      CROSS JOIN transaction_candidates bt
      WHERE ap.target_amount > 0
      ORDER BY ap.id, confidence DESC, abs(bt.transaction_date - ap.target_date), abs(abs(bt.amount) - ap.target_amount)
    )
    SELECT *
    FROM scored
    WHERE confidence >= 60
    ORDER BY confidence DESC
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.bank_transactions bt
      WHERE bt.id = candidate.bank_transaction_id
        AND bt.matched_to_id IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;

    payable_id := candidate.payable_id;
    bank_transaction_id := candidate.bank_transaction_id;
    transaction_date := candidate.transaction_date;
    amount := candidate.amount;
    description := candidate.description;
    confidence := candidate.confidence;
    v_match_type := CASE
      WHEN candidate.confidence >= 95 THEN 'auto_exact'
      WHEN candidate.confidence >= 75 THEN 'auto_fuzzy'
      ELSE 'auto_partial'
    END;
    v_status := CASE WHEN candidate.confidence >= 85 THEN 'matched' ELSE 'review' END;
    match_type := v_match_type;
    status := v_status;
    score_reason := COALESCE(NULLIF(candidate.score_reason, ''), 'score automático');

    UPDATE public.bank_transactions bt
    SET matched_to_id = candidate.payable_id,
      match_type = v_match_type,
        match_confidence = confidence,
      status = v_status,
        notes = concat_ws(' | ', bt.notes, 'Contas a Pagar: ' || score_reason)
    WHERE bt.id = candidate.bank_transaction_id;

    UPDATE public.ap_bills ap
    SET metadata = COALESCE(ap.metadata, '{}'::jsonb) || jsonb_build_object(
          'enterprise',
          COALESCE(ap.metadata->'enterprise', '{}'::jsonb) || jsonb_build_object(
            'reconciliation', jsonb_build_object(
              'status', CASE WHEN v_status = 'matched' THEN 'MATCHED' ELSE 'AWAITING_REVIEW' END,
              'bank_transaction_id', candidate.bank_transaction_id,
              'confidence', confidence,
              'match_type', v_match_type,
              'matched_at', v_now,
              'matched_by', p_actor_id,
              'score_reason', score_reason
            )
          )
        )
    WHERE ap.id = candidate.payable_id;

    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_has_clinic_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_payables_to_bank_transactions(uuid, uuid) TO authenticated, service_role;

ALTER TABLE IF EXISTS public.ap_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payable_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payable_recurring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payables_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ap_bills_select ON public.ap_bills;
DROP POLICY IF EXISTS users_can_create_bills ON public.ap_bills;
DROP POLICY IF EXISTS users_can_delete_bills ON public.ap_bills;
DROP POLICY IF EXISTS users_can_update_bills ON public.ap_bills;
DROP POLICY IF EXISTS users_can_view_clinic_bills ON public.ap_bills;

CREATE POLICY ap_bills_select ON public.ap_bills
  FOR SELECT TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id));

CREATE POLICY ap_bills_insert ON public.ap_bills
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_clinic_access(clinic_id));

CREATE POLICY ap_bills_update ON public.ap_bills
  FOR UPDATE TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id))
  WITH CHECK (public.current_user_has_clinic_access(clinic_id));

CREATE POLICY ap_bills_delete ON public.ap_bills
  FOR DELETE TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id));

DROP POLICY IF EXISTS users_can_view_clinic_audit ON public.payables_audit;
CREATE POLICY payables_audit_select ON public.payables_audit
  FOR SELECT TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id));

DROP POLICY IF EXISTS users_can_create_attachments ON public.payable_attachments;
DROP POLICY IF EXISTS users_can_delete_attachments ON public.payable_attachments;
DROP POLICY IF EXISTS users_can_view_clinic_attachments ON public.payable_attachments;
CREATE POLICY payable_attachments_select ON public.payable_attachments
  FOR SELECT TO authenticated USING (public.current_user_has_clinic_access(clinic_id));
CREATE POLICY payable_attachments_insert ON public.payable_attachments
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_clinic_access(clinic_id));
CREATE POLICY payable_attachments_delete ON public.payable_attachments
  FOR DELETE TO authenticated USING (public.current_user_has_clinic_access(clinic_id));

DROP POLICY IF EXISTS users_can_create_recurring_configs ON public.payable_recurring_configs;
DROP POLICY IF EXISTS users_can_delete_recurring_configs ON public.payable_recurring_configs;
DROP POLICY IF EXISTS users_can_update_recurring_configs ON public.payable_recurring_configs;
DROP POLICY IF EXISTS users_can_view_clinic_recurring_configs ON public.payable_recurring_configs;
CREATE POLICY payable_recurring_select ON public.payable_recurring_configs
  FOR SELECT TO authenticated USING (public.current_user_has_clinic_access(clinic_id));
CREATE POLICY payable_recurring_insert ON public.payable_recurring_configs
  FOR INSERT TO authenticated WITH CHECK (public.current_user_has_clinic_access(clinic_id));
CREATE POLICY payable_recurring_update ON public.payable_recurring_configs
  FOR UPDATE TO authenticated USING (public.current_user_has_clinic_access(clinic_id)) WITH CHECK (public.current_user_has_clinic_access(clinic_id));
CREATE POLICY payable_recurring_delete ON public.payable_recurring_configs
  FOR DELETE TO authenticated USING (public.current_user_has_clinic_access(clinic_id));

DROP POLICY IF EXISTS bank_statements_clinic_access ON public.bank_statements;
CREATE POLICY bank_statements_clinic_access ON public.bank_statements
  FOR ALL TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id))
  WITH CHECK (public.current_user_has_clinic_access(clinic_id));

DROP POLICY IF EXISTS bank_transactions_clinic_access ON public.bank_transactions;
CREATE POLICY bank_transactions_clinic_access ON public.bank_transactions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements bs
      WHERE bs.id = bank_transactions.statement_id
        AND public.current_user_has_clinic_access(bs.clinic_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bank_statements bs
      WHERE bs.id = bank_transactions.statement_id
        AND public.current_user_has_clinic_access(bs.clinic_id)
    )
  );