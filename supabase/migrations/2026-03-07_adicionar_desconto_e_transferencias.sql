-- ============================================
-- 🔧 MIGRAÇÃO: Adicionar Desconto e Transferências
-- Data: 7 de março de 2026
-- ============================================

-- ============================================
-- 1️⃣ EXPANDIR TABELA accounts_receivable
-- Adicionar campos de desconto e novos tipos
-- ============================================

-- Adicionar coluna de desconto (se ainda não existe)
ALTER TABLE accounts_receivable
ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_authorized_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS discount_observation TEXT;

-- Criar índices para desconto
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_discount_reason 
  ON accounts_receivable(discount_reason) 
  WHERE discount > 0;

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_discount_authorized_by 
  ON accounts_receivable(discount_authorized_by) 
  WHERE discount > 0;

-- ============================================
-- 2️⃣ CRIAR TABELA: discount_authorizations
-- Para auditoria e workflow de aprovação
-- ============================================

CREATE TABLE IF NOT EXISTS discount_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  accounts_receivable_id UUID REFERENCES accounts_receivable(id) ON DELETE SET NULL,
  
  -- Informações do desconto
  discount_amount DECIMAL(10, 2) NOT NULL,
  discount_reason VARCHAR(50) NOT NULL CHECK (discount_reason IN ('cortesia', 'promocao', 'primeira_consulta', 'indicacao', 'fidelidade', 'erro_cobranca', 'dificuldade_financeira', 'outros')),
  discount_observation TEXT,
  
  -- Quem solicitou
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Aprovação/Rejeição
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  authorized_at TIMESTAMP,
  authorization_notes TEXT,
  
  -- Timing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para discount_authorizations
CREATE INDEX IF NOT EXISTS idx_discount_authorizations_clinic 
  ON discount_authorizations(clinic_id);

CREATE INDEX IF NOT EXISTS idx_discount_authorizations_appointment 
  ON discount_authorizations(appointment_id);

CREATE INDEX IF NOT EXISTS idx_discount_authorizations_status 
  ON discount_authorizations(status);

CREATE INDEX IF NOT EXISTS idx_discount_authorizations_requested_by 
  ON discount_authorizations(requested_by);

CREATE INDEX IF NOT EXISTS idx_discount_authorizations_authorized_by 
  ON discount_authorizations(authorized_by);

CREATE INDEX IF NOT EXISTS idx_discount_authorizations_created_at 
  ON discount_authorizations(created_at);

-- ============================================
-- 3️⃣ ATUALIZAR receivable_type
-- Adicionar novos tipos de transferência
-- ============================================

-- A coluna receivable_type já existe, apenas atualizando o constraint
-- Para include os novos tipos: DOC, TED, DEPOSITO

ALTER TABLE accounts_receivable
DROP CONSTRAINT IF EXISTS accounts_receivable_receivable_type_check;

ALTER TABLE accounts_receivable
ADD CONSTRAINT accounts_receivable_receivable_type_check 
  CHECK (receivable_type IN ('CASH', 'CREDIT_CARD', 'PIX', 'CHECK', 'BOLETO', 'DOC', 'TED', 'DEPOSIT'));

-- ============================================
-- 4️⃣ EXPANDIR chart_of_accounts
-- Adicionar contas para novos tipos de pagamento
-- ============================================

-- Inserir novas contas de plano de contas padrão (se não existirem)
-- NOTA: Substitua {CLINIC_ID} pelo ID real da clínica

-- Você pode executar isto em uma migration específica por clínica
-- INSERT INTO chart_of_accounts (clinic_id, code, name, account_type, parent_code) VALUES
-- ('{CLINIC_ID}', '1.1.2.05', 'Transferências a Receber (DOC/TED)', 'ASSET', '1.1.2'),
-- ('{CLINIC_ID}', '1.1.2.06', 'Depósitos a Receber', 'ASSET', '1.1.2')
-- ON CONFLICT (clinic_id, code) DO NOTHING;

-- ============================================
-- 5️⃣ CRIAR VIEW: vw_discount_summary
-- Para relatórios de descontos
-- ============================================

DROP VIEW IF EXISTS vw_discount_summary CASCADE;

CREATE VIEW vw_discount_summary AS
SELECT 
  da.clinic_id,
  da.discount_reason,
  COUNT(*) as total_discounts,
  SUM(da.discount_amount) as total_amount,
  COUNT(CASE WHEN da.status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN da.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN da.status = 'rejected' THEN 1 END) as rejected_count,
  DATE_TRUNC('day', da.requested_at) as discount_date
FROM discount_authorizations da
GROUP BY da.clinic_id, da.discount_reason, DATE_TRUNC('day', da.requested_at)
ORDER BY discount_date DESC;

-- ============================================
-- 6️⃣ RLS POLICIES (Completas: SELECT, INSERT, UPDATE)
-- ============================================

ALTER TABLE discount_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discount_authorizations_clinic_policy ON discount_authorizations;
DROP POLICY IF EXISTS discount_authorizations_insert_policy ON discount_authorizations;
DROP POLICY IF EXISTS discount_authorizations_update_policy ON discount_authorizations;

-- SELECT: Qualquer um da clínica pode ver descontos
CREATE POLICY discount_authorizations_clinic_policy
  ON discount_authorizations
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- INSERT: Qualquer um da clínica pode criar solicitação de desconto
CREATE POLICY discount_authorizations_insert_policy
  ON discount_authorizations
  FOR INSERT
  WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
    AND requested_by = auth.uid()
  );

-- UPDATE: Apenas o requestor ou um admin pode atualizar
CREATE POLICY discount_authorizations_update_policy
  ON discount_authorizations
  FOR UPDATE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 7️⃣ TRIGGER: Atualizar campo updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_discount_authorizations_updated_at ON discount_authorizations;

CREATE OR REPLACE FUNCTION update_discount_authorizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discount_authorizations_updated_at
  BEFORE UPDATE ON discount_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_authorizations_updated_at();

-- ============================================
-- 8️⃣ VERIFICAÇÃO
-- ============================================

-- Validar nova estrutura
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'accounts_receivable',
  'discount_authorizations'
)
ORDER BY table_name;

-- Validar colunas de desconto
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts_receivable' 
AND column_name LIKE '%discount%'
ORDER BY ordinal_position;

-- FIM DO SCRIPT
