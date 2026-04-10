-- Adicionar coluna amount_paid (Valor Recebido) à tabela appointments
-- Esta coluna armazena o valor que foi efetivamente recebido pelo paciente

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2);

-- Criar índice para melhor performance em queries
CREATE INDEX IF NOT EXISTS idx_appointments_amount_paid ON appointments(amount_paid);

COMMENT ON COLUMN appointments.amount_paid IS 'Valor efetivamente recebido pelo paciente (pode diferir do valor_total se houver desconto)';
