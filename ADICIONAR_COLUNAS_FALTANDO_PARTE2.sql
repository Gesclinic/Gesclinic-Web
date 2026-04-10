-- Adicionar coluna 'active' às tabelas faltando (Parte 2)
-- Executar no Supabase SQL Editor

ALTER TABLE agenda_rules ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE revenue_rules ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_agenda_rules_active ON agenda_rules(active);
CREATE INDEX IF NOT EXISTS idx_service_prices_active ON service_prices(active);
CREATE INDEX IF NOT EXISTS idx_revenue_rules_active ON revenue_rules(active);
