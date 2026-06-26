-- Add XML support fields to ap_bills for automatic extraction
-- Mirrors the setup in ar_invoices for consistency across receivables and payables

ALTER TABLE ap_bills
ADD COLUMN IF NOT EXISTS guide_number TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ap_bills.guide_number IS 'Invoice/NF number extracted from XML or entered manually. Primary source for NF identification in payables.';
COMMENT ON COLUMN ap_bills.metadata IS 'JSON metadata including XML extraction fields, document extraction results, fiscal review status, and other enrichment data.';

-- Create index for faster lookups and deduplication
CREATE INDEX IF NOT EXISTS idx_ap_bills_guide_number ON ap_bills(clinic_id, guide_number)
WHERE guide_number IS NOT NULL;

-- Create index for metadata searches
CREATE INDEX IF NOT EXISTS idx_ap_bills_metadata ON ap_bills USING GIN(metadata);

-- Update display to prefer XML-extracted guide_number over document_number
-- This ensures NF is always read from XML when available
