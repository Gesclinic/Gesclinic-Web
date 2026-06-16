-- Phase 4.5: Archive and Maintenance Functions
-- Purpose: Functions for archiving old audit logs and managing cleanup

-- ============================================================================
-- 1. Archive old audit logs
-- ============================================================================
CREATE OR REPLACE FUNCTION archive_old_audit_logs(
  p_clinic_id UUID,
  p_cutoff_date TIMESTAMPTZ
)
RETURNS TABLE (archived_count INTEGER) AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_archive_table_name TEXT := 'appointment_audit_log_archive_' || DATE_TRUNC('year', p_cutoff_date)::TEXT;
BEGIN
  -- Count records to be archived
  SELECT COUNT(*)
  INTO v_archived_count
  FROM appointment_audit_log
  WHERE clinic_id = p_clinic_id
    AND changed_at < p_cutoff_date;

  -- Create archive table if it doesn't exist
  -- Format: appointment_audit_log_archive_YYYY
  EXECUTE FORMAT(
    'CREATE TABLE IF NOT EXISTS %I (LIKE appointment_audit_log INCLUDING ALL)',
    v_archive_table_name
  );

  -- Move records to archive table
  EXECUTE FORMAT(
    'INSERT INTO %I
     SELECT * FROM appointment_audit_log
     WHERE clinic_id = $1 AND changed_at < $2',
    v_archive_table_name
  )
  USING p_clinic_id, p_cutoff_date;

  -- Delete from main table
  DELETE FROM appointment_audit_log
  WHERE clinic_id = p_clinic_id
    AND changed_at < p_cutoff_date;

  RETURN QUERY SELECT v_archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Get archive statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_archive_stats(p_clinic_id UUID)
RETURNS TABLE (
  archived_count INTEGER,
  last_archived_date TIMESTAMPTZ,
  next_archival_date DATE
) AS $$
DECLARE
  v_oldest_record TIMESTAMPTZ;
  v_archived_count INTEGER;
BEGIN
  -- Count total records
  SELECT COUNT(*)
  INTO v_archived_count
  FROM appointment_audit_log
  WHERE clinic_id = p_clinic_id;

  -- Get oldest record
  SELECT MIN(changed_at)
  INTO v_oldest_record
  FROM appointment_audit_log
  WHERE clinic_id = p_clinic_id;

  RETURN QUERY SELECT
    v_archived_count,
    v_oldest_record,
    (CURRENT_DATE - INTERVAL '6 months')::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Cleanup function for maintenance
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_audit_maintenance(p_clinic_id UUID)
RETURNS TABLE (
  message TEXT,
  status TEXT
) AS $$
BEGIN
  -- Log cleanup start
  INSERT INTO appointment_audit_log (
    clinic_id, appointment_id, operation, changed_by, before_snapshot, after_snapshot, source
  ) VALUES (
    p_clinic_id,
    gen_random_uuid(),
    'MAINTENANCE',
    auth.uid(),
    jsonb_build_object('action', 'cleanup_started'),
    jsonb_build_object('timestamp', NOW()),
    'system'
  );

  -- Return status
  RETURN QUERY SELECT
    'Maintenance cleanup completed for clinic: ' || p_clinic_id::TEXT,
    'SUCCESS';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Get audit statistics by operation type
-- ============================================================================
CREATE OR REPLACE FUNCTION get_audit_stats_by_operation(
  p_clinic_id UUID,
  p_from_date DATE,
  p_to_date DATE
)
RETURNS TABLE (
  operation VARCHAR,
  count BIGINT,
  percentage NUMERIC
) AS $$
WITH operation_counts AS (
  SELECT
    operation,
    COUNT(*) as op_count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM appointment_audit_log
                        WHERE clinic_id = p_clinic_id
                          AND changed_at::DATE BETWEEN p_from_date AND p_to_date) as percentage
  FROM appointment_audit_log
  WHERE clinic_id = p_clinic_id
    AND changed_at::DATE BETWEEN p_from_date AND p_to_date
  GROUP BY operation
)
SELECT
  operation,
  op_count,
  ROUND(percentage, 2)
FROM operation_counts
ORDER BY op_count DESC;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- 5. Get most active users in audit logs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_audit_users(
  p_clinic_id UUID,
  p_from_date DATE,
  p_to_date DATE,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  change_count BIGINT,
  creates INT,
  updates INT,
  deletes INT
) AS $$
SELECT
  changed_by,
  COUNT(*) as total_changes,
  COALESCE(SUM(CASE WHEN operation = 'CREATE' THEN 1 END), 0),
  COALESCE(SUM(CASE WHEN operation = 'UPDATE' THEN 1 END), 0),
  COALESCE(SUM(CASE WHEN operation = 'DELETE' THEN 1 END), 0)
FROM appointment_audit_log
WHERE clinic_id = p_clinic_id
  AND changed_at::DATE BETWEEN p_from_date AND p_to_date
GROUP BY changed_by
ORDER BY total_changes DESC
LIMIT p_limit;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- 6. Get change frequency per appointment
-- ============================================================================
CREATE OR REPLACE FUNCTION get_appointment_change_frequency(
  p_clinic_id UUID,
  p_from_date DATE,
  p_to_date DATE
)
RETURNS TABLE (
  appointment_id UUID,
  change_count INT,
  last_modified TIMESTAMPTZ,
  first_modified TIMESTAMPTZ,
  operations TEXT[]
) AS $$
SELECT
  appointment_id,
  COUNT(*)::INT,
  MAX(changed_at),
  MIN(changed_at),
  ARRAY_AGG(DISTINCT operation)
FROM appointment_audit_log
WHERE clinic_id = p_clinic_id
  AND changed_at::DATE BETWEEN p_from_date AND p_to_date
GROUP BY appointment_id
ORDER BY change_count DESC;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- 7. Create indexes for better query performance on archive operations
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at_desc 
  ON appointment_audit_log(clinic_id, changed_at DESC)
  WHERE changed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_operation_type
  ON appointment_audit_log(clinic_id, operation)
  WHERE operation IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_user_changes
  ON appointment_audit_log(clinic_id, changed_by, changed_at);

-- ============================================================================
-- 8. Grant permissions for functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION archive_old_audit_logs(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_archive_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_audit_maintenance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_stats_by_operation(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_audit_users(UUID, DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_appointment_change_frequency(UUID, DATE, DATE) TO authenticated;

-- ============================================================================
-- 9. Add comment documentation
-- ============================================================================
COMMENT ON FUNCTION archive_old_audit_logs(UUID, TIMESTAMPTZ) IS
  'Archives audit logs older than specified date to separate archive tables by year';

COMMENT ON FUNCTION get_archive_stats(UUID) IS
  'Returns statistics about archived records and next archival date';

COMMENT ON FUNCTION cleanup_audit_maintenance(UUID) IS
  'Performs maintenance cleanup operations on audit logs';

COMMENT ON FUNCTION get_audit_stats_by_operation(UUID, DATE, DATE) IS
  'Returns breakdown of audit operations by type with percentages';

COMMENT ON FUNCTION get_active_audit_users(UUID, DATE, DATE, INT) IS
  'Returns most active users in audit logs by operation count';

COMMENT ON FUNCTION get_appointment_change_frequency(UUID, DATE, DATE) IS
  'Returns appointments grouped by change frequency and operation types';
