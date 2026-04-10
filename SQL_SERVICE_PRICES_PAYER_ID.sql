-- Adicionar coluna payer_id em service_prices e criar relação

ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS payer_id UUID;

-- Criar foreign key para health_insurances (payers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_service_prices_payer_id'
    AND table_name = 'service_prices'
  ) THEN
    ALTER TABLE service_prices
    ADD CONSTRAINT fk_service_prices_payer_id 
    FOREIGN KEY (payer_id) REFERENCES health_insurances(id) ON DELETE CASCADE;
  END IF;
END $$;
