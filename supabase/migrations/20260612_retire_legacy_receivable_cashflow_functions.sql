-- ============================================
-- Aposenta funcoes legadas de caixa de ar_receivables
-- ============================================
-- Data: 2026-06-12
-- Objetivo:
-- - Garantir que funcoes antigas de trigger nao gerem caixa a partir da tabela legada.
-- - Preservar compatibilidade de assinatura enquanto ar_invoices e receivable_payments seguem canonicos.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ar_receivables'
  ) THEN
    DROP TRIGGER IF EXISTS sync_cashflow_on_receivable_update ON public.ar_receivables;
    DROP TRIGGER IF EXISTS on_ar_receivable_paid_trg ON public.ar_receivables;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_cashflow_from_receivable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_cashflow_from_receivable IS
  'Compatibilidade: funcao legada de ar_receivables desativada. Fluxo de caixa usa recebiveis canonicos em ar_invoices/receivable_payments.';

CREATE OR REPLACE FUNCTION public.on_ar_receivable_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_ar_receivable_paid IS
  'Compatibilidade: funcao legada de ar_receivables desativada. Entradas de caixa devem vir das automacoes canonicas.';