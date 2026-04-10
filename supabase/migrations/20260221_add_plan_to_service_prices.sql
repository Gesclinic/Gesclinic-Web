-- ============================================================
-- MIGRATION: Adicionar campo PLAN à tabela service_prices
-- Data: 21/02/2026
-- ============================================================

-- Adicionar coluna plan se não existir
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS plan VARCHAR(255);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_prices_plan ON service_prices(plan);

-- Verificar resultado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'service_prices' 
AND column_name = 'plan';
