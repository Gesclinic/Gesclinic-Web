-- Migration: Add NF-e, RPS and Integration Fields to health_insurances
-- Date: 2026-05-22
-- Purpose: Support XML generation (NF-e and RPS) in billing configuration

ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS nfe_series TEXT,
ADD COLUMN IF NOT EXISTS cfm_code TEXT,
ADD COLUMN IF NOT EXISTS is_simple_nacional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS icms_indicator TEXT;

ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS rps_series TEXT,
ADD COLUMN IF NOT EXISTS rps_initial INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rps_type TEXT,
ADD COLUMN IF NOT EXISTS iss_retained BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS beneficiary_type TEXT,
ADD COLUMN IF NOT EXISTS municipal_service_code TEXT,
ADD COLUMN IF NOT EXISTS enable_nfe_generation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN health_insurances.nfe_series IS 'NF-e series number for invoicing';
COMMENT ON COLUMN health_insurances.cfm_code IS 'Message Format Code (CFM) for NF-e';
COMMENT ON COLUMN health_insurances.is_simple_nacional IS 'Indicates if operator is enrolled in Simple National tax regime';
COMMENT ON COLUMN health_insurances.icms_indicator IS 'ICMS indicator (0-3): 0=Non-incident, 1=Exempt, 2=Deferred, 3=Subject';
COMMENT ON COLUMN health_insurances.rps_series IS 'RPS (Recibo Provisório de Serviço) series';
COMMENT ON COLUMN health_insurances.rps_initial IS 'Initial RPS number sequence';
COMMENT ON COLUMN health_insurances.rps_type IS 'RPS type: 1=Standard, 2=Fax, 3=Email';
COMMENT ON COLUMN health_insurances.iss_retained IS 'Indicates if ISS is retained at source';
COMMENT ON COLUMN health_insurances.beneficiary_type IS 'Type of beneficiary: operator, insurance, third_party, direct';
COMMENT ON COLUMN health_insurances.municipal_service_code IS 'Municipal service code for ISS integration';
COMMENT ON COLUMN health_insurances.enable_nfe_generation IS 'Enable automatic NF-e generation for this operator';

SELECT 'Migration completed: Added 11 columns for NF-e/RPS/Integration configuration to health_insurances table' AS migration_status;
