-- ============================================================================
-- MIGRATION: 20260611_ensure_ar_invoices_receivable_form_columns.sql
-- PURPOSE: Garantir todas as colunas usadas pelas telas de Contas a Receber
-- DATE: 2026-06-11
-- ============================================================================

ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS appointment_id UUID,
ADD COLUMN IF NOT EXISTS patient_id UUID,
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS service_description TEXT,
ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS service_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS received_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
ADD COLUMN IF NOT EXISTS received_payment_method VARCHAR(100),
ADD COLUMN IF NOT EXISTS chart_account_id UUID,
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'Manual',
ADD COLUMN IF NOT EXISTS centro_custo_id UUID,
ADD COLUMN IF NOT EXISTS professional_id UUID,
ADD COLUMN IF NOT EXISTS payer_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS payer_id UUID,
ADD COLUMN IF NOT EXISTS payer_rule_id BIGINT,
ADD COLUMN IF NOT EXISTS tax_configuration_id BIGINT,
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS received_date DATE,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processor_id UUID,
ADD COLUMN IF NOT EXISTS card_brand VARCHAR(50),
ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS fee_percent NUMERIC(7, 4),
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_parcelas INTEGER,
ADD COLUMN IF NOT EXISTS nf_document_url TEXT,
ADD COLUMN IF NOT EXISTS nf_document_name TEXT,
ADD COLUMN IF NOT EXISTS nf_document_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(50) DEFAULT 'simples_nacional',
ADD COLUMN IF NOT EXISTS pis_percent NUMERIC(5, 2) DEFAULT 1.65,
ADD COLUMN IF NOT EXISTS pis_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cofins_percent NUMERIC(5, 2) DEFAULT 7.60,
ADD COLUMN IF NOT EXISTS cofins_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS csll_percent NUMERIC(5, 2) DEFAULT 9.00,
ADD COLUMN IF NOT EXISTS csll_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ir_percent NUMERIC(5, 2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS ir_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS issqn_percent NUMERIC(5, 2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS issqn_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_taxes NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE ar_invoices
SET
  origem = COALESCE(origem, 'Manual'),
  status = COALESCE(status, 'open'),
  amount = COALESCE(amount, service_value, 0),
  service_value = COALESCE(service_value, amount, 0),
  discount_value = COALESCE(discount_value, 0),
  fee_amount = COALESCE(fee_amount, 0),
  net_value = COALESCE(net_value, GREATEST(COALESCE(amount, service_value, 0) - COALESCE(discount_value, 0) - COALESCE(fee_amount, 0), 0)),
  received_value = COALESCE(received_value, 0),
  total_taxes = COALESCE(total_taxes, 0)
WHERE
  origem IS NULL
  OR status IS NULL
  OR amount IS NULL
  OR service_value IS NULL
  OR discount_value IS NULL
  OR fee_amount IS NULL
  OR net_value IS NULL
  OR received_value IS NULL
  OR total_taxes IS NULL;

DO $$
BEGIN
  ALTER TABLE ar_invoices
    ADD CONSTRAINT check_ar_invoices_amount_non_negative CHECK (COALESCE(amount, 0) >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE ar_invoices
    ADD CONSTRAINT check_ar_invoices_service_value_non_negative CHECK (COALESCE(service_value, 0) >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE ar_invoices
    ADD CONSTRAINT check_ar_invoices_discount_non_negative CHECK (COALESCE(discount_value, 0) >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE ar_invoices
    ADD CONSTRAINT check_ar_invoices_fee_non_negative CHECK (COALESCE(fee_amount, 0) >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE ar_invoices
    ADD CONSTRAINT check_ar_invoices_total_parcelas_positive CHECK (total_parcelas IS NULL OR total_parcelas >= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ar_invoices_clinic ON ar_invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status ON ar_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_due_date ON ar_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_invoice_date ON ar_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_received_date ON ar_invoices(received_date);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_appointment_id ON ar_invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_patient_id ON ar_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_patient_name ON ar_invoices(patient_name);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_chart_account_id ON ar_invoices(chart_account_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_centro_custo_id ON ar_invoices(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_professional_id ON ar_invoices(professional_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_payer ON ar_invoices(payer_type, payer_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_processor_id ON ar_invoices(processor_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_clinic_status ON ar_invoices(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_clinic_due_date ON ar_invoices(clinic_id, due_date);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_clinic_invoice_date ON ar_invoices(clinic_id, invoice_date);

COMMENT ON COLUMN ar_invoices.origem IS 'Origem do lancamento: Manual, Agenda, Faturamento ou Contrato';
COMMENT ON COLUMN ar_invoices.centro_custo_id IS 'Centro de custo financeiro vinculado ao recebivel';
COMMENT ON COLUMN ar_invoices.professional_id IS 'Profissional usado para repasse financeiro';
COMMENT ON COLUMN ar_invoices.processor_id IS 'Operadora/processadora usada em recebimentos por cartao';
COMMENT ON COLUMN ar_invoices.card_brand IS 'Bandeira do cartao usada no recebimento previsto';
COMMENT ON COLUMN ar_invoices.settlement_type IS 'Prazo/forma de liquidacao da operadora, como D+0, D+1, D+30 ou Payment Day';
COMMENT ON COLUMN ar_invoices.fee_percent IS 'Percentual de taxa calculada para recebimento por cartao';
COMMENT ON COLUMN ar_invoices.fee_amount IS 'Valor da taxa calculada para recebimento por cartao';
COMMENT ON COLUMN ar_invoices.total_parcelas IS 'Quantidade total de parcelas informada no lancamento';
COMMENT ON COLUMN ar_invoices.nf_document_url IS 'URL publica ou assinada do anexo de NF do recebivel';
COMMENT ON COLUMN ar_invoices.nf_document_name IS 'Nome original do arquivo de NF anexado ao recebivel';
COMMENT ON COLUMN ar_invoices.nf_document_uploaded_at IS 'Data/hora de upload do anexo de NF';

DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(expected.column_name ORDER BY expected.column_name)
  INTO missing_columns
  FROM UNNEST(ARRAY[
    'appointment_id',
    'patient_id',
    'patient_name',
    'description',
    'service_description',
    'amount',
    'service_value',
    'discount_value',
    'discount_percent',
    'net_value',
    'received_value',
    'status',
    'payment_method',
    'received_payment_method',
    'chart_account_id',
    'origem',
    'centro_custo_id',
    'professional_id',
    'payer_type',
    'payer_id',
    'payer_rule_id',
    'tax_configuration_id',
    'invoice_date',
    'due_date',
    'received_date',
    'received_at',
    'processor_id',
    'card_brand',
    'settlement_type',
    'fee_percent',
    'fee_amount',
    'total_parcelas',
    'nf_document_url',
    'nf_document_name',
    'nf_document_uploaded_at',
    'tax_regime',
    'pis_percent',
    'pis_value',
    'cofins_percent',
    'cofins_value',
    'csll_percent',
    'csll_value',
    'ir_percent',
    'ir_value',
    'issqn_percent',
    'issqn_value',
    'total_taxes',
    'created_at',
    'updated_at'
  ]) AS expected(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns columns
    WHERE columns.table_schema = 'public'
      AND columns.table_name = 'ar_invoices'
      AND columns.column_name = expected.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'ar_invoices ainda esta sem as colunas: %', ARRAY_TO_STRING(missing_columns, ', ');
  END IF;
END $$;

-- Conferencia rapida apos aplicar:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'ar_invoices'
--   AND column_name IN (
--     'origem', 'centro_custo_id', 'professional_id', 'processor_id',
--     'card_brand', 'settlement_type', 'fee_percent', 'fee_amount',
--     'total_parcelas', 'nf_document_url', 'nf_document_name',
--     'nf_document_uploaded_at', 'payer_type', 'payer_id', 'invoice_date',
--     'due_date', 'received_date', 'net_value', 'discount_value'
--   )
-- ORDER BY column_name;
