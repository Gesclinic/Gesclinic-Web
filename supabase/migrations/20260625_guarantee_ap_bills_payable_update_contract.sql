-- ============================================================
-- GARANTIA CONTRATUAL ap_bills - CAMPOS DE EDICAO E PAGAMENTO
-- ============================================================
-- Idempotente: garante as colunas usadas pelo modulo moderno de Contas a Pagar.

ALTER TABLE public.ap_bills
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_stage TEXT DEFAULT 'LAUNCHED',
ADD COLUMN IF NOT EXISTS approval_reason TEXT,
ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS canceled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_forecast BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

UPDATE public.ap_bills
SET payment_date = paid_at::date
WHERE payment_date IS NULL
  AND paid_at IS NOT NULL;

UPDATE public.ap_bills
SET paid_at = payment_date::timestamp + INTERVAL '12 hours'
WHERE paid_at IS NULL
  AND payment_date IS NOT NULL
  AND UPPER(COALESCE(status::text, '')) = 'PAID';

CREATE OR REPLACE FUNCTION public.sync_ap_bills_payment_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_date IS NULL AND NEW.paid_at IS NOT NULL THEN
    NEW.payment_date := NEW.paid_at::date;
  END IF;

  IF NEW.paid_at IS NULL
     AND NEW.payment_date IS NOT NULL
     AND UPPER(COALESCE(NEW.status::text, '')) = 'PAID' THEN
    NEW.paid_at := NEW.payment_date::timestamp + INTERVAL '12 hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ap_bills_payment_dates ON public.ap_bills;

CREATE TRIGGER trg_sync_ap_bills_payment_dates
BEFORE INSERT OR UPDATE OF payment_date, paid_at, status ON public.ap_bills
FOR EACH ROW
EXECUTE FUNCTION public.sync_ap_bills_payment_dates();

CREATE INDEX IF NOT EXISTS idx_ap_bills_payment_date
ON public.ap_bills(clinic_id, payment_date)
WHERE payment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ap_bills_paid_at
ON public.ap_bills(clinic_id, paid_at)
WHERE paid_at IS NOT NULL;