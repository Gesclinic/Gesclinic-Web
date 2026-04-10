-- Add all missing columns to revenue_rules table
-- These columns define how revenue/fees are distributed to professionals

ALTER TABLE public.revenue_rules
ADD COLUMN IF NOT EXISTS clinic_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
ADD COLUMN IF NOT EXISTS repasse_type VARCHAR(50) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS percentage DECIMAL(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fixed_amount DECIMAL(19, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS repasse_to VARCHAR(100) DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS applies_to_status VARCHAR(50) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Update clinic_id for existing rows if they reference a specific clinic
-- This ensures the clinic_id filter in the API works correctly
UPDATE public.revenue_rules 
SET clinic_id = (SELECT id FROM public.clinics LIMIT 1)
WHERE clinic_id = '00000000-0000-0000-0000-000000000000';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_revenue_rules_clinic_id 
ON public.revenue_rules(clinic_id);

CREATE INDEX IF NOT EXISTS idx_revenue_rules_professional_service
ON public.revenue_rules(professional_id, service_id, clinic_id);
