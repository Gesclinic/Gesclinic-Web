-- Add 'grupo' column to service_prices table
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS grupo VARCHAR(255) DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN service_prices.grupo IS 'Grupo do serviço (ex: Consultas, Exames, Procedimentos)';
