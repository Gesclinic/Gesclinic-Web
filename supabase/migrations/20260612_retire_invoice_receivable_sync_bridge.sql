-- ============================================
-- Aposenta ponte ar_invoices -> ar_receivables
-- ============================================
-- Data: 2026-06-12
-- Objetivo:
-- - Impedir duplicacao de recebiveis canonicos em tabelas legadas.
-- - Manter ar_invoices como fonte operacional unica.

DROP TRIGGER IF EXISTS tr_sync_invoice_to_receivables ON public.ar_invoices;
DROP FUNCTION IF EXISTS public.trigger_sync_invoice_to_receivables();
DROP FUNCTION IF EXISTS public.sync_invoices_to_receivables();

CREATE OR REPLACE FUNCTION public.sync_invoices_to_receivables()
RETURNS TABLE (inserted_count INT, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT 0, 'Ponte desativada: ar_invoices e a fonte canonica de recebiveis.'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.sync_invoices_to_receivables IS
  'Compatibilidade: ponte ar_invoices -> ar_receivables desativada para evitar duplicacao de recebiveis canonicos.';