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
