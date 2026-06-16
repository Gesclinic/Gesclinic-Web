-- Accounts Payable -> Cash Flow / Financial Transactions / DRE integration.
-- Reuses existing tables/views: ap_bills, fluxo_caixa_movimentos, cash_flow, financial_transactions, dre_entries.

ALTER TABLE IF EXISTS public.financial_transactions_audit
  ALTER COLUMN transaction_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.financial_transactions_audit
  DROP CONSTRAINT IF EXISTS financial_transactions_audit_transaction_id_fkey;

ALTER TABLE IF EXISTS public.financial_transactions_audit
  ADD CONSTRAINT financial_transactions_audit_transaction_id_fkey
  FOREIGN KEY (transaction_id) REFERENCES public.financial_transactions(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.log_financial_transactions_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_values jsonb;
  v_new_values jsonb;
  v_transaction_id uuid;
  v_changed_by uuid;
BEGIN
  v_old_values := CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END;
  v_new_values := CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END;
  v_transaction_id := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE COALESCE(NEW.id, OLD.id) END;
  v_changed_by := auth.uid();

  IF v_changed_by IS NULL THEN
    SELECT au.id INTO v_changed_by
    FROM auth.users au
    ORDER BY au.created_at NULLS LAST
    LIMIT 1;
  END IF;

  INSERT INTO public.financial_transactions_audit (
    transaction_id,
    clinic_id,
    action,
    old_values,
    new_values,
    changed_by
  ) VALUES (
    v_transaction_id,
    COALESCE(NEW.clinic_id, OLD.clinic_id),
    TG_OP,
    v_old_values,
    v_new_values,
    v_changed_by
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.ap_bill_transaction_category(p_type text, p_category text)
RETURNS transaction_category
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type text := upper(coalesce(p_type, ''));
  v_category text := lower(coalesce(p_category, ''));
BEGIN
  IF v_type = 'PAYROLL' OR v_category LIKE '%folha%' OR v_category LIKE '%salario%' THEN
    RETURN 'payroll'::transaction_category;
  ELSIF v_type = 'RENT' OR v_category LIKE '%aluguel%' THEN
    RETURN 'rent'::transaction_category;
  ELSIF v_type = 'UTILITIES' OR v_category LIKE '%energia%' OR v_category LIKE '%internet%' OR v_category LIKE '%telefon%' THEN
    RETURN 'utilities'::transaction_category;
  ELSIF v_type = 'TAX' OR v_category LIKE '%imposto%' OR v_category LIKE '%tax%' THEN
    RETURN 'tax'::transaction_category;
  ELSIF v_category LIKE '%manut%' THEN
    RETURN 'maintenance'::transaction_category;
  ELSIF v_category LIKE '%software%' OR v_category LIKE '%licen%' THEN
    RETURN 'software'::transaction_category;
  ELSIF v_category LIKE '%equip%' THEN
    RETURN 'equipment'::transaction_category;
  ELSIF v_category LIKE '%material%' THEN
    RETURN 'materials'::transaction_category;
  ELSE
    RETURN 'other'::transaction_category;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_ap_bill_financial_integrations(p_ap_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ap ap_bills%ROWTYPE;
  v_amount numeric := 0;
  v_transaction_date date;
  v_status transaction_status;
  v_movement movement_type_enum;
  v_description text;
  v_cash_status text;
  v_dre_plan_id uuid;
  v_category transaction_category;
  v_actor_id uuid;
BEGIN
  SELECT * INTO v_ap
  FROM public.ap_bills
  WHERE id = p_ap_bill_id;

  DELETE FROM public.fluxo_caixa_movimentos
  WHERE reference_type = 'accounts_payable'
    AND reference_id = p_ap_bill_id;

  DELETE FROM public.dre_entries
  WHERE reference_type = 'accounts_payable'
    AND reference_id = p_ap_bill_id;

  DELETE FROM public.financial_transactions
  WHERE origin_module = 'accounts_payable'
    AND origin_id = p_ap_bill_id;

  IF NOT FOUND AND v_ap.id IS NULL THEN
    RETURN;
  END IF;

  IF v_ap.id IS NULL THEN
    RETURN;
  END IF;

  v_amount := COALESCE(NULLIF(v_ap.balance_amount, 0), NULLIF(v_ap.net_amount, 0), v_ap.amount, 0);
  v_transaction_date := COALESCE(v_ap.paid_at::date, v_ap.due_date, CURRENT_DATE);
  v_description := concat_ws(' - ', 'Conta a Pagar', nullif(v_ap.supplier_name, ''), nullif(v_ap.document_number, ''), nullif(v_ap.description, ''));
  v_category := public.ap_bill_transaction_category(v_ap.type, v_ap.category);
  v_dre_plan_id := COALESCE(v_ap.category_id, v_ap.chart_account_id);
  v_actor_id := COALESCE(auth.uid(), v_ap.paid_by, v_ap.approved_by, v_ap.checked_by, v_ap.released_by, v_ap.created_by);

  IF v_actor_id IS NULL THEN
    SELECT ucr.user_id INTO v_actor_id
    FROM public.user_clinic_roles ucr
    WHERE ucr.clinic_id = v_ap.clinic_id
    ORDER BY ucr.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_actor_id IS NULL THEN
    SELECT au.id INTO v_actor_id
    FROM auth.users au
    ORDER BY au.created_at NULLS LAST
    LIMIT 1;
  END IF;

  IF v_actor_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', v_actor_id::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_actor_id)::text, true);
  END IF;

  IF v_ap.status IN ('CANCELED', 'REVERSED') THEN
    INSERT INTO public.financial_transactions (
      clinic_id,
      financial_account_id,
      account_id,
      description,
      amount,
      type,
      category,
      status,
      supplier_id,
      scheduled_date,
      due_date,
      reference_document,
      created_by,
      updated_by,
      transaction_type,
      movement_type,
      cost_center_id,
      document_number,
      transaction_date,
      competency_date,
      origin_module,
      origin_id,
      is_reconciled
    ) VALUES (
      v_ap.clinic_id,
      v_ap.financial_account_id,
      v_ap.financial_account_id,
      v_description,
      GREATEST(COALESCE(v_ap.net_amount, v_ap.amount, 0), 0),
      'expense'::transaction_type,
      v_category,
      'canceled'::transaction_status,
      v_ap.supplier_id,
      v_ap.due_date,
      v_ap.due_date,
      v_ap.document_number,
      v_ap.created_by,
      v_actor_id,
      CASE WHEN v_ap.status = 'REVERSED' THEN 'REVERSAL' ELSE 'EXPENSE' END::transaction_type_enum,
      'REALIZED'::movement_type_enum,
      v_ap.cost_center_id,
      v_ap.document_number,
      COALESCE(v_ap.canceled_at::date, v_ap.reversed_at::date, CURRENT_DATE),
      COALESCE(v_ap.competency_date, v_ap.due_date),
      'accounts_payable',
      v_ap.id,
      false
    );
    RETURN;
  END IF;

  IF COALESCE(v_amount, 0) <= 0 THEN
    RETURN;
  END IF;

  IF v_ap.status = 'PAID' THEN
    v_status := 'paid'::transaction_status;
    v_movement := 'REALIZED'::movement_type_enum;
    v_cash_status := 'paid';
    v_amount := COALESCE(NULLIF(v_ap.paid_value, 0), v_ap.net_amount, v_ap.amount, 0);
    v_transaction_date := COALESCE(v_ap.paid_at::date, CURRENT_DATE);
  ELSE
    v_status := CASE WHEN v_ap.status = 'APPROVED' THEN 'scheduled'::transaction_status ELSE 'pending'::transaction_status END;
    v_movement := 'PREDICTED'::movement_type_enum;
    v_cash_status := CASE WHEN v_ap.status = 'APPROVED' THEN 'scheduled' ELSE 'pending' END;
    v_amount := COALESCE(NULLIF(v_ap.balance_amount, 0), v_ap.net_amount, v_ap.amount, 0);
    v_transaction_date := COALESCE(v_ap.due_date, CURRENT_DATE);
  END IF;

  INSERT INTO public.fluxo_caixa_movimentos (
    id,
    clinic_id,
    date,
    description,
    category,
    type,
    amount,
    status,
    reference_type,
    reference_id,
    payment_method,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_ap.clinic_id,
    v_transaction_date,
    v_description,
    COALESCE(v_ap.category, v_category::text, 'accounts_payable'),
    'saida',
    GREATEST(v_amount, 0),
    v_cash_status,
    'accounts_payable',
    v_ap.id,
    v_ap.payment_method,
    now(),
    now()
  );

  INSERT INTO public.financial_transactions (
    clinic_id,
    financial_account_id,
    account_id,
    description,
    amount,
    type,
    category,
    status,
    supplier_id,
    scheduled_date,
    due_date,
    reference_document,
    created_by,
    updated_by,
    transaction_type,
    movement_type,
    cost_center_id,
    document_number,
    transaction_date,
    competency_date,
    origin_module,
    origin_id,
    is_reconciled,
    reconciliation_date
  ) VALUES (
    v_ap.clinic_id,
    v_ap.financial_account_id,
    v_ap.financial_account_id,
    v_description,
    GREATEST(v_amount, 0),
    'expense'::transaction_type,
    v_category,
    v_status,
    v_ap.supplier_id,
    v_ap.due_date,
    v_ap.due_date,
    v_ap.document_number,
    v_ap.created_by,
    v_actor_id,
    'EXPENSE'::transaction_type_enum,
    v_movement,
    v_ap.cost_center_id,
    v_ap.document_number,
    v_transaction_date,
    COALESCE(v_ap.competency_date, v_ap.due_date, v_transaction_date),
    'accounts_payable',
    v_ap.id,
    COALESCE(v_ap.metadata->'enterprise'->'reconciliation'->>'status', '') = 'MATCHED',
    CASE WHEN COALESCE(v_ap.metadata->'enterprise'->'reconciliation'->>'status', '') = 'MATCHED' THEN now() ELSE NULL END
  );

  IF v_ap.status <> 'BLOCKED' THEN
    INSERT INTO public.dre_entries (
      clinic_id,
      plano_contas_id,
      date,
      description,
      amount,
      reference_type,
      reference_id,
      created_at,
      updated_at
    ) VALUES (
      v_ap.clinic_id,
      v_dre_plan_id,
      COALESCE(v_ap.competency_date, v_ap.due_date, v_transaction_date),
      v_description,
      -GREATEST(v_amount, 0),
      'accounts_payable',
      v_ap.id,
      now(),
      now()
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_ap_bill_financial_integrations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.fluxo_caixa_movimentos
    WHERE reference_type = 'accounts_payable'
      AND reference_id = OLD.id;

    DELETE FROM public.dre_entries
    WHERE reference_type = 'accounts_payable'
      AND reference_id = OLD.id;

    DELETE FROM public.financial_transactions
    WHERE origin_module = 'accounts_payable'
      AND origin_id = OLD.id;

    RETURN OLD;
  END IF;

  PERFORM public.sync_ap_bill_financial_integrations(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ap_bills_financial_integrations ON public.ap_bills;
CREATE TRIGGER trg_ap_bills_financial_integrations
AFTER INSERT OR UPDATE OR DELETE ON public.ap_bills
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_ap_bill_financial_integrations();

CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_movimentos_ap_reference
  ON public.fluxo_caixa_movimentos(reference_type, reference_id)
  WHERE reference_type = 'accounts_payable';

CREATE INDEX IF NOT EXISTS idx_financial_transactions_ap_origin
  ON public.financial_transactions(origin_module, origin_id)
  WHERE origin_module = 'accounts_payable';

CREATE INDEX IF NOT EXISTS idx_dre_entries_ap_reference
  ON public.dre_entries(reference_type, reference_id)
  WHERE reference_type = 'accounts_payable';

DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN
    SELECT id
    FROM public.ap_bills
    WHERE status NOT IN ('CANCELED', 'REVERSED')
  LOOP
    PERFORM public.sync_ap_bill_financial_integrations(v_id);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.ap_bill_transaction_category(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_ap_bill_financial_integrations(uuid) TO authenticated, service_role;