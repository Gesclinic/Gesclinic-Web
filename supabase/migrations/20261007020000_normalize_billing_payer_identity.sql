-- Normaliza a identidade do convenio em guias, lotes e recebiveis.

ALTER TABLE public.billing_guides
  ADD COLUMN IF NOT EXISTS payer_id uuid REFERENCES public.payers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS procedure_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_billing_guides_clinic_payer
  ON public.billing_guides(clinic_id, payer_id, data_criacao DESC);

ALTER TABLE public.appointment_services
  DROP CONSTRAINT IF EXISTS appointment_services_status_check;
ALTER TABLE public.appointment_services
  ADD CONSTRAINT appointment_services_status_check
  CHECK (status IN ('pending', 'partial', 'completed', 'cancelled', 'canceled'));

UPDATE public.billing_guides g
SET
  appointment_id = COALESCE(g.appointment_id, wi.appointment_id),
  payer_id = COALESCE(g.payer_id, wi.payer_id, a.payer_id),
  patient_id = COALESCE(g.patient_id, wi.patient_id, a.patient_id),
  professional_id = COALESCE(g.professional_id, wi.professional_id, a.professional_id),
  procedure_id = COALESCE(g.procedure_id, wi.procedure_id, aps.service_id),
  paciente_nome = COALESCE(NULLIF(g.paciente_nome, 'Paciente'), p.name, g.paciente_nome),
  convenio = COALESCE(NULLIF(g.convenio, 'Convênio'), NULLIF(g.convenio, 'ConvÃªnio'), py.name, g.convenio),
  profissional = COALESCE(g.profissional, pr.name),
  codigo_cbhpm = COALESCE(g.codigo_cbhpm, s.tuss_code, s.code),
  data_atualizacao = now()
FROM public.billing_work_items wi
LEFT JOIN public.appointments a ON a.id = wi.appointment_id AND a.clinic_id = wi.clinic_id
LEFT JOIN public.appointment_services aps ON aps.id = wi.appointment_service_id AND aps.clinic_id = wi.clinic_id
LEFT JOIN public.patients p ON p.id = COALESCE(wi.patient_id, a.patient_id)
LEFT JOIN public.payers py ON py.id = COALESCE(wi.payer_id, a.payer_id)
LEFT JOIN public.professionals pr ON pr.id = COALESCE(wi.professional_id, a.professional_id)
LEFT JOIN public.services s ON s.id = COALESCE(wi.procedure_id, aps.service_id)
WHERE wi.guide_id = g.id
  AND wi.clinic_id = g.clinic_id;

UPDATE public.billing_batches b
SET payer_id = source.payer_id,
    payer_name = source.payer_name,
    updated_at = now()
FROM (
  SELECT bg.batch_id,
         min(g.payer_id::text)::uuid AS payer_id,
         min(COALESCE(py.name, g.convenio, 'Particular')) AS payer_name
  FROM public.billing_batch_guides bg
  JOIN public.billing_guides g ON g.id = bg.guide_id AND g.clinic_id = bg.clinic_id
  LEFT JOIN public.payers py ON py.id = g.payer_id
  WHERE bg.removed_at IS NULL
  GROUP BY bg.batch_id
  HAVING count(DISTINCT g.payer_id) <= 1
) source
WHERE b.id = source.batch_id;

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
  v_appointment public.appointments;
  v_service public.appointment_services;
  v_patient public.patients;
  v_payer public.payers;
  v_professional public.professionals;
  v_procedure public.services;
  v_guide_number text;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN RAISE EXCEPTION 'access denied'; END IF;

  SELECT * INTO v_item FROM public.billing_work_items
  WHERE id = p_work_item_id AND clinic_id = p_clinic_id FOR UPDATE;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'billing work item not found'; END IF;
  IF v_item.guide_id IS NOT NULL THEN
    SELECT * INTO v_guide FROM public.billing_guides WHERE id = v_item.guide_id AND clinic_id = p_clinic_id;
    RETURN v_guide;
  END IF;
  IF v_item.status <> 'ready' THEN RAISE EXCEPTION 'only ready work items can generate guides'; END IF;
  IF COALESCE(array_length(v_item.blocker_codes, 1), 0) > 0 THEN RAISE EXCEPTION 'work item has unresolved blockers'; END IF;

  SELECT * INTO v_appointment FROM public.appointments WHERE id = v_item.appointment_id AND clinic_id = p_clinic_id;
  SELECT * INTO v_service FROM public.appointment_services WHERE id = v_item.appointment_service_id AND clinic_id = p_clinic_id;
  SELECT * INTO v_patient FROM public.patients WHERE id = COALESCE(v_item.patient_id, v_appointment.patient_id);
  SELECT * INTO v_payer FROM public.payers WHERE id = COALESCE(v_item.payer_id, v_appointment.payer_id);
  SELECT * INTO v_professional FROM public.professionals WHERE id = COALESCE(v_item.professional_id, v_appointment.professional_id);
  SELECT * INTO v_procedure FROM public.services WHERE id = COALESCE(v_item.procedure_id, v_service.service_id);
  v_guide_number := 'GUI-' || to_char(v_item.competency_date, 'YYYYMM') || '-' || upper(substr(replace(v_item.id::text, '-', ''), 1, 10));

  INSERT INTO public.billing_guides (
    clinic_id, appointment_id, payer_id, patient_id, professional_id, procedure_id,
    numero_guia, tipo_guia, paciente_nome, numero_carteirinha, convenio, plano,
    profissional, codigo_cbhpm, valor, status, observacoes, data_criacao, data_atualizacao
  ) VALUES (
    p_clinic_id, v_item.appointment_id, COALESCE(v_item.payer_id, v_appointment.payer_id),
    COALESCE(v_item.patient_id, v_appointment.patient_id),
    COALESCE(v_item.professional_id, v_appointment.professional_id),
    COALESCE(v_item.procedure_id, v_service.service_id), v_guide_number, 'SADT',
    COALESCE(v_patient.name, v_appointment.patient_name, 'Paciente'),
    COALESCE(v_appointment.card_number, v_item.patient_id::text),
    COALESCE(v_payer.name, v_appointment.payer_name, 'Particular'), v_appointment.plan_name,
    v_professional.name, COALESCE(v_procedure.tuss_code, v_procedure.code),
    v_item.net_amount, 'Aguardando XML', 'Gerada automaticamente pelo pré-faturamento', now(), now()
  ) RETURNING * INTO v_guide;

  UPDATE public.billing_work_items SET guide_id = v_guide.id, status = 'guide_generated', updated_at = now()
  WHERE id = v_item.id;
  INSERT INTO public.billing_audit_events
    (clinic_id, aggregate_type, aggregate_id, event_type, previous_status, next_status, payload)
  VALUES (p_clinic_id, 'billing_work_item', v_item.id, 'guide_generated', 'ready', 'guide_generated',
    jsonb_build_object('guide_id', v_guide.id, 'guide_number', v_guide.numero_guia, 'payer_id', v_guide.payer_id));
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
  SELECT * INTO v_batch FROM public.billing_batches WHERE id = p_batch_id AND clinic_id = p_clinic_id FOR UPDATE;
  IF v_batch.id IS NULL THEN RAISE EXCEPTION 'billing batch not found'; END IF;
  IF v_batch.status NOT IN ('draft', 'reopened') THEN RAISE EXCEPTION 'only editable batches accept guide changes'; END IF;
  SELECT * INTO v_guide FROM public.billing_guides WHERE id = p_guide_id AND clinic_id = p_clinic_id;
  IF v_guide.id IS NULL THEN RAISE EXCEPTION 'billing guide not found'; END IF;
  IF p_include AND v_batch.payer_id IS NOT NULL AND v_guide.payer_id IS DISTINCT FROM v_batch.payer_id THEN
    RAISE EXCEPTION 'guide payer does not match batch payer';
  END IF;

  IF p_include THEN
    UPDATE public.billing_batches SET
      payer_id = COALESCE(payer_id, v_guide.payer_id),
      payer_name = CASE WHEN payer_id IS NULL THEN COALESCE(v_guide.convenio, payer_name) ELSE payer_name END,
      updated_at = now()
    WHERE id = p_batch_id;
    INSERT INTO public.billing_batch_guides (clinic_id, batch_id, guide_id)
    VALUES (p_clinic_id, p_batch_id, p_guide_id)
    ON CONFLICT (clinic_id, batch_id, guide_id) DO UPDATE SET removed_at = NULL;
    UPDATE public.billing_guides SET billing_batch_key = v_batch.batch_key, data_atualizacao = now() WHERE id = p_guide_id;
  ELSE
    UPDATE public.billing_batch_guides SET removed_at = now()
    WHERE clinic_id = p_clinic_id AND batch_id = p_batch_id AND guide_id = p_guide_id AND removed_at IS NULL;
    UPDATE public.billing_guides SET billing_batch_key = NULL, data_atualizacao = now()
    WHERE id = p_guide_id AND billing_batch_key = v_batch.batch_key;
  END IF;

  PERFORM public.refresh_billing_batch_totals(p_batch_id);
  INSERT INTO public.billing_audit_events (clinic_id, aggregate_type, aggregate_id, event_type, next_status, payload)
  VALUES (p_clinic_id, 'billing_batch', p_batch_id, CASE WHEN p_include THEN 'guide_added' ELSE 'guide_removed' END,
    v_batch.status, jsonb_build_object('guide_id', p_guide_id, 'payer_id', v_guide.payer_id));
  SELECT * INTO v_batch FROM public.billing_batches WHERE id = p_batch_id;
  RETURN v_batch;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_billing_batch(
  p_clinic_id uuid,
  p_batch_key text,
  p_payer_name text,
  p_competency_date date,
  p_guide_ids uuid[],
  p_payer_id uuid DEFAULT NULL
)
RETURNS public.billing_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.billing_batches;
  v_invalid_count integer;
  v_distinct_payers integer;
  v_guide_payer_id uuid;
  v_guide_payer_name text;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN RAISE EXCEPTION 'access denied'; END IF;
  IF COALESCE(array_length(p_guide_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'at least one guide is required'; END IF;

    SELECT count(DISTINCT g.payer_id), min(g.payer_id::text)::uuid,
         min(COALESCE(py.name, g.convenio, 'Particular'))
    INTO v_distinct_payers, v_guide_payer_id, v_guide_payer_name
  FROM unnest(p_guide_ids) selected_id
  LEFT JOIN public.billing_guides g ON g.id = selected_id AND g.clinic_id = p_clinic_id
    LEFT JOIN public.payers py ON py.id = g.payer_id;

  SELECT count(*) INTO v_invalid_count
  FROM unnest(p_guide_ids) selected_id
  LEFT JOIN public.billing_guides g ON g.id = selected_id AND g.clinic_id = p_clinic_id
  WHERE g.id IS NULL;
  IF v_invalid_count > 0 THEN RAISE EXCEPTION 'one or more guides do not belong to the clinic'; END IF;
  IF v_distinct_payers > 1 THEN RAISE EXCEPTION 'all guides in a batch must belong to the same payer'; END IF;
  IF p_payer_id IS NOT NULL AND v_guide_payer_id IS DISTINCT FROM p_payer_id THEN
    RAISE EXCEPTION 'selected guides do not match the informed payer';
  END IF;

  INSERT INTO public.billing_batches (clinic_id, batch_key, payer_id, payer_name, competency_date)
  VALUES (p_clinic_id, p_batch_key, COALESCE(p_payer_id, v_guide_payer_id),
    COALESCE(v_guide_payer_name, p_payer_name, 'Particular'), p_competency_date)
  ON CONFLICT (clinic_id, batch_key) DO UPDATE SET updated_at = now(), updated_by = auth.uid()
  RETURNING * INTO v_batch;

  INSERT INTO public.billing_batch_guides (clinic_id, batch_id, guide_id)
  SELECT p_clinic_id, v_batch.id, selected_id FROM unnest(p_guide_ids) selected_id
  ON CONFLICT (clinic_id, batch_id, guide_id) DO UPDATE SET removed_at = NULL;
  UPDATE public.billing_guides SET billing_batch_key = v_batch.batch_key, data_atualizacao = now()
  WHERE clinic_id = p_clinic_id AND id = ANY(p_guide_ids);
  PERFORM public.refresh_billing_batch_totals(v_batch.id);
  SELECT * INTO v_batch FROM public.billing_batches WHERE id = v_batch.id;
  INSERT INTO public.billing_audit_events (clinic_id, aggregate_type, aggregate_id, event_type, next_status, payload)
  VALUES (p_clinic_id, 'billing_batch', v_batch.id, 'batch_created', v_batch.status,
    jsonb_build_object('guide_ids', p_guide_ids, 'payer_id', v_batch.payer_id));
  RETURN v_batch;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_guide_from_billing_work_item(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_billing_batch_guide(uuid, uuid, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_billing_batch(uuid, text, text, date, uuid[], uuid) TO authenticated, service_role;