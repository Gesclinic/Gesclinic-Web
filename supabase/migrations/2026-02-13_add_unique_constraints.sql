-- Add unique constraints for UPSERT operations on professional_services and service_prices
-- Note: service_prices uses a DEFAULT UUID for plan_id when not specified to enable UNIQUE constraints

-- 1. Professional Services: Unique constraint on (clinic_id, professional_id, service_id)
-- This is needed for ON CONFLICT to work in UPSERT operations
ALTER TABLE professional_services 
ADD CONSTRAINT uq_professional_services_clinic_prof_service 
UNIQUE(clinic_id, professional_id, service_id);

-- 2. Service Prices: Create UNIQUE constraint on all 4 columns
-- The application will use a default UUID (00000000-0000-0000-0000-000000000000) instead of NULL for plan_id
ALTER TABLE service_prices 
ADD CONSTRAINT uq_service_prices_clinic_service_payer_plan 
UNIQUE(clinic_id, service_id, payer_id, plan_id);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_professional_services_clinic_prof 
ON professional_services(clinic_id, professional_id);

CREATE INDEX IF NOT EXISTS idx_service_prices_clinic_payer 
ON service_prices(clinic_id, payer_id);
