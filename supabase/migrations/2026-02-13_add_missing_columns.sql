-- Migration para adicionar colunas faltantes em service_prices e professional_services
-- Data: 2026-02-13

-- 1. Adicionar coluna plan_id em service_prices
ALTER TABLE public.service_prices
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

-- 2. Adicionar coluna price em professional_services
ALTER TABLE public.professional_services
ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_prices_plan_id 
ON public.service_prices(plan_id);

CREATE INDEX IF NOT EXISTS idx_professional_services_price 
ON public.professional_services(price);

-- Atualizar RLS policies se necessário
-- O restante das policies já deve estar configurado
