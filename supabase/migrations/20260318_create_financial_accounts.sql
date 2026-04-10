-- ============================================
-- PLANO DE CONTAS - GESCLINIC (PADRÃO SAÚDE)
-- ============================================

-- 1. LIMPAR DADOS ANTIGOS (para reexecução segura)
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

-- 4. ÍNDICES
CREATE INDEX idx_financial_accounts_clinic ON financial_accounts(clinic_id);
CREATE INDEX idx_financial_accounts_parent ON financial_accounts(parent_id);
CREATE INDEX idx_financial_accounts_type ON financial_accounts(type);

-- 5. MIGRATION COMPLETA ✅
