-- Add Portal XML Integration Fields to health_insurances table
-- Completes TISS/Portal integration with certificate, webhook, and submission policies

ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS portal_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS portal_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS portal_webhook_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS portal_api_key VARCHAR(500),
ADD COLUMN IF NOT EXISTS certificate_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS certificate_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS use_certificate BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS submission_format VARCHAR(50) DEFAULT 'xml', -- 'xml', 'zip', 'gzip'
ADD COLUMN IF NOT EXISTS response_format VARCHAR(50) DEFAULT 'xml', -- 'xml', 'json'
ADD COLUMN IF NOT EXISTS use_compression BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS max_daily_submissions INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_guides_per_submission INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS requires_manual_confirmation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS support_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS support_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS support_hours VARCHAR(100), -- "08:00-18:00", "24h"
ADD COLUMN IF NOT EXISTS enable_rps_generation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS portal_last_connection_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS portal_connection_status VARCHAR(50) DEFAULT 'untested'; -- 'untested', 'connected', 'failed', 'disconnected'

-- Create index for portal operations
CREATE INDEX IF NOT EXISTS idx_health_insurances_portal_enabled 
ON health_insurances(clinic_id, submission_method) 
WHERE tiss_enabled = TRUE;

-- Add audit column for portal operations logging
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS portal_config_updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS portal_config_updated_by VARCHAR(255);
