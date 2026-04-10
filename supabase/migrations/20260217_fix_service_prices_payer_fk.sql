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
