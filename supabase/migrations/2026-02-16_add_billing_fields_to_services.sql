-- ============================================================
-- Migration: Adicionar Campos de Faturamento aos Serviços
-- Data: 16 de fevereiro de 2026
-- Objetivo: Adicionar suporte para categoria de serviço e controle de faturabilidade
-- ============================================================

-- Adicionar colunas de faturamento à tabela services
ALTER TABLE IF EXISTS services
ADD COLUMN IF NOT EXISTS service_category VARCHAR(50) DEFAULT 'consultation' CHECK (service_category IN ('consultation', 'exam', 'procedure', 'other')),
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true;

-- Criar índice para melhor performance nas buscas by category
CREATE INDEX IF NOT EXISTS idx_services_category 
ON services(clinic_id, service_category) 
WHERE active = TRUE;

-- Criar índice para melhor performance nas buscas de serviços faturáveis
CREATE INDEX IF NOT EXISTS idx_services_billable 
ON services(clinic_id, is_billable) 
WHERE active = TRUE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN services.service_category IS 'Categoria do serviço: consulta, exame, procedimento ou outro';
COMMENT ON COLUMN services.is_billable IS 'Indica se o serviço pode ser faturado para convênios/pacientes';
