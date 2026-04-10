-- Add plan_id column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_plan_id ON appointments(plan_id);

-- Add comment
COMMENT ON COLUMN appointments.plan_id IS 'Foreign key to plans table - specific health plan for this appointment';
