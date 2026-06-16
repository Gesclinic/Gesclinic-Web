-- Create email_queue table and related infrastructure
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  scheduled_job_id UUID REFERENCES scheduled_jobs(id),
  metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_clinic ON email_queue(clinic_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_pending ON email_queue(status, created_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see emails for their clinic
CREATE POLICY "email_queue_clinic_isolation"
ON email_queue
FOR ALL
USING (
  clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles
    WHERE user_id = auth.uid()
  )
);

-- Create email_logs table for historical records
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_queue_id UUID REFERENCES email_queue(id),
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON email_logs(resend_id);

-- Grant proper permissions
GRANT SELECT ON email_queue TO authenticated;
GRANT INSERT ON email_queue TO authenticated;
GRANT UPDATE ON email_queue TO authenticated;
GRANT SELECT ON email_logs TO authenticated;
