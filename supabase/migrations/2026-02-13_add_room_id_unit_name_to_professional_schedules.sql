-- Adicionar colunas room_id e unit_name à tabela professional_schedules
-- Data: 2026-02-13

-- Adiciona coluna room_id (referência às salas)
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Adiciona coluna unit_name (unidade/filial)
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS unit_name VARCHAR(100);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_professional_schedules_room ON professional_schedules(room_id);
CREATE INDEX IF NOT EXISTS idx_professional_schedules_unit_clinic ON professional_schedules(unit_name, clinic_id);

-- Opcional: criar índice composto para buscar por unidade + sala + dia
CREATE INDEX IF NOT EXISTS idx_professional_schedules_unit_room_day ON professional_schedules(unit_name, room_id, day_of_week);
