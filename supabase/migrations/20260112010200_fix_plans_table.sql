-- Instalações legadas podem ter clinic_id; instalações novas já usam planos globais.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'plans'
      AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE public.plans ALTER COLUMN clinic_id DROP NOT NULL;
  END IF;
END
$$;

-- Adicionar colunas faltantes à tabela plans
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_doctors INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS has_financial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_stock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_reports BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_multi_unit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Criar índice para slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);

-- Atualizar ou inserir planos padrão com UUIDs
INSERT INTO plans (id, name, slug, description, max_users, max_doctors, has_financial, has_stock, has_reports, has_multi_unit, stripe_product_id)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Plano Básico', 'basic', 'Agenda Essencial — Para clínicas que estão começando', 2, 2, false, false, false, false, 'prod_basic'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Plano Profissional', 'professional', 'Gestão Completa — Para clínicas que querem controle e lucro', 10, 5, true, true, true, false, 'prod_professional'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Plano Enterprise', 'enterprise', 'Escalas & Performance — para redes, grupos e operações complexas', 999, 999, true, true, true, true, 'prod_enterprise')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  max_users = EXCLUDED.max_users,
  max_doctors = EXCLUDED.max_doctors,
  has_financial = EXCLUDED.has_financial,
  has_stock = EXCLUDED.has_stock,
  has_reports = EXCLUDED.has_reports,
  has_multi_unit = EXCLUDED.has_multi_unit,
  stripe_product_id = EXCLUDED.stripe_product_id,
  updated_at = NOW();
