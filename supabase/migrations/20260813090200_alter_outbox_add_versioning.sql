-- Migration: add versioning columns to platform.outbox_events
ALTER TABLE IF EXISTS platform.outbox_events
  ADD COLUMN IF NOT EXISTS event_version text DEFAULT '1',
  ADD COLUMN IF NOT EXISTS schema_version text DEFAULT '1',
  ADD COLUMN IF NOT EXISTS producer_version text DEFAULT '1',
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_outbox_event_version ON platform.outbox_events (event_type, event_version);
