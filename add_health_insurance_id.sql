-- Script para adicionar health_insurance_id na tabela plans
-- Este campo permitirá conectar planos aos convênios (health_insurances)

-- Adicionar coluna se não existir
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS health_insurance_id uuid;

-- Adicionar foreign key para health_insurances
ALTER TABLE public.plans
ADD CONSTRAINT plans_health_insurance_id_fkey 
  FOREIGN KEY (health_insurance_id) 
  REFERENCES public.health_insurances(id) 
  ON DELETE CASCADE
  NOT VALID;

-- Validar constraint
ALTER TABLE public.plans VALIDATE CONSTRAINT plans_health_insurance_id_fkey;

-- Copiar dados existentes de payer_id para health_insurance_id
-- (se o payer_id for um UUID válido que corresponderia ao health_insurance_id)
UPDATE public.plans 
SET health_insurance_id = payer_id 
WHERE health_insurance_id IS NULL 
  AND payer_id IS NOT NULL;
