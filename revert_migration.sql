-- Reverter a migração: remover coluna health_insurance_id
-- Voltar a usar apenas payer_id

-- Remover a constraint
ALTER TABLE public.plans 
DROP CONSTRAINT IF EXISTS plans_health_insurance_id_fkey;

-- Remover a coluna (opcional, pode deixar como NULL)
-- ALTER TABLE public.plans 
-- DROP COLUMN health_insurance_id;
