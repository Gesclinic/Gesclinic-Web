-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: AUDIT LOGGING DATABASE SCHEMA
-- ═════════════════════════════════════════════════════════════════════════════════
-- Clínica: Neuroclinica Cascavel LTDA
-- Clinic ID: dcee437c-fd14-463c-b25e-a318f5da60b7
-- Timezone: America/Sao_Paulo (UTC-3)
-- Date: 2026-05-06
-- ═════════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
--   Track all changes to appointments for audit trail, compliance, and debugging.
--   Enable realtime notifications for multi-user coordination.
--
-- TABLES TO CREATE:
--   1. appointment_audit_log - Complete change history
--   2. appointment_audit_summary - Daily summaries
-- ═════════════════════════════════════════════════════════════════════════════════

-- =========================================================================
-- TABLE 1: APPOINTMENT AUDIT LOG - Complete Change History
-- =========================================================================
-- Tracks EVERY change to appointments with full before/after snapshot

CREATE TABLE IF NOT EXISTS appointment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Record metadata
  clinic_id UUID,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Change tracking
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changed_by UUID, -- user_id (optional, for tracking who made change)
  
  -- Data snapshots
  before_snapshot JSONB, -- Complete appointment state before change
  after_snapshot JSONB, -- Complete appointment state after change
  changed_fields TEXT[], -- Array of field names that changed
  
  -- Additional context
  source VARCHAR(50), -- 'api', 'mobile', 'web', 'integration', 'system'
  ip_address INET, -- User IP address
  user_agent TEXT, -- Browser user agent
  
  -- Realtime markers
  synced_to_realtime BOOLEAN DEFAULT FALSE,
  realtime_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_audit_log_clinic_id ON appointment_audit_log(clinic_id);
CREATE INDEX idx_audit_log_appointment_id ON appointment_audit_log(appointment_id);
CREATE INDEX idx_audit_log_changed_at ON appointment_audit_log(changed_at DESC);
CREATE INDEX idx_audit_log_operation ON appointment_audit_log(operation);
CREATE INDEX idx_audit_log_changed_by ON appointment_audit_log(changed_by);

-- JSONB indexes for snapshot queries
CREATE INDEX idx_audit_log_before_snapshot ON appointment_audit_log USING GIN(before_snapshot);
CREATE INDEX idx_audit_log_after_snapshot ON appointment_audit_log USING GIN(after_snapshot);

-- Enable RLS
ALTER TABLE appointment_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clinic admins can view their clinic's audit logs
CREATE POLICY "clinic_admins_can_view_audit_logs"
  ON appointment_audit_log
  FOR SELECT
  USING (
    clinic_id = (auth.jwt() ->> 'clinic_id')::uuid
    OR clinic_id IS NULL
  );

-- =========================================================================
-- TABLE 2: APPOINTMENT AUDIT SUMMARY - Daily Statistics
-- =========================================================================
-- Pre-computed daily summaries for dashboard/reporting

CREATE TABLE IF NOT EXISTS appointment_audit_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  clinic_id UUID,
  summary_date DATE NOT NULL,
  
  -- Operation counts
  creates_count INT DEFAULT 0,
  updates_count INT DEFAULT 0,
  deletes_count INT DEFAULT 0,
  total_changes INT DEFAULT 0,
  
  -- Time range
  earliest_change TIMESTAMP WITH TIME ZONE,
  latest_change TIMESTAMP WITH TIME ZONE,
  
  -- User activity
  unique_users INT DEFAULT 0,
  unique_sources TEXT[], -- Array of sources used
  
  -- Data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(clinic_id, summary_date)
);

CREATE INDEX idx_audit_summary_clinic_id ON appointment_audit_summary(clinic_id);
CREATE INDEX idx_audit_summary_date ON appointment_audit_summary(summary_date DESC);

-- Enable RLS
ALTER TABLE appointment_audit_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_admins_can_view_summary"
  ON appointment_audit_summary
  FOR SELECT
  USING (
    clinic_id = (auth.jwt() ->> 'clinic_id')::uuid
    OR clinic_id IS NULL
  );

-- =========================================================================
-- FUNCTION 1: LOG APPOINTMENT CHANGE (Triggered on INSERT/UPDATE/DELETE)
-- =========================================================================
-- Automatically logs all changes to appointments table

CREATE OR REPLACE FUNCTION log_appointment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_operation VARCHAR(10);
  v_before_snapshot JSONB;
  v_after_snapshot JSONB;
  v_changed_fields TEXT[];
  v_clinic_id UUID;
BEGIN
  -- Determine operation type
  IF TG_OP = 'INSERT' THEN
    v_operation := 'CREATE';
    v_before_snapshot := NULL;
    v_after_snapshot := row_to_json(NEW);
    v_changed_fields := ARRAY(SELECT key FROM jsonb_object_keys(v_after_snapshot) AS key);
    v_clinic_id := NEW.clinic_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_operation := 'UPDATE';
    v_before_snapshot := row_to_json(OLD);
    v_after_snapshot := row_to_json(NEW);
    -- Get only changed fields
    v_changed_fields := ARRAY(
      SELECT key FROM (
        SELECT key FROM jsonb_object_keys(v_before_snapshot) AS key
        UNION
        SELECT key FROM jsonb_object_keys(v_after_snapshot) AS key
      ) AS all_keys
      WHERE v_before_snapshot ->> key IS DISTINCT FROM v_after_snapshot ->> key
    );
    v_clinic_id := NEW.clinic_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_operation := 'DELETE';
    v_before_snapshot := row_to_json(OLD);
    v_after_snapshot := NULL;
    v_changed_fields := ARRAY(SELECT key FROM jsonb_object_keys(v_before_snapshot) AS key);
    v_clinic_id := OLD.clinic_id;
  END IF;

  -- Insert audit log entry
  INSERT INTO appointment_audit_log (
    clinic_id,
    appointment_id,
    operation,
    changed_at,
    changed_by,
    before_snapshot,
    after_snapshot,
    changed_fields,
    source
  ) VALUES (
    v_clinic_id,
    COALESCE(NEW.id, OLD.id),
    v_operation,
    NOW(),
    auth.uid(), -- Current user ID from Supabase Auth
    v_before_snapshot,
    v_after_snapshot,
    v_changed_fields,
    'api' -- Default source (can be overridden in app)
  );

  -- Update daily summary (only if clinic_id is available)
  IF v_clinic_id IS NOT NULL THEN
    PERFORM update_audit_summary(v_clinic_id, v_operation);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- FUNCTION 2: UPDATE AUDIT SUMMARY - Maintains daily statistics
-- =========================================================================

CREATE OR REPLACE FUNCTION update_audit_summary(p_clinic_id UUID, p_operation VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_summary_date DATE := CURRENT_DATE;
BEGIN
  INSERT INTO appointment_audit_summary (
    clinic_id,
    summary_date,
    creates_count,
    updates_count,
    deletes_count,
    total_changes,
    earliest_change,
    latest_change,
    unique_users
  ) VALUES (
    p_clinic_id,
    v_summary_date,
    CASE WHEN p_operation = 'CREATE' THEN 1 ELSE 0 END,
    CASE WHEN p_operation = 'UPDATE' THEN 1 ELSE 0 END,
    CASE WHEN p_operation = 'DELETE' THEN 1 ELSE 0 END,
    1,
    NOW(),
    NOW(),
    1
  )
  ON CONFLICT (clinic_id, summary_date)
  DO UPDATE SET
    creates_count = appointment_audit_summary.creates_count + 
      CASE WHEN p_operation = 'CREATE' THEN 1 ELSE 0 END,
    updates_count = appointment_audit_summary.updates_count + 
      CASE WHEN p_operation = 'UPDATE' THEN 1 ELSE 0 END,
    deletes_count = appointment_audit_summary.deletes_count + 
      CASE WHEN p_operation = 'DELETE' THEN 1 ELSE 0 END,
    total_changes = appointment_audit_summary.total_changes + 1,
    latest_change = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- TRIGGER: Attach audit logging to appointments table
-- =========================================================================
-- IMPORTANT: This trigger must be created AFTER the appointments table exists
-- If trigger already exists, it will be replaced

DROP TRIGGER IF EXISTS trg_log_appointment_changes ON appointments;

CREATE TRIGGER trg_log_appointment_changes
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW
EXECUTE FUNCTION log_appointment_change();

-- =========================================================================
-- FUNCTION 3: GET APPOINTMENT AUDIT HISTORY
-- =========================================================================
-- Returns full change history for a specific appointment

CREATE OR REPLACE FUNCTION get_appointment_audit_history(
  p_appointment_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  operation VARCHAR,
  changed_at TIMESTAMP WITH TIME ZONE,
  changed_by UUID,
  changed_fields TEXT[],
  before_snapshot JSONB,
  after_snapshot JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.operation,
    al.changed_at,
    al.changed_by,
    al.changed_fields,
    al.before_snapshot,
    al.after_snapshot
  FROM appointment_audit_log al
  WHERE al.appointment_id = p_appointment_id
  ORDER BY al.changed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- FUNCTION 4: GET AUDIT SUMMARY FOR CLINIC
-- =========================================================================
-- Returns audit statistics for a clinic on a specific date

CREATE OR REPLACE FUNCTION get_audit_summary_for_clinic(
  p_clinic_id UUID,
  p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  summary_date DATE,
  creates_count INT,
  updates_count INT,
  deletes_count INT,
  total_changes INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aas.summary_date,
    aas.creates_count,
    aas.updates_count,
    aas.deletes_count,
    aas.total_changes
  FROM appointment_audit_summary aas
  WHERE aas.clinic_id = p_clinic_id
    AND aas.summary_date >= p_from_date
    AND aas.summary_date <= p_to_date
  ORDER BY aas.summary_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- SUMMARY
-- =========================================================================
-- Tables created:
--   ✅ appointment_audit_log - Track all changes
--   ✅ appointment_audit_summary - Daily statistics
--
-- Functions created:
--   ✅ log_appointment_change() - Automatic logging via trigger
--   ✅ update_audit_summary() - Update daily stats
--   ✅ get_appointment_audit_history() - Query change history
--   ✅ get_audit_summary_for_clinic() - Query statistics
--
-- Trigger created:
--   ✅ trg_log_appointment_changes - Fires on INSERT/UPDATE/DELETE
--
-- RLS Policies:
--   ✅ Clinic admins can view their clinic's audit logs
--
-- Indexes:
--   ✅ clinic_id, appointment_id, changed_at, operation, changed_by
--   ✅ JSONB indexes on snapshots for complex queries
--
-- Ready for Phase 4.2: TypeScript service layer
-- ═════════════════════════════════════════════════════════════════════════════════
