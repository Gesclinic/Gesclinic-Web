-- ============================================================
-- ADICIONAR CAMPO PLAN À TABELA SERVICE_PRICES
-- ============================================================
-- Copie e execute este SQL no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna plan
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_prices' 
    AND column_name = 'plan'
  ) THEN
    ALTER TABLE service_prices ADD COLUMN plan VARCHAR(255);
    CREATE INDEX idx_service_prices_plan ON service_prices(plan);
    RAISE NOTICE 'Campo plan adicionado com sucesso!';
  ELSE
    RAISE NOTICE 'Campo plan já existe!';
  END IF;
END $$;

-- 2. Verificar resultado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'service_prices' 
ORDER BY ordinal_position;
