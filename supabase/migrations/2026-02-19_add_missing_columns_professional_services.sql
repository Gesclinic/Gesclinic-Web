-- Add missing columns to professional_services table

-- Add duration column (in minutes)
ALTER TABLE professional_services 
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add duration_minutes column (in minutes)  
ALTER TABLE professional_services 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add comments to explain the columns
COMMENT ON COLUMN professional_services.duration IS 'Duration of service in minutes';
COMMENT ON COLUMN professional_services.duration_minutes IS 'Duration of service in minutes (preferred field)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_professional_services_duration ON professional_services(duration);
CREATE INDEX IF NOT EXISTS idx_professional_services_duration_minutes ON professional_services(duration_minutes);
