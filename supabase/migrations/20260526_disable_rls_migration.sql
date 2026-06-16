-- Temporarily disable RLS to allow migration
-- This should be re-enabled after migration completes

ALTER TABLE public.audit_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_alerts_persistent DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_events DISABLE ROW LEVEL SECURITY;
