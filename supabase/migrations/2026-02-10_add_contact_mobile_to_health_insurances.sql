-- Add contact_mobile column to health_insurances table
ALTER TABLE health_insurances ADD COLUMN IF NOT EXISTS contact_mobile VARCHAR(20);

-- Add comment explaining the column
COMMENT ON COLUMN health_insurances.contact_mobile IS 'Celular de contato (telefone móvel)';

-- Create index for better performance on queries filtering by contact_mobile
CREATE INDEX IF NOT EXISTS idx_health_insurances_contact_mobile 
ON health_insurances(clinic_id, contact_mobile) 
WHERE contact_mobile IS NOT NULL;
