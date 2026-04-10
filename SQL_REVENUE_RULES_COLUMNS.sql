-- Adicionar coluna repasse_type e outras colunas em revenue_rules

ALTER TABLE revenue_rules
ADD COLUMN IF NOT EXISTS repasse_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fixed_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS applies_to VARCHAR(50),
ADD COLUMN IF NOT EXISTS professional_id UUID,
ADD COLUMN IF NOT EXISTS service_id UUID,
ADD COLUMN IF NOT EXISTS health_insurance_id UUID;

-- Adicionar foreign keys se necessário
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_revenue_rules_professional_id'
    AND table_name = 'revenue_rules'
  ) THEN
    ALTER TABLE revenue_rules
    ADD CONSTRAINT fk_revenue_rules_professional_id 
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_revenue_rules_service_id'
    AND table_name = 'revenue_rules'
  ) THEN
    ALTER TABLE revenue_rules
    ADD CONSTRAINT fk_revenue_rules_service_id 
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_revenue_rules_health_insurance_id'
    AND table_name = 'revenue_rules'
  ) THEN
    ALTER TABLE revenue_rules
    ADD CONSTRAINT fk_revenue_rules_health_insurance_id 
    FOREIGN KEY (health_insurance_id) REFERENCES health_insurances(id) ON DELETE CASCADE;
  END IF;
END $$;
