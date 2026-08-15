-- Migration: create platform.outbox_dlq table

CREATE TABLE IF NOT EXISTS platform.outbox_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid NOT NULL,
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  error text,
  attempts integer DEFAULT 0,
  first_failed_at timestamptz DEFAULT now(),
  last_failed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_dlq_event_id ON platform.outbox_dlq (event_id);
