-- ================================================
-- MIGRAÇÃO: Adicionar campos de Tributos (Reforma Tributária 2024)
-- ================================================
-- Data: 10 de fevereiro de 2026
-- Propósito: Adicionar configurações de tributos para NF-e conforme Reforma Tributária

-- ================================================
-- 1. Adicionar novas colunas de tributos
-- ================================================
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS icms_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS icms_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pis_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pis_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cofins_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cofins_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS iss_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS iss_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS issrf_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS issrf_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS inss_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS inss_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ibs_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ibs_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cbs_applicable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cbs_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS retains_taxes BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(50);

-- ================================================
-- 2. Criar índices para melhor performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_health_insurances_tax_regime 
ON health_insurances(clinic_id, tax_regime) 
WHERE tax_regime IS NOT NULL;

-- ================================================
-- 3. Adicionar comentários nas colunas para documentação
-- ================================================
COMMENT ON COLUMN health_insurances.icms_applicable IS 'ICMS aplicável (Imposto sobre Circulação de Mercadorias e Serviços)';
COMMENT ON COLUMN health_insurances.icms_rate IS 'Alíquota de ICMS em percentual';
COMMENT ON COLUMN health_insurances.pis_applicable IS 'PIS aplicável (Programa de Integração Social)';
COMMENT ON COLUMN health_insurances.pis_rate IS 'Alíquota de PIS em percentual';
COMMENT ON COLUMN health_insurances.cofins_applicable IS 'COFINS aplicável (Contribuição para Financiamento da Seguridade Social)';
COMMENT ON COLUMN health_insurances.cofins_rate IS 'Alíquota de COFINS em percentual';
COMMENT ON COLUMN health_insurances.iss_applicable IS 'ISS aplicável (Imposto sobre Serviço)';
COMMENT ON COLUMN health_insurances.iss_rate IS 'Alíquota de ISS em percentual';
COMMENT ON COLUMN health_insurances.issrf_applicable IS 'ISSRF aplicável (Imposto sobre Serviço Retenção Federal)';
COMMENT ON COLUMN health_insurances.issrf_rate IS 'Alíquota de ISSRF em percentual (retenção federal)';
COMMENT ON COLUMN health_insurances.inss_applicable IS 'INSS aplicável';
COMMENT ON COLUMN health_insurances.inss_rate IS 'Alíquota de INSS em percentual';
COMMENT ON COLUMN health_insurances.ibs_applicable IS 'IBS aplicável (Imposto sobre Bens e Serviços - Reforma Tributária 2024)';
COMMENT ON COLUMN health_insurances.ibs_rate IS 'Alíquota de IBS em percentual (novo sistema 2024+)';
COMMENT ON COLUMN health_insurances.cbs_applicable IS 'CBS aplicável (Contribuição Social sobre Bens e Serviços - Reforma Tributária 2024)';
COMMENT ON COLUMN health_insurances.cbs_rate IS 'Alíquota de CBS em percentual (novo sistema 2024+)';
COMMENT ON COLUMN health_insurances.retains_taxes IS 'Indica se a operadora retém impostos';
COMMENT ON COLUMN health_insurances.tax_regime IS 'Regime tributário (ex: Simples, Lucro Real, Lucro Presumido)';

-- ================================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- ================================================
