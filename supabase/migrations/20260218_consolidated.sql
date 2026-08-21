-- ============================================================================
-- Consolidated from 20260218_add_grupo_to_service_prices.sql
-- ============================================================================

-- Add 'grupo' column to service_prices table
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS grupo VARCHAR(255) DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN service_prices.grupo IS 'Grupo do servi├ºo (ex: Consultas, Exames, Procedimentos)';

-- ============================================================================
-- Consolidated from 20260218_add_is_active_to_service_prices.sql
-- ============================================================================

-- Adicionar campo is_active ├á tabela service_prices
ALTER TABLE service_prices
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Criar ├¡ndice para melhor performance
CREATE INDEX idx_service_prices_is_active ON service_prices(is_active);

-- Garantir que todos os registros existentes fiquem ativos
UPDATE service_prices SET is_active = true WHERE is_active IS NULL;

-- ============================================================================
-- Consolidated from 20260218_add_plano_grupo_to_service_prices.sql
-- ============================================================================

-- Add plano and grupo columns to service_prices table
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS plano VARCHAR(255),
ADD COLUMN IF NOT EXISTS grupo VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_service_prices_plano ON service_prices(plano);
CREATE INDEX IF NOT EXISTS idx_service_prices_grupo ON service_prices(grupo);
