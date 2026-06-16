-- ============================================================================
-- MIGRATION: 20260520_automate_cash_settlement.sql
-- PURPOSE: ETAPA 3 - Baixa financeira automática (settlement automation)
-- STATUS: Ativa
-- DATE: 2026-05-20
-- ============================================================================

-- ============================================================================
-- 1. TABELA: cash_settlement_logs
-- Rastreia todas as baixas financeiras realizadas
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_settlement_logs (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  
  -- Origem do settlement
  origin_type TEXT NOT NULL, -- 'receivable_payment', 'payable_paid', 'transfer'
  origin_id TEXT NOT NULL,
  
  -- Detalhes
  account_from UUID,
  account_to UUID,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  
  -- Cash flow impact
  cf_entrada_amount NUMERIC(12,2), -- entrada criada
  cf_saida_amount NUMERIC(12,2), -- saída criada
  cf_entries_created TEXT[], -- IDs de cash_flow_entries criadas
  
  -- Status
  status TEXT DEFAULT 'completed', -- completed, pending, failed, reversed
  error_message TEXT,
  
  -- Reversão
  is_reversal BOOLEAN DEFAULT false,
  reversal_of_id BIGINT,
  reversal_reason TEXT,
  
  -- Auditoria
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_settlement_logs_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_settlement_logs_reversal FOREIGN KEY (reversal_of_id) REFERENCES cash_settlement_logs(id)
);

CREATE INDEX idx_cash_settlement_logs_clinic ON cash_settlement_logs(clinic_id);
CREATE INDEX idx_cash_settlement_logs_origin ON cash_settlement_logs(origin_type, origin_id);
CREATE INDEX idx_cash_settlement_logs_status ON cash_settlement_logs(status);
CREATE INDEX idx_cash_settlement_logs_created_at ON cash_settlement_logs(created_at DESC);

-- ============================================================================
-- 2. FUNÇÃO: settle_receivable_payment()
-- Integra pagamento recebido com baixa no cash flow
-- ============================================================================
CREATE OR REPLACE FUNCTION settle_receivable_payment(
  p_payment_id BIGINT,
  p_clinic_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_payment RECORD;
  v_receivable RECORD;
  v_settlement_log_id BIGINT;
  v_cf_entrada_id BIGINT;
  v_account_id UUID;
  v_result JSONB;
  v_account_balance_before NUMERIC(12,2);
  v_account_balance_after NUMERIC(12,2);
BEGIN
  -- 1. Buscar pagamento
  SELECT * INTO v_payment FROM receivable_payments 
  WHERE id = p_payment_id AND clinic_id = p_clinic_id LIMIT 1;
  
  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;
  
  -- 2. Buscar receivable
  SELECT * INTO v_receivable FROM ar_invoices 
  WHERE id = v_payment.receivable_id LIMIT 1;
  
  IF v_receivable IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receivable not found');
  END IF;
  
  -- 3. Selecionar conta padrão (usar campo cash_flow_account_id se disponível)
  SELECT id INTO v_account_id FROM financial_accounts
  WHERE clinic_id = p_clinic_id AND is_default = true AND is_active = true
  LIMIT 1;
  
  IF v_account_id IS NULL THEN
    -- Fallback: primeira conta ativa
    SELECT id INTO v_account_id FROM financial_accounts
    WHERE clinic_id = p_clinic_id AND is_active = true
    LIMIT 1;
  END IF;
  
  -- 4. Registrar saldo anterior
  SELECT COALESCE(saldo_inicial, 0) INTO v_account_balance_before 
  FROM financial_accounts WHERE id = v_account_id;
  
  -- 5. Criar entrada no cash_flow_entries (realizado, não projeção)
  INSERT INTO cash_flow_entries (
    clinic_id,
    type,
    amount,
    description,
    origin,
    reference_id,
    reference_type,
    is_projected,
    account_id,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'entrada',
    v_payment.amount_paid,
    format('Recebimento %s: %s', v_payment.payment_method, v_receivable.payer_name),
    'receivable_payment',
    v_payment_id::TEXT,
    'payment',
    false, -- não é projeção, é realizado
    v_account_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_cf_entrada_id;
  
  -- 6. Atualizar saldo da conta (entrada = +)
  UPDATE financial_accounts SET
    saldo_inicial = saldo_inicial + v_payment.amount_paid,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = v_account_id;
  
  -- 7. Registrar saldo após
  SELECT COALESCE(saldo_inicial, 0) INTO v_account_balance_after 
  FROM financial_accounts WHERE id = v_account_id;
  
  -- 8. Criar settlement log
  INSERT INTO cash_settlement_logs (
    clinic_id,
    origin_type,
    origin_id,
    account_from,
    account_to,
    amount,
    description,
    cf_entrada_amount,
    cf_saida_amount,
    cf_entries_created,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'receivable_payment',
    v_payment_id::TEXT,
    NULL, -- entrada não tem origem
    v_account_id,
    v_payment.amount_paid,
    format('Pagamento recebido: %s', v_receivable.payer_name),
    v_payment.amount_paid,
    0,
    ARRAY[v_cf_entrada_id::TEXT],
    'completed',
    v_payment.created_by,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_settlement_log_id;
  
  -- 9. Invalidar cache de analytics
  -- (Este seria feito via trigger em produção, aqui apenas log)
  
  RETURN jsonb_build_object(
    'success', true,
    'settlement_log_id', v_settlement_log_id,
    'cf_entrada_id', v_cf_entrada_id,
    'account_id', v_account_id,
    'account_balance_before', v_account_balance_before,
    'account_balance_after', v_account_balance_after,
    'amount_settled', v_payment.amount_paid,
    'message', 'Payment settled successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  INSERT INTO cash_settlement_logs (
    clinic_id,
    origin_type,
    origin_id,
    amount,
    status,
    error_message,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'receivable_payment',
    p_payment_id::TEXT,
    0,
    'failed',
    SQLERRM,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. FUNÇÃO: settle_payable_payment()
-- Integra pagamento de conta a pagar com saída no cash flow
-- ============================================================================
CREATE OR REPLACE FUNCTION settle_payable_payment(
  p_payable_id BIGINT,
  p_clinic_id UUID,
  p_account_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_payable RECORD;
  v_settlement_log_id BIGINT;
  v_cf_saida_id BIGINT;
  v_account_balance_before NUMERIC(12,2);
  v_account_balance_after NUMERIC(12,2);
  v_result JSONB;
BEGIN
  -- 1. Buscar AP Bill
  SELECT * INTO v_payable FROM ap_bills 
  WHERE id = p_payable_id AND clinic_id = p_clinic_id LIMIT 1;
  
  IF v_payable IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payable not found');
  END IF;
  
  -- 2. Registrar saldo anterior
  SELECT COALESCE(saldo_inicial, 0) INTO v_account_balance_before 
  FROM financial_accounts WHERE id = p_account_id;
  
  -- 3. Criar saída no cash_flow_entries
  INSERT INTO cash_flow_entries (
    clinic_id,
    type,
    amount,
    description,
    origin,
    reference_id,
    reference_type,
    is_projected,
    account_id,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'saida',
    v_payable.valor,
    format('Pagamento fornecedor: %s', v_payable.fornecedor),
    'payable_payment',
    v_payable_id::TEXT,
    'payable',
    false, -- realizado
    p_account_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_cf_saida_id;
  
  -- 4. Atualizar saldo da conta (saída = -)
  UPDATE financial_accounts SET
    saldo_inicial = saldo_inicial - v_payable.valor,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_account_id;
  
  -- 5. Registrar saldo após
  SELECT COALESCE(saldo_inicial, 0) INTO v_account_balance_after 
  FROM financial_accounts WHERE id = p_account_id;
  
  -- 6. Criar settlement log
  INSERT INTO cash_settlement_logs (
    clinic_id,
    origin_type,
    origin_id,
    account_from,
    account_to,
    amount,
    description,
    cf_entrada_amount,
    cf_saida_amount,
    cf_entries_created,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'payable_paid',
    v_payable_id::TEXT,
    p_account_id,
    NULL,
    v_payable.valor,
    format('Pagamento realizado: %s', v_payable.fornecedor),
    0,
    v_payable.valor,
    ARRAY[v_cf_saida_id::TEXT],
    'completed',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_settlement_log_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'settlement_log_id', v_settlement_log_id,
    'cf_saida_id', v_cf_saida_id,
    'account_id', p_account_id,
    'account_balance_before', v_account_balance_before,
    'account_balance_after', v_account_balance_after,
    'amount_settled', v_payable.valor,
    'message', 'Payable settled successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  INSERT INTO cash_settlement_logs (
    clinic_id,
    origin_type,
    origin_id,
    amount,
    status,
    error_message,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'payable_paid',
    p_payable_id::TEXT,
    0,
    'failed',
    SQLERRM,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNÇÃO: reverse_settlement()
-- Reverte uma baixa (rollback seguro)
-- ============================================================================
CREATE OR REPLACE FUNCTION reverse_settlement(
  p_settlement_log_id BIGINT,
  p_clinic_id UUID,
  p_reason TEXT DEFAULT 'Manual reversal'
) RETURNS JSONB AS $$
DECLARE
  v_settlement RECORD;
  v_reversal_log_id BIGINT;
  v_result JSONB;
  i TEXT;
BEGIN
  -- 1. Buscar settlement original
  SELECT * INTO v_settlement FROM cash_settlement_logs
  WHERE id = p_settlement_log_id AND clinic_id = p_clinic_id AND is_reversal = false LIMIT 1;
  
  IF v_settlement IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settlement not found');
  END IF;
  
  -- 2. Reverter cash_flow_entries
  -- Inverter tipo e amount de cada entrada criada
  UPDATE cash_flow_entries SET
    type = CASE WHEN type = 'entrada' THEN 'saida' ELSE 'entrada' END,
    is_reversal = true,
    reversal_of_id = cf_entry.id
  FROM (
    SELECT id FROM cash_flow_entries 
    WHERE id::TEXT = ANY(v_settlement.cf_entries_created)
  ) cf_entry
  WHERE cash_flow_entries.id = cf_entry.id;
  
  -- 3. Reverter saldo da conta
  IF v_settlement.cf_entrada_amount > 0 THEN
    -- Desfazer entrada (subtrair do saldo)
    UPDATE financial_accounts SET
      saldo_inicial = saldo_inicial - v_settlement.cf_entrada_amount
    WHERE id = v_settlement.account_to;
  END IF;
  
  IF v_settlement.cf_saida_amount > 0 THEN
    -- Desfazer saída (adicionar ao saldo)
    UPDATE financial_accounts SET
      saldo_inicial = saldo_inicial + v_settlement.cf_saida_amount
    WHERE id = v_settlement.account_from;
  END IF;
  
  -- 4. Criar reversal log
  INSERT INTO cash_settlement_logs (
    clinic_id,
    origin_type,
    origin_id,
    account_from,
    account_to,
    amount,
    description,
    status,
    is_reversal,
    reversal_of_id,
    reversal_reason,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    v_settlement.origin_type,
    v_settlement.origin_id,
    v_settlement.account_from,
    v_settlement.account_to,
    v_settlement.amount,
    format('Reversão: %s', v_settlement.description),
    'completed',
    true,
    p_settlement_log_id,
    p_reason,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_reversal_log_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reversal_log_id', v_reversal_log_id,
    'original_settlement_id', p_settlement_log_id,
    'message', 'Settlement reversed successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGER: Ao marcar receivable como recebida, settle automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_auto_settle_on_receivable_received()
RETURNS TRIGGER AS $$
DECLARE
  v_latest_payment RECORD;
  v_result JSONB;
BEGIN
  -- Só processar se status mudou para 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    -- Buscar último pagamento
    SELECT * INTO v_latest_payment FROM receivable_payments
    WHERE receivable_id = NEW.id
    ORDER BY payment_date DESC LIMIT 1;
    
    -- Se há pagamento, fazer settlement automático
    IF v_latest_payment IS NOT NULL THEN
      v_result := settle_receivable_payment(v_latest_payment.id, NEW.clinic_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_settle_receivable_received ON ar_invoices;
CREATE TRIGGER trg_auto_settle_receivable_received
AFTER UPDATE ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_settle_on_receivable_received();

-- ============================================================================
-- 6. FUNÇÃO: get_settlement_impact()
-- Calcula impacto de um settlement no cash flow e indicadores
-- ============================================================================
CREATE OR REPLACE FUNCTION get_settlement_impact(
  p_settlement_log_id BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_settlement RECORD;
  v_current_balance NUMERIC(12,2);
  v_dre_impact JSONB;
  v_cash_health TEXT;
  v_days_runway NUMERIC(5,2);
  v_result JSONB;
BEGIN
  SELECT * INTO v_settlement FROM cash_settlement_logs
  WHERE id = p_settlement_log_id LIMIT 1;
  
  IF v_settlement IS NULL THEN
    RETURN jsonb_build_object('error', 'Settlement not found');
  END IF;
  
  -- Saldo atual
  SELECT COALESCE(saldo_inicial, 0) INTO v_current_balance
  FROM financial_accounts WHERE id = v_settlement.account_to OR id = v_settlement.account_from LIMIT 1;
  
  -- Calcular saúde do caixa (simplificado)
  IF v_current_balance > 100000 THEN
    v_cash_health := 'healthy';
  ELSIF v_current_balance > 10000 THEN
    v_cash_health := 'warning';
  ELSE
    v_cash_health := 'critical';
  END IF;
  
  RETURN jsonb_build_object(
    'settlement_id', v_settlement.id,
    'origin_type', v_settlement.origin_type,
    'amount', v_settlement.amount,
    'account_balance_current', v_current_balance,
    'cash_health', v_cash_health,
    'impact_summary', jsonb_build_object(
      'cash_flow_updated', true,
      'balance_updated', true,
      'dre_impacted', v_settlement.cf_entrada_amount > 0 OR v_settlement.cf_saida_amount > 0
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================
ALTER TABLE cash_settlement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY cash_settlement_logs_select
  ON cash_settlement_logs FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE POLICY cash_settlement_logs_insert
  ON cash_settlement_logs FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')));

-- ============================================================================
-- COMMIT
-- ============================================================================
-- ✅ cash_settlement_logs: Rastreamento de baixas
-- ✅ settle_receivable_payment(): Settlement automático
-- ✅ settle_payable_payment(): Settlement de despesas
-- ✅ reverse_settlement(): Rollback seguro
-- ✅ Triggers automáticos
-- ✅ get_settlement_impact(): Análise de impacto
-- ✅ RLS Policies
