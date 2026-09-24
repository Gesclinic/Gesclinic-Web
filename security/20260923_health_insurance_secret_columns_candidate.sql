-- CANDIDATE ONLY. Review and test against the isolated homologation schema.
-- This limits browser reads; it does not encrypt existing plaintext credentials.
-- Apply only after checking every health_insurances query and its RLS policies.
BEGIN;

DO $$
DECLARE
  all_columns text;
  allowed_columns text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'health_insurances'
      AND c.relkind IN ('r', 'p') AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'health_insurances must exist with RLS enabled before changing column grants';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'health_insurances'
  ) THEN
    RAISE EXCEPTION 'Review and install clinic scoped RLS policies first';
  END IF;

  SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum),
         string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum)
           FILTER (WHERE a.attname NOT IN (
             'tiss_password', 'portal_password', 'portal_api_key', 'certificate_password'
           ))
  INTO all_columns, allowed_columns
  FROM pg_attribute a
  WHERE a.attrelid = 'public.health_insurances'::regclass
    AND a.attnum > 0 AND NOT a.attisdropped;

  IF allowed_columns IS NULL THEN
    RAISE EXCEPTION 'No permitted health_insurances columns found';
  END IF;

  EXECUTE 'REVOKE SELECT ON TABLE public.health_insurances FROM PUBLIC, anon, authenticated';
  EXECUTE format('REVOKE SELECT (%s) ON TABLE public.health_insurances FROM PUBLIC, anon, authenticated', all_columns);
  EXECUTE format('GRANT SELECT (%s) ON TABLE public.health_insurances TO authenticated', allowed_columns);
END $$;

COMMIT;

-- Homologation acceptance: authenticated SELECT of normal fields succeeds only
-- for the caller's clinic; SELECT of each secret field and SELECT * fail for
-- both clinic admins and ordinary users; anon reads fail. Verify insert/update
-- and TISS server submission with fictitious credentials before production.
