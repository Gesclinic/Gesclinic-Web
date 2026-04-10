-- ============================================================================
-- CONSOLIDADO: 3 MIGRAÇÕES DE REPASSE (Em ordem de execução)
-- ============================================================================
-- Data: 2026-04-11
-- Propósito: Criar tabelas repasse antes de PHASE 1 triggers
-- Ordem: 1.repasse_config_servico → 2.repasse_config → 3.medical_repasse_module
-- ============================================================================

-- ============================================================================
-- MIGRATION 1/3: repasse_config_servico
-- ============================================================================

CREATE TABLE IF NOT EXISTS repasse_config_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  -- Base calculation type
  tipo_base VARCHAR(20) NOT NULL DEFAULT 'bruto' CHECK (tipo_base IN ('bruto', 'liquido')),
  
  -- Repasse percentage (0-100)
  percentual NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (percentual >= 0 AND percentual <= 100),
  
  -- Tax regime selection
  tax_regime VARCHAR(20) NOT NULL DEFAULT 'simples' CHECK (tax_regime IN ('simples', 'simples_r', 'presumido', 'real')),
  
  -- Tax treatment type (hospital equivalence support)
  regime_tipo VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (regime_tipo IN ('normal', 'equip_hospitalar')),
  
  -- Active status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: only one rule per professional + service combination
  CONSTRAINT unique_professional_service_per_clinic UNIQUE(clinic_id, professional_id, service_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_repasse_config_clinic ON repasse_config_servico(clinic_id);
CREATE INDEX IF NOT EXISTS idx_repasse_config_professional ON repasse_config_servico(professional_id);
CREATE INDEX IF NOT EXISTS idx_repasse_config_service ON repasse_config_servico(service_id);
CREATE INDEX IF NOT EXISTS idx_repasse_config_tax_regime ON repasse_config_servico(tax_regime);
CREATE INDEX IF NOT EXISTS idx_repasse_config_regime_tipo ON repasse_config_servico(regime_tipo);
CREATE INDEX IF NOT EXISTS idx_repasse_config_ativo ON repasse_config_servico(ativo);

-- Enable RLS
ALTER TABLE repasse_config_servico ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow clinic users to see their own repasse configs
CREATE POLICY "Users can view repasse configs for their clinic" ON repasse_config_servico
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert repasse configs for their clinic" ON repasse_config_servico
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update repasse configs for their clinic" ON repasse_config_servico
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete repasse configs for their clinic" ON repasse_config_servico
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE repasse_config_servico IS 'Professional commission (repasse) configuration per service and clinic. Supports multiple tax regimes and hospital equivalence.';
COMMENT ON COLUMN repasse_config_servico.tipo_base IS 'Calculation base: bruto (no deductions) or liquido (with tax deductions)';
COMMENT ON COLUMN repasse_config_servico.percentual IS 'Commission percentage to be repassed to the professional (0-100)';
COMMENT ON COLUMN repasse_config_servico.tax_regime IS 'Tax regime: simples (18%), simples_r (14.93%), presumido (23.25%), real (23.3%)';
COMMENT ON COLUMN repasse_config_servico.regime_tipo IS 'Tax treatment type: normal (standard rates) or equip_hospitalar (hospital equivalence - reduced rates)';
COMMENT ON COLUMN repasse_config_servico.ativo IS 'Whether this rule is active';

---

-- ============================================================================
-- MIGRATION 2/3: repasse_config (NEW with 7-regime support)
-- ============================================================================

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Users can view repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can insert repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can update repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can delete repasse configs for their clinic" ON repasse_config;

-- Drop existing table if it exists with old structure
DROP TABLE IF EXISTS repasse_config CASCADE;

-- Create fresh table
CREATE TABLE repasse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL,
  
  -- New single regime_code field (replaces tax_regime + regime_tipo)
  regime_code VARCHAR(30) NOT NULL DEFAULT 'presumido' 
    CHECK (regime_code IN (
      'simples_3',              -- Simples Nacional Anexo III - 18%
      'simples_5',              -- Simples Nacional Anexo V - 15%
      'simples_r',              -- Simples com Fator R - 14.93%
      'presumido',              -- Lucro Presumido Normal - 23.25%
      'presumido_hospitalar',   -- Presumido Equiparação Hospitalar - 15.6%
      'real_conservador',       -- Lucro Real Conservador - 23.3%
      'real_otimizado'          -- Lucro Real Otimizado (Equiparação) - 17.5%
    )),
  
  -- Calculation base: BRUTO (valor completo) or LIQUIDO (após impostos)
  tipo_base VARCHAR(10) NOT NULL DEFAULT 'LIQUIDO' 
    CHECK (tipo_base IN ('BRUTO', 'LIQUIDO')),
  
  -- Optional ISS customization (override regime default)
  iss_customizado NUMERIC(5,2),
  
  -- Repasse percentage to professional (0-100)
  percentual NUMERIC(5,2) NOT NULL DEFAULT 70 
    CHECK (percentual >= 0 AND percentual <= 100),
  
  -- Active status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: only one rule per professional + service combination per clinic
  CONSTRAINT unique_repasse_per_clinic UNIQUE(clinic_id, professional_id, service_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_repasse_config_clinic_2 ON repasse_config(clinic_id);
CREATE INDEX IF NOT EXISTS idx_repasse_config_professional_2 ON repasse_config(professional_id);
CREATE INDEX IF NOT EXISTS idx_repasse_config_service_2 ON repasse_config(service_id);
CREATE INDEX IF NOT EXISTS idx_repasse_config_regime ON repasse_config(regime_code);
CREATE INDEX IF NOT EXISTS idx_repasse_config_ativo_2 ON repasse_config(ativo);

-- Enable RLS
ALTER TABLE repasse_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow clinic users to see their own repasse configs
CREATE POLICY "Users can view repasse configs for their clinic" ON repasse_config
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert repasse configs for their clinic" ON repasse_config
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update repasse configs for their clinic" ON repasse_config
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete repasse configs for their clinic" ON repasse_config
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

---

-- ============================================================================
-- MIGRATION 3/3: medical_repasse_module (Complete repasse system)
-- ============================================================================

-- ==== 1. CONFIGURAÇÃO DE REPASSE POR PROFISSIONAL ====
CREATE TABLE IF NOT EXISTS medical_repasse_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    professional_id UUID NOT NULL,
    
    percentual_profissional NUMERIC(5,2) DEFAULT 70,
    percentual_clinica NUMERIC(5,2) DEFAULT 30,
    
    aplicar_imposto BOOLEAN DEFAULT TRUE,
    aplicar_glosa BOOLEAN DEFAULT TRUE,
    
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(clinic_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_medrepconf_clinic ON medical_repasse_config(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medrepconf_professional ON medical_repasse_config(professional_id);
CREATE INDEX IF NOT EXISTS idx_medrepconf_ativo ON medical_repasse_config(ativo);

-- Foreign keys for medical_repasse_config
ALTER TABLE medical_repasse_config 
ADD CONSTRAINT fk_medrepconf_professional 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;

ALTER TABLE medical_repasse_config 
ADD CONSTRAINT fk_medrepconf_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- ==== 2. PRODUÇÃO MÉDICA (BASE DO CÁLCULO) ====
CREATE TABLE IF NOT EXISTS medical_production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    professional_id UUID NOT NULL,
    
    atendimento_id UUID,
    tipo TEXT, -- 'consulta', 'exame', 'cirurgia'
    
    valor_bruto NUMERIC(10,2),
    valor_liquido NUMERIC(10,2),
    
    data_atendimento DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medprod_clinic ON medical_production(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medprod_professional ON medical_production(professional_id);
CREATE INDEX IF NOT EXISTS idx_medprod_atendimento ON medical_production(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_medprod_data ON medical_production(data_atendimento);

-- Foreign keys for medical_production
ALTER TABLE medical_production 
ADD CONSTRAINT fk_medprod_professional 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;

ALTER TABLE medical_production 
ADD CONSTRAINT fk_medprod_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- ==== 3. RESULTADO DO REPASSE ====
CREATE TABLE IF NOT EXISTS medical_repasse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    professional_id UUID,
    
    periodo_inicio DATE,
    periodo_fim DATE,
    
    total_bruto NUMERIC(12,2),
    total_liquido NUMERIC(12,2),
    
    valor_profissional NUMERIC(12,2),
    valor_clinica NUMERIC(12,2),
    
    status TEXT DEFAULT 'pendente', -- 'pendente', 'processado', 'pago'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medrepa_clinic ON medical_repasse(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medrepa_professional ON medical_repasse(professional_id);
CREATE INDEX IF NOT EXISTS idx_medrepa_status ON medical_repasse(status);
CREATE INDEX IF NOT EXISTS idx_medrepa_periodo ON medical_repasse(periodo_inicio, periodo_fim);

-- Foreign keys for medical_repasse
ALTER TABLE medical_repasse 
ADD CONSTRAINT fk_medrepa_professional 
FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;

ALTER TABLE medical_repasse 
ADD CONSTRAINT fk_medrepa_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- ==== 7. RLS POLICIES ====
ALTER TABLE medical_repasse_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_repasse ENABLE ROW LEVEL SECURITY;

-- Policies para medical_repasse_config
DROP POLICY IF EXISTS "Users can view repasse config" ON medical_repasse_config;
CREATE POLICY "Users can view repasse config" ON medical_repasse_config
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert repasse config" ON medical_repasse_config;
CREATE POLICY "Users can insert repasse config" ON medical_repasse_config
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update repasse config" ON medical_repasse_config;
CREATE POLICY "Users can update repasse config" ON medical_repasse_config
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Policies para medical_production
DROP POLICY IF EXISTS "Users can view medical production" ON medical_production;
CREATE POLICY "Users can view medical production" ON medical_production
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert medical production" ON medical_production;
CREATE POLICY "Users can insert medical production" ON medical_production
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Policies para medical_repasse
DROP POLICY IF EXISTS "Users can view medical repasse" ON medical_repasse;
CREATE POLICY "Users can view medical repasse" ON medical_repasse
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert medical repasse" ON medical_repasse;
CREATE POLICY "Users can insert medical repasse" ON medical_repasse
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update medical repasse" ON medical_repasse;
CREATE POLICY "Users can update medical repasse" ON medical_repasse
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

-- ============================================================================
-- ✅ 3 MIGRATIONS CONSOLIDADAS - PRONTO PARA EXECUÇÃO
-- ============================================================================
-- Tabelas criadas:
-- 1. repasse_config_servico (repasse por serviço)
-- 2. repasse_config (repasse com 7 regimes)
-- 3. medical_repasse_config (repasse por profissional)
-- 4. medical_production (produção médica base)
-- 5. medical_repasse (resultado do repasse)
-- 
-- RLS Habilitado em todas as tabelas
-- Índices criados para performance
-- ============================================================================
