-- Add scheduling_config column to service_prices to store service schedules per payer
ALTER TABLE IF EXISTS public.service_prices
ADD COLUMN IF NOT EXISTS scheduling_config JSONB DEFAULT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_prices_scheduling_config 
ON public.service_prices USING GIN(scheduling_config);
