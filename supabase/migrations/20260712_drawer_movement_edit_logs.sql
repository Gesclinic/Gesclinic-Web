CREATE TABLE IF NOT EXISTS drawer_movement_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  drawer_id UUID NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
  movement_id UUID NOT NULL REFERENCES drawer_movements(id) ON DELETE CASCADE,
  edited_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  before_values JSONB DEFAULT '{}'::jsonb,
  after_values JSONB DEFAULT '{}'::jsonb,
  edited_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawer_movement_edit_logs_clinic
  ON drawer_movement_edit_logs(clinic_id, edited_at DESC);

CREATE INDEX IF NOT EXISTS idx_drawer_movement_edit_logs_movement
  ON drawer_movement_edit_logs(movement_id);

ALTER TABLE drawer_movement_edit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drawer_movement_edit_logs_clinic_access"
  ON drawer_movement_edit_logs;

CREATE POLICY "drawer_movement_edit_logs_clinic_access"
  ON drawer_movement_edit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM cash_drawers cd
      WHERE cd.id = drawer_movement_edit_logs.drawer_id
        AND cd.clinic_id = drawer_movement_edit_logs.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cash_drawers cd
      WHERE cd.id = drawer_id
        AND cd.clinic_id = clinic_id
    )
  );
