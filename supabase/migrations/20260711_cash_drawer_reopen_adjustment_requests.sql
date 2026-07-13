ALTER TABLE cash_transfers
  DROP CONSTRAINT IF EXISTS cash_transfers_status_check;

ALTER TABLE cash_transfers
  ADD CONSTRAINT cash_transfers_status_check
  CHECK (status IN ('pending', 'pending_approval', 'confirmed', 'rejected', 'reversed'));

ALTER TABLE cash_transfers
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_timestamp TIMESTAMP,
  ADD COLUMN IF NOT EXISTS manager_signature TEXT,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_timestamp TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS cash_transfer_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES cash_transfers(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  action_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_drawer_adjustment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  drawer_id UUID NOT NULL REFERENCES cash_drawers(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('reopen', 'adjustment')),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  review_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cash_drawer_adjustment_requests_clinic_status
  ON cash_drawer_adjustment_requests(clinic_id, status);

CREATE INDEX IF NOT EXISTS idx_cash_drawer_adjustment_requests_drawer
  ON cash_drawer_adjustment_requests(drawer_id);

ALTER TABLE cash_transfer_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_adjustment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_transfer_audit_logs_clinic_access" ON cash_transfer_audit_logs;
CREATE POLICY "cash_transfer_audit_logs_clinic_access" ON cash_transfer_audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM cash_transfers ct
      JOIN users u ON u.clinic_id = ct.clinic_id
      WHERE ct.id = cash_transfer_audit_logs.transfer_id
        AND u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cash_drawer_adjustment_requests_clinic_access" ON cash_drawer_adjustment_requests;
DROP POLICY IF EXISTS "cash_drawer_adjustment_requests_select" ON cash_drawer_adjustment_requests;
DROP POLICY IF EXISTS "cash_drawer_adjustment_requests_insert" ON cash_drawer_adjustment_requests;
DROP POLICY IF EXISTS "cash_drawer_adjustment_requests_update" ON cash_drawer_adjustment_requests;

CREATE POLICY "cash_drawer_adjustment_requests_select" ON cash_drawer_adjustment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM cash_drawers cd
      WHERE cd.id = cash_drawer_adjustment_requests.drawer_id
        AND cd.clinic_id = cash_drawer_adjustment_requests.clinic_id
    )
  );

CREATE POLICY "cash_drawer_adjustment_requests_insert" ON cash_drawer_adjustment_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cash_drawers cd
      WHERE cd.id = drawer_id
        AND cd.clinic_id = clinic_id
    )
  );

CREATE POLICY "cash_drawer_adjustment_requests_update" ON cash_drawer_adjustment_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM cash_drawers cd
      WHERE cd.id = cash_drawer_adjustment_requests.drawer_id
        AND cd.clinic_id = cash_drawer_adjustment_requests.clinic_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cash_drawers cd
      WHERE cd.id = drawer_id
        AND cd.clinic_id = clinic_id
    )
  );
