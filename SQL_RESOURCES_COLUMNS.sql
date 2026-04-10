-- Adicionar colunas faltantes na tabela resources

ALTER TABLE resources
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_maintenance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_maintenance_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER;

-- Criar unique constraint para code se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_resources_code_per_clinic'
  ) THEN
    ALTER TABLE resources
    ADD CONSTRAINT unique_resources_code_per_clinic UNIQUE(clinic_id, code);
  END IF;
END $$;
