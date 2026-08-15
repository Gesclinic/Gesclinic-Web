-- Migration: create platform.audit_events table

CREATE TABLE IF NOT EXISTS platform.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_id uuid,
  payload jsonb,
  metadata jsonb,
  tenant_id uuid,
  clinic_id uuid,
  actor_id uuid,
  ip text,
  user_agent text,
  correlation_id text,
  request_id text,
  hmac text,
  key_version text,
  previous_hash text,
  signature text,
  algorithm text,
  previous_signature text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE platform.audit_events
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS hmac text,
  ADD COLUMN IF NOT EXISTS key_version text,
  ADD COLUMN IF NOT EXISTS previous_hash text,
  ADD COLUMN IF NOT EXISTS signature text,
  ADD COLUMN IF NOT EXISTS algorithm text,
  ADD COLUMN IF NOT EXISTS previous_signature text;

CREATE INDEX IF NOT EXISTS idx_audit_by_tenant ON platform.audit_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_by_clinic ON platform.audit_events (clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_chain ON platform.audit_events (tenant_id, clinic_id, created_at, id);
