-- ============================================
-- FINANCIAL TRANSACTIONS TABLE
-- Registro de todas as transações financeiras da clínica
-- Link com chart de contas (Plano de Contas)
-- ============================================

-- Tipo de transação
CREATE TYPE transaction_type AS ENUM (
  'revenue',      -- Receita
  'expense',      -- Despesa
  'cost',         -- Custo direto
  'deduction',    -- Dedução
  'adjustment',   -- Ajuste
  'transfer'      -- Transferência entre contas
);

-- Status de transação
CREATE TYPE transaction_status AS ENUM (
  'pending',      -- Pendente
  'scheduled',    -- Agendada
  'processed',    -- Processada
  'paid',         -- Paga
  'canceled'      -- Cancelada
);

-- Categoria para análise rápida
CREATE TYPE transaction_category AS ENUM (
  'appointment',      -- Atendimento/Consulta
  'medical_service',  -- Serviço médico
  'exam',            -- Exame
  'procedure',       -- Procedimento
  'surgery',         -- Cirurgia
  'telemedicine',    -- Telemedicina
  'payroll',         -- Folha de pagamento / Repasse
  'materials',       -- Materiais/Insumos
  'maintenance',     -- Manutenção
  'utilities',       -- Utilidades (energia, água, etc)
  'rent',            -- Aluguel
  'tax',             -- Impostos
  'commission',      -- Comissão
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
  description TEXT NOT NULL,           -- Descrição da transação
  amount DECIMAL(15, 2) NOT NULL,     -- Valor
  type transaction_type NOT NULL,      -- Tipo de transação
  category transaction_category NOT NULL DEFAULT 'other',
  status transaction_status NOT NULL DEFAULT 'pending',
  
  -- Referências cruzadas (pode estar vazio)
  appointment_id UUID,                 -- Para transações de atendimento
  professional_id UUID,                -- Profissional envolvido (repasse, consulta, etc)
  supplier_id UUID,                    -- Fornecedor (para despesas)
  
  -- Informações de agendamento
  scheduled_date DATE,                 -- Data agendada (se scheduled)
  due_date DATE,                       -- Data de vencimento
  
  -- Rastreamento
  reference_document TEXT,             -- NF, REC, etc
  notes TEXT,                          -- Observações
  created_by UUID,                     -- Usuário que criou
  updated_by UUID,                     -- Último usuário que atualizou
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
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

-- Função para atualizar timestamp
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

-- View: Resumo de transações por conta (para DRE)
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

-- View: DRE básica (agregação por tipo de conta)
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

-- Comentários para documentação
COMMENT ON TABLE financial_transactions IS 'Registro de todas as transações financeiras da clínica. Integrada com Plano de Contas (financial_accounts) para análise de DRE.';
COMMENT ON COLUMN financial_transactions.account_id IS 'Link com financial_accounts - agrupa transações por conta contábil';
COMMENT ON COLUMN financial_transactions.professional_id IS 'Para rastreabilidade: qual profissional gerou a receita ou recebe o repasse';
COMMENT ON VIEW view_financial_summary IS 'Resumo de transações por conta e categoria para análise rápida';
COMMENT ON VIEW view_dre_summary IS 'Agregação para DRE - mostra fluxo de receitas vs despesas por tipo de conta';
