-- Limpar TODAS as constraints em revenue_rules e recriar corretamente

-- Drop all foreign keys relacionadas a professionals
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fkey CASCADE;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_professional_id CASCADE;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fk CASCADE;

-- Drop all foreign keys relacionadas a services
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_service_id_fkey CASCADE;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_service_id CASCADE;

-- Drop all foreign keys relacionadas a health_insurances
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_health_insurance_id_fkey CASCADE;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_health_insurance_id CASCADE;

-- Agora recriar apenas UM por tabela
ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_professional_id 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;

ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_service_id 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_health_insurance_id 
FOREIGN KEY (health_insurance_id) REFERENCES health_insurances(id) ON DELETE CASCADE;
