-- Adicionar campo is_active à tabela service_prices
ALTER TABLE service_prices 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Criar índice para melhor performance
CREATE INDEX idx_service_prices_is_active ON service_prices(is_active);

-- Garantir que todos os registros existentes fiquem ativos
UPDATE service_prices SET is_active = true WHERE is_active IS NULL;
