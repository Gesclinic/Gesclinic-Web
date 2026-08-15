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
SET search_path = pg_catalog, platform, extensions
AS $$
DECLARE
  prev_hash text;
  canonical text;
  h text;
  v_id uuid;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(COALESCE(p_tenant_id::text, p_clinic_id::text, 'global'), 0)
  );

  SELECT audit.hmac
  INTO prev_hash
  FROM platform.audit_events AS audit
  WHERE audit.tenant_id IS NOT DISTINCT FROM p_tenant_id
    AND audit.clinic_id IS NOT DISTINCT FROM p_clinic_id
  ORDER BY audit.created_at DESC, audit.id DESC
  LIMIT 1;

  -- canonicalize payload + metadata + event_type + event_id
  canonical := pg_catalog.encode(extensions.digest(
    COALESCE(p_payload, '{}'::jsonb)::text ||
    COALESCE(p_metadata, '{}'::jsonb)::text ||
    COALESCE(p_event_type, '') ||
    COALESCE(p_event_id::text, ''),
    'sha256'
  ), 'hex');
  h := pg_catalog.encode(extensions.digest(COALESCE(prev_hash, '') || canonical, 'sha256'), 'hex');

  INSERT INTO platform.audit_events AS inserted(event_type, event_id, payload, metadata, tenant_id, clinic_id, actor_id, ip, user_agent, correlation_id, request_id, key_version, previous_hash, hmac, created_at)
  VALUES (p_event_type, p_event_id, p_payload, p_metadata, p_tenant_id, p_clinic_id, p_actor_id, p_ip, p_user_agent, p_correlation_id, p_request_id, p_key_version, prev_hash, h, clock_timestamp())
  RETURNING inserted.id INTO v_id;

  RETURN QUERY SELECT v_id, h;
END;
$$;

-- Grant execute to service roles only (adjust roles per deployment)
REVOKE ALL ON FUNCTION platform.append_audit_event(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.append_audit_event(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text) TO service_role;

-- Ensure function ownership is set to a privileged role to avoid surprises on deploys
ALTER FUNCTION platform.append_audit_event(text, uuid, jsonb, jsonb, uuid, uuid, uuid, text, text, text, text, text) OWNER TO postgres;
