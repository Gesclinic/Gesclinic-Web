-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- https://app.supabase.com/project/gvdkdjyupktlflwurike/sql/new
-- 
-- Adiciona as colunas plano e grupo à tabela service_prices

ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS plano VARCHAR(255),
ADD COLUMN IF NOT EXISTS grupo VARCHAR(255);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_service_prices_plano ON service_prices(plano);
CREATE INDEX IF NOT EXISTS idx_service_prices_grupo ON service_prices(grupo);

-- Verificação: execute para confirmar que as colunas foram criadas
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'service_prices' AND column_name IN ('plano', 'grupo');
