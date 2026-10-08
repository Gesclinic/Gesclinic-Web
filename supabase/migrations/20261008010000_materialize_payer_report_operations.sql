-- Materializa demonstrativos de pagamento na Agenda, Faturamento, Financeiro e Contas a Pagar.

CREATE TABLE IF NOT EXISTS public.payer_report_operational_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.payer_payment_imports(id) ON DELETE CASCADE,
  import_line_id uuid NOT NULL REFERENCES public.payer_payment_import_lines(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
  appointment_service_id uuid REFERENCES public.appointment_services(id) ON DELETE SET NULL,
  billing_work_item_id uuid REFERENCES public.billing_work_items(id) ON DELETE SET NULL,
  billing_guide_id uuid REFERENCES public.billing_guides(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.ar_invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, import_line_id)
);

CREATE INDEX IF NOT EXISTS idx_payer_report_operational_links_import
  ON public.payer_report_operational_links(clinic_id, import_id);

ALTER TABLE public.payer_report_operational_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payer_report_operational_links_select ON public.payer_report_operational_links;
CREATE POLICY payer_report_operational_links_select
  ON public.payer_report_operational_links FOR SELECT TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id));

DROP POLICY IF EXISTS payer_report_operational_links_write ON public.payer_report_operational_links;
CREATE POLICY payer_report_operational_links_write
  ON public.payer_report_operational_links FOR ALL TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id))
  WITH CHECK (public.current_user_has_clinic_access(clinic_id));

CREATE OR REPLACE FUNCTION public.payer_report_normalized_name(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
    upper(translate(trim(COALESCE(p_value, '')),
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'AAAAAEEEEIIIIOOOOOUUUUC')),
    '[^A-Z0-9]', '', 'g'
  );
$$;

CREATE OR REPLACE FUNCTION public.payer_report_service_date(p_line public.payer_payment_import_lines)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_value text;
  v_parts text[];
  v_year integer;
BEGIN
  IF p_line.service_date IS NOT NULL THEN RETURN p_line.service_date; END IF;
  v_value := trim(COALESCE(p_line.raw_data->>'DATA SERVICO', ''));
  IF v_value !~ '^\d{1,2}/\d{1,2}/(\d{2}|\d{4})$' THEN RETURN NULL; END IF;
  v_parts := string_to_array(v_value, '/');
  v_year := v_parts[3]::integer;
  IF v_year < 100 THEN v_year := 2000 + v_year; END IF;
  RETURN make_date(v_year, v_parts[2]::integer, v_parts[1]::integer);
END;
$$;

CREATE OR REPLACE FUNCTION public.materialize_payer_report_operations(
  p_clinic_id uuid,
  p_import_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_import public.payer_payment_imports%ROWTYPE;
  v_line public.payer_payment_import_lines%ROWTYPE;
  v_repasse public.payer_report_repasse_items%ROWTYPE;
  v_patient_id uuid;
  v_service_id uuid;
  v_appointment_id uuid;
  v_appointment_service_id uuid;
  v_work_item_id uuid;
  v_guide_id uuid;
  v_invoice_id uuid;
  v_service_date date;
  v_service_time time;
  v_procedure_name text;
  v_link_count integer := 0;
  v_patient_count integer := 0;
  v_payable_count integer := 0;
  v_calc record;
  v_payable_id uuid;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN RAISE EXCEPTION 'access denied'; END IF;

  SELECT * INTO v_import FROM public.payer_payment_imports
  WHERE id = p_import_id AND clinic_id = p_clinic_id;
  IF v_import.id IS NULL THEN RAISE EXCEPTION 'payer payment import not found'; END IF;

  PERFORM public.process_payer_report_repasse(p_clinic_id, p_import_id);

  FOR v_line IN
    SELECT * FROM public.payer_payment_import_lines
    WHERE clinic_id = p_clinic_id AND import_id = p_import_id ORDER BY line_number
  LOOP
    IF EXISTS (SELECT 1 FROM public.payer_report_operational_links
      WHERE clinic_id = p_clinic_id AND import_line_id = v_line.id) THEN CONTINUE; END IF;

    SELECT * INTO v_repasse FROM public.payer_report_repasse_items
    WHERE clinic_id = p_clinic_id AND import_line_id = v_line.id;
    IF v_repasse.id IS NULL THEN RAISE EXCEPTION 'repasse item not found for line %', v_line.line_number; END IF;

    SELECT id INTO v_patient_id FROM public.patients
    WHERE clinic_id = p_clinic_id
      AND public.payer_report_normalized_name(name) = public.payer_report_normalized_name(v_line.patient_name)
    ORDER BY active DESC NULLS LAST, created_at LIMIT 1;

    IF v_patient_id IS NULL THEN
      INSERT INTO public.patients (clinic_id, name, payer_id, active, medical_notes)
      VALUES (p_clinic_id, v_line.patient_name, v_import.payer_id, true,
        'Cadastro criado pelo retorno ' || v_import.file_name)
      RETURNING id INTO v_patient_id;
      v_patient_count := v_patient_count + 1;
    END IF;

    v_procedure_name := COALESCE(NULLIF(v_line.raw_data#>>'{_repasse,procedure_name}', ''),
      NULLIF(v_line.raw_data->>'NOME PROCEDIMENTO', ''), v_line.procedure_code, 'Procedimento de operadora');

    SELECT id INTO v_service_id FROM public.services
    WHERE clinic_id = p_clinic_id
      AND (code = v_line.procedure_code OR tuss_code = v_line.procedure_code OR procedure_code = v_line.procedure_code)
    ORDER BY active DESC NULLS LAST, created_at LIMIT 1;

    IF v_service_id IS NULL THEN
      INSERT INTO public.services (clinic_id, code, name, description, default_duration_minutes,
        price, active, tuss_code, procedure_code, procedure_name, is_billable)
      VALUES (p_clinic_id, v_line.procedure_code, v_procedure_name,
        'Serviço criado pelo retorno ' || v_import.file_name, 30, v_line.presented_amount,
        true, v_line.procedure_code, v_line.procedure_code, v_procedure_name, true)
      RETURNING id INTO v_service_id;
    END IF;

    v_service_date := public.payer_report_service_date(v_line);
    IF v_service_date IS NULL THEN RAISE EXCEPTION 'service date not found for line %', v_line.line_number; END IF;
    BEGIN
      v_service_time := COALESCE(NULLIF(v_line.raw_data->>'HORA DE REALIZACAO', '')::time, '08:00'::time);
    EXCEPTION WHEN invalid_datetime_format THEN v_service_time := '08:00'::time;
    END;

    INSERT INTO public.appointments (clinic_id, patient_id, professional_id, service_id,
      scheduled_date, scheduled_time, end_time, status, official_status, notes, payer_id,
      convenio_id, payer_name, value, financial_value, total_value, amount_paid, payment_amount,
      payment_received, payment_date, payment_status, guide_number, service_description,
      duration, finalizado_em, billing_status, billing_data)
    VALUES (p_clinic_id, v_patient_id, v_repasse.professional_id, v_service_id,
      v_service_date, v_service_time, v_service_time + interval '30 minutes', 'completed',
      'completed', 'Importado do demonstrativo ' || v_import.file_name, v_import.payer_id,
      v_import.payer_id, v_import.payer_name, v_line.presented_amount, v_line.presented_amount,
      v_line.presented_amount, v_line.paid_amount, v_line.paid_amount, v_line.paid_amount > 0,
      COALESCE(NULLIF(v_import.metadata->>'report_date', '')::date, v_import.imported_at::date),
      CASE WHEN v_line.paid_amount > 0 THEN 'paid' ELSE 'pending' END, v_line.guide_number,
      v_procedure_name, 30, (v_service_date + v_service_time)::timestamp,
      CASE WHEN v_line.glosa_amount > 0 THEN 'glossed' ELSE 'paid' END,
      jsonb_build_object('source', 'payer_report', 'import_id', p_import_id, 'import_line_id', v_line.id))
    RETURNING id INTO v_appointment_id;

    INSERT INTO public.appointment_services (clinic_id, appointment_id, service_id, value,
      discount, quantity, status, professional_percentage)
    VALUES (p_clinic_id, v_appointment_id, v_service_id, v_line.presented_amount,
      v_line.glosa_amount, 1, 'completed', v_repasse.professional_percentage)
    RETURNING id INTO v_appointment_service_id;

    INSERT INTO public.billing_guides (clinic_id, numero_guia, tipo_guia, status,
      paciente_nome, numero_carteirinha, convenio, profissional, codigo_cbhpm, valor, observacoes, data_criacao,
      data_processamento, appointment_id, workflow_status, negotiated_value, payer_id,
      patient_id, professional_id, procedure_id)
    VALUES (p_clinic_id, v_line.guide_number, 'retorno_operadora', 'Pago', v_line.patient_name,
      'NÃO INFORMADO', v_import.payer_name, v_repasse.requester_name, v_line.procedure_code, v_line.presented_amount,
      'Importado do demonstrativo ' || v_import.file_name, v_service_date, v_import.processed_at,
      v_appointment_id, 'paid', v_line.paid_amount, v_import.payer_id, v_patient_id,
      v_repasse.professional_id, v_service_id)
    RETURNING id INTO v_guide_id;

    INSERT INTO public.billing_work_items (clinic_id, appointment_id, appointment_service_id,
      guide_id, payer_id, patient_id, professional_id, procedure_id, competency_date,
      gross_amount, net_amount, status, eligibility_status, authorization_status,
      document_status, value_status, audit_status, source_snapshot, metadata)
    VALUES (p_clinic_id, v_appointment_id, v_appointment_service_id, v_guide_id,
      v_import.payer_id, v_patient_id, v_repasse.professional_id, v_service_id,
      v_service_date, v_line.presented_amount, v_line.paid_amount, 'batched', 'eligible',
      'waived', 'waived', CASE WHEN v_line.glosa_amount > 0 THEN 'divergent' ELSE 'valid' END,
      'approved', to_jsonb(v_line),
      jsonb_build_object('source', 'payer_report', 'import_id', p_import_id, 'import_line_id', v_line.id))
    RETURNING id INTO v_work_item_id;

    INSERT INTO public.ar_invoices (clinic_id, patient_id, patient_name, appointment_id,
      payer_id, payer_name, payer_type, description, amount, net_value, gross_amount,
      received_value, paid_total, glosa_value, balance_amount, due_date, received_at,
      received_date, status, guide_number, insurance_return_status,
      insurance_return_protocol, insurance_return_date, metadata)
    VALUES (p_clinic_id, v_patient_id, v_line.patient_name, v_appointment_id,
      v_import.payer_id, v_import.payer_name, 'health_insurance', v_procedure_name,
      v_line.presented_amount, v_line.paid_amount, v_line.presented_amount,
      v_line.paid_amount, v_line.paid_amount, v_line.glosa_amount,
      GREATEST(v_line.presented_amount - v_line.paid_amount - v_line.glosa_amount, 0),
      COALESCE(NULLIF(v_import.metadata->>'report_date', '')::date, v_import.imported_at::date),
      v_import.processed_at, COALESCE(NULLIF(v_import.metadata->>'report_date', '')::date, v_import.imported_at::date),
      CASE WHEN v_line.paid_amount > 0 THEN 'received' ELSE 'open' END, v_line.guide_number,
      CASE WHEN v_line.glosa_amount > 0 THEN 'glossed' ELSE 'processed' END,
      v_line.protocol_number, COALESCE(NULLIF(v_import.metadata->>'report_date', '')::date, v_import.imported_at::date),
      jsonb_build_object('source', 'payer_report', 'import_id', p_import_id, 'import_line_id', v_line.id))
    RETURNING id INTO v_invoice_id;

    UPDATE public.appointments SET ar_id = v_invoice_id WHERE id = v_appointment_id;

    INSERT INTO public.payer_report_operational_links (clinic_id, import_id, import_line_id,
      patient_id, service_id, appointment_id, appointment_service_id, billing_work_item_id,
      billing_guide_id, invoice_id)
    VALUES (p_clinic_id, p_import_id, v_line.id, v_patient_id, v_service_id, v_appointment_id,
      v_appointment_service_id, v_work_item_id, v_guide_id, v_invoice_id);
    v_link_count := v_link_count + 1;
  END LOOP;

  FOR v_calc IN
    SELECT calculation.* FROM public.medical_repasse_calculations calculation
    WHERE calculation.clinic_id = p_clinic_id
      AND calculation.metadata->>'source' = 'payer_report'
      AND calculation.metadata->'import_ids' @> jsonb_build_array(p_import_id)
      AND calculation.ap_bill_id IS NULL AND calculation.net_repasse_amount > 0
  LOOP
    INSERT INTO public.ap_bills (clinic_id, supplier_id, vendor_id, supplier_name, vendor_name,
      description, amount, net_amount, balance_amount, due_date, competency_date, status,
      category, subcategory, dre_classification, cost_center_id, metadata)
    SELECT p_clinic_id, v_calc.professional_id, v_calc.professional_id, professional.name,
      professional.name, format('Repasse médico %s/%s - retorno %s',
      lpad(v_calc.reference_month::text, 2, '0'), v_calc.reference_year, v_import.payer_name),
      v_calc.net_repasse_amount, v_calc.net_repasse_amount, v_calc.net_repasse_amount,
      (make_date(v_calc.reference_year, v_calc.reference_month, 1) + interval '1 month - 1 day')::date,
      make_date(v_calc.reference_year, v_calc.reference_month, 1), 'OPEN', 'medical_repass',
      'repasse_medico', 'MEDICAL_REPASS', v_calc.cost_center_id,
      jsonb_build_object('origin_module', 'medical_repasse', 'calculation_id', v_calc.id, 'import_id', p_import_id)
    FROM public.professionals professional WHERE professional.id = v_calc.professional_id
    RETURNING id INTO v_payable_id;

    UPDATE public.medical_repasse_calculations
    SET ap_bill_id = v_payable_id, status = 'provisionado', updated_at = now()
    WHERE id = v_calc.id;
    v_payable_count := v_payable_count + 1;
  END LOOP;

  UPDATE public.payer_payment_imports
  SET metadata = metadata || jsonb_build_object('operations_materialized_at', now(),
    'operational_link_count', (SELECT count(*) FROM public.payer_report_operational_links
      WHERE clinic_id = p_clinic_id AND import_id = p_import_id),
    'medical_payable_count', (SELECT count(*) FROM public.medical_repasse_calculations
      WHERE clinic_id = p_clinic_id AND metadata->>'source' = 'payer_report'
        AND metadata->'import_ids' @> jsonb_build_array(p_import_id) AND ap_bill_id IS NOT NULL))
  WHERE id = p_import_id AND clinic_id = p_clinic_id;

  RETURN jsonb_build_object('created_links', v_link_count, 'created_patients', v_patient_count,
    'created_payables', v_payable_count, 'total_links',
    (SELECT count(*) FROM public.payer_report_operational_links
      WHERE clinic_id = p_clinic_id AND import_id = p_import_id));
END;
$$;

REVOKE ALL ON FUNCTION public.materialize_payer_report_operations(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.materialize_payer_report_operations(uuid, uuid) TO authenticated, service_role;
