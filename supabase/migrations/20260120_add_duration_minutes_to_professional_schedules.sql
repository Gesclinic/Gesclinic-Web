-- Adiciona campo de duração do atendimento à tabela de horários dos profissionais
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Opcional: atualiza registros existentes para garantir valor padrão
UPDATE professional_schedules SET duration_minutes = 30 WHERE duration_minutes IS NULL;
