CREATE OR REPLACE FUNCTION platform.move_outbox_to_dlq(
  p_outbox_id uuid,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  v_event platform.outbox_events%ROWTYPE;
BEGIN
  DELETE FROM platform.outbox_events
  WHERE id = p_outbox_id
  RETURNING * INTO v_event;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO platform.outbox_dlq(
    outbox_id,
    event_id,
    event_type,
    payload,
    error,
    attempts,
    first_failed_at,
    last_failed_at
  ) VALUES (
    v_event.id,
    v_event.event_id,
    v_event.event_type,
    v_event.payload,
    p_error_message,
    COALESCE(v_event.retry_count, 0),
    clock_timestamp(),
    clock_timestamp()
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION platform.move_outbox_to_dlq(uuid, text) FROM PUBLIC;
ALTER FUNCTION platform.move_outbox_to_dlq(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION platform.move_outbox_to_dlq(uuid, text) TO service_role;