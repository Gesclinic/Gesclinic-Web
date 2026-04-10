-- Criar tabela billing_guides para armazenar guias de consulta, internação e SADT
CREATE TABLE IF NOT EXISTS billing_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Informações básicas da guia
  numero_guia VARCHAR(50) UNIQUE NOT NULL, -- Ex: GC001-2025-001
  tipo_guia VARCHAR(20) NOT NULL DEFAULT 'SP', -- SP, SADT, Internação
  status VARCHAR(30) NOT NULL DEFAULT 'Aguardando XML', -- Aguardando XML, XML Gerado, Enviado, Glosado, Pago
  
  -- Dados do paciente
  paciente_nome VARCHAR(255) NOT NULL,
  numero_carteirinha VARCHAR(100) NOT NULL, -- Matrícula/Carteirinha do convênio
  
  -- Dados do convênio/plano
  convenio VARCHAR(255),
  plano VARCHAR(255),
  
  -- Dados do serviço
  profissional VARCHAR(255),
  codigo_cbhpm VARCHAR(20), -- CBHPM/TUSS do procedimento
  valor DECIMAL(10, 2) DEFAULT 0,
  
  -- Observações e metadados
  observacoes TEXT,
  xml_path VARCHAR(500), -- Caminho do arquivo XML gerado
  
  -- Timestamps
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_envio TIMESTAMP WITH TIME ZONE,
  data_processamento TIMESTAMP WITH TIME ZONE,
  
  -- Índices para queries frequentes
  CONSTRAINT numero_carteirinha_not_empty CHECK (length(trim(numero_carteirinha)) > 0)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_billing_guides_clinic_id ON billing_guides(clinic_id);
CREATE INDEX IF NOT EXISTS idx_billing_guides_numero_guia ON billing_guides(numero_guia);
CREATE INDEX IF NOT EXISTS idx_billing_guides_status ON billing_guides(status);
CREATE INDEX IF NOT EXISTS idx_billing_guides_tipo_guia ON billing_guides(tipo_guia);
CREATE INDEX IF NOT EXISTS idx_billing_guides_data_criacao ON billing_guides(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_billing_guides_numero_carteirinha ON billing_guides(numero_carteirinha);
CREATE INDEX IF NOT EXISTS idx_billing_guides_paciente ON billing_guides(paciente_nome);

-- Habilitar RLS (Row Level Security)
ALTER TABLE billing_guides ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
-- Usuários podem ver guias da sua clínica
CREATE POLICY "Users can view guides from their clinic" 
ON billing_guides FOR SELECT
USING (auth.uid()::text = (SELECT users.id FROM users WHERE users.clinic_id = billing_guides.clinic_id LIMIT 1)::text);

-- Usuários podem inserir guias na sua clínica
CREATE POLICY "Users can insert guides in their clinic" 
ON billing_guides FOR INSERT
WITH CHECK (auth.uid()::text = (SELECT users.id FROM users WHERE users.clinic_id = billing_guides.clinic_id LIMIT 1)::text);

-- Usuários podem atualizar guias da sua clínica
CREATE POLICY "Users can update guides from their clinic" 
ON billing_guides FOR UPDATE
USING (auth.uid()::text = (SELECT users.id FROM users WHERE users.clinic_id = billing_guides.clinic_id LIMIT 1)::text);

-- Usuários podem deletar guias da sua clínica
CREATE POLICY "Users can delete guides from their clinic" 
ON billing_guides FOR DELETE
USING (auth.uid()::text = (SELECT users.id FROM users WHERE users.clinic_id = billing_guides.clinic_id LIMIT 1)::text);
