-- Create platform schema and infrastructure tables for feature flags, api keys and audit
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Feature flags table
CREATE TABLE IF NOT EXISTS platform.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- API keys table (minimal). Do NOT store secrets in plaintext in production.
CREATE TABLE IF NOT EXISTS platform.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  revoked boolean DEFAULT false
);

-- Audit events table
CREATE TABLE IF NOT EXISTS platform.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor jsonb,
  clinic_id uuid,
  tenant_id uuid,
  payload jsonb,
  request_id text,
  created_at timestamptz DEFAULT now()
);

-- Event contracts registry (optional)
CREATE TABLE IF NOT EXISTS platform.event_contracts (
  name text PRIMARY KEY,
  version text,
  schema jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_clinic_id ON platform.audit_events (clinic_id);
