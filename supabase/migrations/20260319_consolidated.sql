-- ============================================================================
-- Consolidated from 20260319_CLEANUP_FICTIONAL_DATA.sql
-- ============================================================================

-- ====================================================================
-- CLEANUP: Removing Fictional/Test Data
-- Date: 2026-03-19
--
-- This migration removes all fictional professionals and associated data:
-- - Dr. Jo├úo Silva
-- - Dra. Maria Santos
-- - Dr. Pedro Costa
-- - Dra. Ana Lima
--
-- And their associated records:
-- - repasse_medico
-- - repasse_ajuste
-- - repasse_config (linked to these professionals)
-- - professional_services
-- - professional_payers
-- - professional_schedules
-- ====================================================================

-- Step 1: Store IDs of fictional professionals before deletion
WITH fictional_professionals AS (
  SELECT id, name
  FROM professionals
  WHERE name IN (
    'Dr. Jo├úo Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
)

-- Step 2: Delete associated repasse records
DELETE FROM repasse_ajuste
WHERE repasse_id IN (
  SELECT rm.id
  FROM repasse_medico rm
  INNER JOIN fictional_professionals fp ON rm.professional_id = fp.id
);

-- Step 3: Delete repasse_medico records
DELETE FROM repasse_medico
WHERE professional_id IN (
  SELECT id
  FROM professionals
  WHERE name IN (
    'Dr. Jo├úo Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 4: Delete repasse_config records
DELETE FROM repasse_config
WHERE professional_id IN (
  SELECT id
  FROM professionals
  WHERE name IN (
    'Dr. Jo├úo Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 5: Delete professional_services records
DELETE FROM professional_services
WHERE professional_id IN (
  SELECT id
  FROM professionals
  WHERE name IN (
    'Dr. Jo├úo Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 6: Delete professional_payers records
DELETE FROM professional_payers
WHERE professional_id IN (
  SELECT id
  FROM professionals
  WHERE name IN (
    'Dr. Jo├úo Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 7: Delete professional_schedules records
DELETE FROM professional_schedules
WHERE professional_id IN (
  SELECT id
  FROM professionals
  WHERE name IN (
    'Dr. Jo├úo Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 8: Delete appointments made by these professionals
DELETE FROM appointments
WHERE professional_id IN (
  SELECT id
  FROM professionals
  WHERE name IN (
    'Dr. Jo├úo Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 9: Delete the professionals themselves
DELETE FROM professionals
WHERE name IN (
  'Dr. Jo├úo Silva',
  'Dra. Maria Santos',
  'Dr. Pedro Costa',
  'Dra. Ana Lima'
);

-- Step 10: Delete associated user accounts (if any)
DELETE FROM auth.users
WHERE email ILIKE ANY(ARRAY[
  '%joao.silva%',
  '%maria.santos%',
  '%pedro.costa%',
  '%ana.lima%'
])
AND email NOT LIKE '%@clinic-real%';

-- ====================================================================
-- Summary of cleanup:
-- All fictional professionals and their associated data have been removed:
-- - Professionals: 4 records
-- - Repasse Medico: depends on clinic configuration
-- - Associated services, schedules, and appointments: cleaned up
-- ====================================================================

-- ============================================================================
-- Consolidated from 20260319_create_bancaria_email_tables.sql
-- ============================================================================

-- supabase/migrations/20260319_create_bancaria_email_tables.sql
-- Extens├úo das tabelas de repasse: transfer├¬ncias e emails

-- Tabela: professional_bank_accounts
-- Armazena dados banc├írios dos profissionais para transfer├¬ncias
CREATE TABLE IF NOT EXISTS professional_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  banco VARCHAR(50) NOT NULL, -- 'Bradesco', 'Itau', 'Caixa', etc
  agencia VARCHAR(10) NOT NULL,
  conta VARCHAR(20) NOT NULL,
  tipo_conta VARCHAR(20) NOT NULL CHECK (tipo_conta IN ('corrente', 'poupan├ºa')),
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

-- ├ìndices para performance
CREATE INDEX idx_professional_bank_accounts_clinic ON professional_bank_accounts(clinic_id);
CREATE INDEX idx_professional_bank_accounts_professional ON professional_bank_accounts(professional_id);

-- Tabela: repasse_transferencias
-- Registra todas as transfer├¬ncias banc├írias de repasse
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

-- ├ìndices para performance
CREATE INDEX idx_repasse_transferencias_clinic ON repasse_transferencias(clinic_id);
CREATE INDEX idx_repasse_transferencias_professional ON repasse_transferencias(professional_id);
CREATE INDEX idx_repasse_transferencias_status ON repasse_transferencias(status);
CREATE INDEX idx_repasse_transferencias_metodo ON repasse_transferencias(metodo);
CREATE INDEX idx_repasse_transferencias_data ON repasse_transferencias(data_transacao);

-- Tabela: clinic_email_settings
-- Configura├º├úo do provedor de email por cl├¡nica
CREATE TABLE IF NOT EXISTS clinic_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  provedor VARCHAR(50) NOT NULL CHECK (provedor IN ('sendgrid', 'aws_ses', 'mailgun', 'smtp')),
  chave_api TEXT NOT NULL,
  email_remetente VARCHAR(255) NOT NULL,
  nome_remetente VARCHAR(255),

  -- SendGrid espec├¡fico
  template_id VARCHAR(255),

  configurado BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id)
);

-- ├ìndice
CREATE INDEX idx_clinic_email_settings_clinic ON clinic_email_settings(clinic_id);

-- Tabela: repasse_emails_enviados
-- Hist├│rico de emails enviados sobre repassos
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

-- ├ìndices
CREATE INDEX idx_repasse_emails_enviados_clinic ON repasse_emails_enviados(clinic_id);
CREATE INDEX idx_repasse_emails_enviados_professional ON repasse_emails_enviados(professional_id);
CREATE INDEX idx_repasse_emails_enviados_repasse ON repasse_emails_enviados(repasse_id);
CREATE INDEX idx_repasse_emails_enviados_status ON repasse_emails_enviados(status);

-- Tabela: repasse_scheduler_log
-- Auditoria de execu├º├Áes agendadas do repasse
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

-- ├ìndices
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

-- Fun├º├Áes para auditoria
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

-- Visualiza├º├Áes ├║teis

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

-- ============================================================================
-- Consolidated from 20260319_create_financial_transactions.sql
-- ============================================================================

-- ============================================
-- FINANCIAL TRANSACTIONS TABLE
-- Registro de todas as transa├º├Áes financeiras da cl├¡nica
-- Link com chart de contas (Plano de Contas)
-- ============================================

-- Tipo de transa├º├úo
CREATE TYPE transaction_type AS ENUM (
  'revenue',      -- Receita
  'expense',      -- Despesa
  'cost',         -- Custo direto
  'deduction',    -- Dedu├º├úo
  'adjustment',   -- Ajuste
  'transfer'      -- Transfer├¬ncia entre contas
);

-- Status de transa├º├úo
CREATE TYPE transaction_status AS ENUM (
  'pending',      -- Pendente
  'scheduled',    -- Agendada
  'processed',    -- Processada
  'paid',         -- Paga
  'canceled'      -- Cancelada
);

-- Categoria para an├ílise r├ípida
CREATE TYPE transaction_category AS ENUM (
  'appointment',      -- Atendimento/Consulta
  'medical_service',  -- Servi├ºo m├®dico
  'exam',            -- Exame
  'procedure',       -- Procedimento
  'surgery',         -- Cirurgia
  'telemedicine',    -- Telemedicina
  'payroll',         -- Folha de pagamento / Repasse
  'materials',       -- Materiais/Insumos
  'maintenance',     -- Manuten├º├úo
  'utilities',       -- Utilidades (energia, ├ígua, etc)
  'rent',            -- Aluguel
  'tax',             -- Impostos
  'commission',      -- Comiss├úo
  'marketing',       -- Marketing
  'software',        -- Software/Sistemas
  'equipment',       -- Equipamento
  'other'            -- Outro
);

-- Tabela principal
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  account_id UUID,                     -- Link com financial_accounts (Plano de Contas)
  description TEXT NOT NULL,           -- Descri├º├úo da transa├º├úo
  amount DECIMAL(15, 2) NOT NULL,     -- Valor
  type transaction_type NOT NULL,      -- Tipo de transa├º├úo
  category transaction_category NOT NULL DEFAULT 'other',
  status transaction_status NOT NULL DEFAULT 'pending',

  -- Refer├¬ncias cruzadas (pode estar vazio)
  appointment_id UUID,                 -- Para transa├º├Áes de atendimento
  professional_id UUID,                -- Profissional envolvido (repasse, consulta, etc)
  supplier_id UUID,                    -- Fornecedor (para despesas)

  -- Informa├º├Áes de agendamento
  scheduled_date DATE,                 -- Data agendada (se scheduled)
  due_date DATE,                       -- Data de vencimento

  -- Rastreamento
  reference_document TEXT,             -- NF, REC, etc
  notes TEXT,                          -- Observa├º├Áes
  created_by UUID,                     -- Usu├írio que criou
  updated_by UUID,                     -- ├Ültimo usu├írio que atualizou

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ├ìndices para performance
CREATE INDEX idx_financial_transactions_clinic_id ON financial_transactions(clinic_id);
CREATE INDEX idx_financial_transactions_account_id ON financial_transactions(account_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX idx_financial_transactions_created_at ON financial_transactions(created_at);
CREATE INDEX idx_financial_transactions_appointment_id ON financial_transactions(appointment_id);
CREATE INDEX idx_financial_transactions_professional_id ON financial_transactions(professional_id);
CREATE INDEX idx_financial_transactions_date_range ON financial_transactions(clinic_id, created_at);

-- RLS (Row Level Security)
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_transactions_clinic_access" ON financial_transactions
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Fun├º├úo para atualizar timestamp
CREATE OR REPLACE FUNCTION update_financial_transactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
DROP TRIGGER IF EXISTS trg_financial_transactions_timestamp ON financial_transactions;
CREATE TRIGGER trg_financial_transactions_timestamp
BEFORE UPDATE ON financial_transactions
FOR EACH ROW
EXECUTE FUNCTION update_financial_transactions_timestamp();

-- View: Resumo de transa├º├Áes por conta (para DRE)
CREATE OR REPLACE VIEW view_financial_summary AS
SELECT
  clinic_id,
  account_id,
  type,
  category,
  DATE(created_at) as data,
  COUNT(*) as qtd_transacoes,
  SUM(CASE WHEN status IN ('processed', 'paid') THEN amount ELSE 0 END) as valor_realizado,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as valor_pendente,
  SUM(amount) as valor_total
FROM financial_transactions
GROUP BY clinic_id, account_id, type, category, DATE(created_at);

-- View: DRE b├ísica (agrega├º├úo por tipo de conta)
CREATE OR REPLACE VIEW view_dre_summary AS
SELECT
  ft.clinic_id,
  fa.type as account_type,
  fa.level,
  fa.name as account_name,
  COUNT(ft.id) as qtd_transacoes,
  SUM(CASE WHEN ft.type = 'revenue' THEN ft.amount ELSE -ft.amount END) as valor_liquido
FROM financial_transactions ft
LEFT JOIN financial_accounts fa ON ft.account_id = fa.id
WHERE ft.status IN ('processed', 'paid')
GROUP BY ft.clinic_id, fa.type, fa.level, fa.name;

-- Coment├írios para documenta├º├úo
COMMENT ON TABLE financial_transactions IS 'Registro de todas as transa├º├Áes financeiras da cl├¡nica. Integrada com Plano de Contas (financial_accounts) para an├ílise de DRE.';
COMMENT ON COLUMN financial_transactions.account_id IS 'Link com financial_accounts - agrupa transa├º├Áes por conta cont├íbil';
COMMENT ON COLUMN financial_transactions.professional_id IS 'Para rastreabilidade: qual profissional gerou a receita ou recebe o repasse';
COMMENT ON VIEW view_financial_summary IS 'Resumo de transa├º├Áes por conta e categoria para an├ílise r├ípida';
COMMENT ON VIEW view_dre_summary IS 'Agrega├º├úo para DRE - mostra fluxo de receitas vs despesas por tipo de conta';
