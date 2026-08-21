-- ============================================================================
-- Consolidated from 20260217_add_scheduling_config_to_service_prices.sql
-- ============================================================================

-- Add scheduling_config column to service_prices to store service schedules per payer
ALTER TABLE IF EXISTS public.service_prices
ADD COLUMN IF NOT EXISTS scheduling_config JSONB DEFAULT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_prices_scheduling_config
ON public.service_prices USING GIN(scheduling_config);

-- ============================================================================
-- Consolidated from 20260217_fix_service_prices_payer_fk.sql
-- ============================================================================

-- Fix foreign key constraint on service_prices.payer_id
-- The FK was incorrectly pointing to health_insurances instead of payers

-- 1. Drop the incorrect foreign key constraint
ALTER TABLE IF EXISTS public.service_prices
DROP CONSTRAINT IF EXISTS fk_service_prices_payer_id CASCADE;

-- 2. Add the correct foreign key constraint pointing to payers table
ALTER TABLE IF EXISTS public.service_prices
ADD CONSTRAINT fk_service_prices_payer_id
FOREIGN KEY (payer_id) REFERENCES public.payers(id) ON DELETE SET NULL;

-- 3. Verify the constraint is in place
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'service_prices' AND constraint_name = 'fk_service_prices_payer_id';
