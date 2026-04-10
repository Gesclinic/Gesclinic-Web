-- Script completo para criar todas as colunas necessárias na tabela health_insurances
-- Cole este SQL no Supabase SQL Editor e execute

-- Adicionar todas as colunas que faltam
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS authorization_lead_time_days INTEGER,
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS minimum_margin_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS special_rules TEXT;

-- Criar constraint única para code se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_health_insurance_code_per_clinic'
  ) THEN
    ALTER TABLE health_insurances
    ADD CONSTRAINT unique_health_insurance_code_per_clinic UNIQUE(clinic_id, code);
  END IF;
END $$;
