ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS nf_document_url TEXT,
ADD COLUMN IF NOT EXISTS nf_document_name TEXT,
ADD COLUMN IF NOT EXISTS nf_document_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN ar_invoices.nf_document_url IS 'URL publica ou assinada do anexo de NF do recebivel';
COMMENT ON COLUMN ar_invoices.nf_document_name IS 'Nome original do arquivo de NF anexado ao recebivel';
COMMENT ON COLUMN ar_invoices.nf_document_uploaded_at IS 'Data/hora de upload do anexo de NF';