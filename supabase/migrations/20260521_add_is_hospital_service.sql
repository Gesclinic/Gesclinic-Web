-- Migration: Add is_hospital_service column to services table
-- Date: 2026-05-21
-- Purpose: Mark services that have hospital equipment cost reduction (equiparação hospitalar)

ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_hospital_service BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_services_is_hospital_service ON services(is_hospital_service);

-- Comment explaining the field
COMMENT ON COLUMN services.is_hospital_service IS 'Marks if this service applies hospital equipment cost reduction (equiparação hospitalar). Only applies when clinic has hospital_equivalence and is in Lucro Presumido or Lucro Real tax regime.';
