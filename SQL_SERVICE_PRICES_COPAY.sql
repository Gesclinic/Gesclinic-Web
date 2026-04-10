-- Adicionar coluna co_pay (coparticipação) em service_prices

ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS co_pay DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS copay_percentage DECIMAL(5,2);
