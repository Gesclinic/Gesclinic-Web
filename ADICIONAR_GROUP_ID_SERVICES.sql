-- Adicionar coluna 'group_id' à tabela services
-- Executar no Supabase SQL Editor

ALTER TABLE services ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES service_groups(id) ON DELETE SET NULL;

-- Criar índice de performance
CREATE INDEX IF NOT EXISTS idx_services_group_id ON services(group_id);
