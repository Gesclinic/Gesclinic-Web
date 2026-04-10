-- Add missing columns to revenue_rules table
-- Columns: min_value, max_value (for conditional rule application)

ALTER TABLE public.revenue_rules
ADD COLUMN IF NOT EXISTS min_value DECIMAL(19, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_value DECIMAL(19, 2) DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_revenue_rules_value_range 
ON public.revenue_rules(clinic_id, professional_id, service_id, min_value, max_value);
