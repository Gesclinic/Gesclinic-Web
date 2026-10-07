-- Processa repasses de demonstrativos de pagamento com base no honorario pago.

CREATE TABLE IF NOT EXISTS public.payer_report_repasse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.payer_payment_imports(id) ON DELETE CASCADE,
  import_line_id uuid NOT NULL REFERENCES public.payer_payment_import_lines(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.payer_report_repasse_rules(id) ON DELETE RESTRICT,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  source_key text NOT NULL,
  reference_date date NOT NULL,
  requester_name text,
  procedure_code text,
  procedure_name text,
  service_type text NOT NULL CHECK (service_type IN ('consultation', 'procedure')),
  honorarium_amount numeric(14,2) NOT NULL DEFAULT 0,
  honorarium_paid numeric(14,2) NOT NULL DEFAULT 0,
  glosa_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_percentage numeric(7,4) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  net_after_tax numeric(14,2) NOT NULL DEFAULT 0,
  professional_percentage numeric(7,4) NOT NULL DEFAULT 0,
  professional_amount numeric(14,2) NOT NULL DEFAULT 0,
  clinic_amount numeric(14,2) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, import_line_id)
);

CREATE INDEX IF NOT EXISTS idx_payer_report_repasse_items_period
  ON public.payer_report_repasse_items(clinic_id, reference_date, professional_id);

ALTER TABLE public.payer_report_repasse_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payer_report_repasse_items_select ON public.payer_report_repasse_items;
CREATE POLICY payer_report_repasse_items_select
  ON public.payer_report_repasse_items FOR SELECT TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id));

DROP POLICY IF EXISTS payer_report_repasse_items_write ON public.payer_report_repasse_items;
CREATE POLICY payer_report_repasse_items_write
  ON public.payer_report_repasse_items FOR ALL TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id))
  WITH CHECK (public.current_user_has_clinic_access(clinic_id));

CREATE OR REPLACE FUNCTION public.payer_report_number(p_value text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN trim(COALESCE(p_value, '')) = '' THEN 0::numeric
    WHEN p_value LIKE '%,%' THEN
      COALESCE(NULLIF(regexp_replace(replace(replace(p_value, '.', ''), ',', '.'), '[^0-9.-]', '', 'g'), ''), '0')::numeric
    ELSE COALESCE(NULLIF(regexp_replace(p_value, '[^0-9.-]', '', 'g'), ''), '0')::numeric
  END;
$$;

CREATE OR REPLACE FUNCTION public.process_payer_report_repasse(
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
  v_source_key text;
  v_reference_date date;
  v_period_start date;
  v_period_end date;
  v_item_count integer;
  v_professional_count integer;
  v_total_honorarium numeric(14,2);
  v_total_tax numeric(14,2);
  v_total_repasse numeric(14,2);
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT * INTO v_import
  FROM public.payer_payment_imports
  WHERE id = p_import_id AND clinic_id = p_clinic_id;

  IF v_import.id IS NULL THEN
    RAISE EXCEPTION 'payer payment import not found';
  END IF;

  v_source_key := 'UNIMED:' || COALESCE(v_import.metadata->>'payment_identifier', '');
  IF v_source_key = 'UNIMED:' OR NOT EXISTS (
    SELECT 1 FROM public.payer_report_repasse_rules
    WHERE clinic_id = p_clinic_id AND source_key = v_source_key AND active
  ) THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'report rule not configured');
  END IF;

  v_reference_date := COALESCE(
    NULLIF(v_import.metadata->>'report_date', '')::date,
    v_import.imported_at::date
  );
  v_period_start := date_trunc('month', v_reference_date)::date;
  v_period_end := (v_period_start + interval '1 month - 1 day')::date;

  DELETE FROM public.payer_report_repasse_items
  WHERE clinic_id = p_clinic_id AND import_id = p_import_id;

  WITH line_values AS (
    SELECT
      line.*,
      COALESCE(NULLIF(line.raw_data#>>'{_repasse,requester_name}', ''), line.raw_data->>'SOLICITANTE') AS requester_name,
      COALESCE(NULLIF(line.raw_data#>>'{_repasse,procedure_name}', ''), line.raw_data->>'NOME PROCEDIMENTO') AS procedure_name,
      public.payer_report_number(COALESCE(
        NULLIF(line.raw_data#>>'{_repasse,honorarium_amount}', ''),
        line.raw_data->>'HONORARIO'
      )) AS honorarium_amount,
      public.payer_report_number(COALESCE(
        NULLIF(line.raw_data#>>'{_repasse,presented_quantity}', ''),
        line.raw_data->>'QTDE APRESENTADA'
      )) AS presented_quantity,
      public.payer_report_number(COALESCE(
        NULLIF(line.raw_data#>>'{_repasse,paid_quantity}', ''),
        line.raw_data->>'QTDE PAGA'
      )) AS paid_quantity
    FROM public.payer_payment_import_lines line
    WHERE line.clinic_id = p_clinic_id AND line.import_id = p_import_id
  ), resolved AS (
    SELECT
      line_values.*,
      COALESCE(matched_rule.id, fallback_rule.id) AS report_rule_id,
      COALESCE(matched_rule.professional_id, fallback_rule.professional_id) AS recipient_professional_id,
      COALESCE(matched_rule.consultation_tax_percentage, fallback_rule.consultation_tax_percentage) AS consultation_tax_percentage,
      COALESCE(matched_rule.procedure_tax_percentage, fallback_rule.procedure_tax_percentage) AS procedure_tax_percentage,
      COALESCE(matched_rule.professional_percentage, fallback_rule.professional_percentage) AS professional_percentage,
      COALESCE(matched_rule.clinic_percentage, fallback_rule.clinic_percentage) AS clinic_percentage
    FROM line_values
    LEFT JOIN LATERAL (
      SELECT rule.*
      FROM public.payer_report_repasse_rules rule
      WHERE rule.clinic_id = p_clinic_id
        AND rule.source_key = v_source_key
        AND rule.active
        AND NOT rule.is_fallback
        AND upper(translate(trim(line_values.requester_name),
          'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
          'AAAAAEEEEIIIIOOOOOUUUUC')) = ANY (rule.requester_aliases)
      LIMIT 1
    ) matched_rule ON true
    LEFT JOIN LATERAL (
      SELECT rule.*
      FROM public.payer_report_repasse_rules rule
      WHERE rule.clinic_id = p_clinic_id
        AND rule.source_key = v_source_key
        AND rule.active
        AND rule.is_fallback
      LIMIT 1
    ) fallback_rule ON true
  ), calculated AS (
    SELECT
      resolved.*,
      CASE
        WHEN upper(COALESCE(procedure_name, '')) LIKE '%CONSULTA%' THEN 'consultation'
        ELSE 'procedure'
      END AS service_type,
      GREATEST(
        0,
        round(
          honorarium_amount
          * CASE WHEN presented_quantity > 0 THEN LEAST(paid_quantity / presented_quantity, 1) ELSE 0 END
          - GREATEST(glosa_amount, 0),
          2
        )
      ) AS honorarium_paid
    FROM resolved
    WHERE report_rule_id IS NOT NULL
  ), taxed AS (
    SELECT
      calculated.*,
      CASE WHEN service_type = 'consultation'
        THEN consultation_tax_percentage ELSE procedure_tax_percentage
      END AS tax_percentage
    FROM calculated
  )
  INSERT INTO public.payer_report_repasse_items (
    clinic_id, import_id, import_line_id, rule_id, professional_id, source_key,
    reference_date, requester_name, procedure_code, procedure_name, service_type,
    honorarium_amount, honorarium_paid, glosa_amount, tax_percentage, tax_amount,
    net_after_tax, professional_percentage, professional_amount, clinic_amount, metadata
  )
  SELECT
    p_clinic_id, p_import_id, taxed.id, taxed.report_rule_id,
    taxed.recipient_professional_id, v_source_key, v_reference_date,
    taxed.requester_name, taxed.procedure_code, taxed.procedure_name, taxed.service_type,
    round(taxed.honorarium_amount, 2), round(taxed.honorarium_paid, 2),
    round(GREATEST(taxed.glosa_amount, 0), 2), taxed.tax_percentage,
    round(taxed.honorarium_paid * taxed.tax_percentage / 100, 2),
    round(taxed.honorarium_paid * (1 - taxed.tax_percentage / 100), 2),
    taxed.professional_percentage,
    round(taxed.honorarium_paid * (1 - taxed.tax_percentage / 100) * taxed.professional_percentage / 100, 2),
    round(taxed.honorarium_paid * (1 - taxed.tax_percentage / 100) * taxed.clinic_percentage / 100, 2),
    jsonb_build_object('guide_number', taxed.guide_number, 'line_number', taxed.line_number, 'fallback_used', selected_rule.is_fallback)
  FROM taxed
  LEFT JOIN public.payer_report_repasse_rules selected_rule ON selected_rule.id = taxed.report_rule_id;

  INSERT INTO public.medical_repasse_calculations (
    clinic_id, reference_month, reference_year, period_start, period_end,
    professional_id, convenio_id, rule_id, production_amount, billed_amount,
    received_amount, glosa_amount, eligible_amount, base_amount,
    percentage_applied, gross_repasse_amount, discounts_amount,
    net_repasse_amount, profitability_amount, status, calculated_at, metadata
  )
  SELECT
    p_clinic_id, extract(month FROM v_reference_date)::integer,
    extract(year FROM v_reference_date)::integer, v_period_start, v_period_end,
    item.professional_id, rule.payer_id, enterprise_rule.id,
    round(sum(item.honorarium_amount), 2), round(sum(item.honorarium_amount), 2),
    round(sum(item.honorarium_paid), 2), round(sum(item.glosa_amount), 2),
    round(sum(item.net_after_tax), 2), round(sum(item.net_after_tax), 2),
    rule.professional_percentage, round(sum(item.professional_amount), 2),
    round(sum(item.tax_amount), 2), round(sum(item.professional_amount), 2),
    round(sum(item.clinic_amount), 2), 'calculado', now(),
    jsonb_build_object(
      'source', 'payer_report', 'source_key', v_source_key,
      'import_ids', jsonb_agg(DISTINCT item.import_id), 'line_count', count(*)
    )
  FROM public.payer_report_repasse_items item
  JOIN public.payer_report_repasse_rules rule ON rule.id = item.rule_id
  LEFT JOIN public.medical_repasse_rules enterprise_rule
    ON enterprise_rule.clinic_id = item.clinic_id
    AND enterprise_rule.professional_id = item.professional_id
    AND enterprise_rule.scope_value = v_source_key || ':HONORARIO_LIQUIDO'
    AND enterprise_rule.is_active
  WHERE item.clinic_id = p_clinic_id
    AND item.source_key = v_source_key
    AND item.reference_date BETWEEN v_period_start AND v_period_end
  GROUP BY item.professional_id, rule.payer_id, enterprise_rule.id, rule.professional_percentage
  ON CONFLICT (clinic_id, professional_id, reference_month, reference_year) DO UPDATE SET
    convenio_id = EXCLUDED.convenio_id,
    rule_id = EXCLUDED.rule_id,
    production_amount = EXCLUDED.production_amount,
    billed_amount = EXCLUDED.billed_amount,
    received_amount = EXCLUDED.received_amount,
    glosa_amount = EXCLUDED.glosa_amount,
    eligible_amount = EXCLUDED.eligible_amount,
    base_amount = EXCLUDED.base_amount,
    percentage_applied = EXCLUDED.percentage_applied,
    gross_repasse_amount = EXCLUDED.gross_repasse_amount,
    discounts_amount = EXCLUDED.discounts_amount,
    net_repasse_amount = EXCLUDED.net_repasse_amount,
    profitability_amount = EXCLUDED.profitability_amount,
    status = CASE
      WHEN medical_repasse_calculations.status IN ('pago', 'liberado', 'aprovado')
        THEN medical_repasse_calculations.status
      ELSE 'calculado'
    END,
    calculated_at = now(),
    metadata = EXCLUDED.metadata,
    updated_at = now();

  SELECT count(*), count(DISTINCT professional_id),
    COALESCE(sum(honorarium_paid), 0), COALESCE(sum(tax_amount), 0),
    COALESCE(sum(professional_amount), 0)
  INTO v_item_count, v_professional_count, v_total_honorarium, v_total_tax, v_total_repasse
  FROM public.payer_report_repasse_items
  WHERE clinic_id = p_clinic_id AND import_id = p_import_id;

  UPDATE public.payer_payment_imports
  SET metadata = metadata || jsonb_build_object(
    'repasse_processed_at', now(), 'repasse_item_count', v_item_count,
    'repasse_professional_count', v_professional_count,
    'repasse_honorarium_paid', v_total_honorarium,
    'repasse_tax_amount', v_total_tax,
    'repasse_professional_amount', v_total_repasse
  )
  WHERE id = p_import_id AND clinic_id = p_clinic_id;

  RETURN jsonb_build_object(
    'processed', true, 'source_key', v_source_key, 'reference_date', v_reference_date,
    'items', v_item_count, 'professionals', v_professional_count,
    'honorarium_paid', v_total_honorarium, 'tax_amount', v_total_tax,
    'professional_amount', v_total_repasse
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_payer_report_repasse(uuid, uuid) TO authenticated, service_role;

COMMENT ON TABLE public.payer_report_repasse_items IS
  'Memoria auditavel por linha do calculo de repasse de demonstrativos de convenios.';