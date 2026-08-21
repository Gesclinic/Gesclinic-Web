-- ============================================================================
-- Consolidated from 20260203_add_address_fields_to_professionals.sql
-- ============================================================================

-- Add address fields to professionals table
-- Migration: Add city, state, zip_code, commercial_address columns

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS commercial_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state VARCHAR(2),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- Add comment to table
COMMENT ON COLUMN professionals.commercial_address IS 'Endere├ºo comercial do profissional';
COMMENT ON COLUMN professionals.city IS 'Cidade do profissional';
COMMENT ON COLUMN professionals.state IS 'Estado (UF) do profissional';
COMMENT ON COLUMN professionals.zip_code IS 'CEP do profissional';

-- ============================================================================
-- Consolidated from 20260203_add_photo_columns.sql
-- ============================================================================

-- Add photo_url column to professionals table
-- Migration: Add photo_url, photo_path columns

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- Add comments
COMMENT ON COLUMN professionals.photo_url IS 'URL p├║blica da foto do profissional';
COMMENT ON COLUMN professionals.photo_path IS 'Caminho de armazenamento da foto no Storage';

-- ============================================================================
-- Consolidated from 20260203_add_professional_fields.sql
-- ============================================================================

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
COMMENT ON COLUMN professionals.cremepe_crm IS 'N├║mero do Conselho/CRM do profissional';
COMMENT ON COLUMN professionals.rqe IS 'N├║mero RQE do profissional';
COMMENT ON COLUMN professionals.commercial_address IS 'Endere├ºo comercial do profissional';
COMMENT ON COLUMN professionals.city IS 'Cidade do profissional';
COMMENT ON COLUMN professionals.state IS 'Estado (UF) do profissional';
COMMENT ON COLUMN professionals.zip_code IS 'CEP do profissional';
