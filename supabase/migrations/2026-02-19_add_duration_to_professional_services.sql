-- Add duration column to professional_services table if it doesn't exist
ALTER TABLE professional_services 
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN professional_services.duration IS 'Duration of service in minutes (legacy/alias for duration_minutes)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_professional_services_duration ON professional_services(duration);
