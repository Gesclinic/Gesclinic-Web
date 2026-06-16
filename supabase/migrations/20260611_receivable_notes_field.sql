-- ============================================================================
-- MIGRATION: 20260611_receivable_notes_field.sql
-- PURPOSE: Campo enterprise de observacoes em Contas a Receber sem duplicar tabela
-- ============================================================================

ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN ar_invoices.notes IS 'Observacoes financeiras, operacionais ou de auditoria do recebivel.';
