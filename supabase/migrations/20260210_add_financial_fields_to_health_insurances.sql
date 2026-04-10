-- ================================================
-- Migração: Adicionar Campos Financeiros Avançados
-- Data: 2026-02-10
-- Tabela: health_insurances
-- ================================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'health_insurances'
  ) THEN
    RAISE EXCEPTION 'Tabela health_insurances não existe!';
  END IF;
END
$$;

-- ================================================
-- SEÇÃO 1: CONDIÇÕES COMERCIAIS
-- ================================================

-- Campo: administration_fee_percentage
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS administration_fee_percentage NUMERIC(5,2) DEFAULT 0;

-- Campo: early_payment_discount_percentage
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS early_payment_discount_percentage NUMERIC(5,2) DEFAULT 0;

-- Campo: volume_discount_percentage
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS volume_discount_percentage NUMERIC(5,2) DEFAULT 0;

-- ================================================
-- SEÇÃO 2: PRAZOS E PAGAMENTO
-- ================================================

-- Campo: payment_due_days
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS payment_due_days INTEGER DEFAULT 30;

-- Campo: billing_cycle_start
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS billing_cycle_start INTEGER DEFAULT 1;

-- Campo: billing_cycle_end
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS billing_cycle_end INTEGER DEFAULT 30;

-- Campo: accepted_payment_methods (Array de texto)
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS accepted_payment_methods TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ================================================
-- SEÇÃO 3: REAJUSTES
-- ================================================

-- Campo: reajustment_index
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS reajustment_index VARCHAR(50);

-- Campo: annual_reajustment_date (mês no formato YYYY-MM)
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS annual_reajustment_date VARCHAR(7);

-- Campo: next_reajustment_date
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS next_reajustment_date DATE;

-- ================================================
-- SEÇÃO 4: VIGÊNCIA DO CONTRATO
-- ================================================

-- Campo: contract_start_date
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS contract_start_date DATE;

-- Campo: contract_end_date
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS contract_end_date DATE;

-- Campo: auto_renewal
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT FALSE;

-- Campo: prior_notice_days
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS prior_notice_days INTEGER DEFAULT 30;

-- ================================================
-- SEÇÃO 5: LIMITES E TETOS
-- ================================================

-- Campo: monthly_billing_ceiling (teto mensal em R$)
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS monthly_billing_ceiling NUMERIC(12,2);

-- Campo: consultation_limit (limite de consultas por ano)
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS consultation_limit INTEGER;

-- Campo: copayment_value (co-participação/franquia em R$)
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS copayment_value NUMERIC(8,2);

-- ================================================
-- SEÇÃO 6: POLÍTICA DE SUSPENSÃO E MULTAS
-- ================================================

-- Campo: days_to_suspension
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS days_to_suspension INTEGER DEFAULT 30;

-- Campo: late_payment_fine_percentage
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS late_payment_fine_percentage NUMERIC(5,2) DEFAULT 0;

-- Campo: daily_interest_rate_percentage
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS daily_interest_rate_percentage NUMERIC(7,4) DEFAULT 0;

-- ================================================
-- SEÇÃO 7: CONTATOS E DADOS BANCÁRIOS
-- ================================================

-- Campo: financial_contact_name
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS financial_contact_name VARCHAR(255);

-- Campo: financial_contact_email
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS financial_contact_email VARCHAR(255);

-- Campo: financial_contact_phone
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS financial_contact_phone VARCHAR(20);

-- Campo: bank_name
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

-- Campo: bank_branch
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(10);

-- Campo: bank_account
ALTER TABLE IF EXISTS public.health_insurances
ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);

-- ================================================
-- CRIAR ÍNDICES PARA MELHOR PERFORMANCE
-- ================================================

-- Índice para contract_start_date e contract_end_date
CREATE INDEX IF NOT EXISTS idx_health_insurances_contract_dates
ON public.health_insurances(contract_start_date, contract_end_date);

-- Índice para next_reajustment_date
CREATE INDEX IF NOT EXISTS idx_health_insurances_next_reajustment
ON public.health_insurances(next_reajustment_date);

-- Índice para financial_contact_email
CREATE INDEX IF NOT EXISTS idx_health_insurances_financial_email
ON public.health_insurances(financial_contact_email);

-- ================================================
-- ATUALIZAR updated_at CASO EXISTA
-- ================================================

UPDATE public.health_insurances 
SET updated_at = CURRENT_TIMESTAMP
WHERE updated_at IS NULL;

-- ================================================
-- COMENTÁRIOS DESCRITIVOS DOS CAMPOS
-- ================================================

COMMENT ON COLUMN public.health_insurances.administration_fee_percentage IS 'Taxa de administração cobrada pelo convênio (%)';
COMMENT ON COLUMN public.health_insurances.early_payment_discount_percentage IS 'Desconto oferecido se pagamento antecipado (%)';
COMMENT ON COLUMN public.health_insurances.volume_discount_percentage IS 'Desconto por volume faturado (%)';
COMMENT ON COLUMN public.health_insurances.payment_due_days IS 'Dias para Pagamento (DPP) - vencimento da fatura';
COMMENT ON COLUMN public.health_insurances.billing_cycle_start IS 'Dia de início do ciclo de faturamento';
COMMENT ON COLUMN public.health_insurances.billing_cycle_end IS 'Dia de término do ciclo de faturamento';
COMMENT ON COLUMN public.health_insurances.accepted_payment_methods IS 'Array com métodos de pagamento aceitos (debit, boleto, ted, pix)';
COMMENT ON COLUMN public.health_insurances.reajustment_index IS 'Índice de reajuste (INPC, IPCA, IGP-M, fixed_percentage, customized)';
COMMENT ON COLUMN public.health_insurances.annual_reajustment_date IS 'Mês de reajuste anual (YYYY-MM)';
COMMENT ON COLUMN public.health_insurances.next_reajustment_date IS 'Próxima data de reajuste para controle/avaliação';
COMMENT ON COLUMN public.health_insurances.contract_start_date IS 'Data de início do contrato';
COMMENT ON COLUMN public.health_insurances.contract_end_date IS 'Data de término/vencimento do contrato';
COMMENT ON COLUMN public.health_insurances.auto_renewal IS 'Se o contrato se renova automaticamente';
COMMENT ON COLUMN public.health_insurances.prior_notice_days IS 'Dias de aviso prévio antes do vencimento sem renovação';
COMMENT ON COLUMN public.health_insurances.monthly_billing_ceiling IS 'Teto/limite de faturamento mensal em R$';
COMMENT ON COLUMN public.health_insurances.consultation_limit IS 'Limite de consultas permitidas por ano';
COMMENT ON COLUMN public.health_insurances.copayment_value IS 'Valor de co-participação/franquia por atendimento em R$';
COMMENT ON COLUMN public.health_insurances.days_to_suspension IS 'Dias após atraso para suspender atendimentos';
COMMENT ON COLUMN public.health_insurances.late_payment_fine_percentage IS 'Multa por pagamento em atraso (%)';
COMMENT ON COLUMN public.health_insurances.daily_interest_rate_percentage IS 'Taxa de juros diária (%)';
COMMENT ON COLUMN public.health_insurances.financial_contact_name IS 'Nome do responsável financeiro do convênio';
COMMENT ON COLUMN public.health_insurances.financial_contact_email IS 'Email do contato financeiro';
COMMENT ON COLUMN public.health_insurances.financial_contact_phone IS 'Telefone do contato financeiro';
COMMENT ON COLUMN public.health_insurances.bank_name IS 'Nome do banco para depósitos';
COMMENT ON COLUMN public.health_insurances.bank_branch IS 'Agência bancária';
COMMENT ON COLUMN public.health_insurances.bank_account IS 'Número da conta bancária';

-- ================================================
-- VERIFICAÇÃO FINAL
-- ================================================

DO $$
DECLARE
  missing_columns TEXT;
BEGIN
  SELECT STRING_AGG(column_name, ', ')
  INTO missing_columns
  FROM (
    VALUES 
      ('administration_fee_percentage'),
      ('early_payment_discount_percentage'),
      ('volume_discount_percentage'),
      ('payment_due_days'),
      ('billing_cycle_start'),
      ('billing_cycle_end'),
      ('accepted_payment_methods'),
      ('reajustment_index'),
      ('annual_reajustment_date'),
      ('next_reajustment_date'),
      ('contract_start_date'),
      ('contract_end_date'),
      ('auto_renewal'),
      ('prior_notice_days'),
      ('monthly_billing_ceiling'),
      ('consultation_limit'),
      ('copayment_value'),
      ('days_to_suspension'),
      ('late_payment_fine_percentage'),
      ('daily_interest_rate_percentage'),
      ('financial_contact_name'),
      ('financial_contact_email'),
      ('financial_contact_phone'),
      ('bank_name'),
      ('bank_branch'),
      ('bank_account')
  ) AS required_cols(column_name)
  WHERE column_name NOT IN (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'health_insurances'
  );

  IF missing_columns IS NOT NULL THEN
    RAISE WARNING 'Colunas não criadas: %', missing_columns;
  ELSE
    RAISE NOTICE '✓ Todos os campos foram criados com sucesso!';
  END IF;
END
$$;
