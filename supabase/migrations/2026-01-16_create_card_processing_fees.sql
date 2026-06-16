-- Tabela de Taxas de Processamento por Tipo de Cartão e Forma de Recebimento
-- Exemplo: VISA à vista: 2.5%, VISA parcelado: 3.5%, etc.

CREATE TABLE IF NOT EXISTS card_processing_fees (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Identificação
  brand VARCHAR(50) NOT NULL, -- VISA, MASTERCARD, ELO, AMEX, DINERS
  
  -- Tipos de Recebimento
  -- "immediate" (D+0) - recebe no mesmo dia
  -- "next_day" (D+1) - recebe no dia seguinte
  -- "scheduled" (D+30) - recebe em 30 dias
  -- "payment_day" (conforme payment_day do cartão) - recebe no dia configurado
  settlement_type VARCHAR(50) NOT NULL DEFAULT 'next_day',
  
  -- Taxa (em percentual)
  -- Exemplo: 2.5 = 2.5%
  fee_percentage DECIMAL(5, 2) NOT NULL,
  
  -- Metadados
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(clinic_id, brand, settlement_type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_card_processing_fees_clinic_id 
  ON card_processing_fees(clinic_id);

CREATE INDEX IF NOT EXISTS idx_card_processing_fees_brand 
  ON card_processing_fees(brand, settlement_type);

-- Comentários
COMMENT ON TABLE card_processing_fees IS 'Define as taxas de processamento de cartão por bandeira e tipo de liquidação';
COMMENT ON COLUMN card_processing_fees.settlement_type IS 'immediate (D+0), next_day (D+1), scheduled (D+30), ou payment_day (conforme cartão)';
COMMENT ON COLUMN card_processing_fees.fee_percentage IS 'Taxa em percentual (ex: 2.5 = 2.5%)';

-- ====================================================================
-- DADOS PADRÃO: Taxas típicas de mercado (PARA TESTE)
-- ====================================================================
INSERT INTO card_processing_fees (clinic_id, brand, settlement_type, fee_percentage, notes)
SELECT 
  c.id,
  brand,
  settlement_type,
  fee_percentage,
  notes
FROM clinics c
CROSS JOIN (
  -- VISA
  VALUES
  ('VISA', 'immediate', 3.2, 'À vista'),
  ('VISA', 'next_day', 2.5, 'D+1 (próximo dia útil)'),
  ('VISA', 'scheduled', 1.8, 'D+30 (30 dias)'),
  
  -- MASTERCARD
  ('MASTERCARD', 'immediate', 3.2, 'À vista'),
  ('MASTERCARD', 'next_day', 2.5, 'D+1 (próximo dia útil)'),
  ('MASTERCARD', 'scheduled', 1.8, 'D+30 (30 dias)'),
  
  -- ELO
  ('ELO', 'immediate', 3.0, 'À vista'),
  ('ELO', 'next_day', 2.4, 'D+1 (próximo dia útil)'),
  ('ELO', 'scheduled', 1.7, 'D+30 (30 dias)'),
  
  -- AMEX
  ('AMEX', 'immediate', 3.8, 'À vista'),
  ('AMEX', 'next_day', 3.2, 'D+1 (próximo dia útil)'),
  ('AMEX', 'scheduled', 2.5, 'D+30 (30 dias)'),
  
  -- DINERS
  ('DINERS', 'immediate', 3.5, 'À vista'),
  ('DINERS', 'next_day', 2.8, 'D+1 (próximo dia útil)'),
  ('DINERS', 'scheduled', 2.0, 'D+30 (30 dias)')
) AS fees(brand, settlement_type, fee_percentage, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM card_processing_fees cpf 
  WHERE cpf.clinic_id = c.id 
    AND cpf.brand = fees.brand 
    AND cpf.settlement_type = fees.settlement_type
);
