-- ============================================================
-- FIX: Appointments UPDATE RLS Policy - Add WITH CHECK clause
-- ============================================================
-- Issue: UPDATE operations are silently failing because RLS policy lacks WITH CHECK
-- This causes updateResult: [] (empty array) even though updateError is null
-- The UPDATE is being rejected at database level, not application level

-- Drop the incomplete UPDATE policy
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;

-- Recreate with proper WITH CHECK clause
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

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'appointments_update';
