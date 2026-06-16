-- ============================================================================
-- MIGRATION: 20260521_add_financial_columns_to_ar_invoices.sql
-- PURPOSE: Adicionar colunas financeiras detalhadas a ar_invoices
-- STATUS: Crítica - sem isso, appointment não vira receivable
-- DATE: 2026-05-21
-- ============================================================================

-- ✅ Adicionar colunas financeiras básicas
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_description TEXT,
ADD COLUMN IF NOT EXISTS service_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0.00;

-- ✅ Adicionar colunas de impostos detalhados
ALTER TABLE ar_invoices
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
ADD COLUMN IF NOT EXISTS net_value NUMERIC(12, 2) DEFAULT 0.00;

-- ✅ Adicionar colunas de rastreabilidade
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS payer_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS payer_id UUID,
ADD COLUMN IF NOT EXISTS payer_rule_id BIGINT,
ADD COLUMN IF NOT EXISTS tax_configuration_id BIGINT;

-- ✅ Adicionar colunas de data/status
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS received_date DATE,
ADD COLUMN IF NOT EXISTS received_value NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS received_payment_method VARCHAR(50);

-- ✅ Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ar_invoices_appointment_id ON ar_invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_patient_name ON ar_invoices(patient_name);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_clinic_appointment ON ar_invoices(clinic_id, appointment_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status_clinic ON ar_invoices(status, clinic_id);

-- ✅ Adicionar constraint de validação
ALTER TABLE ar_invoices
ADD CONSTRAINT check_service_value_positive CHECK (service_value >= 0),
ADD CONSTRAINT check_taxes_positive CHECK (total_taxes >= 0);
