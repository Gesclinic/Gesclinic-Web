-- ============================================================================
-- MIGRATION: 20260611_enterprise_receivables_evolution.sql
-- PURPOSE: Evolucao enterprise idempotente de Contas a Receber sem duplicar modulo
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE receivable_payment_method AS ENUM (
    'cash',
    'pix',
    'cartao_credito',
    'cartao_debito',
    'ted',
    'doc',
    'boleto',
    'convenio',
    'cheque',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS convenio_id UUID,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS guide_number TEXT,
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS procedure_id UUID,
ADD COLUMN IF NOT EXISTS procedure_name TEXT,
ADD COLUMN IF NOT EXISTS specialty_id UUID,
ADD COLUMN IF NOT EXISTS specialty_name TEXT,
ADD COLUMN IF NOT EXISTS unit_id UUID,
ADD COLUMN IF NOT EXISTS unit_name TEXT,
ADD COLUMN IF NOT EXISTS competency_date DATE,
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS glosa_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS taxes_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS repasse_expected NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS repasse_paid NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS repasse_percent NUMERIC(7, 4),
ADD COLUMN IF NOT EXISTS repasse_model TEXT,
ADD COLUMN IF NOT EXISTS paid_total NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS enterprise_status TEXT,
ADD COLUMN IF NOT EXISTS payment_split JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS glosa_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

UPDATE ar_invoices ai
SET
  gross_amount = COALESCE(
    ai.gross_amount,
    NULLIF(to_jsonb(ai)->>'amount', '')::numeric,
    NULLIF(to_jsonb(ai)->>'service_value', '')::numeric,
    0
  ),
  paid_total = COALESCE(
    ai.paid_total,
    NULLIF(to_jsonb(ai)->>'received_value', '')::numeric,
    0
  ),
  glosa_value = COALESCE(ai.glosa_value, 0),
  taxes_value = COALESCE(
    ai.taxes_value,
    NULLIF(to_jsonb(ai)->>'total_taxes', '')::numeric,
    NULLIF(to_jsonb(ai)->>'total_impostos', '')::numeric,
    0
  ),
  repasse_expected = COALESCE(
    ai.repasse_expected,
    NULLIF(to_jsonb(ai)->>'repasse_medico', '')::numeric,
    0
  ),
  repasse_paid = COALESCE(ai.repasse_paid, 0),
  balance_amount = GREATEST(
    COALESCE(
      NULLIF(to_jsonb(ai)->>'net_value', '')::numeric,
      NULLIF(to_jsonb(ai)->>'amount', '')::numeric,
      0
    )
    - COALESCE(
      NULLIF(to_jsonb(ai)->>'received_value', '')::numeric,
      ai.paid_total,
      0
    )
    - COALESCE(ai.glosa_value, 0),
    0
  ),
  enterprise_status = COALESCE(
    ai.enterprise_status,
    CASE
      WHEN lower(COALESCE(to_jsonb(ai)->>'status', '')) IN ('received', 'paid', 'recebido') THEN 'RECEBIDO'
      WHEN lower(COALESCE(to_jsonb(ai)->>'status', '')) IN ('partial', 'parcial') THEN 'PARCIAL'
      WHEN lower(COALESCE(to_jsonb(ai)->>'status', '')) IN ('glossed', 'glosado') THEN 'GLOSADO'
      WHEN lower(COALESCE(to_jsonb(ai)->>'status', '')) IN ('canceled', 'cancelado') THEN 'CANCELADO'
      WHEN NULLIF(to_jsonb(ai)->>'due_date', '')::date IS NOT NULL
        AND NULLIF(to_jsonb(ai)->>'due_date', '')::date < CURRENT_DATE
        AND lower(COALESCE(to_jsonb(ai)->>'status', '')) NOT IN ('received', 'paid', 'canceled', 'glossed') THEN 'VENCIDO'
      WHEN lower(COALESCE(to_jsonb(ai)->>'status', '')) IN ('planned', 'previsto') THEN 'PREVISTO'
      ELSE 'PENDENTE'
    END
  ),
  payment_split = COALESCE(ai.payment_split, '[]'::jsonb),
  glosa_metadata = COALESCE(ai.glosa_metadata, '{}'::jsonb),
  metadata = COALESCE(ai.metadata, '{}'::jsonb)
WHERE ai.enterprise_status IS NULL
  OR ai.gross_amount IS NULL
  OR ai.paid_total IS NULL
  OR ai.balance_amount IS NULL
  OR ai.payment_split IS NULL
  OR ai.metadata IS NULL;

CREATE INDEX IF NOT EXISTS idx_ar_invoices_enterprise_status ON ar_invoices(clinic_id, enterprise_status);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_competency_date ON ar_invoices(clinic_id, competency_date);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_convenio_id ON ar_invoices(clinic_id, convenio_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_company_id ON ar_invoices(clinic_id, company_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_unit_id ON ar_invoices(clinic_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_specialty_id ON ar_invoices(clinic_id, specialty_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_glosa_value ON ar_invoices(clinic_id, glosa_value);

CREATE TABLE IF NOT EXISTS receivable_payments (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  ar_invoice_id UUID,
  receivable_id BIGINT,
  installment_id BIGINT,
  amount_paid NUMERIC(12, 2) NOT NULL,
  payment_method receivable_payment_method,
  payment_method_text TEXT,
  payment_reference TEXT,
  transaction_id TEXT UNIQUE,
  gateway_response JSONB,
  payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processed_date TIMESTAMPTZ,
  status TEXT DEFAULT 'completed',
  created_by TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE receivable_payments
ADD COLUMN IF NOT EXISTS ar_invoice_id UUID,
ADD COLUMN IF NOT EXISTS payment_method_text TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  ALTER TABLE receivable_payments ALTER COLUMN receivable_id DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE receivable_payments
    ADD CONSTRAINT fk_receivable_payments_ar_invoice
    FOREIGN KEY (ar_invoice_id) REFERENCES ar_invoices(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_receivable_payments_ar_invoice_id ON receivable_payments(ar_invoice_id);
CREATE INDEX IF NOT EXISTS idx_receivable_payments_clinic_date ON receivable_payments(clinic_id, payment_date DESC);

CREATE TABLE IF NOT EXISTS receivable_glosas (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  ar_invoice_id UUID NOT NULL REFERENCES ar_invoices(id) ON DELETE CASCADE,
  sent_amount NUMERIC(12, 2) DEFAULT 0.00,
  paid_amount NUMERIC(12, 2) DEFAULT 0.00,
  glosa_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  reason TEXT,
  glosa_type TEXT DEFAULT 'administrativa',
  contestation_status TEXT DEFAULT 'pendente',
  responsible TEXT,
  glosa_date DATE DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receivable_glosas_clinic ON receivable_glosas(clinic_id);
CREATE INDEX IF NOT EXISTS idx_receivable_glosas_ar_invoice ON receivable_glosas(ar_invoice_id);
CREATE INDEX IF NOT EXISTS idx_receivable_glosas_status ON receivable_glosas(clinic_id, contestation_status);

ALTER TABLE receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_glosas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY receivable_payments_clinic_select ON receivable_payments
    FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY receivable_payments_clinic_insert ON receivable_payments
    FOR INSERT WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY receivable_glosas_clinic_all ON receivable_glosas
    FOR ALL USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()))
    WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
