-- Fix RLS policy for appointment_items that was accessing auth.users
-- The original policy was causing "permission denied for table users" errors
-- Replace with policy using user_clinic_roles join

DROP POLICY IF EXISTS "see_appointment_items" ON appointment_items;

CREATE POLICY "see_appointment_items" ON appointment_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_clinic_roles ucr ON (a.clinic_id = ucr.clinic_id)
      WHERE a.id = appointment_items.appointment_id
        AND ucr.user_id = auth.uid()
    )
  );
