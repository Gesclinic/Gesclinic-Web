-- Fix: Set created_by automatically to auth.uid() if not provided
-- This migration adds a trigger to ensure created_by is always set to the current authenticated user

-- Drop existing trigger if it exists (safe)
DROP TRIGGER IF EXISTS set_created_by_on_insert ON financial_accounts CASCADE;
DROP FUNCTION IF EXISTS set_created_by_on_insert() CASCADE;

-- Create function to set created_by to auth.uid()
CREATE FUNCTION set_created_by_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run before insert
CREATE TRIGGER set_created_by_on_insert
  BEFORE INSERT ON financial_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by_on_insert();

-- Similarly for audit table
DROP TRIGGER IF EXISTS set_changed_by_on_insert ON financial_accounts_audit CASCADE;
DROP FUNCTION IF EXISTS set_changed_by_on_insert() CASCADE;

CREATE FUNCTION set_changed_by_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.changed_by IS NULL THEN
    NEW.changed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_changed_by_on_insert
  BEFORE INSERT ON financial_accounts_audit
  FOR EACH ROW
  EXECUTE FUNCTION set_changed_by_on_insert();

-- Test: Verify the trigger is in place
SELECT 
  trigger_name, 
  event_object_table,
  event_manipulation
FROM information_schema.triggers 
WHERE event_object_table IN ('financial_accounts', 'financial_accounts_audit')
  AND trigger_name LIKE 'set_%_on_insert'
ORDER BY event_object_table;
