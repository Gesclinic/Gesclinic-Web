-- ============================================================================
-- MIGRATION: 20260622_add_bank_statement_metadata.sql
-- PURPOSE: Add metadata column to store rich bank transaction details
-- ============================================================================

-- Add metadata column to conciliation_bank_statements
ALTER TABLE conciliation_bank_statements
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reference_hash VARCHAR(255);

-- Create index for deduplication check
CREATE INDEX IF NOT EXISTS idx_conciliation_statements_reference_hash 
  ON conciliation_bank_statements(clinic_id, bank_account_id, reference_hash);

-- Metadata structure example:
-- {
--   "raw_type": "CREDIT",
--   "raw_memo": "PIX transferência entrada",
--   "transaction_type": "credit",
--   "operation_type": "PIX|TED|BOLETO|TARIFA|CHEQUE|DEPOSITO",
--   "party_name": "Cliente X LTDA",
--   "party_account": "12345-6",
--   "party_bank": "001",
--   "party_agency": "0123",
--   "reference_number": "e1234567890123456789",
--   "bank_id": "e1234567890123456789",
--   "check_number": null,
--   "sequence_number": null,
--   "fee_amount": 0,
--   "channel": "PIX",
--   "posting_timestamp": "2026-06-22T14:30:45Z",
--   "end_balance": null,
--   "original_encoding": "utf-8"
-- }

COMMENT ON TABLE conciliation_bank_statements IS 
'Bank statements for reconciliation with enriched metadata for smart matching';

COMMENT ON COLUMN conciliation_bank_statements.metadata IS 
'JSON metadata containing operation type, parties, channels, etc for improved matching';

COMMENT ON COLUMN conciliation_bank_statements.reference_hash IS 
'SHA256 hash of (clinic_id, account_id, date, amount, reference_number) for deduplication';
