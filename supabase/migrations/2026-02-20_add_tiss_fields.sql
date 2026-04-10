-- Adicionar coluna para dados de faturamento TISS estruturado
-- Compatível com Unimed, Fundação Copele, Sanepar, Itamed, PAM, SUS, Consórcios

-- Se a coluna não existir, adicionar billing_data (armazena JSON com estrutura TISS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'billing_data') THEN
    ALTER TABLE appointments ADD COLUMN billing_data JSONB;
    COMMENT ON COLUMN appointments.billing_data IS 'Dados estruturados de faturamento TISS em formato JSON/JSONB para compatibilidade com múltiplas operadoras';
  END IF;
END $$;

-- Criar índice para buscar rapidamente por tipo de guia
CREATE INDEX IF NOT EXISTS idx_appointments_billing_guide_type 
  ON appointments USING GIN (billing_data) 
  WHERE billing_data IS NOT NULL;

-- Adicionar coluna para armazenar métadata sobre status do faturamento TISS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'billing_status') THEN
    ALTER TABLE appointments ADD COLUMN billing_status VARCHAR(50) DEFAULT 'pending';
    COMMENT ON COLUMN appointments.billing_status IS 'Status do faturamento: pending, structured, sent, approved, denied';
  END IF;
END $$;

-- Adicionar coluna para o XML gerado final (opcional, para auditoria)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'billing_xml') THEN
    ALTER TABLE appointments ADD COLUMN billing_xml TEXT;
    COMMENT ON COLUMN appointments.billing_xml IS 'XML TISS gerado para envio à operadora (opcional, para auditoria)';
  END IF;
END $$;

-- Criar view para relatório de faturamento TISS estruturado
CREATE OR REPLACE VIEW view_tiss_billing AS 
SELECT 
  a.id,
  a.clinic_id,
  a.scheduled_date,
  a.scheduled_time,
  p.name AS patient_name,
  p.document_id AS patient_cpf,
  pat.name AS payer_name,
  pl.name AS plan_name,
  sv.name AS service_name,
  a.guide_number,
  a.billing_status,
  (a.billing_data->>'guide_type') AS guide_type,
  (a.billing_data->>'code_type') AS code_type,
  (a.billing_data->>'procedure_code') AS procedure_code,
  (a.billing_data->>'estimated_value') AS estimated_value,
  (a.billing_data->>'authorized_value') AS authorized_value,
  a.authorization_number,
  a.authorization_expiry,
  a.updated_at
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN payers pat ON a.payer_id = pat.id
LEFT JOIN plans pl ON a.plan_id = pl.id
LEFT JOIN services sv ON a.service_id = sv.id
WHERE a.billing_data IS NOT NULL
ORDER BY a.scheduled_date DESC, a.scheduled_time DESC;

COMMENT ON VIEW view_tiss_billing IS 'Visualização de guias TISS estruturadas prontas para faturamento';
