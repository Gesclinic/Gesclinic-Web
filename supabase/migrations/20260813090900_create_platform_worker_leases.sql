-- Migration: create platform.worker_leases and helper functions for worker registration/lease

CREATE TABLE IF NOT EXISTS platform.worker_leases (
  worker_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name text NOT NULL,
  last_heartbeat timestamptz DEFAULT now(),
  lease_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION platform.register_worker(p_worker_name text, p_lease_seconds integer DEFAULT 30)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  wid uuid;
BEGIN
  IF NULLIF(BTRIM(p_worker_name), '') IS NULL THEN
    RAISE EXCEPTION 'worker name is required' USING ERRCODE = '22023';
  END IF;
  IF p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'lease seconds must be positive' USING ERRCODE = '22023';
  END IF;
  INSERT INTO platform.worker_leases(worker_name, last_heartbeat, lease_expires_at)
  VALUES (p_worker_name, clock_timestamp(), clock_timestamp() + make_interval(secs => p_lease_seconds))
  RETURNING worker_id INTO wid;
  RETURN wid;
END;
$$;

CREATE OR REPLACE FUNCTION platform.renew_worker_lease(p_worker_id uuid, p_lease_seconds integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
BEGIN
  IF p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'lease seconds must be positive' USING ERRCODE = '22023';
  END IF;
  UPDATE platform.worker_leases
  SET last_heartbeat = clock_timestamp(),
      lease_expires_at = clock_timestamp() + make_interval(secs => p_lease_seconds)
  WHERE worker_id = p_worker_id
    AND lease_expires_at > clock_timestamp();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION platform.release_worker(p_worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
BEGIN
  DELETE FROM platform.worker_leases WHERE worker_id = p_worker_id;
  RETURN FOUND;
END;
$$;

-- Create platform_worker role if not exists and grant minimal execute rights
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_worker') THEN
    EXECUTE 'CREATE ROLE platform_worker NOLOGIN';
  END IF;
EXCEPTION WHEN others THEN
  -- ignore role creation errors in read-only audit
  RAISE NOTICE 'role creation skipped or not permitted';
END$$;

REVOKE ALL ON FUNCTION platform.register_worker(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.renew_worker_lease(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform.release_worker(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.register_worker(text, integer) TO platform_worker;
GRANT EXECUTE ON FUNCTION platform.renew_worker_lease(uuid, integer) TO platform_worker;
GRANT EXECUTE ON FUNCTION platform.release_worker(uuid) TO platform_worker;

-- Ensure ownership is explicit (adjust if your deployment uses different privileged role)
ALTER FUNCTION platform.register_worker(text, integer) OWNER TO postgres;
ALTER FUNCTION platform.renew_worker_lease(uuid, integer) OWNER TO postgres;
ALTER FUNCTION platform.release_worker(uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION platform.cleanup_expired_worker_leases()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, platform
AS $$
DECLARE
  cnt integer := 0;
BEGIN
  DELETE FROM platform.worker_leases WHERE lease_expires_at IS NOT NULL AND lease_expires_at < now();
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

REVOKE ALL ON FUNCTION platform.cleanup_expired_worker_leases() FROM PUBLIC;
ALTER FUNCTION platform.cleanup_expired_worker_leases() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION platform.cleanup_expired_worker_leases() TO service_role;
