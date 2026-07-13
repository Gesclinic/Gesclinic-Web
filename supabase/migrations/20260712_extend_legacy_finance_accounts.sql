-- Extend legacy finance_accounts so the financial accounts screen can persist
-- the same fields shown in the edit form.

ALTER TABLE public.finance_accounts
  ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_chart_code TEXT,
  ADD COLUMN IF NOT EXISTS account_chart_name TEXT,
  ADD COLUMN IF NOT EXISTS balance_date DATE,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS participates_cashflow BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allows_reconciliation BOOLEAN DEFAULT TRUE;

UPDATE public.finance_accounts
SET
  initial_balance = COALESCE(initial_balance, 0),
  current_balance = COALESCE(current_balance, initial_balance, 0),
  credit_limit = COALESCE(credit_limit, 0),
  participates_cashflow = COALESCE(participates_cashflow, TRUE),
  allows_reconciliation = COALESCE(allows_reconciliation, TRUE)
WHERE clinic_id IS NOT NULL;
