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
