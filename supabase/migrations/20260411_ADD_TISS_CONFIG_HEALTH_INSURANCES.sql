-- ============================================================
-- Migration: Adicionar configurações TISS na tabela health_insurances
-- Data: Abril 11, 2026
-- ============================================================

-- Adicionar colunas TISS na tabela health_insurances (convênios)
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20),      -- Código ANS (ex: 342856)
ADD COLUMN IF NOT EXISTS tiss_enabled BOOLEAN DEFAULT FALSE, -- Habilitar TISS?
ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50),      -- HTTP, SFTP, ou PORTAL
ADD COLUMN IF NOT EXISTS tiss_endpoint VARCHAR(500),         -- URL do endpoint TISS
ADD COLUMN IF NOT EXISTS tiss_username VARCHAR(255),         -- Credencial TISS
ADD COLUMN IF NOT EXISTS tiss_password VARCHAR(255),         -- Credencial TISS (encriptada no app)
ADD COLUMN IF NOT EXISTS tiss_response_email VARCHAR(255),   -- Email para respostas TISS
ADD COLUMN IF NOT EXISTS tiss_last_sync TIMESTAMP;           -- Última sincronização TISS

-- Criar índice para convênios TISS habilitados
CREATE INDEX IF NOT EXISTS idx_health_insurances_tiss_enabled 
  ON health_insurances(tiss_enabled) WHERE tiss_enabled = true;

-- Criar índice para buscar por ANS
CREATE INDEX IF NOT EXISTS idx_health_insurances_registration_ans 
  ON health_insurances(registration_ans) WHERE registration_ans IS NOT NULL;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
