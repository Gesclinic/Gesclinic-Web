-- ============================================================================
-- MIGRATION: 20260613_add_ar_card_reconciliation_fields.sql
-- PURPOSE: Campos minimos para futura conciliacao de cartoes em contas a receber
-- DATE: 2026-06-13
-- ============================================================================

ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4);

CREATE INDEX IF NOT EXISTS idx_ar_invoices_card_reconciliation
  ON ar_invoices(clinic_id, processor_id, card_brand, card_last4, received_date)
  WHERE card_last4 IS NOT NULL;

COMMENT ON COLUMN ar_invoices.card_last4 IS 'Ultimos 4 digitos do cartao, usados para conciliacao com extratos/relatorios de operadoras';

DO $$
BEGIN
  ALTER TABLE ar_invoices
    ADD CONSTRAINT check_ar_invoices_card_last4_digits CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
