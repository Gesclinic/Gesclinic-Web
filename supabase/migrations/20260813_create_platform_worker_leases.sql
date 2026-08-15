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
SET search_path = platform, public
AS $$
DECLARE
  wid uuid;
BEGIN
  INSERT INTO platform.worker_leases(worker_name, last_heartbeat, lease_expires_at)
  VALUES (p_worker_name, now(), now() + (p_lease_seconds || ' seconds')::interval)
  RETURNING worker_id INTO wid;
  RETURN wid;
END;
$$;

CREATE OR REPLACE FUNCTION platform.renew_worker_lease(p_worker_id uuid, p_lease_seconds integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = platform, public
AS $$
BEGIN
  UPDATE platform.worker_leases SET last_heartbeat = now(), lease_expires_at = now() + (p_lease_seconds || ' seconds')::interval WHERE worker_id = p_worker_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION platform.release_worker(p_worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = platform, public
AS $$
BEGIN
  DELETE FROM platform.worker_leases WHERE worker_id = p_worker_id;
  RETURN true;
END;
$$;

-- Create platform_worker role if not exists and grant minimal execute rights
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_worker') THEN
    PERFORM pg_catalog.create_role('platform_worker', '', false, false, false);
  END IF;
EXCEPTION WHEN others THEN
  -- ignore role creation errors in read-only audit
  RAISE NOTICE 'role creation skipped or not permitted';
END$$;

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
AS $$
DECLARE
  cnt integer := 0;
BEGIN
  DELETE FROM platform.worker_leases WHERE lease_expires_at IS NOT NULL AND lease_expires_at < now() RETURNING 1 INTO cnt;
  RETURN COALESCE(cnt, 0);
END;
$$;
