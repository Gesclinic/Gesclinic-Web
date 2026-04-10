CREATE TABLE IF NOT EXISTS public.digital_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_user_id UUID,
  patient_name TEXT,
  patient_cpf TEXT,
  professional_name TEXT NOT NULL,
  professional_crm TEXT,
  professional_uf TEXT,
  professional_specialty TEXT,
  professional_rqe TEXT,
  clinic_name TEXT,
  clinic_cnpj TEXT,
  clinic_city TEXT,
  clinic_state TEXT,
  clinic_address TEXT,
  clinic_email TEXT,
  clinic_phone TEXT,
  clinic_logo TEXT,
  medicamentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  modo_assinatura TEXT NOT NULL DEFAULT 'manual' CHECK (modo_assinatura IN ('manual', 'digital')),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'pendente', 'assinada', 'expirada')),
  memed_id TEXT,
  qr_code TEXT,
  certificado_id TEXT,
  data_emissao TEXT,
  hora_emissao TEXT,
  emitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.digital_prescriptions
  ADD COLUMN IF NOT EXISTS professional_specialty TEXT,
  ADD COLUMN IF NOT EXISTS professional_rqe TEXT;

CREATE INDEX IF NOT EXISTS idx_digital_prescriptions_patient_id
  ON public.digital_prescriptions(patient_id);

CREATE INDEX IF NOT EXISTS idx_digital_prescriptions_clinic_id
  ON public.digital_prescriptions(clinic_id);

CREATE INDEX IF NOT EXISTS idx_digital_prescriptions_created_at
  ON public.digital_prescriptions(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_prescriptions TO anon, authenticated;

ALTER TABLE public.digital_prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS digital_prescriptions_select_access ON public.digital_prescriptions;
CREATE POLICY digital_prescriptions_select_access
  ON public.digital_prescriptions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS digital_prescriptions_insert_access ON public.digital_prescriptions;
CREATE POLICY digital_prescriptions_insert_access
  ON public.digital_prescriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS digital_prescriptions_update_access ON public.digital_prescriptions;
CREATE POLICY digital_prescriptions_update_access
  ON public.digital_prescriptions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS digital_prescriptions_delete_access ON public.digital_prescriptions;
CREATE POLICY digital_prescriptions_delete_access
  ON public.digital_prescriptions
  FOR DELETE
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.digital_prescriptions IS 'Persistencia de receitas digitais geradas para pacientes.';