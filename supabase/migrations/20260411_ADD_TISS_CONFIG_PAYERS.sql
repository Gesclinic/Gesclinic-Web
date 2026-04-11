-- ============================================================
-- Migration: Adicionar configurações TISS na tabela payers
-- Data: Abril 11, 2026
-- ============================================================

-- Adicionar colunas TISS na tabela payers (operadoras/convênios)
ALTER TABLE IF EXISTS payers
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20),      -- Código ANS (ex: 342856)
ADD COLUMN IF NOT EXISTS tiss_enabled BOOLEAN DEFAULT FALSE, -- Habilitar TISS?
ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50),      -- HTTP, SFTP, ou PORTAL
ADD COLUMN IF NOT EXISTS tiss_endpoint VARCHAR(500),         -- URL do endpoint TISS
ADD COLUMN IF NOT EXISTS tiss_username VARCHAR(255),         -- Credencial TISS
ADD COLUMN IF NOT EXISTS tiss_password VARCHAR(255),         -- Credencial TISS (encriptada no app)
ADD COLUMN IF NOT EXISTS tiss_response_email VARCHAR(255),   -- Email para respostas TISS
ADD COLUMN IF NOT EXISTS tiss_last_sync TIMESTAMP;           -- Última sincronização TISS

-- Criar índice para operadoras TISS habilitadas
CREATE INDEX IF NOT EXISTS idx_payers_tiss_enabled 
  ON payers(tiss_enabled) WHERE tiss_enabled = true;

-- Criar índice para buscar por ANS
CREATE INDEX IF NOT EXISTS idx_payers_registration_ans 
  ON payers(registration_ans) WHERE registration_ans IS NOT NULL;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
