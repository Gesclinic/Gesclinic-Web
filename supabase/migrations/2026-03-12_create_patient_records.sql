CREATE TABLE IF NOT EXISTS public.patient_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_name TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('consulta', 'evolucao', 'procedimento', 'exame')),
  record_date DATE NOT NULL,
  record_time TEXT,
  diagnosis TEXT NOT NULL,
  prescription TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_patient_records_patient_id
  ON public.patient_records(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_records_record_date
  ON public.patient_records(record_date DESC, record_time DESC);

GRANT SELECT, INSERT, UPDATE ON public.patient_records TO anon, authenticated;

ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_records_select_access ON public.patient_records;
CREATE POLICY patient_records_select_access
  ON public.patient_records
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS patient_records_insert_access ON public.patient_records;
CREATE POLICY patient_records_insert_access
  ON public.patient_records
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS patient_records_update_access ON public.patient_records;
CREATE POLICY patient_records_update_access
  ON public.patient_records
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.patient_records IS 'Registros do histórico clínico do paciente com suporte a rascunho e finalização.';