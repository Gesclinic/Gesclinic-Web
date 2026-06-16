-- STEP 1: Disable RLS entirely on card_processors table
ALTER TABLE card_processors DISABLE ROW LEVEL SECURITY;

-- STEP 2: Insert 6 initial operators
INSERT INTO card_processors (clinic_id, name, settlement_day, is_active, created_at, updated_at)
SELECT 
  (SELECT id FROM clinics LIMIT 1) as clinic_id,
  operator_name as name,
  settlement_day,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  VALUES 
    ('STONE', 1),
    ('PAGBANK', 1),
    ('PAGSEGURO', 15),
    ('MERCADO PAGO', 1),
    ('CIELO', 1),
    ('REDE', 1)
) AS operators(operator_name, settlement_day)
ON CONFLICT (clinic_id, name) DO NOTHING;

-- STEP 3: Re-enable RLS
ALTER TABLE card_processors ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop old broken policies
DROP POLICY IF EXISTS card_processors_select ON card_processors;
DROP POLICY IF EXISTS card_processors_insert ON card_processors;
DROP POLICY IF EXISTS card_processors_update ON card_processors;
DROP POLICY IF EXISTS card_processors_delete ON card_processors;

-- STEP 5: Create correct policies that look up clinic_id from users table
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

-- STEP 6: Verify
SELECT 'Policies after fix:' as status;
SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'card_processors' ORDER BY policyname;

SELECT 'Card processors count:' as status;
SELECT COUNT(*) FROM card_processors;

SELECT 'Sample data:' as status;
SELECT id, clinic_id, name, settlement_day FROM card_processors ORDER BY name;
