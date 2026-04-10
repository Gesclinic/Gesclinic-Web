-- ============================================================
-- ADICIONAR TODAS AS COLUNAS FALTANDO - CONSOLIDADO
-- Executar no Supabase SQL Editor
-- ============================================================

-- Parte 1: Colunas 'active' (já executado - repetir por segurança)
ALTER TABLE professional_services ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE agenda_rules ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE service_prices ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE revenue_rules ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Parte 2: Coluna 'group_id' para services
ALTER TABLE services ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES service_groups(id) ON DELETE SET NULL;

-- Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_professional_services_active ON professional_services(active);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(active);
CREATE INDEX IF NOT EXISTS idx_professionals_active ON professionals(active);
CREATE INDEX IF NOT EXISTS idx_agenda_rules_active ON agenda_rules(active);
CREATE INDEX IF NOT EXISTS idx_service_prices_active ON service_prices(active);
CREATE INDEX IF NOT EXISTS idx_revenue_rules_active ON revenue_rules(active);
CREATE INDEX IF NOT EXISTS idx_services_group_id ON services(group_id);
