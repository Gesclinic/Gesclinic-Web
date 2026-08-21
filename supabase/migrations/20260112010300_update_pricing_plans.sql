-- Atualizar os planos com os novos preços e descrições

DO $$
BEGIN
IF to_regclass('public.subscription_plans') IS NOT NULL THEN

-- Plano Básico
UPDATE subscription_plans 
SET 
  name = 'Plano Básico',
  description = 'Agenda Essencial — Para clínicas que estão começando',
  price_monthly = 99.00,
  price_annual = 990.00,
  max_users = 2,
  max_patients = 500,
  features = '{
    "agenda": true,
    "financeiro": false,
    "estoque": false,
    "pacientes": true,
    "profissionais": true,
    "relatorios": false,
    "api_access": false,
    "custom_branding": false,
    "medical_specialty": false,
    "advanced_reporting": false,
    "stock_control": false
  }'::jsonb
WHERE slug = 'basic';

-- Plano Profissional
UPDATE subscription_plans 
SET 
  name = 'Plano Profissional',
  description = 'Gestão Completa — Para clínicas que querem controle e lucro',
  price_monthly = 249.00,
  price_annual = 2490.00,
  max_users = 10,
  max_patients = 5000,
  features = '{
    "agenda": true,
    "financeiro": true,
    "estoque": true,
    "pacientes": true,
    "profissionais": true,
    "relatorios": true,
    "api_access": false,
    "custom_branding": true,
    "medical_specialty": true,
    "advanced_reporting": true,
    "stock_control": true
  }'::jsonb
WHERE slug = 'professional';

-- Plano Enterprise
UPDATE subscription_plans 
SET 
  name = 'Plano Enterprise',
  description = 'Escala & Performance — Para redes, grupos e operações complexas',
  price_monthly = NULL,
  price_annual = NULL,
  max_users = 999,
  max_patients = 999999,
  features = '{
    "agenda": true,
    "financeiro": true,
    "estoque": true,
    "pacientes": true,
    "profissionais": true,
    "relatorios": true,
    "api_access": true,
    "custom_branding": true,
    "medical_specialty": true,
    "advanced_reporting": true,
    "stock_control": true,
    "multi_units": true,
    "dre_per_unit": true,
    "medical_repasse": true,
    "dedicated_support": true
  }'::jsonb
WHERE slug = 'enterprise';

END IF;
END
$$;

SELECT 'Planos atualizados com sucesso!' as status;
