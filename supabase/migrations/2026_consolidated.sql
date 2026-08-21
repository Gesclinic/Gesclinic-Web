-- ============================================================================
-- Consolidated from 2026_01_16_add_code_to_health_insurances.sql
-- ============================================================================

-- Add code column to health_insurances table
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Create unique constraint for code per clinic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_health_insurance_code_per_clinic'
  ) THEN
    ALTER TABLE health_insurances
    ADD CONSTRAINT unique_health_insurance_code_per_clinic UNIQUE(clinic_id, code);
  END IF;
END
$$;

-- ============================================================================
-- Consolidated from 2026_01_17_add_missing_columns_to_health_insurances.sql
-- ============================================================================

-- Adicionar colunas faltantes na tabela health_insurances

ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS authorization_lead_time_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT false;

-- Criar unique constraint para code (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_health_insurance_code_per_clinic'
  ) THEN
    ALTER TABLE health_insurances
    ADD CONSTRAINT unique_health_insurance_code_per_clinic UNIQUE(clinic_id, code);
  END IF;
END $$;

-- ============================================================================
-- Consolidated from 2026_02_10_fix_carnival_holidays.sql
-- ============================================================================

-- ===============================================
-- FIX CARNAVAL 2026 - Remover bloqueio obrigatório
-- ===============================================

-- Step 1: Delete Carnaval entries (if they exist)
DELETE FROM holidays
WHERE date IN ('2026-02-13', '2026-02-14', '2026-02-17')
  AND scope = 'NACIONAL';

-- Step 2: Insert Carnaval as OPTIONAL holidays (is_mandatory = false, is_blocked = false)
INSERT INTO holidays (date, name, scope, is_blocked, is_mandatory, clinic_id, state, city, created_at)
VALUES
  ('2026-02-13', 'Carnaval', 'NACIONAL', false, false, NULL, NULL, NULL, NOW()),
  ('2026-02-14', 'Sexta-feira de Carnaval', 'NACIONAL', false, false, NULL, NULL, NULL, NOW()),
  ('2026-02-17', 'Terça-feira de Carnaval', 'NACIONAL', false, false, NULL, NULL, NULL, NOW());

-- Verification
SELECT date, name, is_blocked, is_mandatory FROM holidays
WHERE date IN ('2026-02-13', '2026-02-14', '2026-02-17')
ORDER BY date;
