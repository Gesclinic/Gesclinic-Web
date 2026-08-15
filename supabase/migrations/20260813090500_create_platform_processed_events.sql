-- Migration: create platform.processed_events table
CREATE TABLE IF NOT EXISTS platform.processed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  consumer text NOT NULL,
  checksum text,
  processed_at timestamptz DEFAULT now(),
  execution_time_ms integer,
  status text,
  details jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_by_event_consumer ON platform.processed_events (event_id, consumer);
