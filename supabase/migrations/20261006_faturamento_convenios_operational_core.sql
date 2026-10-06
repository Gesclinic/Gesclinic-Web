-- Faturamento de convenios: nucleo operacional tenant-safe.

CREATE TABLE IF NOT EXISTS public.billing_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  batch_key text NOT NULL,
  payer_id uuid,
  payer_name text NOT NULL,
  competency_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'closed', 'xml_generated', 'sent', 'protocolled', 'processed', 'partially_paid', 'paid', 'glossed', 'reopened', 'canceled')),
  guide_count integer NOT NULL DEFAULT 0 CHECK (guide_count >= 0),
  gross_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  xml_path text,
  xml_version integer NOT NULL DEFAULT 0 CHECK (xml_version >= 0),
  protocol_number text,
  closed_at timestamptz,
  sent_at timestamptz,
  processed_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (clinic_id, batch_key),
  UNIQUE (clinic_id, id)
);

CREATE TABLE IF NOT EXISTS public.billing_batch_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  guide_id uuid NOT NULL REFERENCES public.billing_guides(id) ON DELETE RESTRICT,
  added_by uuid DEFAULT auth.uid(),
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT billing_batch_guides_batch_fk FOREIGN KEY (clinic_id, batch_id)
    REFERENCES public.billing_batches(clinic_id, id) ON DELETE CASCADE,
  UNIQUE (clinic_id, batch_id, guide_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_batch_active_guide
  ON public.billing_batch_guides(clinic_id, guide_id) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.billing_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  payer_id uuid,
  payer_name text NOT NULL,
  competency_date date NOT NULL,
  production_cutoff_date date,
  billing_close_date date NOT NULL,
  submission_due_date date,
  invoice_due_date date,
  expected_payment_date date,
  appeal_due_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'open', 'closed', 'completed', 'canceled')),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (clinic_id, payer_id, competency_date)
);

CREATE TABLE IF NOT EXISTS public.billing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  guide_id uuid REFERENCES public.billing_guides(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.billing_batches(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'validated', 'rejected', 'waived')),
  required boolean NOT NULL DEFAULT true,
  validation_notes text,
  validated_by uuid,
  validated_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (guide_id IS NOT NULL OR batch_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.payer_payment_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  payer_id uuid,
  payer_name text NOT NULL,
  batch_id uuid REFERENCES public.billing_batches(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  file_format text NOT NULL CHECK (file_format IN ('xml', 'csv', 'xlsx', 'txt', 'json')),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'validated', 'processing', 'processed', 'partial', 'failed', 'canceled')),
  total_rows integer NOT NULL DEFAULT 0,
  matched_rows integer NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  matched_amount numeric(14,2) NOT NULL DEFAULT 0,
  error_message text,
  imported_by uuid DEFAULT auth.uid(),
  imported_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (clinic_id, file_hash)
);

CREATE TABLE IF NOT EXISTS public.payer_payment_import_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.payer_payment_imports(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  guide_number text,
  protocol_number text,
  patient_name text,
  procedure_code text,
  service_date date,
  presented_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  glosa_amount numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  event_type text NOT NULL DEFAULT 'payment' CHECK (event_type IN ('payment', 'partial_payment', 'glosa', 'recovery', 'discount', 'tax', 'complement')),
  match_status text NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending', 'exact', 'probable', 'manual', 'applied', 'ignored', 'divergent')),
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, import_id, line_number)
);

CREATE TABLE IF NOT EXISTS public.payer_payment_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  import_line_id uuid NOT NULL REFERENCES public.payer_payment_import_lines(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.ar_invoices(id) ON DELETE RESTRICT,
  guide_id uuid REFERENCES public.billing_guides(id) ON DELETE SET NULL,
  match_type text NOT NULL CHECK (match_type IN ('exact', 'probable', 'manual')),
  confidence numeric(5,2) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  matched_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed', 'applied', 'rejected', 'reversed')),
  reason text,
  matched_by uuid DEFAULT auth.uid(),
  matched_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (clinic_id, import_line_id, invoice_id)
);

CREATE TABLE IF NOT EXISTS public.billing_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  previous_status text,
  next_status text,
  actor_id uuid DEFAULT auth.uid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_billing_batches_clinic_status ON public.billing_batches(clinic_id, status, competency_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_batch_guides_batch ON public.billing_batch_guides(clinic_id, batch_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_billing_calendars_due ON public.billing_calendars(clinic_id, status, billing_close_date);
CREATE INDEX IF NOT EXISTS idx_billing_documents_pending ON public.billing_documents(clinic_id, status) WHERE required;
CREATE INDEX IF NOT EXISTS idx_payer_payment_imports_status ON public.payer_payment_imports(clinic_id, status, imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_payer_payment_lines_guide ON public.payer_payment_import_lines(clinic_id, guide_number);
CREATE INDEX IF NOT EXISTS idx_payer_payment_matches_invoice ON public.payer_payment_matches(clinic_id, invoice_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_audit_aggregate ON public.billing_audit_events(clinic_id, aggregate_type, aggregate_id, occurred_at DESC);

ALTER TABLE public.billing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_batch_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payer_payment_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payer_payment_import_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payer_payment_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'billing_batches', 'billing_batch_guides', 'billing_calendars', 'billing_documents',
    'payer_payment_imports', 'payer_payment_import_lines', 'payer_payment_matches', 'billing_audit_events'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS billing_tenant_select ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS billing_tenant_insert ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS billing_tenant_update ON public.%I', table_name);
    EXECUTE format('CREATE POLICY billing_tenant_select ON public.%I FOR SELECT TO authenticated USING (public.current_user_has_clinic_access(clinic_id))', table_name);
    EXECUTE format('CREATE POLICY billing_tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.current_user_has_clinic_access(clinic_id))', table_name);
    IF table_name <> 'billing_audit_events' THEN
      EXECUTE format('CREATE POLICY billing_tenant_update ON public.%I FOR UPDATE TO authenticated USING (public.current_user_has_clinic_access(clinic_id)) WITH CHECK (public.current_user_has_clinic_access(clinic_id))', table_name);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_billing_batch_totals(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
BEGIN
  SELECT clinic_id INTO v_clinic_id FROM public.billing_batches WHERE id = p_batch_id;
  IF v_clinic_id IS NULL OR NOT public.current_user_has_clinic_access(v_clinic_id) THEN
    RAISE EXCEPTION 'billing batch not found or access denied';
  END IF;

  UPDATE public.billing_batches b
  SET guide_count = totals.guide_count,
      gross_amount = totals.gross_amount,
      updated_at = now(),
      updated_by = auth.uid()
  FROM (
    SELECT count(*)::integer AS guide_count, COALESCE(sum(g.valor), 0)::numeric(14,2) AS gross_amount
    FROM public.billing_batch_guides bg
    JOIN public.billing_guides g ON g.id = bg.guide_id AND g.clinic_id = bg.clinic_id
    WHERE bg.batch_id = p_batch_id AND bg.removed_at IS NULL
  ) totals
  WHERE b.id = p_batch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_billing_batch_totals(uuid) TO authenticated, service_role;

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
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN
    RAISE EXCEPTION 'access denied';
  END IF;
  IF COALESCE(array_length(p_guide_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'at least one guide is required';
  END IF;

  SELECT count(*) INTO v_invalid_count
  FROM unnest(p_guide_ids) guide_id
  LEFT JOIN public.billing_guides g ON g.id = guide_id AND g.clinic_id = p_clinic_id
  WHERE g.id IS NULL;
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'one or more guides do not belong to the clinic';
  END IF;

  INSERT INTO public.billing_batches (clinic_id, batch_key, payer_id, payer_name, competency_date)
  VALUES (p_clinic_id, p_batch_key, p_payer_id, p_payer_name, p_competency_date)
  ON CONFLICT (clinic_id, batch_key) DO UPDATE SET updated_at = now(), updated_by = auth.uid()
  RETURNING * INTO v_batch;

  INSERT INTO public.billing_batch_guides (clinic_id, batch_id, guide_id)
  SELECT p_clinic_id, v_batch.id, guide_id FROM unnest(p_guide_ids) guide_id
  ON CONFLICT (clinic_id, batch_id, guide_id) DO UPDATE SET removed_at = NULL;

  UPDATE public.billing_guides
  SET billing_batch_key = v_batch.batch_key, data_atualizacao = now()
  WHERE clinic_id = p_clinic_id AND id = ANY(p_guide_ids);

  PERFORM public.refresh_billing_batch_totals(v_batch.id);
  SELECT * INTO v_batch FROM public.billing_batches WHERE id = v_batch.id;

  INSERT INTO public.billing_audit_events (clinic_id, aggregate_type, aggregate_id, event_type, next_status, payload)
  VALUES (p_clinic_id, 'billing_batch', v_batch.id, 'batch_created', v_batch.status, jsonb_build_object('guide_ids', p_guide_ids));
  RETURN v_batch;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_billing_batch(
  p_clinic_id uuid,
  p_batch_id uuid,
  p_next_status text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS public.billing_batches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.billing_batches;
  v_previous_status text;
  v_allowed boolean := false;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN RAISE EXCEPTION 'access denied'; END IF;
  SELECT * INTO v_batch FROM public.billing_batches WHERE id = p_batch_id AND clinic_id = p_clinic_id FOR UPDATE;
  IF v_batch.id IS NULL THEN RAISE EXCEPTION 'billing batch not found'; END IF;
  v_previous_status := v_batch.status;

  v_allowed := CASE v_previous_status
    WHEN 'draft' THEN p_next_status IN ('closed', 'canceled')
    WHEN 'closed' THEN p_next_status IN ('xml_generated', 'reopened', 'canceled')
    WHEN 'reopened' THEN p_next_status IN ('closed', 'canceled')
    WHEN 'xml_generated' THEN p_next_status IN ('sent', 'reopened')
    WHEN 'sent' THEN p_next_status IN ('protocolled', 'processed')
    WHEN 'protocolled' THEN p_next_status IN ('processed')
    WHEN 'processed' THEN p_next_status IN ('partially_paid', 'paid', 'glossed')
    WHEN 'partially_paid' THEN p_next_status IN ('paid', 'glossed')
    WHEN 'glossed' THEN p_next_status IN ('partially_paid', 'paid')
    ELSE false
  END;
  IF NOT v_allowed THEN RAISE EXCEPTION 'invalid transition from % to %', v_previous_status, p_next_status; END IF;

  UPDATE public.billing_batches SET
    status = p_next_status,
    closed_at = CASE WHEN p_next_status = 'closed' THEN now() ELSE closed_at END,
    sent_at = CASE WHEN p_next_status = 'sent' THEN now() ELSE sent_at END,
    processed_at = CASE WHEN p_next_status = 'processed' THEN now() ELSE processed_at END,
    xml_path = COALESCE(p_context->>'xml_path', xml_path),
    xml_version = CASE WHEN p_next_status = 'xml_generated' THEN xml_version + 1 ELSE xml_version END,
    protocol_number = COALESCE(p_context->>'protocol_number', protocol_number),
    updated_at = now(), updated_by = auth.uid(), metadata = metadata || p_context
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;

  INSERT INTO public.billing_audit_events (clinic_id, aggregate_type, aggregate_id, event_type, previous_status, next_status, payload)
  VALUES (p_clinic_id, 'billing_batch', p_batch_id, 'status_changed', v_previous_status, p_next_status, p_context);
  RETURN v_batch;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_billing_batch(uuid, text, text, date, uuid[], uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_billing_batch(uuid, uuid, text, jsonb) TO authenticated, service_role;

INSERT INTO public.billing_batches (
  clinic_id, batch_key, payer_name, competency_date, status, guide_count, gross_amount, created_at, updated_at, metadata
)
SELECT
  g.clinic_id,
  g.billing_batch_key,
  COALESCE(max(g.convenio), 'Particular'),
  date_trunc('month', min(g.data_criacao))::date,
  CASE
    WHEN bool_or(lower(g.status) LIKE '%enviado%') THEN 'sent'
    WHEN bool_or(g.xml_path IS NOT NULL) THEN 'xml_generated'
    ELSE 'closed'
  END,
  count(*)::integer,
  COALESCE(sum(g.valor), 0),
  min(g.data_criacao),
  max(g.data_atualizacao),
  jsonb_build_object('migrated_from_billing_batch_key', true)
FROM public.billing_guides g
WHERE g.billing_batch_key IS NOT NULL
GROUP BY g.clinic_id, g.billing_batch_key
ON CONFLICT (clinic_id, batch_key) DO NOTHING;

INSERT INTO public.billing_batch_guides (clinic_id, batch_id, guide_id, metadata)
SELECT g.clinic_id, b.id, g.id, jsonb_build_object('migrated_from_billing_batch_key', true)
FROM public.billing_guides g
JOIN public.billing_batches b ON b.clinic_id = g.clinic_id AND b.batch_key = g.billing_batch_key
WHERE g.billing_batch_key IS NOT NULL
ON CONFLICT (clinic_id, batch_id, guide_id) DO NOTHING;