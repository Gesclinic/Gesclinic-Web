GRANT USAGE ON SCHEMA platform TO service_role;
GRANT USAGE ON SCHEMA platform TO platform_worker;

ALTER TABLE platform.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.outbox_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.processed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.worker_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.event_schemas ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON platform.audit_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.outbox_events TO service_role;
GRANT SELECT ON platform.outbox_dlq TO service_role;
GRANT SELECT, INSERT ON platform.processed_events TO service_role;
GRANT SELECT ON platform.worker_leases TO service_role;
GRANT SELECT ON platform.event_schemas TO service_role;

REVOKE ALL ON platform.audit_events FROM anon, authenticated;
REVOKE ALL ON platform.outbox_events FROM anon, authenticated;
REVOKE ALL ON platform.outbox_dlq FROM anon, authenticated;
REVOKE ALL ON platform.processed_events FROM anon, authenticated;
REVOKE ALL ON platform.worker_leases FROM anon, authenticated;
REVOKE ALL ON platform.event_schemas FROM anon, authenticated;