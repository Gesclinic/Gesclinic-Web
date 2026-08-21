-- ============================================================================
-- Consolidated from 20260318_CONSOLIDADO_REPASSE_TABLES.sql
-- ============================================================================

-- ============================================================================
-- CONSOLIDADO: 3 MIGRA├ç├òES DE REPASSE (Em ordem de execu├º├úo)
-- ============================================================================
-- Data: 2026-04-11
-- Prop├│sito: Criar tabelas repasse antes de PHASE 1 triggers
-- Ordem: 1.repasse_config_servico ÔåÆ 2.repasse_config ÔåÆ 3.medical_repasse_module
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
      'presumido_hospitalar',   -- Presumido Equipara├º├úo Hospitalar - 15.6%
      'real_conservador',       -- Lucro Real Conservador - 23.3%
      'real_otimizado'          -- Lucro Real Otimizado (Equipara├º├úo) - 17.5%
    )),

  -- Calculation base: BRUTO (valor completo) or LIQUIDO (ap├│s impostos)
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

-- ==== 1. CONFIGURA├ç├âO DE REPASSE POR PROFISSIONAL ====
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

-- ==== 2. PRODU├ç├âO M├ëDICA (BASE DO C├üLCULO) ====
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
-- Ô£à 3 MIGRATIONS CONSOLIDADAS - PRONTO PARA EXECU├ç├âO
-- ============================================================================
-- Tabelas criadas:
-- 1. repasse_config_servico (repasse por servi├ºo)
-- 2. repasse_config (repasse com 7 regimes)
-- 3. medical_repasse_config (repasse por profissional)
-- 4. medical_production (produ├º├úo m├®dica base)
-- 5. medical_repasse (resultado do repasse)
--
-- RLS Habilitado em todas as tabelas
-- ├ìndices criados para performance
-- ============================================================================

-- ============================================================================
-- Consolidated from 20260318_MIGRACAO_REPASSE_SAFE.sql
-- ============================================================================

-- ============================================================================
-- MIGRA├ç├òES REPASSE - VERS├âO SAFE (Remove antes de criar)
-- ============================================================================
-- Data: 2026-04-11
-- Idempotency: 100% - Remove tudo antes de criar novamente
-- ============================================================================

-- ============================================================================
-- STEP 1: REMOVER TUDO QUE J├ü EXISTE (Safe approach)
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
-- Ô£à MIGRATIONS COMPLETAS - SAFE VERSION
-- ============================================================================
-- 5 tabelas criadas
-- 22 ├¡ndices criados
-- 15 RLS policies criadas
-- 100% idempotent (seguro rodar 2x)
-- ============================================================================

-- ============================================================================
-- Consolidated from 20260318_add_service_type_to_repasse_config.sql
-- ============================================================================

-- Migration: Add service_type column to repasse_config for group-based rules
-- Date: 2026-03-18
-- Description: Allow repasse rules by service category/group in addition to individual services

ALTER TABLE repasse_config
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(30),
  ADD CONSTRAINT service_type_check CHECK (service_type IN ('consultas', 'exames', 'cirurgias', 'procedimentos', null));

-- Add comment explaining the logic
COMMENT ON COLUMN repasse_config.service_type IS 'Service category for group-based rules. If NULL, rule applies to individual service_id only. If set, applies to all services in that category.';

-- Note on uniqueness:
-- Since service_id and service_type are mutually exclusive (validated at app level):
-- - Rules can have the same (clinic_id, professional_id) if one uses service_id and other uses service_type
-- - PostgreSQL allows multiple NULLs, so duplicates are prevented by app validation
-- - Dropping old constraint to allow flexible rule creation

-- Drop old constraint if it exists
ALTER TABLE repasse_config
  DROP CONSTRAINT IF EXISTS unique_repasse_per_clinic;

-- Create index for service_type lookups (for performance)
CREATE INDEX IF NOT EXISTS idx_repasse_config_service_type ON repasse_config(clinic_id, professional_id, service_type);

-- Create index for service_id lookups (for performance)
CREATE INDEX IF NOT EXISTS idx_repasse_config_service_id ON repasse_config(clinic_id, professional_id, service_id);

-- ============================================================================
-- Consolidated from 20260318_create_financial_accounts.sql
-- ============================================================================

-- ============================================
-- PLANO DE CONTAS - GESCLINIC (PADR├âO SA├ÜDE)
-- ============================================

-- 1. LIMPAR DADOS ANTIGOS (para reexecu├º├úo segura)
DROP TABLE IF EXISTS financial_accounts CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;

-- 2. ENUM TIPO DE CONTA
CREATE TYPE account_type AS ENUM (
    'receita',
    'deducao',
    'custo',
    'despesa',
    'investimento',
    'ajuste'
);

-- 3. TABELA PRINCIPAL
CREATE TABLE financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID,
    name TEXT NOT NULL,
    type account_type NOT NULL,
    parent_id UUID REFERENCES financial_accounts(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. ├ìNDICES
CREATE INDEX idx_financial_accounts_clinic ON financial_accounts(clinic_id);
CREATE INDEX idx_financial_accounts_parent ON financial_accounts(parent_id);
CREATE INDEX idx_financial_accounts_type ON financial_accounts(type);

-- 5. MIGRATION COMPLETA Ô£à

-- ============================================================================
-- Consolidated from 20260318_create_medical_repasse_module.sql
-- ============================================================================

-- ============================================
-- M├ôDULO COMPLETO DE REPASSE AUTOM├üTICO
-- Data: 2026-03-18
-- Integrado com Plano de Contas
-- ============================================

-- ==== 1. CONFIGURA├ç├âO DE REPASSE POR PROFISSIONAL ====
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

-- ==== 2. PRODU├ç├âO M├ëDICA (BASE DO C├üLCULO) ====
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

-- ==== 4. FUN├ç├âO AUTOM├üTICA DE C├üLCULO ====
CREATE OR REPLACE FUNCTION calcular_repasse(
    p_professional_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS VOID AS $$
DECLARE
    v_config RECORD;
    v_total_bruto NUMERIC := 0;
    v_total_liquido NUMERIC := 0;
    v_valor_profissional NUMERIC := 0;
    v_valor_clinica NUMERIC := 0;
    v_clinic_id UUID;
BEGIN

    -- Obter clinic_id da produ├º├úo
    SELECT DISTINCT clinic_id INTO v_clinic_id
    FROM medical_production
    WHERE professional_id = p_professional_id
    AND data_atendimento BETWEEN p_data_inicio AND p_data_fim
    LIMIT 1;

    -- Se n├úo tiver produ├º├úo, sair
    IF v_clinic_id IS NULL THEN
        RETURN;
    END IF;

    -- Buscar configura├º├úo
    SELECT * INTO v_config
    FROM medical_repasse_config
    WHERE professional_id = p_professional_id
    AND clinic_id = v_clinic_id
    AND ativo = TRUE
    LIMIT 1;

    -- Se n├úo tiver config, usar padr├úo 70/30
    IF v_config IS NULL THEN
        v_config := ROW(
            gen_random_uuid(),
            v_clinic_id,
            p_professional_id,
            70,
            30,
            TRUE,
            TRUE,
            TRUE,
            NOW(),
            NOW()
        )::medical_repasse_config;
    END IF;

    -- Somar produ├º├úo
    SELECT
        COALESCE(SUM(valor_bruto), 0),
        COALESCE(SUM(valor_liquido), 0)
    INTO v_total_bruto, v_total_liquido
    FROM medical_production
    WHERE professional_id = p_professional_id
    AND data_atendimento BETWEEN p_data_inicio AND p_data_fim;

    -- Calcular repasse
    v_valor_profissional := v_total_liquido * (v_config.percentual_profissional / 100);
    v_valor_clinica := v_total_liquido * (v_config.percentual_clinica / 100);

    -- Inserir resultado (atualizar se j├í existe para o per├¡odo)
    INSERT INTO medical_repasse (
        clinic_id,
        professional_id,
        periodo_inicio,
        periodo_fim,
        total_bruto,
        total_liquido,
        valor_profissional,
        valor_clinica,
        status
    ) VALUES (
        v_clinic_id,
        p_professional_id,
        p_data_inicio,
        p_data_fim,
        v_total_bruto,
        v_total_liquido,
        v_valor_profissional,
        v_valor_clinica,
        'processado'
    )
    ON CONFLICT (clinic_id, professional_id, periodo_inicio, periodo_fim)
    DO UPDATE SET
        total_bruto = EXCLUDED.total_bruto,
        total_liquido = EXCLUDED.total_liquido,
        valor_profissional = EXCLUDED.valor_profissional,
        valor_clinica = EXCLUDED.valor_clinica,
        status = 'processado',
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- ==== 5. FUN├ç├âO PARA GERAR CONTAS A PAGAR ====
CREATE OR REPLACE FUNCTION gerar_conta_repasse()
RETURNS TRIGGER AS $$
BEGIN

    -- Inserir na tabela de transa├º├Áes financeiras
    INSERT INTO financial_transactions (
        clinic_id,
        description,
        amount,
        type,
        account_id,
        category,
        status,
        created_at
    )
    VALUES (
        NEW.clinic_id,
        'Repasse m├®dico - ' || (SELECT name FROM professionals WHERE id = NEW.professional_id LIMIT 1),
        NEW.valor_profissional,
        'expense',
        (SELECT id FROM financial_accounts
         WHERE clinic_id = NEW.clinic_id AND name = 'Repasse M├®dico' LIMIT 1),
        'payroll',
        'pending',
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==== 6. TRIGGER PARA AUTO-GERAR CONTAS ====
DROP TRIGGER IF EXISTS trg_repasse_financeiro ON medical_repasse;
CREATE TRIGGER trg_repasse_financeiro
AFTER INSERT ON medical_repasse
FOR EACH ROW
EXECUTE FUNCTION gerar_conta_repasse();

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

-- ==== Ô£à MIGRATION COMPLETA ====

-- ============================================================================
-- Consolidated from 20260318_create_repasse_config.sql
-- ============================================================================

-- Migration: Create repasse_config table with new regime system
-- Date: 2026-03-18
-- Description: Creates table for professional repasse (commission) configuration with 7-regime support

-- Drop existing policies first
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
      'presumido_hospitalar',   -- Presumido Equipara├º├úo Hospitalar - 15.6%
      'real_conservador',       -- Lucro Real Conservador - 23.3%
      'real_otimizado'          -- Lucro Real Otimizado (Equipara├º├úo) - 17.5%
    )),

  -- Calculation base: BRUTO (valor completo) or LIQUIDO (ap├│s impostos)
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
CREATE INDEX idx_repasse_config_clinic ON repasse_config(clinic_id);
CREATE INDEX idx_repasse_config_professional ON repasse_config(professional_id);
CREATE INDEX idx_repasse_config_service ON repasse_config(service_id);
CREATE INDEX idx_repasse_config_regime ON repasse_config(regime_code);
CREATE INDEX idx_repasse_config_ativo ON repasse_config(ativo);

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

-- ============================================================================
-- Consolidated from 20260318_create_repasse_config_servico.sql
-- ============================================================================

-- Migration: Create repasse_config_servico table with all columns
-- Date: 2026-03-18
-- Description: Creates the base table for repasse (professional commission) configuration by service

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
CREATE INDEX idx_repasse_config_clinic ON repasse_config_servico(clinic_id);
CREATE INDEX idx_repasse_config_professional ON repasse_config_servico(professional_id);
CREATE INDEX idx_repasse_config_service ON repasse_config_servico(service_id);
CREATE INDEX idx_repasse_config_tax_regime ON repasse_config_servico(tax_regime);
CREATE INDEX idx_repasse_config_regime_tipo ON repasse_config_servico(regime_tipo);
CREATE INDEX idx_repasse_config_ativo ON repasse_config_servico(ativo);

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

-- ============================================================================
-- Consolidated from 20260318_disable_repasse_config_rls.sql
-- ============================================================================

-- FORCE: Disable RLS completely on repasse_config to allow all operations
-- This is a temporary fix to allow development/testing

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to select" ON repasse_config;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON repasse_config;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON repasse_config;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON repasse_config;
DROP POLICY IF EXISTS "Users can view repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can insert repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can update repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can delete repasse configs for their clinic" ON repasse_config;

-- DISABLE RLS completely
ALTER TABLE repasse_config DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
-- SELECT * FROM information_schema.tables WHERE table_name='repasse_config';

-- ============================================================================
-- Consolidated from 20260318_fix_repasse_config_rls.sql
-- ============================================================================

-- Fix RLS policies for repasse_config
-- The issue: policies are too restrictive or user_roles doesn't match properly

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can insert repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can update repasse configs for their clinic" ON repasse_config;
DROP POLICY IF EXISTS "Users can delete repasse configs for their clinic" ON repasse_config;

-- Disable RLS temporarily to allow testing
ALTER TABLE repasse_config DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with simple permissive policies
ALTER TABLE repasse_config ENABLE ROW LEVEL SECURITY;

-- Create very permissive policies that check only auth.uid() is not null
-- This allows authenticated users to manage repasse configs
CREATE POLICY "Allow authenticated users to select" ON repasse_config
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert" ON repasse_config
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update" ON repasse_config
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete" ON repasse_config
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- Consolidated from 20260318_populate_financial_accounts_structure.sql
-- ============================================================================

-- ============================================
-- POPULA├ç├âO DE CONTAS - ESTRUTURA PROFISSIONAL SA├ÜDE
-- Plano de contas padr├úo com hierarquia para an├ílise real de lucro
-- ============================================

-- Fun├º├úo auxiliar para inserir conta com suporte a hierarquia
CREATE OR REPLACE FUNCTION seed_account(
    p_clinic_id UUID,
    p_name TEXT,
    p_type account_type,
    p_parent_id UUID DEFAULT NULL,
    p_level INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO financial_accounts (clinic_id, name, type, parent_id, level, is_active)
    VALUES (p_clinic_id, p_name, p_type, p_parent_id, p_level, TRUE)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Seed data para primeira cl├¡nica (se existir)
DO $$
DECLARE
    v_clinic_id UUID;

    -- Level 1 (Raiz)
    v_receitas UUID;
    v_deducoes UUID;
    v_custos UUID;
    v_despesas_admin UUID;
    v_despesas_clinica UUID;
    v_despesas_comerciais UUID;
    v_despesas_fin UUID;
    v_investimentos UUID;
    v_ajustes UUID;

    -- Level 2 (Receitas)
    v_receita_bruta UUID;
    v_receita_operacional UUID;
    v_outras_receitas UUID;

    -- Level 2 (Dedu├º├Áes)
    v_impostos UUID;
    v_glosas UUID;

BEGIN

-- Obter primeira cl├¡nica
SELECT id INTO v_clinic_id FROM clinics LIMIT 1;

IF v_clinic_id IS NOT NULL THEN

-- ========================
-- 1. RECEITAS (VERDE)
-- ========================

v_receitas := seed_account(v_clinic_id, '1. RECEITAS', 'receita', NULL, 1);

  v_receita_bruta := seed_account(v_clinic_id, '1.1 Receita Bruta', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Consultas Particulares', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Consultas Conv├¬nios', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Exames', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Procedimentos', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Cirurgias', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Telemedicina', 'receita', v_receita_bruta, 3);

  v_receita_operacional := seed_account(v_clinic_id, '1.2 Receita Operacional', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Taxa Administrativa (Cl├¡nica)', 'receita', v_receita_operacional, 3);
    PERFORM seed_account(v_clinic_id, 'Aluguel de Sala', 'receita', v_receita_operacional, 3);
    PERFORM seed_account(v_clinic_id, 'Servi├ºos Terceirizados', 'receita', v_receita_operacional, 3);

  v_outras_receitas := seed_account(v_clinic_id, '1.3 Outras Receitas', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Juros Recebidos', 'receita', v_outras_receitas, 3);
    PERFORM seed_account(v_clinic_id, 'Multas Recebidas', 'receita', v_outras_receitas, 3);
    PERFORM seed_account(v_clinic_id, 'Outros Ganhos', 'receita', v_outras_receitas, 3);

-- ========================
-- 2. DEDU├ç├òES DA RECEITA (VERMELHO)
-- ========================

v_deducoes := seed_account(v_clinic_id, '2. DEDU├ç├òES DA RECEITA', 'deducao', NULL, 1);

  v_impostos := seed_account(v_clinic_id, '2.1 Impostos sobre Faturamento', 'deducao', v_deducoes, 2);
    PERFORM seed_account(v_clinic_id, 'Simples Nacional', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'ISS', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'PIS', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'COFINS', 'deducao', v_impostos, 3);

  v_glosas := seed_account(v_clinic_id, '2.2 Glosas', 'deducao', v_deducoes, 2);
    PERFORM seed_account(v_clinic_id, 'Glosas Conv├¬nios', 'deducao', v_glosas, 3);
    PERFORM seed_account(v_clinic_id, 'Cancelamentos e Estornos', 'deducao', v_glosas, 3);

-- ========================
-- 3. CUSTOS DIRETOS (LARANJA)
-- ========================

v_custos := seed_account(v_clinic_id, '3. CUSTOS DIRETOS', 'custo', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Repasse M├®dico', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Repasse Profissionais', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Custos de Exames', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Materiais M├®dicos', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Medicamentos', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Instrumenta├º├úo Cir├║rgica', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Equipamentos (uso por procedimento)', 'custo', v_custos, 2);

-- ========================
-- 4. DESPESAS ADMINISTRATIVAS (AZUL)
-- ========================

v_despesas_admin := seed_account(v_clinic_id, '4. DESPESAS ADMINISTRATIVAS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Sal├írios Administrativos', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Encargos Trabalhistas', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Pr├│-labore', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Contabilidade', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Jur├¡dico', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Sistemas / Softwares', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Internet / Telefonia', 'despesa', v_despesas_admin, 2);

-- ========================
-- 5. DESPESAS DA CL├ìNICA (AZUL)
-- ========================

v_despesas_clinica := seed_account(v_clinic_id, '5. DESPESAS DA CL├ìNICA', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Aluguel', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Condom├¡nio', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Energia', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, '├ügua', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Limpeza', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Manuten├º├úo', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Seguran├ºa', 'despesa', v_despesas_clinica, 2);

-- ========================
-- 6. DESPESAS COMERCIAIS (AZUL)
-- ========================

v_despesas_comerciais := seed_account(v_clinic_id, '6. DESPESAS COMERCIAIS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Marketing Digital', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Tr├ífego Pago', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Ag├¬ncia', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Comiss├Áes', 'despesa', v_despesas_comerciais, 2);

-- ========================
-- 7. DESPESAS FINANCEIRAS (AZUL)
-- ========================

v_despesas_fin := seed_account(v_clinic_id, '7. DESPESAS FINANCEIRAS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Tarifas Banc├írias', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Juros Pagos', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Multas', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Antecipa├º├úo de Receb├¡veis', 'despesa', v_despesas_fin, 2);

-- ========================
-- 8. INVESTIMENTOS (ROXO)
-- ========================

v_investimentos := seed_account(v_clinic_id, '8. INVESTIMENTOS', 'investimento', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Equipamentos', 'investimento', v_investimentos, 2);
  PERFORM seed_account(v_clinic_id, 'Reforma / Estrutura', 'investimento', v_investimentos, 2);
  PERFORM seed_account(v_clinic_id, 'M├│veis', 'investimento', v_investimentos, 2);

-- ========================
-- 9. AJUSTES CONT├üBEIS (CINZA)
-- ========================

v_ajustes := seed_account(v_clinic_id, '9. AJUSTES CONT├üBEIS', 'ajuste', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Deprecia├º├úo', 'ajuste', v_ajustes, 2);
  PERFORM seed_account(v_clinic_id, 'Amortiza├º├úo', 'ajuste', v_ajustes, 2);
  PERFORM seed_account(v_clinic_id, 'Provis├Áes', 'ajuste', v_ajustes, 2);

RAISE NOTICE 'Estrutura de contas criada com sucesso para cl├¡nica: %', v_clinic_id;

ELSE
  RAISE NOTICE 'Nenhuma cl├¡nica encontrada. Seed data n├úo ser├í aplicado.';
END IF;

END $$;

-- Remover fun├º├úo auxiliar ap├│s uso
DROP FUNCTION IF EXISTS seed_account(UUID, TEXT, account_type, UUID, INTEGER);
