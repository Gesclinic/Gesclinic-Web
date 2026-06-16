-- Email Schedules Table Creation
CREATE TABLE IF NOT EXISTS email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  report_type VARCHAR(50) DEFAULT 'financial',
  frequency VARCHAR(50) NOT NULL,
  cron_expression VARCHAR(100),
  attach_pdf BOOLEAN DEFAULT true,
  attach_excel BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active',
  next_run TIMESTAMP WITH TIME ZONE,
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_schedules_clinic ON email_schedules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON email_schedules(status, next_run) WHERE status = 'active';

ALTER TABLE email_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_schedules_clinic_isolation" ON email_schedules 
  FOR ALL USING (clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON email_schedules TO authenticated;
