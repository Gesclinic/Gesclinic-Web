-- Adiciona campos de observações e convênios permitidos à tabela de horários dos profissionais
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS allowed_health_insurances UUID[];

-- Criar índice para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_professional_schedules_allowed_insurances 
  ON professional_schedules USING GIN (allowed_health_insurances);
