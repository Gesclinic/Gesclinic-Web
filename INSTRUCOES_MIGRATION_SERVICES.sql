-- Execute este SQL no Supabase SQL Editor
-- Para adicionar as colunas faltantes à tabela services

-- 1. Adicionar colunas faltantes
ALTER TABLE services
ADD COLUMN IF NOT EXISTS type_billing VARCHAR(50) DEFAULT 'per_consultation',
ADD COLUMN IF NOT EXISTS allow_scheduling_fit BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS base_value DECIMAL(12, 2) DEFAULT 0;

-- 2. Renomear coluna se existir
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='duration_minutes'
  ) THEN
    ALTER TABLE services RENAME COLUMN duration_minutes TO default_duration_minutes;
  END IF;
END $$;

-- 3. Adicionar coluna default_duration_minutes se não existir
ALTER TABLE services
ADD COLUMN IF NOT EXISTS default_duration_minutes INT DEFAULT 30;

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_services_type_billing ON services(type_billing);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);

-- Verificar resultado
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'services'
ORDER BY ordinal_position;
