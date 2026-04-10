-- Script completo para configurar service_prices corretamente

-- 1. Adicionar service_id se não existir
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS service_id UUID,
ADD COLUMN IF NOT EXISTS health_insurance_id UUID,
ADD COLUMN IF NOT EXISTS base_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS clinic_id UUID;

-- 2. Remover constraints existentes para recriar corretamente
ALTER TABLE service_prices
DROP CONSTRAINT IF EXISTS fk_service_prices_service_id CASCADE;

ALTER TABLE service_prices
DROP CONSTRAINT IF EXISTS fk_service_prices_health_insurance_id CASCADE;

ALTER TABLE service_prices
DROP CONSTRAINT IF EXISTS fk_service_prices_clinic_id CASCADE;

-- 3. Criar foreign key para services
ALTER TABLE service_prices
ADD CONSTRAINT fk_service_prices_service_id 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

-- 4. Criar foreign key para health_insurances
ALTER TABLE service_prices
ADD CONSTRAINT fk_service_prices_health_insurance_id 
FOREIGN KEY (health_insurance_id) REFERENCES health_insurances(id) ON DELETE CASCADE;

-- 5. Criar foreign key para clinics
ALTER TABLE service_prices
ADD CONSTRAINT fk_service_prices_clinic_id 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
