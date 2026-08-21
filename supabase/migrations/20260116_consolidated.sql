-- ============================================================================
-- Consolidated from 20260116_INSERT_DEMO_USER.sql
-- ============================================================================

-- ============================================================
-- INSERT INITIAL CLINIC AND USER
-- ============================================================
-- Insert demo clinic and user for fernando.cooper@gesclinic.com.br

-- 1. Insert Clinic
INSERT INTO clinics (id, name, email, phone, address, city, state, zip_code, cnpj)
VALUES (
  gen_random_uuid(),
  'Gesclinic Demo',
  'contato@gesclinic.com.br',
  '11 3000-0000',
  'Rua Exemplo, 123',
  'S├úo Paulo',
  'SP',
  '01310-100',
  '00.000.000/0000-00'
)
ON CONFLICT (cnpj) DO NOTHING;

-- 2. Get clinic ID for next insert
WITH clinic_data AS (
  SELECT id FROM clinics WHERE name = 'Gesclinic Demo' LIMIT 1
)

-- 3. Insert User
INSERT INTO users (id, clinic_id, email, name, role)
SELECT
  gen_random_uuid(),
  clinic_data.id,
  'fernando.cooper@gesclinic.com.br',
  'Fernando Cooper',
  'admin'
FROM clinic_data
ON CONFLICT DO NOTHING;

-- Confirmation
SELECT 'Cl├¡nica e usu├írio inseridos com sucesso!' as status;

-- ============================================================================
-- Consolidated from 20260116_add_missing_services_columns.sql
-- ============================================================================

-- Migration: Add missing columns to services table
-- Date: 2026-01-16

ALTER TABLE services
ADD COLUMN IF NOT EXISTS type_billing VARCHAR(50) DEFAULT 'per_consultation',
ADD COLUMN IF NOT EXISTS allow_scheduling_fit BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS base_value DECIMAL(12, 2) DEFAULT 0;

-- Rename duration_minutes to default_duration_minutes if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='services' AND column_name='duration_minutes'
  ) THEN
    ALTER TABLE services RENAME COLUMN duration_minutes TO default_duration_minutes;
  END IF;
END $$;

-- Add the column if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS default_duration_minutes INT DEFAULT 30;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_type_billing ON services(type_billing);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
