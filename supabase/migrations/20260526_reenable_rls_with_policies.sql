-- Re-enable RLS on audit tables with INSERT policies
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_alerts_persistent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_events ENABLE ROW LEVEL SECURITY;

-- Create INSERT policies
CREATE POLICY "audit_reports_insert" ON public.audit_reports 
  FOR INSERT 
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()));

CREATE POLICY "audit_alerts_insert" ON public.audit_alerts_persistent 
  FOR INSERT 
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()));

CREATE POLICY "user_events_insert" ON public.user_audit_events 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid() AND clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()));
