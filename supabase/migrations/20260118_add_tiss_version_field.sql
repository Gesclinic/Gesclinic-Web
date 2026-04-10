-- ============================================================
-- Migration: Adicionar Campo tiss_version à Tabela health_insurances
-- Data: 18 de janeiro de 2026
-- ============================================================

-- Adicionar coluna de versão TISS
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS tiss_version VARCHAR(20) DEFAULT '3.05.00';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_health_insurances_tiss_version 
ON health_insurances(clinic_id, tiss_version) 
WHERE active = TRUE;

-- ============================================================
-- Comentário na coluna para documentação
-- ============================================================
COMMENT ON COLUMN health_insurances.tiss_version IS 'Versão do padrão TISS utilizado pelo convênio (ex: 3.05.00)';

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
