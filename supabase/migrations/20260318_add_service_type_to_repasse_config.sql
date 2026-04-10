-- Migration: Add service_type column to repasse_config for group-based rules
-- Date: 2026-03-18
-- Description: Allow repasse rules by service category/group in addition to individual services

ALTER TABLE repasse_config 
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(30),
  ADD CONSTRAINT service_type_check CHECK (service_type IN ('consultas', 'exames', 'cirurgias', 'procedimentos', null));

-- Add comment explaining the logic
COMMENT ON COLUMN repasse_config.service_type IS 'Service category for group-based rules. If NULL, rule applies to individual service_id only. If set, applies to all services in that category.';

-- Note on uniqueness:
-- Since service_id and service_type are mutually exclusive (validated at app level):
-- - Rules can have the same (clinic_id, professional_id) if one uses service_id and other uses service_type
-- - PostgreSQL allows multiple NULLs, so duplicates are prevented by app validation
-- - Dropping old constraint to allow flexible rule creation

-- Drop old constraint if it exists
ALTER TABLE repasse_config 
  DROP CONSTRAINT IF EXISTS unique_repasse_per_clinic;

-- Create index for service_type lookups (for performance)
CREATE INDEX IF NOT EXISTS idx_repasse_config_service_type ON repasse_config(clinic_id, professional_id, service_type);

-- Create index for service_id lookups (for performance)
CREATE INDEX IF NOT EXISTS idx_repasse_config_service_id ON repasse_config(clinic_id, professional_id, service_id);
