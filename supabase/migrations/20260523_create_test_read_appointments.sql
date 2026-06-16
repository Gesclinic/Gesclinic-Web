-- Migration: Create test_read_appointments RPC function
-- Purpose: Test if admin user can read appointments for a specific clinic
-- Date: 2026-05-23

CREATE OR REPLACE FUNCTION test_read_appointments(p_clinic_id uuid)
RETURNS TABLE (
  total_count bigint,
  scheduled_count bigint,
  specific_appointment_exists boolean,
  sample_appointments json
) SECURITY INVOKER LANGUAGE sql AS $$
SELECT
  (SELECT COUNT(*) FROM appointments WHERE clinic_id = p_clinic_id),
  (SELECT COUNT(*) FROM appointments WHERE clinic_id = p_clinic_id AND status = 'scheduled'),
  EXISTS(SELECT 1 FROM appointments WHERE id = '75e578b5-7737-42f2-8008-c7a1d3746b83' AND clinic_id = p_clinic_id),
  json_agg(row_to_json(t)) FILTER (WHERE t.id IS NOT NULL)
FROM (
  SELECT id, status, scheduled_date, scheduled_time 
  FROM appointments 
  WHERE clinic_id = p_clinic_id 
  LIMIT 5
) t;
$$;
