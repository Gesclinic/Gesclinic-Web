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
SET search_path = platform, public
AS $$
DECLARE
  prev_sig text := p_previous_signature;
  new_id uuid;
BEGIN
  INSERT INTO platform.audit_events(event_type, event_id, payload, metadata, tenant_id, clinic_id, actor_id, ip, user_agent, correlation_id, request_id, key_version, signature, previous_signature, created_at)
  VALUES (p_event_type, p_event_id, p_payload, p_metadata, p_tenant_id, p_clinic_id, p_actor_id, p_ip, p_user_agent, p_correlation_id, p_request_id, p_key_version, p_signature, prev_sig, now()) RETURNING id INTO new_id;
  RETURN QUERY SELECT new_id;
END;
$$;

-- Restrict execute to service role only and fix ownership
GRANT EXECUTE ON FUNCTION platform.append_audit_event_v2(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text, text, text, text) TO service_role;
ALTER FUNCTION platform.append_audit_event_v2(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text, text, text, text) OWNER TO postgres;
