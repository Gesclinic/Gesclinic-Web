-- Adicionar campos faltantes na tabela clinics
-- Data: 13/01/2026

-- Verificar se as colunas já existem e adicionar se necessário
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS clinic_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS fantasy_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS zipcode TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'matriz' CHECK (clinic_type IN ('matriz', 'filial')),
ADD COLUMN IF NOT EXISTS parent_clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clinics_clinic_code ON clinics(clinic_code);
CREATE INDEX IF NOT EXISTS idx_clinics_clinic_type ON clinics(clinic_type);
CREATE INDEX IF NOT EXISTS idx_clinics_parent_clinic_id ON clinics(parent_clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(status);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_clinics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clinics_updated_at_trigger ON clinics;

CREATE TRIGGER update_clinics_updated_at_trigger
BEFORE UPDATE ON clinics
FOR EACH ROW
EXECUTE FUNCTION update_clinics_updated_at();
