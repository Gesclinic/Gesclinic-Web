-- ============================================
-- GESCLINIC FINANCIAL SYSTEM - COMPLETE SETUP
-- Execute em ordem no Supabase SQL Editor
-- ============================================

-- ====== MIGRATION 1: FINANCIAL ACCOUNTS (Plano de Contas) ======

DROP TABLE IF EXISTS financial_accounts CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;

CREATE TYPE account_type AS ENUM (
    'receita',
    'deducao',
    'custo',
    'despesa',
    'investimento',
    'ajuste'
);

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

CREATE INDEX idx_financial_accounts_clinic ON financial_accounts(clinic_id);
CREATE INDEX idx_financial_accounts_parent ON financial_accounts(parent_id);
CREATE INDEX idx_financial_accounts_type ON financial_accounts(type);

-- ====== MIGRATION 2: POPULATE ACCOUNTS (44 Contas Padrão) ======

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

DO $$
DECLARE
    v_clinic_id UUID;
    v_receitas UUID;
    v_deducoes UUID;
    v_custos UUID;
    v_despesas_admin UUID;
    v_despesas_clinica UUID;
    v_despesas_comerciais UUID;
    v_despesas_fin UUID;
    v_investimentos UUID;
    v_ajustes UUID;
    v_receita_bruta UUID;
    v_receita_operacional UUID;
    v_outras_receitas UUID;
    v_impostos UUID;
    v_glosas UUID;
    
BEGIN

SELECT id INTO v_clinic_id FROM clinics LIMIT 1;

IF v_clinic_id IS NOT NULL THEN

v_receitas := seed_account(v_clinic_id, '1. RECEITAS', 'receita', NULL, 1);

  v_receita_bruta := seed_account(v_clinic_id, '1.1 Receita Bruta', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Consultas Particulares', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Consultas Convênios', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Exames', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Procedimentos', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Cirurgias', 'receita', v_receita_bruta, 3);
    PERFORM seed_account(v_clinic_id, 'Telemedicina', 'receita', v_receita_bruta, 3);

  v_receita_operacional := seed_account(v_clinic_id, '1.2 Receita Operacional', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Taxa Administrativa (Clínica)', 'receita', v_receita_operacional, 3);
    PERFORM seed_account(v_clinic_id, 'Aluguel de Sala', 'receita', v_receita_operacional, 3);
    PERFORM seed_account(v_clinic_id, 'Serviços Terceirizados', 'receita', v_receita_operacional, 3);

  v_outras_receitas := seed_account(v_clinic_id, '1.3 Outras Receitas', 'receita', v_receitas, 2);
    PERFORM seed_account(v_clinic_id, 'Juros Recebidos', 'receita', v_outras_receitas, 3);
    PERFORM seed_account(v_clinic_id, 'Multas Recebidas', 'receita', v_outras_receitas, 3);
    PERFORM seed_account(v_clinic_id, 'Outros Ganhos', 'receita', v_outras_receitas, 3);

v_deducoes := seed_account(v_clinic_id, '2. DEDUÇÕES DA RECEITA', 'deducao', NULL, 1);

  v_impostos := seed_account(v_clinic_id, '2.1 Impostos sobre Faturamento', 'deducao', v_deducoes, 2);
    PERFORM seed_account(v_clinic_id, 'Simples Nacional', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'ISS', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'PIS', 'deducao', v_impostos, 3);
    PERFORM seed_account(v_clinic_id, 'COFINS', 'deducao', v_impostos, 3);

  v_glosas := seed_account(v_clinic_id, '2.2 Glosas', 'deducao', v_deducoes, 2);
    PERFORM seed_account(v_clinic_id, 'Glosas Convênios', 'deducao', v_glosas, 3);
    PERFORM seed_account(v_clinic_id, 'Cancelamentos e Estornos', 'deducao', v_glosas, 3);

v_custos := seed_account(v_clinic_id, '3. CUSTOS DIRETOS', 'custo', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Repasse Médico', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Repasse Profissionais', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Custos de Exames', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Materiais Médicos', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Medicamentos', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Instrumentação Cirúrgica', 'custo', v_custos, 2);
  PERFORM seed_account(v_clinic_id, 'Equipamentos (uso por procedimento)', 'custo', v_custos, 2);

v_despesas_admin := seed_account(v_clinic_id, '4. DESPESAS ADMINISTRATIVAS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Salários Administrativos', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Encargos Trabalhistas', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Pró-labore', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Contabilidade', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Jurídico', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Sistemas / Softwares', 'despesa', v_despesas_admin, 2);
  PERFORM seed_account(v_clinic_id, 'Internet / Telefonia', 'despesa', v_despesas_admin, 2);

v_despesas_clinica := seed_account(v_clinic_id, '5. DESPESAS DA CLÍNICA', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Aluguel', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Condomínio', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Energia', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Água', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Limpeza', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Manutenção', 'despesa', v_despesas_clinica, 2);
  PERFORM seed_account(v_clinic_id, 'Segurança', 'despesa', v_despesas_clinica, 2);

v_despesas_comerciais := seed_account(v_clinic_id, '6. DESPESAS COMERCIAIS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Marketing Digital', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Tráfego Pago', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Agência', 'despesa', v_despesas_comerciais, 2);
  PERFORM seed_account(v_clinic_id, 'Comissões', 'despesa', v_despesas_comerciais, 2);

v_despesas_fin := seed_account(v_clinic_id, '7. DESPESAS FINANCEIRAS', 'despesa', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Tarifas Bancárias', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Juros Pagos', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Multas', 'despesa', v_despesas_fin, 2);
  PERFORM seed_account(v_clinic_id, 'Antecipação de Recebíveis', 'despesa', v_despesas_fin, 2);

v_investimentos := seed_account(v_clinic_id, '8. INVESTIMENTOS', 'investimento', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Equipamentos', 'investimento', v_investimentos, 2);
  PERFORM seed_account(v_clinic_id, 'Reforma / Estrutura', 'investimento', v_investimentos, 2);
  PERFORM seed_account(v_clinic_id, 'Móveis', 'investimento', v_investimentos, 2);

v_ajustes := seed_account(v_clinic_id, '9. AJUSTES CONTÁBEIS', 'ajuste', NULL, 1);
  PERFORM seed_account(v_clinic_id, 'Depreciação', 'ajuste', v_ajustes, 2);
  PERFORM seed_account(v_clinic_id, 'Amortização', 'ajuste', v_ajustes, 2);
  PERFORM seed_account(v_clinic_id, 'Provisões', 'ajuste', v_ajustes, 2);

RAISE NOTICE 'Estrutura de contas criada com sucesso para clínica: %', v_clinic_id;

ELSE
  RAISE NOTICE 'Nenhuma clínica encontrada. Seed data não será aplicado.';
END IF;

END $$;

DROP FUNCTION IF EXISTS seed_account(UUID, TEXT, account_type, UUID, INTEGER);

-- ====== MIGRATION 3: FINANCIAL TRANSACTIONS ======

DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS transaction_category CASCADE;

CREATE TYPE transaction_type AS ENUM (
  'revenue',
  'expense',
  'cost',
  'deduction',
  'adjustment',
  'transfer'
);

CREATE TYPE transaction_status AS ENUM (
  'pending',
  'scheduled',
  'processed',
  'paid',
  'canceled'
);

CREATE TYPE transaction_category AS ENUM (
  'appointment',
  'medical_service',
  'exam',
  'procedure',
  'surgery',
  'telemedicine',
  'payroll',
  'materials',
  'maintenance',
  'utilities',
  'rent',
  'tax',
  'commission',
  'marketing',
  'software',
  'equipment',
  'other'
);

CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  account_id UUID,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type transaction_type NOT NULL,
  category transaction_category NOT NULL DEFAULT 'other',
  status transaction_status NOT NULL DEFAULT 'pending',
  appointment_id UUID,
  professional_id UUID,
  supplier_id UUID,
  scheduled_date DATE,
  due_date DATE,
  reference_document TEXT,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_financial_transactions_clinic_id ON financial_transactions(clinic_id);
CREATE INDEX idx_financial_transactions_account_id ON financial_transactions(account_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX idx_financial_transactions_created_at ON financial_transactions(created_at);
CREATE INDEX idx_financial_transactions_appointment_id ON financial_transactions(appointment_id);
CREATE INDEX idx_financial_transactions_professional_id ON financial_transactions(professional_id);
CREATE INDEX idx_financial_transactions_date_range ON financial_transactions(clinic_id, created_at);

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_transactions_clinic_access" ON financial_transactions
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_financial_transactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_financial_transactions_timestamp ON financial_transactions;
CREATE TRIGGER trg_financial_transactions_timestamp
BEFORE UPDATE ON financial_transactions
FOR EACH ROW
EXECUTE FUNCTION update_financial_transactions_timestamp();

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

-- ====== VALIDAÇÃO ======
SELECT 'Estrutura criada com sucesso!' as resultado;
SELECT COUNT(*) as total_contas FROM financial_accounts;
SELECT COUNT(*) as total_transacoes FROM financial_transactions;
