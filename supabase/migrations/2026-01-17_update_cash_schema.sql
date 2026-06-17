-- Atualização do Schema de Caixa
-- Adiciona suporte para APIs externas e workflow de aprovação

-- =============================================
-- 1. ATUALIZAR finance_accounts - Adicionar colunas de saldo externo
-- =============================================

ALTER TABLE finance_accounts 
ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS last_balance_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS external_credentials JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN finance_accounts.bank_code IS 'Código do banco (C6, ITAU, BRADESCO, etc)';
COMMENT ON COLUMN finance_accounts.external_id IS 'ID da conta no sistema externo';
COMMENT ON COLUMN finance_accounts.external_balance IS 'Saldo sincronizado do banco em tempo real';
COMMENT ON COLUMN finance_accounts.last_balance_sync IS 'Última vez que o saldo foi sincronizado';
COMMENT ON COLUMN finance_accounts.external_credentials IS 'Credenciais criptografadas para API externa';

-- =============================================
-- 2. ATUALIZAR card_processors - Adicionar colunas de saldo
-- =============================================

ALTER TABLE card_processors 
ADD COLUMN IF NOT EXISTS processor_type VARCHAR(50) DEFAULT 'GETNET',
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS available_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS last_balance_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS external_credentials JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN card_processors.processor_type IS 'Tipo de processador (GETNET, PAGSEGURO, STONE, etc)';
COMMENT ON COLUMN card_processors.external_id IS 'ID do comerciante no sistema externo';
COMMENT ON COLUMN card_processors.external_balance IS 'Saldo total sincronizado';
COMMENT ON COLUMN card_processors.available_balance IS 'Saldo disponível para saque';
COMMENT ON COLUMN card_processors.pending_balance IS 'Saldo em pendência';
COMMENT ON COLUMN card_processors.last_balance_sync IS 'Última sincronização';

-- =============================================
-- 3. ATUALIZAR cash_transfers - Adicionar campos para drawer e aprovação
-- =============================================

-- Adicionar coluna from_drawer_id se não existir
ALTER TABLE cash_transfers 
ADD COLUMN IF NOT EXISTS from_drawer_id UUID REFERENCES cash_drawers(id) ON DELETE RESTRICT;

-- Tornar from_account_id opcional (permitir NULL)
ALTER TABLE cash_transfers
ALTER COLUMN from_account_id DROP NOT NULL;

-- Adicionar campos de aprovação
ALTER TABLE cash_transfers 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approval_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manager_signature TEXT,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID,
ADD COLUMN IF NOT EXISTS rejection_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Adicionar constraint de verificação (de caixa OU de conta)
ALTER TABLE cash_transfers
DROP CONSTRAINT IF EXISTS cash_transfers_source_check;

ALTER TABLE cash_transfers
ADD CONSTRAINT cash_transfers_source_check
CHECK (
  (from_drawer_id IS NOT NULL AND from_account_id IS NULL)
  OR
  (from_drawer_id IS NULL AND from_account_id IS NOT NULL)
);

COMMENT ON COLUMN cash_transfers.from_drawer_id IS 'ID do caixa de origem (se transferência de caixa)';
COMMENT ON COLUMN cash_transfers.status IS 'pending | pending_approval | confirmed | rejected';
COMMENT ON COLUMN cash_transfers.approved_by IS 'UUID do gestor que aprovou';
COMMENT ON COLUMN cash_transfers.manager_signature IS 'Assinatura digital em base64';

-- Criar índices para foreign keys (se não existirem)
CREATE INDEX IF NOT EXISTS idx_cash_transfers_from_drawer ON cash_transfers(from_drawer_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_approved_by ON cash_transfers(approved_by);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_rejected_by ON cash_transfers(rejected_by);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_status ON cash_transfers(status);

-- =============================================
-- 4. CRIAR TABELA cash_transfer_audit_logs - Auditoria de aprovações
-- =============================================

CREATE TABLE IF NOT EXISTS cash_transfer_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  transfer_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'approved' | 'rejected' | 'created' | 'updated'
  performed_by UUID NOT NULL,
  action_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_id ON cash_transfer_audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_transfer_id ON cash_transfer_audit_logs(transfer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON cash_transfer_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON cash_transfer_audit_logs(created_at);

-- RLS
ALTER TABLE cash_transfer_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver logs do próprio clinic" 
  ON cash_transfer_audit_logs 
  FOR SELECT 
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Apenas sistema pode inserir logs" 
  ON cash_transfer_audit_logs 
  FOR INSERT 
  WITH CHECK (true);

-- =============================================
-- 5. CRIAR TABELA sync_error_logs - Log de erros de sincronização
-- =============================================

CREATE TABLE IF NOT EXISTS sync_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  error_type VARCHAR(50), -- 'BANK_SYNC' | 'CARD_SYNC' | 'AUTH_ERROR' | etc
  error_message TEXT,
  error_details JSONB,
  external_source VARCHAR(50), -- 'C6_BANK' | 'GETNET' | etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sync_error_logs_clinic_id ON sync_error_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_sync_error_logs_error_type ON sync_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_sync_error_logs_created_at ON sync_error_logs(created_at);

-- RLS
ALTER TABLE sync_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver erros do próprio clinic" 
  ON sync_error_logs 
  FOR SELECT 
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- =============================================
-- 6. CRIAR TABELA cash_balance_history - Histórico de saldos
-- =============================================

CREATE TABLE IF NOT EXISTS cash_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  balance_type VARCHAR(50), -- 'BANK' | 'CARD' | 'DRAWER' | 'GENERAL'
  source_id UUID, -- ID da conta/processador/caixa
  source_name VARCHAR(255),
  balance_amount DECIMAL(15,2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_balance_history_clinic_id ON cash_balance_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_source_id ON cash_balance_history(source_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_recorded_at ON cash_balance_history(recorded_at);

-- =============================================
-- 7. FUNÇÃO: Registrar ação de aprovação
-- =============================================

CREATE OR REPLACE FUNCTION log_transfer_approval(
  p_transfer_id UUID,
  p_clinic_id UUID,
  p_action VARCHAR,
  p_performed_by UUID,
  p_action_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO cash_transfer_audit_logs (
    clinic_id,
    transfer_id,
    action,
    performed_by,
    action_data
  ) VALUES (
    p_clinic_id,
    p_transfer_id,
    p_action,
    p_performed_by,
    p_action_data
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. FUNÇÃO: Sincronizar saldos com histórico
-- =============================================

CREATE OR REPLACE FUNCTION record_balance_snapshot(
  p_clinic_id UUID,
  p_balance_type VARCHAR,
  p_source_id UUID,
  p_source_name VARCHAR,
  p_balance_amount DECIMAL
) RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO cash_balance_history (
    clinic_id,
    balance_type,
    source_id,
    source_name,
    balance_amount
  ) VALUES (
    p_clinic_id,
    p_balance_type,
    p_source_id,
    p_source_name,
    p_balance_amount
  ) RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 9. ATUALIZAR POLÍTICA RLS - cash_transfers
-- =============================================

-- Apenas para garantir que as políticas existentes cobrem o novo schema
-- (Não sobrescrever policies existentes, só comentando a estrutura esperada)

-- Esperado: 
-- - Users podem VER transferências do seu clinic
-- - Apenas GESTOR/ADMIN podem CRIAR com status='pending_approval'
-- - Apenas GESTOR/ADMIN podem ATUALIZAR status para 'confirmed'/'rejected'

-- =============================================
-- 10. CONFIRMAR Índices de Performance
-- =============================================

-- Finance accounts
CREATE INDEX IF NOT EXISTS idx_finance_accounts_clinic_id ON finance_accounts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_account_type ON finance_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_last_sync ON finance_accounts(last_balance_sync DESC);

-- Card processors
CREATE INDEX IF NOT EXISTS idx_card_processors_clinic_id ON card_processors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_card_processors_is_active ON card_processors(is_active);
CREATE INDEX IF NOT EXISTS idx_card_processors_last_sync ON card_processors(last_balance_sync DESC);

-- Cash transfers
CREATE INDEX IF NOT EXISTS idx_cash_transfers_clinic_id ON cash_transfers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_from_account ON cash_transfers(from_account_id) WHERE from_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cash_transfers_from_drawer ON cash_transfers(from_drawer_id) WHERE from_drawer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cash_transfers_to_account ON cash_transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transfers_created_at ON cash_transfers(created_at DESC);

-- =============================================
-- CONCLUSÃO
-- =============================================

-- Log da migração
DO $$
BEGIN
  RAISE NOTICE 'Schema de caixa atualizado com sucesso!';
  RAISE NOTICE 'Novas colunas adicionadas a finance_accounts e card_processors';
  RAISE NOTICE 'Novas tabelas criadas: cash_transfer_audit_logs, sync_error_logs, cash_balance_history';
  RAISE NOTICE 'Funções criadas: log_transfer_approval, record_balance_snapshot';
END $$;
