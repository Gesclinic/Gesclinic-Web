-- Tabela para Cartões de Pagamento das Clínicas
-- Cadastra cartões de crédito/débito com datas de vencimento e dia de pagamento

CREATE TABLE IF NOT EXISTS clinic_payment_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Dados do Cartão
  brand VARCHAR(50) NOT NULL, -- VISA, MASTERCARD, ELO, AMEX, DINERS
  last_4_digits VARCHAR(4) NOT NULL,
  holder_name VARCHAR(255) NOT NULL,
  
  -- Validade
  expiry_month INT,
  expiry_year INT,
  
  -- Configuração de Pagamento
  payment_day INT DEFAULT 1, -- Dia do mês para vencimento (1-31)
  
  -- Metadados
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices
  UNIQUE(clinic_id, brand, last_4_digits)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_clinic_payment_cards_clinic_id 
  ON clinic_payment_cards(clinic_id);

CREATE INDEX IF NOT EXISTS idx_clinic_payment_cards_is_active 
  ON clinic_payment_cards(is_active);

-- Comentários de documentação
COMMENT ON TABLE clinic_payment_cards IS 'Armazena os cartões de pagamento cadastrados em cada clínica';
COMMENT ON COLUMN clinic_payment_cards.brand IS 'Bandeira do cartão: VISA, MASTERCARD, ELO, AMEX, DINERS';
COMMENT ON COLUMN clinic_payment_cards.last_4_digits IS 'Últimos 4 dígitos do cartão (segurança)';
COMMENT ON COLUMN clinic_payment_cards.payment_day IS 'Dia do mês em que o cartão é debitado/creditado (1-31)';
