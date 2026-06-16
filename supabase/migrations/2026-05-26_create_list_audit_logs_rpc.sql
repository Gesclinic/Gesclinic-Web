-- =====================================================================
-- 2026-05-26_create_list_audit_logs_rpc.sql
-- =====================================================================
-- RPC function to list audit logs with patient and professional details
-- =====================================================================

CREATE OR REPLACE FUNCTION list_audit_logs_with_details(
  p_clinic_id UUID,
  p_action_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  appointment_id UUID,
  action_type TEXT,
  performed_by UUID,
  performed_by_role TEXT,
  context JSONB,
  created_at TIMESTAMP,
  clinic_id UUID,
  patient_name TEXT,
  professional_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aal.id,
    aal.appointment_id,
    aal.action_type,
    aal.performed_by,
    aal.performed_by_role,
    aal.context,
    aal.created_at,
    aal.clinic_id,
    p.name as patient_name,
    prof.name as professional_name
  FROM public.appointment_audit_logs aal
  LEFT JOIN public.appointments a ON aal.appointment_id = a.id
  LEFT JOIN public.patients p ON a.patient_id = p.id
  LEFT JOIN public.professionals prof ON a.professional_id = prof.id
  WHERE aal.clinic_id = p_clinic_id
    AND (p_action_type IS NULL OR aal.action_type = p_action_type)
    AND (p_start_date IS NULL OR aal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR aal.created_at <= p_end_date)
  ORDER BY aal.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
