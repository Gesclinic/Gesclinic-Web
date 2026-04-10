-- Add code column to health_insurances table
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Create unique constraint for code per clinic
ALTER TABLE health_insurances
ADD CONSTRAINT unique_health_insurance_code_per_clinic UNIQUE(clinic_id, code);
