-- ============================================================================
-- ETAPA 1 v2.0: Tax Configuration & Payer Rules
-- ============================================================================
-- Suporta cálculos de PIS/COFINS/CSLL/IR/ISSQN
-- Data: 2026-05-20

-- ============================================================================
-- 1. TAX_CONFIGURATIONS (Configuração de Impostos por Clínica)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_configurations (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Regime Tributário
  tax_regime VARCHAR NOT NULL DEFAULT 'simples_nacional' 
    CHECK (tax_regime IN ('lucro_real', 'lucro_presumido', 'simples_nacional')),
  
  -- Percentuais Padrão (podem ser sobrescrito por payer_rule)
  default_pis_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.65,
  default_cofins_percent NUMERIC(5, 2) NOT NULL DEFAULT 7.60,
  default_csll_percent NUMERIC(5, 2) NOT NULL DEFAULT 9.00,
  default_ir_percent NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
  
  -- ISSQN (Imposto sobre Serviços)
  issqn_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
  issqn_municipality_code VARCHAR(7), -- IBGE code
  issqn_municipality_name VARCHAR(255),
  
  -- Configurações Especiais (Lucro Presumido)
  presumed_profit_margin NUMERIC(5, 2) DEFAULT 32.00, -- Margem presumida
  
  -- Retenção de Impostos
  retains_ist_on_particulars BOOLEAN DEFAULT FALSE, -- ISS retido na fonte
  retains_ir_on_health_plans BOOLEAN DEFAULT TRUE,  -- IR retido de convênios
  retains_pis_on_particulars BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id)
);

-- ============================================================================
-- 2. APPOINTMENT_PAYER_RULES (Regras de Faturamento por Convênio/Particular)
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_payer_rules (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Tipo de Pagador
  payer_type VARCHAR NOT NULL CHECK (payer_type IN ('CONVENIO', 'PARTICULAR')),
  
  -- Referências (mutualmente exclusivas por tipo)
  health_plan_id UUID REFERENCES health_plans(id) ON DELETE CASCADE, -- Se CONVENIO
  client_id UUID REFERENCES patients(id) ON DELETE CASCADE,          -- Se PARTICULAR (específico)
  
  -- Informações Básicas
  name VARCHAR NOT NULL, -- Ex: "Unimed SP", "Particular - Desconto 20%"
  description TEXT,
  
  -- Desconto
  discount_percent NUMERIC(5, 2) DEFAULT 0.00,
  discount_type VARCHAR DEFAULT 'percentage' 
    CHECK (discount_type IN ('percentage', 'fixed_amount', 'table_based')),
  discount_fixed_amount NUMERIC(10, 2), -- Se tipo é fixed_amount
  discount_applies_to VARCHAR DEFAULT 'gross_value'
    CHECK (discount_applies_to IN ('gross_value', 'net_value')),
  discount_reason VARCHAR,
  
  -- Impostos Específicos (sobrescreve tax_configurations)
  pis_percent NUMERIC(5, 2),           -- NULL = usar default
  cofins_percent NUMERIC(5, 2),
  csll_percent NUMERIC(5, 2),
  ir_percent NUMERIC(5, 2),
  issqn_percent NUMERIC(5, 2),
  
  -- Retenção de Impostos (sobrescreve global)
  retains_ist BOOLEAN,                 -- ISS retido na fonte
  retains_ir BOOLEAN,
  retains_pis BOOLEAN,
  retains_cofins BOOLEAN,
  
  -- Informações de Pagamento
  payment_method VARCHAR DEFAULT 'pix'
    CHECK (payment_method IN ('pix', 'boleto', 'ted', 'doc', 'dinheiro', 'cartao')),
  days_to_pay INT DEFAULT 0,           -- 0 = à vista, 30 = 30 dias
  
  -- Configurações Especiais
  requires_pre_authorization BOOLEAN DEFAULT FALSE,
  requires_guide_number BOOLEAN DEFAULT FALSE,
  
  -- Valores Limites
  minimum_value NUMERIC(10, 2),
  maximum_value NUMERIC(10, 2),
  
  -- Suspensão Temporária
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspension_reason VARCHAR,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_health_plan CHECK (
    (payer_type = 'CONVENIO' AND health_plan_id IS NOT NULL) OR
    (payer_type = 'PARTICULAR' AND health_plan_id IS NULL)
  ),
  UNIQUE(clinic_id, payer_type, health_plan_id, client_id)
);

-- ============================================================================
-- 3. ATUALIZAR ar_invoices COM CAMPOS DE IMPOSTOS DETALHADOS
-- ============================================================================
-- Adicionar colunas se ainda não existirem
ALTER TABLE ar_invoices 
ADD COLUMN IF NOT EXISTS payer_type VARCHAR CHECK (payer_type IN ('CONVENIO', 'PARTICULAR')),
ADD COLUMN IF NOT EXISTS payer_rule_id BIGINT REFERENCES appointment_payer_rules(id),
ADD COLUMN IF NOT EXISTS tax_regime VARCHAR,
ADD COLUMN IF NOT EXISTS tax_configuration_id BIGINT REFERENCES tax_configurations(id);

-- Colunas de impostos individualizados
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS pis_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS pis_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cofins_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS cofins_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS csll_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS csll_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ir_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS ir_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS issqn_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS issqn_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_impostos NUMERIC(10, 2) DEFAULT 0;

-- ============================================================================
-- 4. INDEXES para Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tax_configurations_clinic_id ON tax_configurations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payer_rules_clinic_id ON appointment_payer_rules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payer_rules_health_plan_id ON appointment_payer_rules(health_plan_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_payer_rule_id ON ar_invoices(payer_rule_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_tax_configuration_id ON ar_invoices(tax_configuration_id);

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_payer_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/edit their clinic's tax configurations
CREATE POLICY "tax_configurations_clinic_isolation" ON tax_configurations
  USING (clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()));

-- RLS Policy: Users can only see/edit their clinic's payer rules
CREATE POLICY "appointment_payer_rules_clinic_isolation" ON appointment_payer_rules
  USING (clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()));

-- ============================================================================
-- 6. SEED DATA (Exemplo para Neuroclinica)
-- ============================================================================
-- Inserir configuração de imposto padrão para a clínica
INSERT INTO tax_configurations (
  clinic_id,
  tax_regime,
  default_pis_percent,
  default_cofins_percent,
  default_csll_percent,
  default_ir_percent,
  issqn_percent,
  issqn_municipality_code,
  issqn_municipality_name,
  presumed_profit_margin
) VALUES (
  'dcee437c-fd14-463c-b25e-a318f5da60b7', -- Neuroclinica Cascavel
  'simples_nacional',
  1.65,
  7.60,
  9.00,
  15.00,
  5.00,
  '4104907', -- IBGE code para Cascavel, PR
  'Cascavel',
  32.00
) ON CONFLICT (clinic_id) DO NOTHING;

-- Inserir regra padrão para Particulares
INSERT INTO appointment_payer_rules (
  clinic_id,
  payer_type,
  name,
  description,
  discount_percent,
  payment_method,
  days_to_pay,
  is_active
) VALUES (
  'dcee437c-fd14-463c-b25e-a318f5da60b7',
  'PARTICULAR',
  'Paciente Particular - Sem Desconto',
  'Regra padrão para pacientes particulares',
  0.00,
  'pix',
  0,
  TRUE
) ON CONFLICT (clinic_id, payer_type, health_plan_id, client_id) DO NOTHING;
