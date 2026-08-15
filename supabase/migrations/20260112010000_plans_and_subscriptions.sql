-- Criar tabela de planos (plans)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  max_users INT DEFAULT 1,
  max_doctors INT DEFAULT 1,
  has_financial BOOLEAN DEFAULT FALSE,
  has_stock BOOLEAN DEFAULT FALSE,
  has_reports BOOLEAN DEFAULT FALSE,
  has_multi_unit BOOLEAN DEFAULT FALSE,
  stripe_product_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Relations that depend on clinics/profiles are created after the base schema.
