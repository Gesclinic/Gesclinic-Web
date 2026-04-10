-- FORCE: Disable RLS completely on repasse_config to allow all operations
-- This is a temporary fix to allow development/testing

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to select" ON repasse_config;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON repasse_config;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON repasse_config;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON repasse_config;
DROP POLICY IF EXISTS "Users can view repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can insert repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can update repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can delete repasse configs for their clinic" ON repasse_config;

-- DISABLE RLS completely
ALTER TABLE repasse_config DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
-- SELECT * FROM information_schema.tables WHERE table_name='repasse_config';
