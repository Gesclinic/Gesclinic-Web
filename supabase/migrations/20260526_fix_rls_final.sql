-- FINAL FIX: Disable RLS on all audit tables
ALTER TABLE public.audit_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_alerts_persistent DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_events DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('audit_reports', 'audit_alerts_persistent', 'user_audit_events');
