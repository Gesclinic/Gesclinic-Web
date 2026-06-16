-- ============================================================================
-- MIGRATION: 20260611_receivable_insurance_tiss_fields.sql
-- PURPOSE: Estrutura de convenio/TISS em ar_invoices sem criar tabela paralela
-- ============================================================================

ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS ans_registration TEXT,
ADD COLUMN IF NOT EXISTS insurance_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_billing_status TEXT,
ADD COLUMN IF NOT EXISTS tiss_xml_status TEXT,
ADD COLUMN IF NOT EXISTS insurance_return_status TEXT,
ADD COLUMN IF NOT EXISTS insurance_return_protocol TEXT,
ADD COLUMN IF NOT EXISTS insurance_return_date DATE;

CREATE INDEX IF NOT EXISTS idx_ar_invoices_insurance_billing_status
ON ar_invoices(clinic_id, insurance_billing_status);

COMMENT ON COLUMN ar_invoices.ans_registration IS 'Registro ANS da operadora relacionado ao recebivel.';
COMMENT ON COLUMN ar_invoices.insurance_invoice_number IS 'Numero da fatura/lote de cobranca do convenio.';
COMMENT ON COLUMN ar_invoices.insurance_billing_status IS 'Status operacional do convenio: gerada, enviada, processada, paga ou glosada.';
COMMENT ON COLUMN ar_invoices.tiss_xml_status IS 'Status do XML TISS: pendente, gerado, enviado, processando, aceito, rejeitado.';
COMMENT ON COLUMN ar_invoices.insurance_return_status IS 'Status do retorno do convenio.';
COMMENT ON COLUMN ar_invoices.insurance_return_protocol IS 'Protocolo/recibo de retorno do convenio.';
COMMENT ON COLUMN ar_invoices.insurance_return_date IS 'Data de retorno/processamento do convenio.';
