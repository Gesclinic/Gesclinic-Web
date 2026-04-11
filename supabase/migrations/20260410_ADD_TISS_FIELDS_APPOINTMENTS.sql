-- ============================================================
-- Migration: Adicionar campos faltantes em appointments (sem excluir existentes)
-- Data: Abril 10, 2026
-- ============================================================

-- 1. Adicionar campos de faturamento/TISS em appointments
ALTER TABLE IF EXISTS appointments
ADD COLUMN IF NOT EXISTS total_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS guide_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS authorization_expiry DATE,
ADD COLUMN IF NOT EXISTS subscriber_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS dependent_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS dependent_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS dependent_birthdate DATE,
ADD COLUMN IF NOT EXISTS dependent_gender VARCHAR(1),
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS billing_data JSONB,
ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS billing_xml TEXT,
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Criar índices para otimizar queries TISS
CREATE INDEX IF NOT EXISTS idx_appointments_guide_number 
  ON appointments(guide_number) WHERE guide_number IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_appointments_subscriber_number 
  ON appointments(subscriber_number) WHERE subscriber_number IS NOT NULL;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
