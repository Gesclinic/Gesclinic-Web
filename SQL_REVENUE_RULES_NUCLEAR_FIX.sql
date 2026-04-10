-- NUCLEAR: Remover TODAS as constraints de revenue_rules e recriar APENAS UMA de cada

-- 1. REMOVER TUDO
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS fk_revenue_rules_professional_id;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS fk_revenue_rules_professionals;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fk;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_professionals_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_professionals_fk;

ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS fk_revenue_rules_service_id;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS fk_revenue_rules_services;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_service_id_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_service_id_fk;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_services_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_services_fk;

ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS fk_revenue_rules_health_insurance_id;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_health_insurance_id_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_health_insurance_id_fk;

-- 2. RECRIAR APENAS UMA VEZ CADA
ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_professionals 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL;

ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_services 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
