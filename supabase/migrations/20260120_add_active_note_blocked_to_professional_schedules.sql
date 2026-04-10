-- Adiciona campos para controle de disponibilidade, observação e bloqueio na tabela de horários dos profissionais
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;

-- Opcional: atualiza registros existentes para garantir valores padrão
UPDATE professional_schedules SET active = TRUE WHERE active IS NULL;
UPDATE professional_schedules SET blocked = FALSE WHERE blocked IS NULL;
