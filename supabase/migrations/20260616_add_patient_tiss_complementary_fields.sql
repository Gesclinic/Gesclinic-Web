-- Campos complementares do cadastro do paciente para TISS/XML
-- Idempotente para ambientes que ainda nao possuem a estrutura completa.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS rg_number TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS state_birth VARCHAR(2),
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS professional_occupation TEXT,
  ADD COLUMN IF NOT EXISTS ethnicity TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_clinic_document_id
  ON public.patients(clinic_id, document_id);

COMMENT ON COLUMN public.patients.mother_name IS 'Nome da mae do paciente, usado em faturamento TISS/XML quando exigido pela operadora.';
COMMENT ON COLUMN public.patients.rg_number IS 'RG ou documento complementar do paciente.';
COMMENT ON COLUMN public.patients.nationality IS 'Nacionalidade do paciente.';
COMMENT ON COLUMN public.patients.state_birth IS 'UF de naturalidade do paciente.';
COMMENT ON COLUMN public.patients.professional_occupation IS 'Profissao/ocupacao do paciente.';
COMMENT ON COLUMN public.patients.ethnicity IS 'Raca/etnia autodeclarada do paciente.';
COMMENT ON COLUMN public.patients.complement IS 'Complemento do endereco do paciente.';
