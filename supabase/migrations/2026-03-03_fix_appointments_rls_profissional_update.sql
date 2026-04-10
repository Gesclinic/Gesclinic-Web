-- ============================================================
-- FIX: Appointments UPDATE RLS Policy - Allow Professional Updates
-- ============================================================
-- Issue: Professional trying to update appointment fails silently
-- Solution: Add policy allowing professionals to update their own appointments
-- OR update as admin/gestor for the clinic

-- First, check if policy exists and drop it
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_profissional" ON public.appointments;

-- FIXED POLICY: Allow updates if user is part of the clinic
-- Includes both USING and WITH CHECK to prevent silent RLS rejection
CREATE POLICY "appointments_update"
  ON public.appointments FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- Verify both policies exist
SELECT policyname, tablename FROM pg_policies 
WHERE tablename = 'appointments' 
AND policyname LIKE '%appointments_update%'
ORDER BY policyname;
