-- Migration: create function to append audit event with hash chain atomically
CREATE OR REPLACE FUNCTION platform.append_audit_event(
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
  p_key_version text
)
RETURNS TABLE(id uuid, new_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = platform, public
AS $$
DECLARE
  prev_hash text;
  canonical text;
  h text;
  v_id uuid;
BEGIN
  SELECT previous_hash INTO prev_hash FROM platform.audit_events WHERE tenant_id = p_tenant_id ORDER BY created_at DESC LIMIT 1;
  -- canonicalize payload + metadata + event_type + event_id
  canonical := encode(digest(coalesce(p_payload::text, '') || coalesce(p_metadata::text, '') || p_event_type || coalesce(p_event_id::text, ''), 'sha256'), 'hex');
  h := encode(digest(coalesce(prev_hash, '') || canonical, 'sha256'), 'hex');

  -- Insert including previous_hash; set hmac in a single follow-up using an unambiguous variable
  INSERT INTO platform.audit_events(event_type, event_id, payload, metadata, tenant_id, clinic_id, actor_id, ip, user_agent, correlation_id, request_id, key_version, previous_hash, created_at)
  VALUES (p_event_type, p_event_id, p_payload, p_metadata, p_tenant_id, p_clinic_id, p_actor_id, p_ip, p_user_agent, p_correlation_id, p_request_id, p_key_version, prev_hash, now()) RETURNING id INTO v_id;

  -- store computed hash in a deterministic way referencing the inserted id variable
  UPDATE platform.audit_events SET hmac = h WHERE id = v_id;

  RETURN QUERY SELECT v_id, h;
END;
$$;

-- Grant execute to service roles only (adjust roles per deployment)
GRANT EXECUTE ON FUNCTION platform.append_audit_event(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text) TO service_role;

-- Ensure function ownership is set to a privileged role to avoid surprises on deploys
ALTER FUNCTION platform.append_audit_event(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text) OWNER TO postgres;
