-- ============================================================
-- GARANTIA CONTRATUAL ap_bills - CAMPOS FINANCEIROS E FISCAIS
-- ============================================================
-- Idempotente: nao cria tabela paralela, apenas garante colunas no ap_bills.

ALTER TABLE ap_bills
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS supplier_id UUID,
ADD COLUMN IF NOT EXISTS supplier_document TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_series TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'SUPPLIER',
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS unit_id UUID,
ADD COLUMN IF NOT EXISTS unit_name TEXT,
ADD COLUMN IF NOT EXISTS issue_date DATE,
ADD COLUMN IF NOT EXISTS competency_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fine_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_value NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_bank TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS financial_account_id UUID,
ADD COLUMN IF NOT EXISTS chart_account_id UUID,
ADD COLUMN IF NOT EXISTS cost_center_id UUID,
ADD COLUMN IF NOT EXISTS dre_classification TEXT,
ADD COLUMN IF NOT EXISTS cost_allocations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT,
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS installment_total INTEGER,
ADD COLUMN IF NOT EXISTS parent_installment_id UUID,
ADD COLUMN IF NOT EXISTS parent_payable_id UUID,
ADD COLUMN IF NOT EXISTS has_invoice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invoice_xml_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS document_taxes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS document_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS medication_traceability JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ap_bills.document_taxes IS 'Impostos detalhados extraidos de XML/cupom/NF para conferencia fiscal de contas a pagar.';
COMMENT ON COLUMN ap_bills.document_items IS 'Itens da nota/cupom extraidos do documento fiscal de contas a pagar.';
COMMENT ON COLUMN ap_bills.medication_traceability IS 'Rastreabilidade medicamentosa extraida da NF: lote, validade, ANVISA, PMC, fabricacao e agregacao.';

CREATE INDEX IF NOT EXISTS idx_ap_bills_document_number ON ap_bills(clinic_id, document_number);
CREATE INDEX IF NOT EXISTS idx_ap_bills_invoice_number ON ap_bills(clinic_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_ap_bills_document_taxes_gin ON ap_bills USING gin(document_taxes);
CREATE INDEX IF NOT EXISTS idx_ap_bills_document_items_gin ON ap_bills USING gin(document_items);
CREATE INDEX IF NOT EXISTS idx_ap_bills_medication_traceability_gin ON ap_bills USING gin(medication_traceability);
