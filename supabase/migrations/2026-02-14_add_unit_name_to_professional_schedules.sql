-- Adiciona coluna unit_name para rastrear unidade/filial física do horário
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS unit_name VARCHAR(100);

-- Criar índice para melhor performance em buscas por unidade
CREATE INDEX IF NOT EXISTS idx_professional_schedules_unit_clinic ON professional_schedules(unit_name, clinic_id);
