-- ============================================================
-- Migration: Adicionar Campos Obrigatórios para TISS XML
-- Data: 18 de janeiro de 2026
-- ============================================================

-- 1. SERVICES - Adicionar campos TISS
ALTER TABLE IF EXISTS services
ADD COLUMN IF NOT EXISTS tuss_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS type_service VARCHAR(50),
ADD COLUMN IF NOT EXISTS guide_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS unit_measure VARCHAR(20),
ADD COLUMN IF NOT EXISTS cost_value DECIMAL(12,2);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_services_tuss_code 
ON services(clinic_id, tuss_code) 
WHERE active = TRUE;

-- 2. PROFESSIONALS - Adicionar campos TISS
ALTER TABLE IF EXISTS professionals
ADD COLUMN IF NOT EXISTS cbo_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS cns_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS council_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS council_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS council_state VARCHAR(2);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_professionals_cbo_code 
ON professionals(clinic_id, cbo_code);

-- 3. HEALTH_INSURANCES - Adicionar campos TISS
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20),
ADD COLUMN IF NOT EXISTS tiss_pattern BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS guide_format VARCHAR(50);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_health_insurances_ans 
ON health_insurances(clinic_id, registration_ans);

-- 4. PROFESSIONAL_PAYERS - Validar credential_number
-- Se não tiver a coluna:
ALTER TABLE IF EXISTS professional_payers
ADD COLUMN IF NOT EXISTS credential_number VARCHAR(50);

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
