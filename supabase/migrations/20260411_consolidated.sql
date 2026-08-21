-- ============================================================================
-- Consolidated from 20260411_ADD_TISS_CONFIG_HEALTH_INSURANCES.sql
-- ============================================================================

-- ============================================================
-- Migration: Adicionar configura├º├Áes TISS na tabela health_insurances
-- Data: Abril 11, 2026
-- ============================================================

-- Adicionar colunas TISS na tabela health_insurances (conv├¬nios)
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20),      -- C├│digo ANS (ex: 342856)
ADD COLUMN IF NOT EXISTS tiss_enabled BOOLEAN DEFAULT FALSE, -- Habilitar TISS?
ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50),      -- HTTP, SFTP, ou PORTAL
ADD COLUMN IF NOT EXISTS tiss_endpoint VARCHAR(500),         -- URL do endpoint TISS
ADD COLUMN IF NOT EXISTS tiss_username VARCHAR(255),         -- Credencial TISS
ADD COLUMN IF NOT EXISTS tiss_password VARCHAR(255),         -- Credencial TISS (encriptada no app)
ADD COLUMN IF NOT EXISTS tiss_response_email VARCHAR(255),   -- Email para respostas TISS
ADD COLUMN IF NOT EXISTS tiss_last_sync TIMESTAMP;           -- ├Ültima sincroniza├º├úo TISS

-- Criar ├¡ndice para conv├¬nios TISS habilitados
CREATE INDEX IF NOT EXISTS idx_health_insurances_tiss_enabled
  ON health_insurances(tiss_enabled) WHERE tiss_enabled = true;

-- Criar ├¡ndice para buscar por ANS
CREATE INDEX IF NOT EXISTS idx_health_insurances_registration_ans
  ON health_insurances(registration_ans) WHERE registration_ans IS NOT NULL;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================

-- ============================================================================
-- Consolidated from 20260411_ADD_TISS_CONFIG_PAYERS.sql
-- ============================================================================

-- ============================================================
-- Migration: Adicionar configura├º├Áes TISS na tabela payers
-- Data: Abril 11, 2026
-- ============================================================

-- Adicionar colunas TISS na tabela payers (operadoras/conv├¬nios)
ALTER TABLE IF EXISTS payers
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20),      -- C├│digo ANS (ex: 342856)
ADD COLUMN IF NOT EXISTS tiss_enabled BOOLEAN DEFAULT FALSE, -- Habilitar TISS?
ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50),      -- HTTP, SFTP, ou PORTAL
ADD COLUMN IF NOT EXISTS tiss_endpoint VARCHAR(500),         -- URL do endpoint TISS
ADD COLUMN IF NOT EXISTS tiss_username VARCHAR(255),         -- Credencial TISS
ADD COLUMN IF NOT EXISTS tiss_password VARCHAR(255),         -- Credencial TISS (encriptada no app)
ADD COLUMN IF NOT EXISTS tiss_response_email VARCHAR(255),   -- Email para respostas TISS
ADD COLUMN IF NOT EXISTS tiss_last_sync TIMESTAMP;           -- ├Ültima sincroniza├º├úo TISS

-- Criar ├¡ndice para operadoras TISS habilitadas
CREATE INDEX IF NOT EXISTS idx_payers_tiss_enabled
  ON payers(tiss_enabled) WHERE tiss_enabled = true;

-- Criar ├¡ndice para buscar por ANS
CREATE INDEX IF NOT EXISTS idx_payers_registration_ans
  ON payers(registration_ans) WHERE registration_ans IS NOT NULL;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
