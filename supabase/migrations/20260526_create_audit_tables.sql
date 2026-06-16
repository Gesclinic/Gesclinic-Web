-- Supabase Migration: Create audit-related tables for Option 5 integration
-- Creates persistent storage for audit reports, alerts, and user events

-- Table: audit_reports
-- Stores generated audit reports (daily/weekly/monthly breakdowns)
CREATE TABLE IF NOT EXISTS public.audit_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  user_id UUID,
  report_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  data JSONB NOT NULL, -- Report data: {totalActions, byActionType: {CREATED, UPDATED, DELETED}, byRole: {...}, ...}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_reports_clinic ON public.audit_reports(clinic_id);
CREATE INDEX idx_audit_reports_period ON public.audit_reports(period_start, period_end);
CREATE INDEX idx_audit_reports_user ON public.audit_reports(user_id);

-- Table: audit_alerts_persistent
-- Stores persistent alerts (critical deletions, rapid changes, etc.)
CREATE TABLE IF NOT EXISTS public.audit_alerts_persistent (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  alert_type VARCHAR(100) NOT NULL, -- 'MULTIPLE_DELETES', 'OUT_OF_HOURS', 'NEW_DELETOR', 'RAPID_CHANGES'
  severity VARCHAR(20) NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL, -- Additional context
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_alerts_clinic ON public.audit_alerts_persistent(clinic_id);
CREATE INDEX idx_audit_alerts_severity ON public.audit_alerts_persistent(severity);
CREATE INDEX idx_audit_alerts_created ON public.audit_alerts_persistent(created_at);
CREATE INDEX idx_audit_alerts_unread ON public.audit_alerts_persistent(read_at) WHERE read_at IS NULL;

-- Table: user_audit_events
-- Tracks user login/logout and session events for security auditing
CREATE TABLE IF NOT EXISTS public.user_audit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  user_id UUID,
  email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'SESSION_TIMEOUT'
  session_duration_seconds INT, -- Duration between LOGIN and LOGOUT
  details JSONB, -- Additional context: IP address, device, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_audit_events_clinic ON public.user_audit_events(clinic_id);
CREATE INDEX idx_user_audit_events_user ON public.user_audit_events(user_id);
CREATE INDEX idx_user_audit_events_created ON public.user_audit_events(created_at);
CREATE INDEX idx_user_audit_events_email ON public.user_audit_events(email);

-- Enable RLS for security
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_alerts_persistent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their clinic's data
CREATE POLICY "audit_reports_clinic_isolation" ON public.audit_reports
  FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM public.user_clinic_roles 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "audit_alerts_clinic_isolation" ON public.audit_alerts_persistent
  FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM public.user_clinic_roles 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "user_audit_events_clinic_isolation" ON public.user_audit_events
  FOR SELECT
  USING (clinic_id IN (
    SELECT clinic_id FROM public.user_clinic_roles 
    WHERE user_id = auth.uid()
  ));

-- Trigger to update updated_at on audit_reports
CREATE OR REPLACE FUNCTION update_audit_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_reports_updated_at
BEFORE UPDATE ON public.audit_reports
FOR EACH ROW
EXECUTE FUNCTION update_audit_reports_updated_at();

-- Enable Realtime for real-time syncing
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_alerts_persistent;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_audit_events;
