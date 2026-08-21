-- ============================================================================
-- Consolidated from 20260221_add_plan_to_service_prices.sql
-- ============================================================================

-- ============================================================
-- MIGRATION: Adicionar campo PLAN ├á tabela service_prices
-- Data: 21/02/2026
-- ============================================================

-- Adicionar coluna plan se n├úo existir
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS plan VARCHAR(255);

-- Criar ├¡ndice para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_prices_plan ON service_prices(plan);

-- Verificar resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_prices'
AND column_name = 'plan';

-- ============================================================================
-- Consolidated from 20260221_fix_eletroencefalograma_category.sql
-- ============================================================================

-- ========================================================
-- Migration: Corrigir categoria do Eletroencefalograma
-- Date: 2026-02-21
-- ========================================================

-- Atualizar categoria para 'exam' (exame)
UPDATE services
SET service_category = 'exam'
WHERE name ILIKE '%Eletroencefalograma%';

-- Verificar resultado
SELECT id, name, service_category
FROM services
WHERE name ILIKE '%Eletroencefalograma%'
ORDER BY name;

-- ============================================================================
-- Consolidated from 20260221_populate_eletroencefalograma_code.sql
-- ============================================================================

-- ========================================================
-- Migration: Popular c├│digo CBHPM para Eletroencefalograma
-- Date: 2026-02-21
-- ========================================================

-- Atualizar servi├ºo 'Eletroencefalograma especial' com c├│digo CBHPM
UPDATE services
SET code = '40103200'
WHERE name ILIKE '%Eletroencefalograma%'
AND code IS NULL;

-- Verificar resultado
SELECT id, name, code, description
FROM services
WHERE name ILIKE '%Eletroencefalograma%'
ORDER BY name;
