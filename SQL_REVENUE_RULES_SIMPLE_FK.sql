-- Limpar constraints de revenue_rules de forma simples

-- Drop all constraints
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fkey;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_professional_id;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_service_id_fkey;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_service_id;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS revenue_rules_health_insurance_id_fkey;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_health_insurance_id;

-- Recriar foreign keys
ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_professional_id 
FOREIGN KEY (professional_id) REFERENCES professionals(id);

ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_service_id 
FOREIGN KEY (service_id) REFERENCES services(id);

ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_health_insurance_id 
FOREIGN KEY (health_insurance_id) REFERENCES health_insurances(id);
