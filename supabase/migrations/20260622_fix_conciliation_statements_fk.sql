-- Fix foreign key constraint on conciliation_bank_statements
-- Change from clinic_bank_accounts to financial_accounts

-- First, drop the old constraint
ALTER TABLE conciliation_bank_statements
DROP CONSTRAINT IF EXISTS conciliation_bank_statements_bank_account_id_fkey;

-- Add new constraint pointing to financial_accounts
ALTER TABLE conciliation_bank_statements
ADD CONSTRAINT conciliation_bank_statements_bank_account_id_fkey
FOREIGN KEY (bank_account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE;

-- Log the change
COMMENT ON CONSTRAINT conciliation_bank_statements_bank_account_id_fkey 
ON conciliation_bank_statements 
IS 'Foreign key now points to financial_accounts (real accounts) instead of clinic_bank_accounts (legacy)';
