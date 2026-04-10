-- Adicionar colunas faltantes na tabela health_insurances

ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS authorization_lead_time_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT false;

-- Criar unique constraint para code (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_health_insurance_code_per_clinic'
  ) THEN
    ALTER TABLE health_insurances
    ADD CONSTRAINT unique_health_insurance_code_per_clinic UNIQUE(clinic_id, code);
  END IF;
END $$;
