-- Adicionar colunas de preço em service_prices

ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS notes TEXT;
