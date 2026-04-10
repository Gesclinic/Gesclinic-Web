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
