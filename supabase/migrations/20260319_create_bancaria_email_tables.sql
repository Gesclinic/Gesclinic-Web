-- supabase/migrations/20260319_create_bancaria_email_tables.sql
-- Extensão das tabelas de repasse: transferências e emails

-- Tabela: professional_bank_accounts
-- Armazena dados bancários dos profissionais para transferências
CREATE TABLE IF NOT EXISTS professional_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  banco VARCHAR(50) NOT NULL, -- 'Bradesco', 'Itau', 'Caixa', etc
  agencia VARCHAR(10) NOT NULL,
  conta VARCHAR(20) NOT NULL,
  tipo_conta VARCHAR(20) NOT NULL CHECK (tipo_conta IN ('corrente', 'poupança')),
  cpf_cnpj VARCHAR(20) NOT NULL,
  
  -- PIX
  tipo_chave VARCHAR(20) CHECK (tipo_chave IN ('cpf', 'email', 'telefone', 'aleatoria')),
  chave_pix VARCHAR(255),
  
  titular VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(professional_id, clinic_id)
);

-- Índices para performance
CREATE INDEX idx_professional_bank_accounts_clinic ON professional_bank_accounts(clinic_id);
CREATE INDEX idx_professional_bank_accounts_professional ON professional_bank_accounts(professional_id);

-- Tabela: repasse_transferencias
-- Registra todas as transferências bancárias de repasse
CREATE TABLE IF NOT EXISTS repasse_transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repasse_id UUID NOT NULL REFERENCES medical_repasse(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  valor DECIMAL(15, 2) NOT NULL,
  metodo VARCHAR(50) NOT NULL CHECK (metodo IN ('pix', 'ted', 'paypal', 'stripe', 'manual')),
  dados_bancarios_id UUID REFERENCES professional_bank_accounts(id),
  
  status VARCHAR(50) NOT NULL DEFAULT 'pendente' 
    CHECK (status IN ('pendente', 'processando', 'concluido', 'erro', 'cancelado')),
  
  descricao TEXT,
  data_transacao TIMESTAMP,
  id_transacao_externa VARCHAR(255),
  mensagem_erro TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_repasse_transferencias_clinic ON repasse_transferencias(clinic_id);
CREATE INDEX idx_repasse_transferencias_professional ON repasse_transferencias(professional_id);
CREATE INDEX idx_repasse_transferencias_status ON repasse_transferencias(status);
CREATE INDEX idx_repasse_transferencias_metodo ON repasse_transferencias(metodo);
CREATE INDEX idx_repasse_transferencias_data ON repasse_transferencias(data_transacao);

-- Tabela: clinic_email_settings
-- Configuração do provedor de email por clínica
CREATE TABLE IF NOT EXISTS clinic_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  provedor VARCHAR(50) NOT NULL CHECK (provedor IN ('sendgrid', 'aws_ses', 'mailgun', 'smtp')),
  chave_api TEXT NOT NULL,
  email_remetente VARCHAR(255) NOT NULL,
  nome_remetente VARCHAR(255),
  
  -- SendGrid específico
  template_id VARCHAR(255),
  
  configurado BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id)
);

-- Índice
CREATE INDEX idx_clinic_email_settings_clinic ON clinic_email_settings(clinic_id);

-- Tabela: repasse_emails_enviados
-- Histórico de emails enviados sobre repassos
CREATE TABLE IF NOT EXISTS repasse_emails_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repasse_id UUID NOT NULL REFERENCES medical_repasse(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  provedor VARCHAR(50) NOT NULL,
  destinatario VARCHAR(255) NOT NULL,
  assunto VARCHAR(255),
  
  status VARCHAR(50) DEFAULT 'enviado' CHECK (status IN ('enviado', 'nao_enviado', 'erro')),
  resposta JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_repasse_emails_enviados_clinic ON repasse_emails_enviados(clinic_id);
CREATE INDEX idx_repasse_emails_enviados_professional ON repasse_emails_enviados(professional_id);
CREATE INDEX idx_repasse_emails_enviados_repasse ON repasse_emails_enviados(repasse_id);
CREATE INDEX idx_repasse_emails_enviados_status ON repasse_emails_enviados(status);

-- Tabela: repasse_scheduler_log
-- Auditoria de execuções agendadas do repasse
CREATE TABLE IF NOT EXISTS repasse_scheduler_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  
  tipo_execucao VARCHAR(50) CHECK (tipo_execucao IN ('automatico', 'manual')),
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP,
  
  periodo_inicio DATE,
  periodo_fim DATE,
  
  status VARCHAR(50) DEFAULT 'iniciado' CHECK (status IN ('iniciado', 'processando', 'concluido', 'erro')),
  total_processados INTEGER,
  total_sucesso INTEGER,
  total_erro INTEGER,
  
  mensagem TEXT,
  erro_log TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_repasse_scheduler_log_clinic ON repasse_scheduler_log(clinic_id);
CREATE INDEX idx_repasse_scheduler_log_status ON repasse_scheduler_log(status);
CREATE INDEX idx_repasse_scheduler_log_data ON repasse_scheduler_log(data_inicio);

-- RLS (Row Level Security)

-- Tabela: professional_bank_accounts
ALTER TABLE professional_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY professional_bank_accounts_clinic_access ON professional_bank_accounts
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Tabela: repasse_transferencias
ALTER TABLE repasse_transferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY repasse_transferencias_clinic_access ON repasse_transferencias
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Tabela: clinic_email_settings
ALTER TABLE clinic_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinic_email_settings_access ON clinic_email_settings
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Tabela: repasse_emails_enviados
ALTER TABLE repasse_emails_enviados ENABLE ROW LEVEL SECURITY;

CREATE POLICY repasse_emails_enviados_access ON repasse_emails_enviados
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Tabela: repasse_scheduler_log
ALTER TABLE repasse_scheduler_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY repasse_scheduler_log_access ON repasse_scheduler_log
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Funções para auditoria
CREATE OR REPLACE FUNCTION update_repasse_transferencias_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_repasse_transferencias_update_timestamp
BEFORE UPDATE ON repasse_transferencias
FOR EACH ROW
EXECUTE FUNCTION update_repasse_transferencias_timestamp();

-- Visualizações úteis

-- View: repasse_transferencias_resumo
CREATE OR REPLACE VIEW repasse_transferencias_resumo AS
SELECT 
  rt.clinic_id,
  rt.professional_id,
  p.name AS professional_name,
  COUNT(*) as total_transferencias,
  SUM(CASE WHEN rt.status = 'concluido' THEN 1 ELSE 0 END) as concluidas,
  SUM(CASE WHEN rt.status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
  SUM(CASE WHEN rt.status = 'erro' THEN 1 ELSE 0 END) as erros,
  SUM(CASE WHEN rt.status = 'concluido' THEN rt.valor ELSE 0 END) as valor_concluido,
  SUM(CASE WHEN rt.status = 'pendente' THEN rt.valor ELSE 0 END) as valor_pendente
FROM repasse_transferencias rt
JOIN professionals p ON rt.professional_id = p.id
GROUP BY rt.clinic_id, rt.professional_id, p.name;

-- View: repasse_emails_resumo
CREATE OR REPLACE VIEW repasse_emails_resumo AS
SELECT 
  ree.clinic_id,
  DATE(ree.created_at) as data,
  COUNT(*) as total_emails,
  SUM(CASE WHEN ree.status = 'enviado' THEN 1 ELSE 0 END) as enviados,
  SUM(CASE WHEN ree.status = 'erro' THEN 1 ELSE 0 END) as erros
FROM repasse_emails_enviados ree
GROUP BY ree.clinic_id, DATE(ree.created_at);
