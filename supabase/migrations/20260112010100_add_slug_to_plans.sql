-- Add slug column to plans table if it doesn't exist
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add constraints and indexes if needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);

-- Insert initial plans data (or update if they exist)
INSERT INTO plans (id, name, slug, description, max_users, max_doctors, has_financial, has_stock, has_reports, has_multi_unit, stripe_product_id)
VALUES
  ('plan_basic', 'Plano Básico', 'basic', 'Agenda Essencial — Para clínicas que estão começando', 2, 2, false, false, false, false, 'prod_basic'),
  ('plan_professional', 'Plano Profissional', 'professional', 'Gestão Completa — Para clínicas que querem controle e lucro', 10, 5, true, true, true, false, 'prod_professional'),
  ('plan_enterprise', 'Plano Enterprise', 'enterprise', 'Escalas & Performance — para redes, grupos e operações complexas', 999, 999, true, true, true, true, 'prod_enterprise')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  max_users = EXCLUDED.max_users,
  max_doctors = EXCLUDED.max_doctors,
  has_financial = EXCLUDED.has_financial,
  has_stock = EXCLUDED.has_stock,
  has_reports = EXCLUDED.has_reports,
  has_multi_unit = EXCLUDED.has_multi_unit,
  stripe_product_id = EXCLUDED.stripe_product_id;
