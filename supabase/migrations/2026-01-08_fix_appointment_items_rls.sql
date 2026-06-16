-- Fix appointment_items RLS policies
DROP POLICY IF EXISTS "select_appointment_items" ON appointment_items;
DROP POLICY IF EXISTS "insert_appointment_items" ON appointment_items;
DROP POLICY IF EXISTS "update_appointment_items" ON appointment_items;
DROP POLICY IF EXISTS "delete_appointment_items" ON appointment_items;

CREATE POLICY "select_appointment_items"
  ON appointment_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_clinic_roles ucr ON a.clinic_id = ucr.clinic_id
      WHERE a.id = appointment_id
        AND ucr.user_id = auth.uid()
    )
  );

CREATE POLICY "insert_appointment_items"
  ON appointment_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_clinic_roles ucr ON a.clinic_id = ucr.clinic_id
      WHERE a.id = appointment_id
        AND ucr.user_id = auth.uid()
    )
  );

CREATE POLICY "update_appointment_items"
  ON appointment_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_clinic_roles ucr ON a.clinic_id = ucr.clinic_id
      WHERE a.id = appointment_id
        AND ucr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_clinic_roles ucr ON a.clinic_id = ucr.clinic_id
      WHERE a.id = appointment_id
        AND ucr.user_id = auth.uid()
    )
  );

CREATE POLICY "delete_appointment_items"
  ON appointment_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_clinic_roles ucr ON a.clinic_id = ucr.clinic_id
      WHERE a.id = appointment_id
        AND ucr.user_id = auth.uid()
    )
  );
