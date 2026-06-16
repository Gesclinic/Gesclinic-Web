-- ============================================================================
-- MIGRATION: 20260520_enhance_receivables_automation.sql
-- PURPOSE: ETAPA 2 - Recebíveis automáticos com parcelas, payment methods, status
-- STATUS: Ativa
-- DATE: 2026-05-20
-- ============================================================================

-- ============================================================================
-- 1. ENUMS: Payment Methods e Statuses
-- ============================================================================
CREATE TYPE IF NOT EXISTS receivable_payment_method AS ENUM (
  'cash',           -- Dinheiro
  'pix',            -- PIX
  'cartao_credito', -- Cartão de crédito
  'cartao_debito',  -- Cartão de débito
  'ted',            -- Transferência eletrônica
  'doc',            -- Documento de transferência
  'boleto',         -- Boleto bancário
  'convenio',       -- Convênio/Health Insurance
  'cheque',         -- Cheque
  'outro'           -- Outro
);

CREATE TYPE IF NOT EXISTS receivable_status_extended AS ENUM (
  'pending',        -- Aguardando pagamento
  'partial',        -- Recebimento parcial
  'overdue',        -- Vencida
  'received',       -- Recebida
  'cancelled',      -- Cancelada
  'refunded'        -- Reembolsada
);

-- ============================================================================
-- 2. TABELA: receivable_installments
-- Parcelas individuais de uma AR Invoice
-- ============================================================================
CREATE TABLE IF NOT EXISTS receivable_installments (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  receivable_id BIGINT NOT NULL,
  
  -- Identificação
  installment_number INT NOT NULL, -- 1, 2, 3, etc
  total_installments INT NOT NULL, -- total de parcelas
  
  -- Valores
  value_gross NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  value_net NUMERIC(12,2) NOT NULL, -- gross - discount - tax
  
  -- Datas
  due_date DATE NOT NULL,
  received_date DATE,
  
  -- Pagamento
  payment_method receivable_payment_method DEFAULT 'pix',
  status receivable_status_extended DEFAULT 'pending',
  
  -- Rastreamento
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_receivable_installments_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_receivable_installments_receivable FOREIGN KEY (receivable_id) REFERENCES ar_invoices(id),
  CONSTRAINT valid_installment_number CHECK (installment_number > 0 AND installment_number <= total_installments)
);

CREATE INDEX idx_receivable_installments_clinic ON receivable_installments(clinic_id);
CREATE INDEX idx_receivable_installments_receivable ON receivable_installments(receivable_id);
CREATE INDEX idx_receivable_installments_status ON receivable_installments(status);
CREATE INDEX idx_receivable_installments_due_date ON receivable_installments(due_date);
CREATE INDEX idx_receivable_installments_clinic_status_date 
  ON receivable_installments(clinic_id, status, due_date);

-- ============================================================================
-- 3. TABELA: receivable_payments
-- Histórico de pagamentos recebidos
-- ============================================================================
CREATE TABLE IF NOT EXISTS receivable_payments (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  receivable_id BIGINT NOT NULL,
  installment_id BIGINT,
  
  -- Valores pagos
  amount_paid NUMERIC(12,2) NOT NULL,
  payment_method receivable_payment_method NOT NULL,
  
  -- Identificação do pagamento
  payment_reference TEXT, -- PIX, TED, Cheque number, etc
  transaction_id TEXT UNIQUE,
  gateway_response JSONB, -- Resposta do gateway de pagamento (se aplicável)
  
  -- Datas
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_date TIMESTAMP WITH TIME ZONE,
  
  -- Rastreamento
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, refunded
  created_by TEXT, -- Quem registrou o pagamento (user_id ou 'system')
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_receivable_payments_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_receivable_payments_receivable FOREIGN KEY (receivable_id) REFERENCES ar_invoices(id),
  CONSTRAINT fk_receivable_payments_installment FOREIGN KEY (installment_id) REFERENCES receivable_installments(id)
);

CREATE INDEX idx_receivable_payments_clinic ON receivable_payments(clinic_id);
CREATE INDEX idx_receivable_payments_receivable ON receivable_payments(receivable_id);
CREATE INDEX idx_receivable_payments_payment_date ON receivable_payments(payment_date DESC);
CREATE INDEX idx_receivable_payments_transaction ON receivable_payments(transaction_id);

-- ============================================================================
-- 4. TABELA: receivable_reconciliation
-- Rastreamento de reconciliação automática
-- ============================================================================
CREATE TABLE IF NOT EXISTS receivable_reconciliation (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  payment_id BIGINT NOT NULL,
  
  -- Reconciliação
  reconciled BOOLEAN DEFAULT false,
  reconciliation_date TIMESTAMP WITH TIME ZONE,
  auto_reconciled BOOLEAN DEFAULT false, -- Se foi reconciliada automaticamente
  
  -- Divergências
  has_divergence BOOLEAN DEFAULT false,
  divergence_type TEXT, -- amount_mismatch, date_mismatch, etc
  divergence_amount NUMERIC(12,2),
  divergence_notes TEXT,
  
  -- Rastreamento
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_receivable_reconciliation_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_receivable_reconciliation_payment FOREIGN KEY (payment_id) REFERENCES receivable_payments(id)
);

CREATE INDEX idx_receivable_reconciliation_clinic ON receivable_reconciliation(clinic_id);
CREATE INDEX idx_receivable_reconciliation_reconciled ON receivable_reconciliation(reconciled);

-- ============================================================================
-- 5. FUNÇÃO: split_receivable_into_installments()
-- Divide uma AR Invoice em parcelas
-- ============================================================================
CREATE OR REPLACE FUNCTION split_receivable_into_installments(
  p_receivable_id BIGINT,
  p_clinic_id UUID,
  p_num_installments INT DEFAULT 1,
  p_first_due_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_receivable RECORD;
  v_value_per_installment NUMERIC(12,2);
  v_due_date DATE;
  v_installment_ids BIGINT[] := ARRAY[]::BIGINT[];
  i INT;
  v_result JSONB;
BEGIN
  -- Buscar receivable
  SELECT * INTO v_receivable FROM ar_invoices 
  WHERE id = p_receivable_id AND clinic_id = p_clinic_id LIMIT 1;
  
  IF v_receivable IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receivable not found');
  END IF;
  
  -- Validar número de parcelas
  IF p_num_installments <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Number of installments must be positive');
  END IF;
  
  -- Calcular valor por parcela
  v_value_per_installment := v_receivable.valor_liquido / p_num_installments;
  v_due_date := COALESCE(p_first_due_date, v_receivable.data_vencimento);
  
  -- Criar parcelas
  FOR i IN 1..p_num_installments LOOP
    INSERT INTO receivable_installments (
      clinic_id,
      receivable_id,
      installment_number,
      total_installments,
      value_gross,
      discount_percent,
      discount_amount,
      tax_percent,
      tax_amount,
      value_net,
      due_date,
      payment_method,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_clinic_id,
      p_receivable_id,
      i,
      p_num_installments,
      v_receivable.valor_bruto / p_num_installments,
      CASE WHEN i = p_num_installments THEN (v_receivable.descontos / (v_receivable.valor_bruto / p_num_installments)) ELSE 0 END,
      CASE WHEN i = p_num_installments THEN v_receivable.descontos ELSE 0 END,
      CASE WHEN i = p_num_installments THEN (v_receivable.impostos / (v_receivable.valor_bruto / p_num_installments)) ELSE 0 END,
      CASE WHEN i = p_num_installments THEN v_receivable.impostos ELSE 0 END,
      v_value_per_installment,
      v_due_date + ((i - 1) * INTERVAL '30 days')::INTEGER,
      v_receivable.metodo_pagamento_default,
      'pending',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ) RETURNING id INTO v_installment_ids[i];
  END LOOP;
  
  -- Atualizar receivable com status de parcelamento
  UPDATE ar_invoices SET
    parcelado = true,
    parcela_atual = 1,
    total_parcelas = p_num_installments,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_receivable_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'receivable_id', p_receivable_id,
    'num_installments', p_num_installments,
    'installment_ids', v_installment_ids,
    'value_per_installment', v_value_per_installment,
    'message', format('Receivable split into %s installments', p_num_installments)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNÇÃO: register_receivable_payment()
-- Registra um pagamento recebido
-- ============================================================================
CREATE OR REPLACE FUNCTION register_receivable_payment(
  p_receivable_id BIGINT,
  p_clinic_id UUID,
  p_amount_paid NUMERIC(12,2),
  p_payment_method receivable_payment_method,
  p_payment_reference TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT 'system'
) RETURNS JSONB AS $$
DECLARE
  v_receivable RECORD;
  v_payment_id BIGINT;
  v_installment_id BIGINT;
  v_amount_remaining NUMERIC(12,2);
  v_installments RECORD;
  v_new_status receivable_status_extended;
  v_result JSONB;
BEGIN
  -- Buscar receivable
  SELECT * INTO v_receivable FROM ar_invoices 
  WHERE id = p_receivable_id AND clinic_id = p_clinic_id LIMIT 1;
  
  IF v_receivable IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Receivable not found');
  END IF;
  
  -- Validar valor
  IF p_amount_paid <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount paid must be positive');
  END IF;
  
  -- Criar registro de pagamento
  INSERT INTO receivable_payments (
    clinic_id,
    receivable_id,
    amount_paid,
    payment_method,
    payment_reference,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    p_receivable_id,
    p_amount_paid,
    p_payment_method,
    p_payment_reference,
    'completed',
    p_created_by,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_payment_id;
  
  -- Se tem parcelas, atribuir a uma parcela
  SELECT * INTO v_installments FROM receivable_installments
  WHERE receivable_id = p_receivable_id AND status = 'pending'
  ORDER BY installment_number ASC LIMIT 1;
  
  IF v_installments IS NOT NULL THEN
    v_installment_id := v_installments.id;
    
    -- Atualizar status da parcela
    IF p_amount_paid >= v_installments.value_net THEN
      UPDATE receivable_installments SET
        status = 'received',
        received_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = v_installment_id;
    ELSE
      UPDATE receivable_installments SET
        status = 'partial',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = v_installment_id;
    END IF;
    
    -- Atualizar payment com installment_id
    UPDATE receivable_payments SET
      installment_id = v_installment_id
    WHERE id = v_payment_id;
  END IF;
  
  -- Calcular novo status do receivable
  SELECT COUNT(*) INTO v_amount_remaining FROM receivable_installments
  WHERE receivable_id = p_receivable_id AND status IN ('pending', 'partial');
  
  IF v_amount_remaining = 0 THEN
    v_new_status := 'received'::receivable_status_extended;
  ELSIF v_amount_remaining < COALESCE(v_receivable.total_parcelas, 1) THEN
    v_new_status := 'partial'::receivable_status_extended;
  ELSE
    v_new_status := 'pending'::receivable_status_extended;
  END IF;
  
  -- Atualizar receivable
  UPDATE ar_invoices SET
    status = v_new_status::TEXT,
    data_recebimento = CASE WHEN v_new_status = 'received' THEN CURRENT_DATE ELSE data_recebimento END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_receivable_id;
  
  -- Criar entry em cash_flow (realizado, não projeção)
  INSERT INTO cash_flow_entries (
    clinic_id,
    type,
    amount,
    description,
    origin,
    reference_id,
    reference_type,
    is_projected,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'entrada',
    p_amount_paid,
    format('Recebimento: %s - %s', v_receivable.payer_name, p_payment_reference),
    'receivable_payment',
    v_payment_id::TEXT,
    'payment',
    false, -- realizado, não projeção
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'installment_id', v_installment_id,
    'new_status', v_new_status,
    'message', 'Payment registered successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNÇÃO: get_receivables_aging()
-- Retorna aging de receivables (dias em aberto)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_receivables_aging(
  p_clinic_id UUID
) RETURNS TABLE (
  aging_bucket TEXT,
  count_receivables BIGINT,
  total_amount NUMERIC,
  average_days_overdue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE
      WHEN (CURRENT_DATE - ri.due_date) < 0 THEN '0-30 dias'
      WHEN (CURRENT_DATE - ri.due_date) < 30 THEN '0-30 dias'
      WHEN (CURRENT_DATE - ri.due_date) < 60 THEN '31-60 dias'
      WHEN (CURRENT_DATE - ri.due_date) < 90 THEN '61-90 dias'
      ELSE '90+ dias'
    END as aging_bucket,
    COUNT(ri.id)::BIGINT as count_receivables,
    SUM(ri.value_net)::NUMERIC as total_amount,
    AVG(CURRENT_DATE - ri.due_date)::NUMERIC as average_days_overdue
  FROM receivable_installments ri
  WHERE ri.clinic_id = p_clinic_id AND ri.status = 'pending'
  GROUP BY aging_bucket
  ORDER BY aging_bucket DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. TRIGGER: Atualizar status de receivable quando última parcela é paga
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_update_receivable_status_on_installment_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_count INT;
  v_new_status TEXT;
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- Contar parcelas ainda pendentes
    SELECT COUNT(*) INTO v_pending_count FROM receivable_installments
    WHERE receivable_id = NEW.receivable_id AND status IN ('pending', 'partial');
    
    IF v_pending_count = 0 THEN
      -- Todas as parcelas foram pagas
      UPDATE ar_invoices SET
        status = 'received',
        data_recebimento = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.receivable_id;
    ELSIF v_pending_count < (SELECT total_installments FROM receivable_installments WHERE id = NEW.id LIMIT 1) THEN
      -- Parciais ainda abertas
      UPDATE ar_invoices SET
        status = 'partial',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.receivable_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_receivable_installment_paid ON receivable_installments;
CREATE TRIGGER trg_receivable_installment_paid
AFTER UPDATE ON receivable_installments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_receivable_status_on_installment_paid();

-- ============================================================================
-- 9. TRIGGER: Auto-detectar pagamentos vencidos
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_mark_overdue_receivables()
RETURNS VOID AS $$
BEGIN
  UPDATE receivable_installments SET
    status = 'overdue',
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
  
  -- Também atualizar o receivable se tem parcelas vencidas
  UPDATE ar_invoices SET
    status = 'overdue',
    updated_at = CURRENT_TIMESTAMP
  WHERE status = 'pending' 
    AND id IN (
      SELECT receivable_id FROM receivable_installments 
      WHERE status = 'overdue'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================
ALTER TABLE receivable_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY receivable_installments_select
  ON receivable_installments FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE POLICY receivable_installments_insert
  ON receivable_installments FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro', 'faturamento')));

CREATE POLICY receivable_payments_select
  ON receivable_payments FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE POLICY receivable_payments_insert
  ON receivable_payments FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro', 'faturamento')));

-- ============================================================================
-- COMMIT
-- ============================================================================
-- ✅ receivable_payment_method ENUM: 9 formas de pagamento
-- ✅ receivable_status_extended ENUM: 6 status
-- ✅ receivable_installments: Tabela de parcelas
-- ✅ receivable_payments: Histórico de pagamentos
-- ✅ receivable_reconciliation: Rastreamento de reconciliação
-- ✅ split_receivable_into_installments(): Parcelamento
-- ✅ register_receivable_payment(): Registro de pagamento
-- ✅ get_receivables_aging(): Análise de aging
-- ✅ Triggers para status automático
-- ✅ RLS Policies
