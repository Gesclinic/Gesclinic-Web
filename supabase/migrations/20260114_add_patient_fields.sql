-- ============================================================
-- ADD MISSING PATIENT FIELDS
-- ============================================================
-- Adds additional columns to patients table for:
-- - Contact info (cell_phone)
-- - Address details (street, number, neighborhood)
-- - Payment/Insurance info (payer_id, plan_id, insurance_id_number)
-- - Responsible person (responsible_name, responsible_relationship)
-- - Medical record and photo (record_number, photo_url)

ALTER TABLE patients ADD COLUMN IF NOT EXISTS cell_phone VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS number VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS payer_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_id_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS responsible_relationship VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS record_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_patients_cell_phone ON patients(cell_phone);
CREATE INDEX IF NOT EXISTS idx_patients_payer ON patients(payer_id);
CREATE INDEX IF NOT EXISTS idx_patients_plan ON patients(plan_id);
