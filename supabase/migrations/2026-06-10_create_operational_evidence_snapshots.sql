CREATE TABLE IF NOT EXISTS public.operational_evidence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  snapshot_type VARCHAR(80) NOT NULL DEFAULT 'compliance_readiness',
  period_days INTEGER NOT NULL DEFAULT 30 CHECK (period_days > 0),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_evidence_clinic_generated
  ON public.operational_evidence_snapshots(clinic_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_evidence_type
  ON public.operational_evidence_snapshots(snapshot_type);

ALTER TABLE public.operational_evidence_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operational_evidence_clinic_select ON public.operational_evidence_snapshots;
CREATE POLICY operational_evidence_clinic_select ON public.operational_evidence_snapshots
  FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS operational_evidence_anon_select ON public.operational_evidence_snapshots;
CREATE POLICY operational_evidence_anon_select ON public.operational_evidence_snapshots
  FOR SELECT
  TO PUBLIC
  USING (true);

DROP POLICY IF EXISTS operational_evidence_clinic_insert ON public.operational_evidence_snapshots;
CREATE POLICY operational_evidence_clinic_insert ON public.operational_evidence_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS operational_evidence_anon_insert ON public.operational_evidence_snapshots;
CREATE POLICY operational_evidence_anon_insert ON public.operational_evidence_snapshots
  FOR INSERT
  TO PUBLIC
  WITH CHECK (clinic_id IS NOT NULL AND jsonb_typeof(checks) = 'array');

DROP POLICY IF EXISTS operational_evidence_clinic_delete ON public.operational_evidence_snapshots;
CREATE POLICY operational_evidence_clinic_delete ON public.operational_evidence_snapshots
  FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()
    )
  );

REVOKE ALL ON public.operational_evidence_snapshots FROM anon;
REVOKE ALL ON public.operational_evidence_snapshots FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.operational_evidence_snapshots TO authenticated;
GRANT SELECT, INSERT ON public.operational_evidence_snapshots TO anon;
