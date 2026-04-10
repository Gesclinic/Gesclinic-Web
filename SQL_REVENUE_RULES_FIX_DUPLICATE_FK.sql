-- Remover constraints duplicadas entre revenue_rules e professionals

-- Remover todas as constraints antigas
ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_professional_id CASCADE;

ALTER TABLE revenue_rules
DROP CONSTRAINT IF EXISTS fk_revenue_rules_professional_id_fkey CASCADE;

-- Recriar apenas uma vez
ALTER TABLE revenue_rules
ADD CONSTRAINT fk_revenue_rules_professional_id 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;
