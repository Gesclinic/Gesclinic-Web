-- ============================================================
-- DIAGNOSTIC: Disable RLS temporarily to test UPDATE
-- ============================================================
-- If UPDATE works without RLS, problem is the policy
-- If UPDATE fails even without RLS, problem is constraint/trigger

-- Disable RLS on appointments table
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;

-- Now test: any UPDATE should work
-- Try to update a test appointment manually in the SQL editor:
-- UPDATE appointments SET scheduled_date = '2026-03-05' 
-- WHERE id = '5bae42ff-d0a0-4330-84ba-7fab58ad6dc7';

-- Then SELECT to verify it changed:
SELECT id, scheduled_date, scheduled_time FROM appointments 
WHERE id = '5bae42ff-d0a0-4330-84ba-7fab58ad6dc7';

-- If UPDATE works here, re-enable RLS and fix the policy
-- ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
