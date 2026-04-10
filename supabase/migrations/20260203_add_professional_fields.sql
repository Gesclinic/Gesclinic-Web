-- Add professional registration fields to professionals table
-- Migration: Add cremepe_crm, rqe and address fields

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS cremepe_crm TEXT,
ADD COLUMN IF NOT EXISTS rqe TEXT,
ADD COLUMN IF NOT EXISTS commercial_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state VARCHAR(2),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- Add comments
COMMENT ON COLUMN professionals.cremepe_crm IS 'Número do Conselho/CRM do profissional';
COMMENT ON COLUMN professionals.rqe IS 'Número RQE do profissional';
COMMENT ON COLUMN professionals.commercial_address IS 'Endereço comercial do profissional';
COMMENT ON COLUMN professionals.city IS 'Cidade do profissional';
COMMENT ON COLUMN professionals.state IS 'Estado (UF) do profissional';
COMMENT ON COLUMN professionals.zip_code IS 'CEP do profissional';
