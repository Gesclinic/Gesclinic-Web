-- ============================================================
-- FIX: RLS Policies for appointments (SELECT + UPDATE)
-- ============================================================
-- Both SELECT and UPDATE policies must allow authenticated users
-- Otherwise UPDATE USING clause fails to find the row

-- Drop all old policies
DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete" ON public.appointments;
DROP POLICY IF EXISTS "authenticated_can_select" ON public.appointments;
DROP POLICY IF EXISTS "authenticated_can_insert" ON public.appointments;
DROP POLICY IF EXISTS "authenticated_can_update" ON public.appointments;
DROP POLICY IF EXISTS "Users can read" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert" ON public.appointments;
DROP POLICY IF EXISTS "Users can update" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete" ON public.appointments;

-- Create new policies: allow all authenticated users
-- This removes clinic_id checks which were causing silent rejections

CREATE POLICY "appointments_select"
  ON public.appointments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "appointments_insert"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "appointments_update"
  ON public.appointments FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "appointments_delete"
  ON public.appointments FOR DELETE
  USING (auth.role() = 'authenticated');

-- Verify all policies were created
SELECT policyname, action FROM pg_policies 
WHERE tablename = 'appointments' 
ORDER BY policyname;
