-- Draft: Transactional RPCs for Appointment flows
-- NOTE: Do NOT apply automatically. Review before running in production.

CREATE OR REPLACE FUNCTION platform.appointment_create(
  p_payload jsonb,
  p_request_id uuid DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_trace_id text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  v_row RECORD;
  v_event_id uuid := gen_random_uuid();
  v_request_id uuid := coalesce(p_request_id, gen_random_uuid());
  v_correlation_id text := coalesce(p_correlation_id, gen_random_uuid()::text);
  v_occurred_at timestamptz := now();
BEGIN
  -- Insert business row (only mapping commonly used fields, keep flexible via JSONB)
  INSERT INTO public.appointments (
    clinic_id, patient_id, professional_id, service_id, room_id, scheduled_date, scheduled_time, end_time, status, notes, price, duration, created_at, updated_at
  ) VALUES (
    (p_payload->>'clinic_id')::uuid,
    NULLIF(p_payload->>'patient_id','')::uuid,
    NULLIF(p_payload->>'professional_id','')::uuid,
    NULLIF(p_payload->>'service_id','')::uuid,
    NULLIF(p_payload->>'room_id','')::uuid,
    NULLIF(p_payload->>'scheduled_date','')::date,
    NULLIF(p_payload->>'scheduled_time','')::time,
    NULLIF(p_payload->>'end_time','')::time,
    COALESCE(p_payload->>'status', 'scheduled'),
    (p_payload->>'notes'),
    (p_payload->>'price')::numeric,
    (p_payload->>'duration')::integer,
    now(), now()
  ) RETURNING * INTO v_row;

  -- Build event envelope (canonical fields required by platform)
  INSERT INTO platform.outbox_events(
    event_id, event_type, version, payload, metadata, tenant_id, clinic_id, correlation_id, request_id, actor_id, created_at, updated_at
  ) VALUES (
    v_event_id,
    'appointment.created',
    '1.0',
    to_jsonb(v_row),
    p_payload->'metadata',
    NULL,
    v_row.clinic_id,
    v_correlation_id,
    v_request_id,
    p_actor_id,
    v_occurred_at,
    v_occurred_at
  );

  -- Append audit event (v2 if available). Signature/algorithm left NULL (signing delegated elsewhere if needed)
  PERFORM platform.append_audit_event_v2(
    'appointment.created',
    v_event_id,
    to_jsonb(v_row),
    p_payload->'metadata',
    NULL, -- tenant
    v_row.clinic_id,
    p_actor_id,
    NULL,
    NULL,
    v_correlation_id,
    v_request_id,
    NULL, -- key_version
    NULL, -- signature
    NULL, -- algorithm
    NULL  -- previous_signature
  );

  RETURN to_jsonb(v_row);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- Update RPC: use existing safe update helper when appropriate
CREATE OR REPLACE FUNCTION platform.appointment_update(
  p_appointment_id uuid,
  p_payload jsonb,
  p_request_id uuid DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_trace_id text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  v_row RECORD;
  v_event_id uuid := gen_random_uuid();
  v_request_id uuid := coalesce(p_request_id, gen_random_uuid());
  v_correlation_id text := coalesce(p_correlation_id, gen_random_uuid()::text);
  v_occurred_at timestamptz := now();
BEGIN
  -- Prefer existing update_appointment_safe if concurrency control required
  v_row := NULL;
  -- Attempt safe update via existing helper if payload includes updated_at
  IF p_payload ? 'updated_at' THEN
    PERFORM public.update_appointment_safe(p_appointment_id, (p_payload->>'updated_at')::timestamptz, p_payload);
    -- read current row
    SELECT * INTO v_row FROM public.appointments WHERE id = p_appointment_id;
  ELSE
    UPDATE public.appointments
    SET
      patient_id = COALESCE(NULLIF(p_payload->>'patient_id','')::uuid, patient_id),
      professional_id = COALESCE(NULLIF(p_payload->>'professional_id','')::uuid, professional_id),
      service_id = COALESCE(NULLIF(p_payload->>'service_id','')::uuid, service_id),
      room_id = COALESCE(NULLIF(p_payload->>'room_id','')::uuid, room_id),
      scheduled_date = COALESCE(NULLIF(p_payload->>'scheduled_date','')::date, scheduled_date),
      scheduled_time = COALESCE(NULLIF(p_payload->>'scheduled_time','')::time, scheduled_time),
      end_time = COALESCE(NULLIF(p_payload->>'end_time','')::time, end_time),
      status = COALESCE(p_payload->>'status', status),
      notes = COALESCE(p_payload->>'notes', notes),
      updated_at = now()
    WHERE id = p_appointment_id
    RETURNING * INTO v_row;
  END IF;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Appointment not found: %', p_appointment_id;
  END IF;

  INSERT INTO platform.outbox_events(
    event_id, event_type, version, payload, metadata, tenant_id, clinic_id, correlation_id, request_id, actor_id, created_at, updated_at
  ) VALUES (
    v_event_id,
    'appointment.updated',
    '1.0',
    to_jsonb(v_row),
    p_payload->'metadata',
    NULL,
    v_row.clinic_id,
    v_correlation_id,
    v_request_id,
    p_actor_id,
    v_occurred_at,
    v_occurred_at
  );

  PERFORM platform.append_audit_event_v2(
    'appointment.updated',
    v_event_id,
    to_jsonb(v_row),
    p_payload->'metadata',
    NULL,
    v_row.clinic_id,
    p_actor_id,
    NULL,
    NULL,
    v_correlation_id,
    v_request_id,
    NULL,
    NULL,
    NULL,
    NULL
  );

  RETURN to_jsonb(v_row);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION platform.appointment_cancel(
  p_appointment_id uuid,
  p_reason text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_trace_id text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  v_row RECORD;
  v_event_id uuid := gen_random_uuid();
  v_request_id uuid := coalesce(p_request_id, gen_random_uuid());
  v_correlation_id text := coalesce(p_correlation_id, gen_random_uuid()::text);
  v_occurred_at timestamptz := now();
BEGIN
  UPDATE public.appointments
  SET status = 'canceled', notes = COALESCE(notes, '') || '\nCanceled reason: ' || COALESCE(p_reason,''), updated_at = now()
  WHERE id = p_appointment_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found: %', p_appointment_id;
  END IF;

  INSERT INTO platform.outbox_events(
    event_id, event_type, version, payload, metadata, tenant_id, clinic_id, correlation_id, request_id, actor_id, created_at, updated_at
  ) VALUES (
    v_event_id,
    'appointment.canceled',
    '1.0',
    to_jsonb(v_row),
    jsonb_build_object('reason', p_reason),
    NULL,
    v_row.clinic_id,
    v_correlation_id,
    v_request_id,
    p_actor_id,
    v_occurred_at,
    v_occurred_at
  );

  PERFORM platform.append_audit_event_v2(
    'appointment.canceled',
    v_event_id,
    to_jsonb(v_row),
    jsonb_build_object('reason', p_reason),
    NULL,
    v_row.clinic_id,
    p_actor_id,
    NULL,
    NULL,
    v_correlation_id,
    v_request_id,
    NULL,
    NULL,
    NULL,
    NULL
  );

  RETURN to_jsonb(v_row);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION platform.appointment_create(jsonb, uuid, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.appointment_update(uuid, jsonb, uuid, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.appointment_cancel(uuid, text, uuid, text, text, uuid) FROM PUBLIC;

ALTER FUNCTION platform.appointment_create(jsonb, uuid, text, text, uuid) OWNER TO postgres;
ALTER FUNCTION platform.appointment_update(uuid, jsonb, uuid, text, text, uuid) OWNER TO postgres;
ALTER FUNCTION platform.appointment_cancel(uuid, text, uuid, text, text, uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION platform.appointment_create(jsonb, uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION platform.appointment_update(uuid, jsonb, uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION platform.appointment_cancel(uuid, text, uuid, text, text, uuid) TO service_role;
