-- Add created_by column to appointments table
-- This column tracks which user created each appointment

ALTER TABLE appointments 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX idx_appointments_created_by ON appointments(created_by);

-- Comment on column
COMMENT ON COLUMN appointments.created_by IS 'User ID who created this appointment';
