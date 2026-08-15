CREATE TABLE IF NOT EXISTS platform.event_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  version text NOT NULL DEFAULT '1',
  schema_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, version)
);

CREATE INDEX IF NOT EXISTS idx_platform_event_schemas_type_version
  ON platform.event_schemas(event_type, version);