-- Completa os comandos operacionais do faturamento mestre.

CREATE OR REPLACE FUNCTION public.generate_guide_from_billing_work_item(
  p_clinic_id uuid,
  p_work_item_id uuid
)
RETURNS public.billing_guides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.billing_work_items;
  v_guide public.billing_guides;
  v_snapshot jsonb;
  v_appointment jsonb;
  v_service jsonb;
  v_service_definition jsonb;
  v_guide_number text;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT * INTO v_item
  FROM public.billing_work_items
  WHERE id = p_work_item_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN RAISE EXCEPTION 'billing work item not found'; END IF;
  IF v_item.guide_id IS NOT NULL THEN
    SELECT * INTO v_guide FROM public.billing_guides
    WHERE id = v_item.guide_id AND clinic_id = p_clinic_id;
    RETURN v_guide;
  END IF;
  IF v_item.status <> 'ready' THEN
    RAISE EXCEPTION 'only ready work items can generate guides';
  END IF;
  IF COALESCE(array_length(v_item.blocker_codes, 1), 0) > 0 THEN
    RAISE EXCEPTION 'work item has unresolved blockers';
  END IF;

  v_snapshot := COALESCE(v_item.source_snapshot, '{}'::jsonb);
  v_appointment := COALESCE(v_snapshot->'appointment', '{}'::jsonb);
  v_service := COALESCE(v_snapshot->'service', '{}'::jsonb);
  v_service_definition := CASE
    WHEN jsonb_typeof(v_service->'services') = 'array' THEN COALESCE(v_service->'services'->0, '{}'::jsonb)
    ELSE COALESCE(v_service->'services', '{}'::jsonb)
  END;
  v_guide_number := 'GUI-' || to_char(v_item.competency_date, 'YYYYMM') || '-' || upper(substr(replace(v_item.id::text, '-', ''), 1, 10));

  INSERT INTO public.billing_guides (
    clinic_id, numero_guia, tipo_guia, paciente_nome, numero_carteirinha, convenio, plano,
    profissional, codigo_cbhpm, valor, status, observacoes,
    data_criacao, data_atualizacao
  ) VALUES (
    p_clinic_id,
    v_guide_number,
    'SADT',
    COALESCE(v_appointment->>'patient_name', v_appointment->>'paciente_nome', 'Paciente'),
    COALESCE(v_appointment->>'insurance_card_number', v_appointment->>'numero_carteirinha', v_item.patient_id::text),
    COALESCE(v_appointment->>'payer_name', v_appointment->>'convenio', 'Convênio'),
    COALESCE(v_appointment->>'plan_name', v_appointment->>'plano'),
    COALESCE(v_appointment->>'professional_name', v_appointment->>'profissional'),
    COALESCE(v_service_definition->>'tuss_code', v_service_definition->>'code'),
    v_item.net_amount,
    'Aguardando XML',
    'Gerada automaticamente pelo pré-faturamento',
    now(),
    now()
  ) RETURNING * INTO v_guide;

  UPDATE public.billing_work_items
  SET guide_id = v_guide.id, status = 'guide_generated', updated_at = now()
  WHERE id = v_item.id;

  INSERT INTO public.billing_audit_events
    (clinic_id, aggregate_type, aggregate_id, event_type, previous_status, next_status, payload)
  VALUES
    (p_clinic_id, 'billing_work_item', v_item.id, 'guide_generated', 'ready', 'guide_generated',
     jsonb_build_object('guide_id', v_guide.id, 'guide_number', v_guide.numero_guia));

  RETURN v_guide;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_billing_batch_guide(
  p_clinic_id uuid,
  p_batch_id uuid,
  p_guide_id uuid,
  p_include boolean
)
RETURNS public.billing_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.billing_batches;
  v_guide public.billing_guides;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN RAISE EXCEPTION 'access denied'; END IF;
  SELECT * INTO v_batch FROM public.billing_batches
  WHERE id = p_batch_id AND clinic_id = p_clinic_id FOR UPDATE;
  IF v_batch.id IS NULL THEN RAISE EXCEPTION 'billing batch not found'; END IF;
  IF v_batch.status NOT IN ('draft', 'reopened') THEN RAISE EXCEPTION 'only editable batches accept guide changes'; END IF;
  SELECT * INTO v_guide FROM public.billing_guides
  WHERE id = p_guide_id AND clinic_id = p_clinic_id;
  IF v_guide.id IS NULL THEN RAISE EXCEPTION 'billing guide not found'; END IF;

  IF p_include THEN
    INSERT INTO public.billing_batch_guides (clinic_id, batch_id, guide_id)
    VALUES (p_clinic_id, p_batch_id, p_guide_id)
    ON CONFLICT (clinic_id, batch_id, guide_id) DO UPDATE SET removed_at = NULL;
    UPDATE public.billing_guides SET billing_batch_key = v_batch.batch_key, data_atualizacao = now()
    WHERE id = p_guide_id;
  ELSE
    UPDATE public.billing_batch_guides SET removed_at = now()
    WHERE clinic_id = p_clinic_id AND batch_id = p_batch_id AND guide_id = p_guide_id AND removed_at IS NULL;
    UPDATE public.billing_guides SET billing_batch_key = NULL, data_atualizacao = now()
    WHERE id = p_guide_id AND billing_batch_key = v_batch.batch_key;
  END IF;

  PERFORM public.refresh_billing_batch_totals(p_batch_id);
  INSERT INTO public.billing_audit_events
    (clinic_id, aggregate_type, aggregate_id, event_type, next_status, payload)
  VALUES
    (p_clinic_id, 'billing_batch', p_batch_id, CASE WHEN p_include THEN 'guide_added' ELSE 'guide_removed' END,
     v_batch.status, jsonb_build_object('guide_id', p_guide_id));
  SELECT * INTO v_batch FROM public.billing_batches WHERE id = p_batch_id;
  RETURN v_batch;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_payer_payment_match(
  p_clinic_id uuid,
  p_match_id uuid
)
RETURNS public.payer_payment_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.payer_payment_matches;
  v_line public.payer_payment_import_lines;
  v_invoice public.ar_invoices;
  v_net numeric(14,2);
  v_received numeric(14,2);
  v_balance numeric(14,2);
  v_status text;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT * INTO v_match FROM public.payer_payment_matches
  WHERE id = p_match_id AND clinic_id = p_clinic_id FOR UPDATE;
  IF v_match.id IS NULL THEN RAISE EXCEPTION 'payment match not found'; END IF;
  IF v_match.status = 'applied' THEN RETURN v_match; END IF;
  IF v_match.status NOT IN ('suggested', 'confirmed') THEN
    RAISE EXCEPTION 'payment match cannot be applied from status %', v_match.status;
  END IF;

  SELECT * INTO v_line FROM public.payer_payment_import_lines
  WHERE id = v_match.import_line_id AND clinic_id = p_clinic_id FOR UPDATE;
  SELECT * INTO v_invoice FROM public.ar_invoices
  WHERE id = v_match.invoice_id AND clinic_id = p_clinic_id FOR UPDATE;
  IF v_line.id IS NULL OR v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'payment line or invoice not found';
  END IF;

  v_net := COALESCE(v_invoice.net_value, v_invoice.amount, 0);
  v_received := LEAST(v_net, COALESCE(v_invoice.received_value, v_invoice.paid_total, 0) + GREATEST(v_line.paid_amount, 0));
  v_balance := GREATEST(v_net - v_received - GREATEST(v_line.glosa_amount, 0), 0);
  v_status := CASE WHEN v_balance = 0 AND v_received > 0 THEN 'received' ELSE 'partial' END;

  UPDATE public.ar_invoices SET
    received_value = v_received,
    paid_total = v_received,
    glosa_value = COALESCE(glosa_value, 0) + GREATEST(v_line.glosa_amount, 0),
    balance_amount = v_balance,
    status = v_status,
    received_date = CASE WHEN v_received > 0 THEN CURRENT_DATE ELSE received_date END,
    received_at = CASE WHEN v_received > 0 THEN now() ELSE received_at END,
    insurance_return_status = CASE WHEN v_line.glosa_amount > 0 THEN 'glossed' ELSE 'processed' END,
    insurance_return_protocol = COALESCE(v_line.protocol_number, insurance_return_protocol),
    insurance_return_date = CURRENT_DATE,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'payer_payment_match_id', v_match.id,
      'payer_payment_import_line_id', v_line.id,
      'payer_payment_applied_at', now()
    ),
    updated_at = now()
  WHERE id = v_invoice.id;

  UPDATE public.payer_payment_matches
  SET status = 'applied', applied_at = now(), matched_by = auth.uid()
  WHERE id = v_match.id RETURNING * INTO v_match;
  UPDATE public.payer_payment_import_lines SET match_status = 'applied' WHERE id = v_line.id;

  INSERT INTO public.billing_audit_events
    (clinic_id, aggregate_type, aggregate_id, event_type, previous_status, next_status, payload)
  VALUES
    (p_clinic_id, 'payer_payment_match', v_match.id, 'payment_applied', 'suggested', 'applied',
     jsonb_build_object('invoice_id', v_invoice.id, 'paid_amount', v_line.paid_amount, 'glosa_amount', v_line.glosa_amount));

  RETURN v_match;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_guide_from_billing_work_item(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_payer_payment_match(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_billing_batch_guide(uuid, uuid, uuid, boolean) TO authenticated, service_role;
