-- ============================================================================
-- MIGRAÇÕES REPASSE - VERSÃO SAFE (Remove antes de criar)
-- ============================================================================
-- Data: 2026-04-11
-- Idempotency: 100% - Remove tudo antes de criar novamente
-- ============================================================================

-- ============================================================================
-- STEP 1: REMOVER TUDO QUE JÁ EXISTE (Safe approach)
-- ============================================================================

-- Drop tables first (CASCADE will automatically drop all policies + indexes + constraints)
DROP TABLE IF EXISTS medical_repasse CASCADE;
DROP TABLE IF EXISTS medical_production CASCADE;
DROP TABLE IF EXISTS medical_repasse_config CASCADE;
DROP TABLE IF EXISTS repasse_config CASCADE;
DROP TABLE IF EXISTS repasse_config_servico CASCADE;

---

-- ============================================================================
-- STEP 2: CRIAR TUDO DO ZERO
-- ============================================================================

-- ============================================================================
-- TABLE 1: repasse_config_servico
-- ============================================================================

CREATE TABLE repasse_config_servico (
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

-- Create indexes
CREATE INDEX idx_rcs_clinic ON repasse_config_servico(clinic_id);
CREATE INDEX idx_rcs_professional ON repasse_config_servico(professional_id);
CREATE INDEX idx_rcs_service ON repasse_config_servico(service_id);
CREATE INDEX idx_rcs_tax_regime ON repasse_config_servico(tax_regime);
CREATE INDEX idx_rcs_regime_tipo ON repasse_config_servico(regime_tipo);
CREATE INDEX idx_rcs_ativo ON repasse_config_servico(ativo);

-- Enable RLS
ALTER TABLE repasse_config_servico ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update repasse configs for their clinic" ON repasse_config_servico
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete repasse configs for their clinic" ON repasse_config_servico
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE repasse_config_servico IS 'Professional commission (repasse) configuration per service and clinic';
COMMENT ON COLUMN repasse_config_servico.percentual IS 'Commission percentage to be repassed to the professional (0-100)';

---

-- ============================================================================
-- TABLE 2: repasse_config
-- ============================================================================

CREATE TABLE repasse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL,
  
  -- New single regime_code field
  regime_code VARCHAR(30) NOT NULL DEFAULT 'presumido' 
    CHECK (regime_code IN (
      'simples_3',
      'simples_5',
      'simples_r',
      'presumido',
      'presumido_hospitalar',
      'real_conservador',
      'real_otimizado'
    )),
  
  -- Calculation base
  tipo_base VARCHAR(10) NOT NULL DEFAULT 'LIQUIDO' 
    CHECK (tipo_base IN ('BRUTO', 'LIQUIDO')),
  
  -- Optional ISS customization
  iss_customizado NUMERIC(5,2),
  
  -- Repasse percentage
  percentual NUMERIC(5,2) NOT NULL DEFAULT 70 
    CHECK (percentual >= 0 AND percentual <= 100),
  
  -- Active status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT unique_repasse_per_clinic UNIQUE(clinic_id, professional_id, service_id)
);

-- Create indexes
CREATE INDEX idx_rc_clinic ON repasse_config(clinic_id);
CREATE INDEX idx_rc_professional ON repasse_config(professional_id);
CREATE INDEX idx_rc_service ON repasse_config(service_id);
CREATE INDEX idx_rc_regime ON repasse_config(regime_code);
CREATE INDEX idx_rc_ativo ON repasse_config(ativo);

-- Enable RLS
ALTER TABLE repasse_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
-- TABLE 3: medical_repasse_config
-- ============================================================================

CREATE TABLE medical_repasse_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    
    percentual_profissional NUMERIC(5,2) DEFAULT 70,
    percentual_clinica NUMERIC(5,2) DEFAULT 30,
    
    aplicar_imposto BOOLEAN DEFAULT TRUE,
    aplicar_glosa BOOLEAN DEFAULT TRUE,
    
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(clinic_id, professional_id)
);

CREATE INDEX idx_mrc_clinic ON medical_repasse_config(clinic_id);
CREATE INDEX idx_mrc_professional ON medical_repasse_config(professional_id);
CREATE INDEX idx_mrc_ativo ON medical_repasse_config(ativo);

-- Enable RLS
ALTER TABLE medical_repasse_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view repasse config" ON medical_repasse_config
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert repasse config" ON medical_repasse_config
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update repasse config" ON medical_repasse_config
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

---

-- ============================================================================
-- TABLE 4: medical_production
-- ============================================================================

CREATE TABLE medical_production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    
    atendimento_id UUID,
    tipo TEXT,
    
    valor_bruto NUMERIC(10,2),
    valor_liquido NUMERIC(10,2),
    
    data_atendimento DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mp_clinic ON medical_production(clinic_id);
CREATE INDEX idx_mp_professional ON medical_production(professional_id);
CREATE INDEX idx_mp_atendimento ON medical_production(atendimento_id);
CREATE INDEX idx_mp_data ON medical_production(data_atendimento);

-- Enable RLS
ALTER TABLE medical_production ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view medical production" ON medical_production
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert medical production" ON medical_production
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

---

-- ============================================================================
-- TABLE 5: medical_repasse
-- ============================================================================

CREATE TABLE medical_repasse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    
    periodo_inicio DATE,
    periodo_fim DATE,
    
    total_bruto NUMERIC(12,2),
    total_liquido NUMERIC(12,2),
    
    valor_profissional NUMERIC(12,2),
    valor_clinica NUMERIC(12,2),
    
    status TEXT DEFAULT 'pendente',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mr_clinic ON medical_repasse(clinic_id);
CREATE INDEX idx_mr_professional ON medical_repasse(professional_id);
CREATE INDEX idx_mr_status ON medical_repasse(status);
CREATE INDEX idx_mr_periodo ON medical_repasse(periodo_inicio, periodo_fim);

-- Enable RLS
ALTER TABLE medical_repasse ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view medical repasse" ON medical_repasse
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert medical repasse" ON medical_repasse
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update medical repasse" ON medical_repasse
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid())
  );

-- ============================================================================
-- ✅ MIGRATIONS COMPLETAS - SAFE VERSION
-- ============================================================================
-- 5 tabelas criadas
-- 22 índices criados
-- 15 RLS policies criadas
-- 100% idempotent (seguro rodar 2x)
-- ============================================================================
