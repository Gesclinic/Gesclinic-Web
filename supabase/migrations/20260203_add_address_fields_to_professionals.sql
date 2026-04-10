-- Add address fields to professionals table
-- Migration: Add city, state, zip_code, commercial_address columns

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS commercial_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state VARCHAR(2),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- Add comment to table
COMMENT ON COLUMN professionals.commercial_address IS 'Endereço comercial do profissional';
COMMENT ON COLUMN professionals.city IS 'Cidade do profissional';
COMMENT ON COLUMN professionals.state IS 'Estado (UF) do profissional';
COMMENT ON COLUMN professionals.zip_code IS 'CEP do profissional';
