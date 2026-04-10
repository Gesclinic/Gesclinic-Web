-- Add missing timestamp columns to appointments table
-- These columns track when a professional starts and finishes an appointment

-- 1. Add started_at column (when professional begins service)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- 2. Add finished_at column (when professional finishes service)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

-- 3. Add updated_at column (last update timestamp - for general tracking)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Create index on updated_at for better query performance
CREATE INDEX IF NOT EXISTS appointments_updated_at_idx ON appointments(updated_at DESC);

-- 5. Create index on started_at and finished_at for analytics
CREATE INDEX IF NOT EXISTS appointments_started_at_idx ON appointments(started_at DESC);
CREATE INDEX IF NOT EXISTS appointments_finished_at_idx ON appointments(finished_at DESC);

-- 6. Optional: Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to avoid duplicate)
DROP TRIGGER IF EXISTS trigger_update_appointments_updated_at ON appointments;

-- Create the trigger
CREATE TRIGGER trigger_update_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_appointments_updated_at();

-- Add comment to document the columns
COMMENT ON COLUMN appointments.started_at IS 'Timestamp when professional starts service (status = in_service)';
COMMENT ON COLUMN appointments.finished_at IS 'Timestamp when professional finishes service (status = finished)';
COMMENT ON COLUMN appointments.updated_at IS 'Last update timestamp (automatically updated on any change)';
