-- ============================================================================
-- Migration: Add Financial Plan Account Links
-- Date: 2026-07-20
-- Purpose: Persist management financial plan classification on receivables,
--          payables, and financial transactions used by cash flow.
-- ============================================================================

ALTER TABLE ar_invoices
  ADD COLUMN IF NOT EXISTS financial_plan_account_id UUID REFERENCES financial_plan_accounts(id) ON DELETE SET NULL;

ALTER TABLE ap_bills
  ADD COLUMN IF NOT EXISTS financial_plan_account_id UUID REFERENCES financial_plan_accounts(id) ON DELETE SET NULL;

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS financial_plan_account_id UUID REFERENCES financial_plan_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ar_invoices_financial_plan_account_id
  ON ar_invoices(financial_plan_account_id);

CREATE INDEX IF NOT EXISTS idx_ap_bills_financial_plan_account_id
  ON ap_bills(financial_plan_account_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_financial_plan_account_id
  ON financial_transactions(financial_plan_account_id);

COMMENT ON COLUMN ar_invoices.financial_plan_account_id IS 'Management financial plan account used by operational cash flow classification';
COMMENT ON COLUMN ap_bills.financial_plan_account_id IS 'Management financial plan account used by operational cash flow classification';
COMMENT ON COLUMN financial_transactions.financial_plan_account_id IS 'Management financial plan account used by operational cash flow classification';
