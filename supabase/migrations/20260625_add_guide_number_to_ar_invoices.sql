-- Add NF guide_number field to ar_invoices for XML extraction
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS guide_number TEXT;

COMMENT ON COLUMN ar_invoices.guide_number IS 'Invoice/NF number extracted from XML or entered manually. Primary source for NF identification in the system.';

-- Create index for faster lookups and deduplication
CREATE INDEX IF NOT EXISTS idx_ar_invoices_guide_number ON ar_invoices(clinic_id, guide_number)
WHERE guide_number IS NOT NULL;
