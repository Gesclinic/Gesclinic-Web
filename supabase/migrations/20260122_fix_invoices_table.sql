-- ============================================================
-- FIX INVOICES TABLE - Adicionar colunas faltantes
-- ============================================================

-- Adicionar colunas faltantes que a API espera
ALTER TABLE IF EXISTS public.invoices
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS issued_date DATE,
  ADD COLUMN IF NOT EXISTS paid_date DATE;

-- Sincronizar colunas derivadas
UPDATE public.invoices 
SET 
  total = amount,
  due_date = CAST(due_at AS DATE),
  issued_date = CAST(issued_at AS DATE),
  paid_date = CAST(paid_at AS DATE)
WHERE total IS NULL OR due_date IS NULL OR issued_date IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- Criar view para compatibilidade com queries legadas
CREATE OR REPLACE VIEW public.view_invoices_v1 AS
SELECT 
  id,
  clinic_id,
  invoice_number,
  COALESCE(description, '') AS description,
  amount,
  COALESCE(total, amount) AS total,
  patient_id,
  COALESCE(issued_date, CAST(issued_at AS DATE)) AS issued_date,
  COALESCE(due_date, CAST(due_at AS DATE)) AS due_date,
  COALESCE(paid_date, CAST(paid_at AS DATE)) AS paid_date,
  status,
  subscription_id,
  stripe_invoice_id,
  created_at,
  updated_at
FROM public.invoices;

SELECT 'invoices table fixed!' AS status;
