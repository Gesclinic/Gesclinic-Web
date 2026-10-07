-- Escopo mestre de faturamento: configuracao, pre-faturamento e rastreabilidade.

CREATE TABLE IF NOT EXISTS public.billing_payer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL,
  payer_name text NOT NULL,
  tiss_version text NOT NULL DEFAULT '4.01.00',
  submission_method text NOT NULL DEFAULT 'portal' CHECK (submission_method IN ('portal', 'api', 'sftp', 'manual')),
  guide_number_pattern text NOT NULL DEFAULT 'GUI-{YYYY}-{SEQ}',
  batch_number_pattern text NOT NULL DEFAULT 'LOT-{YYYYMM}-{SEQ}',
  payment_term_days integer NOT NULL DEFAULT 30 CHECK (payment_term_days >= 0),
  appeal_term_days integer NOT NULL DEFAULT 30 CHECK (appeal_term_days >= 0),
  requires_eligibility boolean NOT NULL DEFAULT true,
  requires_authorization boolean NOT NULL DEFAULT false,
  requires_cid boolean NOT NULL DEFAULT false,
  requires_tuss boolean NOT NULL DEFAULT true,
  blocks_incomplete_billing boolean NOT NULL DEFAULT true,
  honorarium_trigger text NOT NULL DEFAULT 'receipt' CHECK (honorarium_trigger IN ('production', 'billing', 'receipt', 'hybrid')),
  active boolean NOT NULL DEFAULT true,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, payer_id)
);

CREATE TABLE IF NOT EXISTS public.billing_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL,
  guide_type text NOT NULL DEFAULT 'all',
  document_type text NOT NULL,
  label text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  blocks_billing boolean NOT NULL DEFAULT true,
  validity_days integer CHECK (validity_days IS NULL OR validity_days > 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, payer_id, guide_type, document_type)
);

CREATE TABLE IF NOT EXISTS public.billing_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL,
  appointment_service_id uuid NOT NULL,
  guide_id uuid REFERENCES public.billing_guides(id) ON DELETE SET NULL,
  payer_id uuid,
  patient_id uuid,
  professional_id uuid,
  procedure_id uuid,
  competency_date date NOT NULL,
  gross_amount numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'ready', 'blocked', 'guide_generated', 'batched', 'canceled')),
  eligibility_status text NOT NULL DEFAULT 'pending' CHECK (eligibility_status IN ('pending', 'eligible', 'ineligible', 'waived')),
  authorization_status text NOT NULL DEFAULT 'pending' CHECK (authorization_status IN ('pending', 'authorized', 'denied', 'expired', 'waived')),
  document_status text NOT NULL DEFAULT 'pending' CHECK (document_status IN ('pending', 'complete', 'incomplete', 'waived')),
  value_status text NOT NULL DEFAULT 'pending' CHECK (value_status IN ('pending', 'valid', 'divergent', 'waived')),
  audit_status text NOT NULL DEFAULT 'pending' CHECK (audit_status IN ('pending', 'approved', 'rejected', 'waived')),
  blocker_codes text[] NOT NULL DEFAULT '{}'::text[],
  assigned_to uuid,
  due_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, appointment_service_id)
);

CREATE TABLE IF NOT EXISTS public.billing_pending_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('registration', 'eligibility', 'authorization', 'document', 'value', 'procedure', 'audit', 'batch', 'submission', 'return', 'payment', 'glosa', 'appeal', 'honorarium', 'integration')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  assigned_to uuid,
  due_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_pending_open
  ON public.billing_pending_items(clinic_id, aggregate_type, aggregate_id, category)
  WHERE status IN ('open', 'in_progress');

CREATE TABLE IF NOT EXISTS public.billing_xml_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.billing_batches(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  tiss_version text NOT NULL,
  file_path text,
  content_hash text NOT NULL,
  xml_content text NOT NULL,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid')),
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_by uuid DEFAULT auth.uid(),
  generated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (clinic_id, batch_id, version),
  UNIQUE (clinic_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_billing_payer_settings_active ON public.billing_payer_settings(clinic_id, active, payer_name);
CREATE INDEX IF NOT EXISTS idx_billing_document_requirements_payer ON public.billing_document_requirements(clinic_id, payer_id, active);
CREATE INDEX IF NOT EXISTS idx_billing_work_queue ON public.billing_work_items(clinic_id, status, competency_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_work_assignee ON public.billing_work_items(clinic_id, assigned_to, due_at) WHERE status IN ('pending', 'in_review', 'blocked');
CREATE INDEX IF NOT EXISTS idx_billing_pending_sla ON public.billing_pending_items(clinic_id, status, due_at, severity);
CREATE INDEX IF NOT EXISTS idx_billing_xml_batch ON public.billing_xml_versions(clinic_id, batch_id, version DESC);

ALTER TABLE public.billing_payer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_pending_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_xml_versions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'billing_payer_settings',
    'billing_document_requirements',
    'billing_work_items',
    'billing_pending_items',
    'billing_xml_versions'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS billing_master_select ON public.%I', target_table);
    EXECUTE format('DROP POLICY IF EXISTS billing_master_insert ON public.%I', target_table);
    EXECUTE format('DROP POLICY IF EXISTS billing_master_update ON public.%I', target_table);
    EXECUTE format('CREATE POLICY billing_master_select ON public.%I FOR SELECT TO authenticated USING (public.current_user_has_clinic_access(clinic_id))', target_table);
    EXECUTE format('CREATE POLICY billing_master_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.current_user_has_clinic_access(clinic_id))', target_table);
    IF target_table <> 'billing_xml_versions' THEN
      EXECUTE format('CREATE POLICY billing_master_update ON public.%I FOR UPDATE TO authenticated USING (public.current_user_has_clinic_access(clinic_id)) WITH CHECK (public.current_user_has_clinic_access(clinic_id))', target_table);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.transition_billing_work_item(
  p_clinic_id uuid,
  p_work_item_id uuid,
  p_next_status text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS public.billing_work_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_item public.billing_work_items;
  previous_status text;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN RAISE EXCEPTION 'access denied'; END IF;
  SELECT * INTO current_item FROM public.billing_work_items
  WHERE id = p_work_item_id AND clinic_id = p_clinic_id FOR UPDATE;
  IF current_item.id IS NULL THEN RAISE EXCEPTION 'billing work item not found'; END IF;
  previous_status := current_item.status;

  IF NOT (CASE previous_status
    WHEN 'pending' THEN p_next_status IN ('in_review', 'blocked', 'canceled')
    WHEN 'in_review' THEN p_next_status IN ('ready', 'blocked', 'canceled')
    WHEN 'blocked' THEN p_next_status IN ('in_review', 'canceled')
    WHEN 'ready' THEN p_next_status IN ('guide_generated', 'blocked', 'canceled')
    WHEN 'guide_generated' THEN p_next_status IN ('batched', 'blocked')
    ELSE false
  END) THEN RAISE EXCEPTION 'invalid work item transition from % to %', previous_status, p_next_status; END IF;

  UPDATE public.billing_work_items SET
    status = p_next_status,
    assigned_to = COALESCE((p_context->>'assigned_to')::uuid, assigned_to),
    due_at = COALESCE((p_context->>'due_at')::timestamptz, due_at),
    reviewed_by = CASE WHEN p_next_status IN ('ready', 'blocked') THEN auth.uid() ELSE reviewed_by END,
    reviewed_at = CASE WHEN p_next_status IN ('ready', 'blocked') THEN now() ELSE reviewed_at END,
    metadata = metadata || p_context,
    updated_at = now()
  WHERE id = p_work_item_id RETURNING * INTO current_item;

  INSERT INTO public.billing_audit_events (clinic_id, aggregate_type, aggregate_id, event_type, previous_status, next_status, payload)
  VALUES (p_clinic_id, 'billing_work_item', p_work_item_id, 'status_changed', previous_status, p_next_status, p_context);
  RETURN current_item;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_billing_work_item(uuid, uuid, text, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_billing_pending_item(
  p_clinic_id uuid,
  p_pending_id uuid,
  p_resolution_notes text DEFAULT NULL
)
RETURNS public.billing_pending_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_item public.billing_pending_items;
BEGIN
  IF NOT public.current_user_has_clinic_access(p_clinic_id) THEN RAISE EXCEPTION 'access denied'; END IF;
  UPDATE public.billing_pending_items SET
    status = 'resolved', resolved_by = auth.uid(), resolved_at = now(),
    resolution_notes = p_resolution_notes, updated_at = now()
  WHERE id = p_pending_id AND clinic_id = p_clinic_id AND status IN ('open', 'in_progress')
  RETURNING * INTO resolved_item;
  IF resolved_item.id IS NULL THEN RAISE EXCEPTION 'open billing pending item not found'; END IF;
  INSERT INTO public.billing_audit_events (clinic_id, aggregate_type, aggregate_id, event_type, previous_status, next_status, payload)
  VALUES (p_clinic_id, 'billing_pending_item', p_pending_id, 'resolved', 'open', 'resolved', jsonb_build_object('notes', p_resolution_notes));
  RETURN resolved_item;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_billing_pending_item(uuid, uuid, text) TO authenticated, service_role;