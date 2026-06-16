-- Drop existing RLS policies
DROP POLICY IF EXISTS card_processors_select ON card_processors;
DROP POLICY IF EXISTS card_processors_insert ON card_processors;
DROP POLICY IF EXISTS card_processors_update ON card_processors;
DROP POLICY IF EXISTS card_processors_delete ON card_processors;

-- Create new RLS policies that look up clinic_id from users table
CREATE POLICY card_processors_select ON card_processors
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY card_processors_insert ON card_processors
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY card_processors_update ON card_processors
  FOR UPDATE USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY card_processors_delete ON card_processors
  FOR DELETE USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'card_processors' ORDER BY policyname;
