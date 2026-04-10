-- Garantir que as colunas existem e as foreign keys estão corretas

-- Adicionar colunas se não existirem
ALTER TABLE revenue_rules
ADD COLUMN IF NOT EXISTS professional_id UUID,
ADD COLUMN IF NOT EXISTS service_id UUID;

-- Remover ALL constraints antigos
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fkey;
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fk;
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_professional_id;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_service_id_fkey;
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_service_id_fk;
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_service_id;

-- Criar foreign keys NOVAS
ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_professional_id 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL;

ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_service_id 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
