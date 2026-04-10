-- ================================================
-- MIGRAÇÃO COMPLETA: Adicionar todos os campos faltantes à tabela health_insurances
-- ================================================
-- Data: 10 de fevereiro de 2026
-- Propósito: Consolidar todos os campos necessários para convênios (Nome Fantasia, Razão Social, TISS, etc.)

-- ================================================
-- 1. Adicionar campos de Nome Fantasia e Razão Social
-- ================================================
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS fantasy_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);

-- ================================================
-- 2. Adicionar campos de Configuração TISS
-- ================================================
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(50),
ADD COLUMN IF NOT EXISTS tiss_pattern BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guide_format VARCHAR(50),
ADD COLUMN IF NOT EXISTS tiss_version VARCHAR(10) DEFAULT '3.05.00';

-- ================================================
-- 3. Criar índices para melhor performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_health_insurances_fantasy_name 
ON health_insurances(clinic_id, fantasy_name) 
WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_health_insurances_ans 
ON health_insurances(registration_ans) 
WHERE registration_ans IS NOT NULL;

-- ================================================
-- 4. Adicionar comentários nas colunas para documentação
-- ================================================
COMMENT ON COLUMN health_insurances.fantasy_name IS 'Nome Fantasia da operadora (ex: Unimed São Paulo)';
COMMENT ON COLUMN health_insurances.legal_name IS 'Razão Social completa da operadora';
COMMENT ON COLUMN health_insurances.registration_ans IS 'Número de registro na ANS (Agência Nacional de Saúde)';
COMMENT ON COLUMN health_insurances.tiss_pattern IS 'Se utiliza padrão TISS para transmissão de dados';
COMMENT ON COLUMN health_insurances.guide_format IS 'Formato de guia utilizado pela operadora';
COMMENT ON COLUMN health_insurances.tiss_version IS 'Versão do padrão TISS utilizado (ex: 3.05.00)';

-- ================================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- ================================================
-- Todos os campos necessários foram adicionados à tabela health_insurances
-- ================================================
