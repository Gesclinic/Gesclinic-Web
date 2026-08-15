-- Migration: append audit event v2 (accept external signature and algorithm)
CREATE OR REPLACE FUNCTION platform.append_audit_event_v2(
  p_event_type text,
  p_event_id uuid,
  p_payload jsonb,
  p_metadata jsonb,
  p_tenant_id uuid,
  p_clinic_id uuid,
  p_actor_id uuid,
  p_ip text,
  p_user_agent text,
  p_correlation_id text,
  p_request_id text,
  p_key_version text,
  p_signature text,
  p_algorithm text,
  p_previous_signature text
)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform, extensions
AS $$
DECLARE
  new_id uuid;
  new_hash text;
BEGIN
  SELECT appended.id, appended.new_hash
  INTO new_id, new_hash
  FROM platform.append_audit_event(
    p_event_type, p_event_id, p_payload, p_metadata, p_tenant_id,
    p_clinic_id, p_actor_id, p_ip, p_user_agent, p_correlation_id,
    p_request_id, p_key_version
  ) AS appended;

  UPDATE platform.audit_events AS audit
  SET signature = p_signature,
      algorithm = p_algorithm,
      previous_signature = p_previous_signature
  WHERE audit.id = new_id;

  RETURN QUERY SELECT new_id;
END;
$$;

-- Restrict execute to service role only and fix ownership
REVOKE ALL ON FUNCTION platform.append_audit_event_v2(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.append_audit_event_v2(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text, text, text, text) TO service_role;
ALTER FUNCTION platform.append_audit_event_v2(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text, text, text, text) OWNER TO postgres;
