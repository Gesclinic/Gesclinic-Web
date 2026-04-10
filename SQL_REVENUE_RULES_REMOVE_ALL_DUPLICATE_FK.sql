-- Remover ABSOLUTAMENTE TODAS as foreign keys duplicadas

-- Listar todas as constraints para revenue_rules
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'revenue_rules' 
AND constraint_type = 'FOREIGN KEY';

-- Remover cada uma individualmente (execute os DROPs abaixo baseado na listagem acima)
-- Exemplos de possíveis nomes:
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_professional_id_fk;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS fk_revenue_rules_professional_id;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_professionals_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_professionals_fk;

-- Remover service_id também
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_service_id_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_service_id_fk;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS fk_revenue_rules_service_id;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_services_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_services_fk;

-- Remover health_insurance_id também
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_health_insurance_id_fkey;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS revenue_rules_health_insurance_id_fk;
ALTER TABLE revenue_rules DROP CONSTRAINT IF EXISTS fk_revenue_rules_health_insurance_id;

-- Agora criar APENAS UM de cada
ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_professionals 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL;

ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_services 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;

ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_health_insurances 
FOREIGN KEY (health_insurance_id) REFERENCES health_insurances(id) ON DELETE SET NULL;
