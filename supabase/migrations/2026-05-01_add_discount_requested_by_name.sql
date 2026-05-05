-- Adicionar campo discount_requested_by_name à tabela appointments
-- Este campo armazena o nome/email de quem solicitou o desconto

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS discount_requested_by_name VARCHAR(255) NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_appointments_discount_requested_by_name 
ON appointments(discount_requested_by_name);

-- Comentar a coluna para documentação
COMMENT ON COLUMN appointments.discount_requested_by_name IS 
'Nome ou email do usuário que solicitou o desconto. Preenchido automaticamente quando discount_requested_by é definido.';
