-- ====================================================================
-- MIGRAÇÃO: Adicionar campos de processador de cartão à tabela appointments
-- ====================================================================
-- Esta migração adiciona suporte para integração de taxa de processamento de cartão
-- Permite rastrear qual processador, bandeira, tipo de liquidação e taxa foram usados

-- Adicionar processor_id (FK para card_processors)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS processor_id UUID REFERENCES card_processors(id) ON DELETE SET NULL;

-- Adicionar card_brand (Bandeira: VISA, MASTERCARD, ELO, AMEX, HIPERCARD, DISCOVER)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(50);

-- Adicionar fee_percent (% de taxa: 0-100)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS fee_percent DECIMAL(5, 2);

-- Adicionar fee_amount (Valor da taxa em R$)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(10, 2);

-- Adicionar net_amount (Valor líquido recebido: valor_bruto - taxa)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10, 2);

-- Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_appointments_processor_id ON appointments(processor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_settlement_type ON appointments(settlement_type);
CREATE INDEX IF NOT EXISTS idx_appointments_fee_percent ON appointments(fee_percent);

-- Adicionar comentários às colunas para documentação
COMMENT ON COLUMN appointments.processor_id IS 'FK to card_processors - qual processadora foi usada';
COMMENT ON COLUMN appointments.settlement_type IS 'Tipo de liquidação: D+0, D+1, D+30, ou Payment Day';
COMMENT ON COLUMN appointments.fee_percent IS 'Percentual de taxa cobrada pelo processador (0-100%)';
COMMENT ON COLUMN appointments.fee_amount IS 'Valor em reais da taxa cobrada';
COMMENT ON COLUMN appointments.net_amount IS 'Valor líquido recebido após descontar a taxa';

-- ====================================================================
-- VALIDAÇÕES E CONSTRAINTS (OPCIONAL)
-- ====================================================================
-- Adicionar validação: fee_percent deve estar entre 0 e 100
ALTER TABLE appointments
ADD CONSTRAINT check_fee_percent CHECK (fee_percent IS NULL OR (fee_percent >= 0 AND fee_percent <= 100));

-- Adicionar validação: fee_amount não deve ser negativo
ALTER TABLE appointments
ADD CONSTRAINT check_fee_amount CHECK (fee_amount IS NULL OR fee_amount >= 0);

-- Adicionar validação: net_amount não deve ser negativo
ALTER TABLE appointments
ADD CONSTRAINT check_net_amount CHECK (net_amount IS NULL OR net_amount >= 0);

-- ====================================================================
-- NOTA: Esses campos são preenchidos automaticamente quando:
-- 1. Appointment é criado com payment_method contendo "cartão"
-- 2. CardProcessorSelectorFields é usado para selecionar processador
-- 3. calculateProcessingFee() é chamado para calcular a taxa
-- ====================================================================
