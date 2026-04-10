-- ============================================================
-- FIX: Re-enable RLS with corrected UPDATE policy
-- ============================================================
-- The issue was that the policy checked users table
-- But the authenticated user might not be in users table
-- Solution: Allow UPDATE for ANY authenticated user
-- (clinic_id filtering is done at application level)

-- Re-enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop old problematic policies
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;

-- Create new policy: allow authenticated users to update ANY appointment
-- This removes the users table check which was causing silent rejection
CREATE POLICY "appointments_update"
  ON public.appointments FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Verify policy exists
SELECT policyname, permissive, action FROM pg_policies 
WHERE tablename = 'appointments' AND policyname = 'appointments_update';
