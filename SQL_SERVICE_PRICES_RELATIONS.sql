-- Adicionar foreign key de service_prices para services

-- Primeiro, adicionar a coluna service_id se não existir
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS service_id UUID;

-- Criar foreign key para services
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_service_prices_service_id'
    AND table_name = 'service_prices'
  ) THEN
    ALTER TABLE service_prices
    ADD CONSTRAINT fk_service_prices_service_id 
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar outras colunas que podem estar faltando
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS health_insurance_id UUID,
ADD COLUMN IF NOT EXISTS base_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Foreign key para health_insurances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_service_prices_health_insurance_id'
    AND table_name = 'service_prices'
  ) THEN
    ALTER TABLE service_prices
    ADD CONSTRAINT fk_service_prices_health_insurance_id 
    FOREIGN KEY (health_insurance_id) REFERENCES health_insurances(id) ON DELETE CASCADE;
  END IF;
END $$;
