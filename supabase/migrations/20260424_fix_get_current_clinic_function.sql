-- =================================================================
-- FIX: get_current_clinic() function
-- Purpose: Return clinic_id for authenticated user, NEVER throw exception
-- Date: 2026-04-24
-- =================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.get_current_clinic() CASCADE;

-- Create improved version that never throws
CREATE OR REPLACE FUNCTION public.get_current_clinic()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  clinic uuid;
BEGIN
  -- Get clinic_id for authenticated user
  SELECT clinic_id INTO clinic
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;

  -- IMPORTANT: Always return (even NULL if not found)
  -- This prevents "unexpected null value" errors
  RETURN clinic;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_clinic() TO authenticated;

-- =================================================================
-- VERIFICATION QUERIES (run after migration)
-- =================================================================
-- Check function exists:
-- SELECT exists (
--   SELECT 1 FROM pg_proc 
--   WHERE proname = 'get_current_clinic'
-- );

-- Test function (must be authenticated):
-- SELECT get_current_clinic();

-- =================================================================
