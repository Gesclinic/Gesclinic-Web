-- Adicionar Foreign Key de professional_services para professionals (se não existir)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_professional_services_professional_id'
    AND table_name = 'professional_services'
  ) THEN
    ALTER TABLE professional_services
    ADD CONSTRAINT fk_professional_services_professional_id 
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar Foreign Key de professional_services para services (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_professional_services_service_id'
    AND table_name = 'professional_services'
  ) THEN
    ALTER TABLE professional_services
    ADD CONSTRAINT fk_professional_services_service_id 
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar colunas faltantes em professional_services se necessário
ALTER TABLE professional_services
ADD COLUMN IF NOT EXISTS competence_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS duration_minutes_override INTEGER,
ADD COLUMN IF NOT EXISTS clinic_id UUID;

-- Se clinic_id foi adicionado, criar foreign key para clinics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_professional_services_clinic_id'
    AND table_name = 'professional_services'
  ) THEN
    ALTER TABLE professional_services
    ADD CONSTRAINT fk_professional_services_clinic_id 
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
  END IF;
END $$;
