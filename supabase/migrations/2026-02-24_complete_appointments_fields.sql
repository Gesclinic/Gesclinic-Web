-- ====================================================================
-- MIGRAÇÃO COMPLETA: Adicionar todos os campos necessários à tabela appointments
-- ====================================================================
-- Esta migração adiciona todos os campos necessários para:
-- 1. Auto-save de dados de pagamento
-- 2. Auto-save de dados de liberação (autorização)
-- 3. Auto-save de dados de faturamento (desconto)
-- 4. Rastreamento de observações

-- Adicionar coluna discount (Valor do Desconto)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;

-- Adicionar coluna notes (Observações)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Adicionar coluna authorization_number (Nº Autorização)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(255);

-- Adicionar coluna authorization_expiry (Validade da Autorização)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS authorization_expiry VARCHAR(255);

-- Adicionar coluna card_number (Matrícula/Cartão)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS card_number VARCHAR(255);

-- Adicionar coluna card_brand (Bandeira do Cartão)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS card_brand VARCHAR(100);

-- Adicionar coluna card_last_digits (Últimos 4 Dígitos do Cartão)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS card_last_digits VARCHAR(4);

-- Adicionar coluna card_installments (Número de Parcelas)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS card_installments INTEGER DEFAULT 1;

-- Adicionar coluna payment_method (Forma de Pagamento)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Adicionar coluna amount_paid (Valor Recebido)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2);

-- Criar índices para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_appointments_discount ON appointments(discount);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON appointments(payment_method);
CREATE INDEX IF NOT EXISTS idx_appointments_authorization_number ON appointments(authorization_number);
CREATE INDEX IF NOT EXISTS idx_appointments_card_number ON appointments(card_number);

-- Adicionar comentários às colunas para documentação
COMMENT ON COLUMN appointments.discount IS 'Valor do desconto autorizado para a consulta';
COMMENT ON COLUMN appointments.notes IS 'Observações adicionais sobre o atendimento';
COMMENT ON COLUMN appointments.authorization_number IS 'Número da autorização do convênio';
COMMENT ON COLUMN appointments.authorization_expiry IS 'Data de validade da autorização';
COMMENT ON COLUMN appointments.card_number IS 'Número de beneficiário/cartão do convênio';
COMMENT ON COLUMN appointments.card_brand IS 'Bandeira do cartão (VISA, MASTERCARD, ELO, etc)';
COMMENT ON COLUMN appointments.card_last_digits IS 'Últimos 4 dígitos do cartão para referência';
COMMENT ON COLUMN appointments.card_installments IS 'Número de parcelas do pagamento em cartão';
COMMENT ON COLUMN appointments.payment_method IS 'Forma de pagamento (DINHEIRO, CARTAO, PIX, CHEQUE, BOLETO)';
COMMENT ON COLUMN appointments.amount_paid IS 'Valor efetivamente recebido (com desconto aplicado)';
