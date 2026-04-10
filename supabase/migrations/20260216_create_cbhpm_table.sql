-- ============================================================
-- MIGRATION: Criar tabela de Procedimentos CBHPM
-- Data: 16/02/2026
-- Descrição: Tabela centralizada para gerenciar códigos CBHPM
-- ============================================================

-- Criar tabela CBHPM
CREATE TABLE IF NOT EXISTS cbhpm_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Identificação
  codigo_cbhpm VARCHAR(20) NOT NULL,
  descricao_completa TEXT NOT NULL,
  descricao_curta VARCHAR(255),
  
  -- Classificação
  grupo_procedimento VARCHAR(100),
  subgrupo_procedimento VARCHAR(100),
  
  -- Mapeamento para Tabelas
  codigo_tuss VARCHAR(10),
  
  -- Valores de Referência
  valor_minimo DECIMAL(12, 2) DEFAULT 0.00,
  valor_maximo DECIMAL(12, 2) DEFAULT 0.00,
  valor_base DECIMAL(12, 2) DEFAULT 0.00,
  
  -- Controle / Regras
  permite_faturamento BOOLEAN DEFAULT true,
  exige_autorizacao BOOLEAN DEFAULT false,
  tipo_guia VARCHAR(50), -- 'consulta', 'sadt', 'internacao', 'procedimento'
  unidade_medida VARCHAR(20), -- 'unidade', 'sessao', 'minuto', 'diaria'
  
  -- Documentação
  observacoes TEXT,
  categoria VARCHAR(100),
  subcategoria VARCHAR(100),
  
  -- Revisão e Histórico
  ano_tabela INT DEFAULT DATE_PART('year', NOW()),
  indice_reajuste DECIMAL(5, 3) DEFAULT 1.000,
  data_vigencia DATE,
  data_fim_vigencia DATE,
  
  -- Controle de Sistema
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Indexes para performance
CREATE INDEX idx_cbhpm_procedures_clinic_id ON cbhpm_procedures(clinic_id);
CREATE INDEX idx_cbhpm_procedures_codigo_cbhpm ON cbhpm_procedures(codigo_cbhpm);
CREATE INDEX idx_cbhpm_procedures_codigo_tuss ON cbhpm_procedures(codigo_tuss);
CREATE INDEX idx_cbhpm_procedures_ativo ON cbhpm_procedures(ativo);
CREATE INDEX idx_cbhpm_procedures_tipo_guia ON cbhpm_procedures(tipo_guia);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cbhpm_procedures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cbhpm_procedures_updated_at_trigger
BEFORE UPDATE ON cbhpm_procedures
FOR EACH ROW
EXECUTE FUNCTION update_cbhpm_procedures_updated_at();

-- ============================================================
-- Tabela de Mapeamento CBHPM ↔ Services
-- Para vincular CBHPM com serviços cadastrados
-- ============================================================

CREATE TABLE IF NOT EXISTS cbhpm_service_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cbhpm_id UUID NOT NULL REFERENCES cbhpm_procedures(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Configuração de Relacionamento
  eh_principal BOOLEAN DEFAULT false,
  sobrescreve_valor BOOLEAN DEFAULT false,
  valor_especifico DECIMAL(12, 2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cbhpm_id, service_id, clinic_id)
);

CREATE INDEX idx_cbhpm_service_mapping_clinic_id ON cbhpm_service_mapping(clinic_id);
CREATE INDEX idx_cbhpm_service_mapping_service_id ON cbhpm_service_mapping(service_id);
CREATE INDEX idx_cbhpm_service_mapping_cbhpm_id ON cbhpm_service_mapping(cbhpm_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE cbhpm_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbhpm_service_mapping ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem apenas CBHPM de sua clínica (usando user_roles)
CREATE POLICY cbhpm_procedures_select_own_clinic ON cbhpm_procedures
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_procedures_insert_own_clinic ON cbhpm_procedures
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_procedures_update_own_clinic ON cbhpm_procedures
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_procedures_delete_own_clinic ON cbhpm_procedures
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Policies para Mapeamento
CREATE POLICY cbhpm_service_mapping_select ON cbhpm_service_mapping
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_service_mapping_insert ON cbhpm_service_mapping
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_service_mapping_update ON cbhpm_service_mapping
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_service_mapping_delete ON cbhpm_service_mapping
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Dados Iniciais (Exemplo)
-- Alguns procedimentos CBHPM mais comuns
-- ============================================================

INSERT INTO cbhpm_procedures (
  clinic_id, codigo_cbhpm, descricao_completa, descricao_curta,
  grupo_procedimento, subgrupo_procedimento, codigo_tuss,
  valor_minimo, valor_maximo, valor_base,
  tipo_guia, unidade_medida, categoria, ativo
) 
SELECT 
  c.id,
  '1.01.01.01',
  'Consulta - Clínico Geral',
  'Consulta Clínico',
  'CONSULTAS',
  'CLÍNICAS GERAIS',
  '0101010101',
  80.00, 150.00, 110.00,
  'consulta', 'unidade', 'CONSULTA', true
FROM clinics c LIMIT 1

ON CONFLICT (clinic_id) DO NOTHING;

-- Confirmar migração
SELECT 'CBHPM_PROCEDURES table created successfully!' as status;
