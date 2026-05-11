-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Add clinic_id column to appointments table
-- ═════════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-06
-- Purpose: Ensure clinic_id column exists for audit logging system
-- ═════════════════════════════════════════════════════════════════════════════════

-- Check and add clinic_id column if it doesn't exist
DO $$ 
BEGIN
  -- Try to add the column
  BEGIN
    ALTER TABLE appointments 
    ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Column clinic_id added to appointments table';
  EXCEPTION 
    WHEN duplicate_column THEN 
      RAISE NOTICE 'Column clinic_id already exists on appointments table';
    WHEN OTHERS THEN 
      RAISE NOTICE 'Error adding clinic_id column: %', SQLERRM;
  END;
END $$;

-- Create index on clinic_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
  ON appointments(clinic_id);

-- ═════════════════════════════════════════════════════════════════════════════════
-- IMPORTANT NEXT STEP:
-- After this migration runs, you may need to backfill clinic_id values for existing
-- appointments by joining with related tables (patient, professional, etc.)
-- ═════════════════════════════════════════════════════════════════════════════════
