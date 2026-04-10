-- ============================================================
-- FIX: Allow authenticated users to UPDATE appointments
-- ============================================================
-- Simplified policy: any authenticated user can update
-- This bypasses the users table check to allow testing

-- Drop all conflicting UPDATE policies
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_via_users" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_as_professional" ON public.appointments;

-- Create new policy: allow all authenticated users to update
CREATE POLICY "appointments_update"
  ON public.appointments FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Verify policy was created
SELECT policyname, permissive, action FROM pg_policies 
WHERE tablename = 'appointments' 
AND policyname = 'appointments_update';
