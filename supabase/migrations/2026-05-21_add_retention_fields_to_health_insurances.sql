-- ============================================================================
-- MIGRAÇÃO: Adicionar campos de Retenção na Fonte à tabela health_insurances
-- ============================================================================
-- Data: 21 de maio de 2026
-- Propósito: Adicionar suporte para configuração de retenção de impostos por convênio

-- ============================================================================
-- 1. Adicionar colunas de retenção
-- ============================================================================
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS retention_type VARCHAR(20) DEFAULT 'particular'
  CHECK (retention_type IN ('particular', 'ti', 'tirf')),
ADD COLUMN IF NOT EXISTS retains_pis BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retains_cofins BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retains_csll BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retains_ir BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retains_iss BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 2. Adicionar comentários nas colunas para documentação
-- ============================================================================
COMMENT ON COLUMN health_insurances.retention_type IS 'Tipo de retenção: particular (sem retenção), ti (retém federais), tirf (retém tudo)';
COMMENT ON COLUMN health_insurances.retains_pis IS 'Indica se este convênio retém PIS';
COMMENT ON COLUMN health_insurances.retains_cofins IS 'Indica se este convênio retém COFINS';
COMMENT ON COLUMN health_insurances.retains_csll IS 'Indica se este convênio retém CSLL';
COMMENT ON COLUMN health_insurances.retains_ir IS 'Indica se este convênio retém IR';
COMMENT ON COLUMN health_insurances.retains_iss IS 'Indica se este convênio retém ISS';

-- ============================================================================
-- 3. Criar índice para melhor performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_health_insurances_retention_type 
ON health_insurances(clinic_id, retention_type) 
WHERE retention_type != 'particular';

-- ============================================================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- ============================================================================
