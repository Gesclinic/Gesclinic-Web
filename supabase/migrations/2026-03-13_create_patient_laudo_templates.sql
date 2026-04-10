CREATE TABLE IF NOT EXISTS public.patient_laudo_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_user_id UUID,
  name TEXT NOT NULL,
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
  title_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  letterhead JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_patient_laudo_templates_clinic_id
  ON public.patient_laudo_templates(clinic_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_laudo_templates TO anon, authenticated;

ALTER TABLE public.patient_laudo_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_laudo_templates_select_access ON public.patient_laudo_templates;
CREATE POLICY patient_laudo_templates_select_access
  ON public.patient_laudo_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS patient_laudo_templates_insert_access ON public.patient_laudo_templates;
CREATE POLICY patient_laudo_templates_insert_access
  ON public.patient_laudo_templates
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS patient_laudo_templates_update_access ON public.patient_laudo_templates;
CREATE POLICY patient_laudo_templates_update_access
  ON public.patient_laudo_templates
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS patient_laudo_templates_delete_access ON public.patient_laudo_templates;
CREATE POLICY patient_laudo_templates_delete_access
  ON public.patient_laudo_templates
  FOR DELETE
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.patient_laudo_templates IS 'Modelos salvos de laudo com timbrado e campos institucionais por clinica.';