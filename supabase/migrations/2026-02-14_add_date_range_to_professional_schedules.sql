-- Adiciona campos de período (data inicial e final) aos horários dos profissionais
-- Permite que um horário seja válido apenas em um período específico
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Criar índice para melhor performance nas buscas por data
CREATE INDEX IF NOT EXISTS idx_professional_schedules_start_date 
  ON professional_schedules(start_date);

CREATE INDEX IF NOT EXISTS idx_professional_schedules_end_date 
  ON professional_schedules(end_date);

-- Criar índice composto para buscas por período
CREATE INDEX IF NOT EXISTS idx_professional_schedules_date_range 
  ON professional_schedules(start_date, end_date);
