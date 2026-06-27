-- ============================================================================
-- MIGRATION: 20260626_add_service_group_to_ar_invoices.sql
-- PURPOSE: Store the operational service group for Accounts Receivable rows
--          (for example: Consulta, Exame, Procedimento).
-- ============================================================================

ALTER TABLE public.ar_invoices
  ADD COLUMN IF NOT EXISTS service_group text;

COMMENT ON COLUMN public.ar_invoices.service_group IS 'Grupo operacional do serviço no contas a receber, ex: Consulta, Exame, Procedimento.';

CREATE INDEX IF NOT EXISTS idx_ar_invoices_service_group
  ON public.ar_invoices(clinic_id, service_group)
  WHERE service_group IS NOT NULL;