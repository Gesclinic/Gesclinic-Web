-- Migration: create platform.outbox_events table and claim function
-- NOTE: Do NOT apply automatically. Review before running in production.

CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  event_type text NOT NULL,
  version text NOT NULL,
  payload jsonb NOT NULL,
  metadata jsonb,
  tenant_id uuid,
  clinic_id uuid,
  correlation_id text,
  request_id text,
  actor_id uuid,
  retry_count integer DEFAULT 0,
  last_error text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  status text DEFAULT 'pending', -- pending, processing, delivered, failed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_created_at ON platform.outbox_events (created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_partition_created ON platform.outbox_events (clinic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_next_retry_at ON platform.outbox_events (next_retry_at) WHERE status = 'pending';

-- Function to claim next outbox event in a concurrency-safe way
CREATE OR REPLACE FUNCTION platform.claim_next_outbox_event(partition_key uuid DEFAULT NULL)
RETURNS TABLE(id uuid, event_id uuid, event_type text, version text, payload jsonb, metadata jsonb, tenant_id uuid, clinic_id uuid, correlation_id text, request_id text, actor_id uuid, retry_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  rec RECORD;
BEGIN
  LOOP
    -- Select a candidate row and lock it
    SELECT * INTO rec FROM platform.outbox_events
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= now())
      AND (partition_key IS NULL OR clinic_id = partition_key)
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN;
    END IF;

    -- mark as processing
    UPDATE platform.outbox_events SET status = 'processing', updated_at = now() WHERE id = rec.id;

    RETURN QUERY SELECT rec.id, rec.event_id, rec.event_type, rec.version, rec.payload, rec.metadata, rec.tenant_id, rec.clinic_id, rec.correlation_id, rec.request_id, rec.actor_id, rec.retry_count;
    RETURN;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION platform.claim_next_outbox_event(uuid) FROM PUBLIC;
ALTER FUNCTION platform.claim_next_outbox_event(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION platform.claim_next_outbox_event(uuid) TO service_role;
