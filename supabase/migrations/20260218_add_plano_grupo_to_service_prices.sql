-- Add plano and grupo columns to service_prices table
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS plano VARCHAR(255),
ADD COLUMN IF NOT EXISTS grupo VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_service_prices_plano ON service_prices(plano);
CREATE INDEX IF NOT EXISTS idx_service_prices_grupo ON service_prices(grupo);
