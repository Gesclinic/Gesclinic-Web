CREATE TABLE IF NOT EXISTS public.patient_laudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_user_id UUID,
  professional_name TEXT NOT NULL,
  laudo_type TEXT NOT NULL DEFAULT 'personalizado' CHECK (
    laudo_type IN (
      'avaliacao_clinica',
      'resultado_exame',
      'evolucao_clinica',
      'alta_medica',
      'parecer_medico',
      'personalizado'
    )
  ),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  exam_date DATE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'assinado', 'publicado', 'cancelado')
  ),
  portal_visible BOOLEAN NOT NULL DEFAULT false,
  portal_published_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_patient_laudos_patient_id
  ON public.patient_laudos(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_laudos_patient_status
  ON public.patient_laudos(patient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_laudos_portal
  ON public.patient_laudos(patient_id, portal_visible, portal_published_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_laudos TO anon, authenticated;

ALTER TABLE public.patient_laudos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_laudos_select_access ON public.patient_laudos;
CREATE POLICY patient_laudos_select_access
  ON public.patient_laudos
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS patient_laudos_insert_access ON public.patient_laudos;
CREATE POLICY patient_laudos_insert_access
  ON public.patient_laudos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS patient_laudos_update_access ON public.patient_laudos;
CREATE POLICY patient_laudos_update_access
  ON public.patient_laudos
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS patient_laudos_delete_access ON public.patient_laudos;
CREATE POLICY patient_laudos_delete_access
  ON public.patient_laudos
  FOR DELETE
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.patient_laudos IS 'Laudos do paciente com fluxo de rascunho, assinatura e publicação no portal.';