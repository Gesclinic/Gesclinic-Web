-- Add INSERT policies for audit tables to allow background migration

-- INSERT policy for audit_reports
-- Allow insert if user belongs to the clinic
CREATE POLICY "audit_reports_insert_policy" ON public.audit_reports
  FOR INSERT
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM public.user_clinic_roles 
    WHERE user_id = auth.uid()
  ));

-- INSERT policy for audit_alerts_persistent
-- Allow insert if user belongs to the clinic
CREATE POLICY "audit_alerts_insert_policy" ON public.audit_alerts_persistent
  FOR INSERT
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM public.user_clinic_roles 
    WHERE user_id = auth.uid()
  ));

-- INSERT policy for user_audit_events
-- Allow insert if user_id matches auth.uid() and clinic_id is accessible
CREATE POLICY "user_audit_events_insert_policy" ON public.user_audit_events
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Also add UPDATE policies for completeness
CREATE POLICY "audit_reports_update_policy" ON public.audit_reports
  FOR UPDATE
  USING (clinic_id IN (
    SELECT clinic_id FROM public.user_clinic_roles 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "audit_alerts_update_policy" ON public.audit_alerts_persistent
  FOR UPDATE
  USING (clinic_id IN (
    SELECT clinic_id FROM public.user_clinic_roles 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "user_audit_events_update_policy" ON public.user_audit_events
  FOR UPDATE
  USING (clinic_id IN (
    SELECT clinic_id FROM public.user_clinic_roles 
    WHERE user_id = auth.uid()
  ));
