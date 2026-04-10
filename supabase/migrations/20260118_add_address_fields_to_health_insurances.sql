-- ============================================================
-- Migration: Adicionar Campos de Endereço à Tabela health_insurances
-- Data: 18 de janeiro de 2026
-- ============================================================

-- Adicionar campos de endereço à tabela health_insurances
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_state VARCHAR(2),
ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(20);

-- Criar índice para melhor performance nas buscas por cidade/estado
CREATE INDEX IF NOT EXISTS idx_health_insurances_address 
ON health_insurances(clinic_id, address_city, address_state) 
WHERE active = TRUE;

-- ============================================================
-- Comentários nas colunas para documentação
-- ============================================================
COMMENT ON COLUMN health_insurances.address_street IS 'Rua/Avenida do endereço';
COMMENT ON COLUMN health_insurances.address_number IS 'Número do endereço';
COMMENT ON COLUMN health_insurances.address_neighborhood IS 'Bairro';
COMMENT ON COLUMN health_insurances.address_city IS 'Cidade';
COMMENT ON COLUMN health_insurances.address_state IS 'Estado (UF) - 2 caracteres';
COMMENT ON COLUMN health_insurances.address_zip_code IS 'CEP';

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
