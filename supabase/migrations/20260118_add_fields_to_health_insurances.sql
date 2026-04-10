-- Adicionar campos de configuração aos convênios
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_margin_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_rules TEXT;
