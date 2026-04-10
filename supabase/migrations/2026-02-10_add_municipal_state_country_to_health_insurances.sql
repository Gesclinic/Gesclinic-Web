-- ================================================
-- MIGRAÇÃO: Adicionar Inscrição Municipal, Estadual e País
-- ================================================
-- Data: 10 de fevereiro de 2026
-- Propósito: Adicionar campos de identificação fiscal e localização

-- ================================================
-- 1. Adicionar novas colunas de identificação
-- ================================================
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(50),
ADD COLUMN IF NOT EXISTS state_registration VARCHAR(50),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Brasil';

-- ================================================
-- 2. Criar índices para melhor performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_health_insurances_municipal_registration 
ON health_insurances(clinic_id, municipal_registration) 
WHERE municipal_registration IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_health_insurances_state_registration 
ON health_insurances(clinic_id, state_registration) 
WHERE state_registration IS NOT NULL;

-- ================================================
-- 3. Adicionar comentários nas colunas para documentação
-- ================================================
COMMENT ON COLUMN health_insurances.municipal_registration IS 'Inscrição Municipal (IM) da operadora de saúde';
COMMENT ON COLUMN health_insurances.state_registration IS 'Inscrição Estadual (IE) da operadora de saúde';
COMMENT ON COLUMN health_insurances.country IS 'País de localização da operadora (padrão: Brasil)';

-- ================================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- ================================================
