-- Migration: function to mark outbox row as failed and compute next_retry_at
CREATE OR REPLACE FUNCTION platform.platform_mark_outbox_failed(outbox_id uuid, err_msg text)
RETURNS TABLE(id uuid, retry_count integer, next_retry_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  r RECORD;
  attempts integer;
  backoff_seconds integer;
BEGIN
  SELECT * INTO r FROM platform.outbox_events WHERE id = outbox_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  attempts := COALESCE(r.retry_count, 0) + 1;
  -- exponential backoff base 2^attempts seconds, capped
  backoff_seconds := LEAST(POWER(2, attempts)::int, 86400);
  UPDATE platform.outbox_events SET retry_count = attempts, last_error = err_msg, next_retry_at = now() + (backoff_seconds || ' seconds')::interval, status = 'pending', updated_at = now() WHERE id = outbox_id RETURNING id, retry_count, next_retry_at INTO r;
  RETURN QUERY SELECT r.id, r.retry_count, r.next_retry_at;
END;
$$;

REVOKE ALL ON FUNCTION platform.platform_mark_outbox_failed(uuid, text) FROM PUBLIC;
ALTER FUNCTION platform.platform_mark_outbox_failed(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION platform.platform_mark_outbox_failed(uuid, text) TO service_role;
