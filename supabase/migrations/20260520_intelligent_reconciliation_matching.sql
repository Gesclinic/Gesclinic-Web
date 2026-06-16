-- ============================================================================
-- MIGRATION: 20260520_intelligent_reconciliation_matching.sql
-- PURPOSE: ETAPA 6 - Conciliação automática com matching engine
-- STATUS: Ativa
-- DATE: 2026-05-20
-- ============================================================================

-- ============================================================================
-- 1. TABELA: bank_statement_imports
-- Importação de extratos bancários (OFX, CSV, XLSX)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  account_id UUID,
  
  -- Import details
  import_file_name TEXT,
  import_file_size INT,
  import_format TEXT, -- 'ofx', 'csv', 'xlsx'
  import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Estatísticas
  total_transactions INT DEFAULT 0,
  matched_count INT DEFAULT 0,
  unmatched_count INT DEFAULT 0,
  divergence_count INT DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_bank_import_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_bank_import_account FOREIGN KEY (account_id) REFERENCES financial_accounts(id)
);

CREATE INDEX idx_bank_imports_clinic ON bank_statement_imports(clinic_id);

-- ============================================================================
-- 2. TABELA: bank_transactions
-- Transações importadas do banco
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  import_id BIGINT NOT NULL,
  account_id UUID,
  
  -- Transaction details
  transaction_date DATE NOT NULL,
  transaction_amount NUMERIC(12,2) NOT NULL,
  transaction_type TEXT, -- 'debit', 'credit'
  transaction_description TEXT,
  transaction_reference TEXT, -- PIX, TED, Cheque, etc
  
  -- Matching
  is_matched BOOLEAN DEFAULT false,
  matched_to_payment_id BIGINT,
  matched_to_receivable_id BIGINT,
  match_score NUMERIC(3,2), -- 0.00 - 1.00 (confidence)
  
  -- Reconciliation
  is_reconciled BOOLEAN DEFAULT false,
  reconciliation_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_bank_tx_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_bank_tx_import FOREIGN KEY (import_id) REFERENCES bank_statement_imports(id),
  CONSTRAINT fk_bank_tx_account FOREIGN KEY (account_id) REFERENCES financial_accounts(id),
  CONSTRAINT fk_bank_tx_payment FOREIGN KEY (matched_to_payment_id) REFERENCES receivable_payments(id),
  CONSTRAINT fk_bank_tx_receivable FOREIGN KEY (matched_to_receivable_id) REFERENCES ar_invoices(id)
);

CREATE INDEX idx_bank_tx_import ON bank_transactions(import_id);
CREATE INDEX idx_bank_tx_matched ON bank_transactions(is_matched);
CREATE INDEX idx_bank_tx_reconciled ON bank_transactions(is_reconciled);
CREATE INDEX idx_bank_tx_date ON bank_transactions(transaction_date DESC);

-- ============================================================================
-- 3. FUNÇÃO: fuzzy_match_transactions()
-- Matching engine com fuzzy matching para transações
-- ============================================================================
CREATE OR REPLACE FUNCTION fuzzy_match_transactions(
  p_clinic_id UUID,
  p_import_id BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_bank_tx RECORD;
  v_payments RECORD;
  v_best_match RECORD;
  v_best_score NUMERIC(3,2) := 0;
  v_matched_count INT := 0;
  v_divergence_count INT := 0;
  v_result JSONB;
BEGIN
  -- Iterar sobre transações não casadas
  FOR v_bank_tx IN
    SELECT * FROM bank_transactions
    WHERE import_id = p_import_id AND is_matched = false
    ORDER BY transaction_amount DESC
  LOOP
    v_best_score := 0;
    v_best_match := NULL;
    
    -- Buscar possíveis matches em receivable_payments
    FOR v_payments IN
      SELECT 
        rp.id,
        rp.amount_paid,
        rp.payment_date,
        rp.payment_reference,
        ABS(rp.amount_paid - v_bank_tx.transaction_amount) as amount_diff,
        ABS(rp.payment_date::DATE - v_bank_tx.transaction_date) as days_diff
      FROM receivable_payments rp
      WHERE rp.clinic_id = p_clinic_id
        AND rp.status = 'completed'
        AND rp.payment_date::DATE BETWEEN (v_bank_tx.transaction_date - INTERVAL '5 days')::DATE AND (v_bank_tx.transaction_date + INTERVAL '5 days')::DATE
        AND ABS(rp.amount_paid - v_bank_tx.transaction_amount) < 0.01 -- Mesma quantia (tolerance 0.01)
    LOOP
      -- Calcular score
      -- Reduzir se houver diferença de data
      -- Reduzir se houver diferença de valor
      DECLARE
        v_score NUMERIC(3,2) := 1.0;
      BEGIN
        -- Penalidade por dias de diferença
        v_score := v_score - (v_payments.days_diff * 0.05); -- 5% por dia
        -- Penalidade por valor (if difference)
        IF v_payments.amount_diff > 0 THEN
          v_score := v_score - (v_payments.amount_diff / v_bank_tx.transaction_amount * 0.3);
        END IF;
        
        IF v_score > v_best_score THEN
          v_best_score := GREATEST(v_score, 0.5); -- Mínimo 0.5 para considerar match
          v_best_match := v_payments;
        END IF;
      END;
    END LOOP;
    
    -- Se houver melhor match acima do threshold, registrar
    IF v_best_score >= 0.7 THEN
      UPDATE bank_transactions SET
        is_matched = true,
        matched_to_payment_id = v_best_match.id,
        match_score = v_best_score,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = v_bank_tx.id;
      
      v_matched_count := v_matched_count + 1;
    ELSIF v_best_score >= 0.5 AND v_best_score < 0.7 THEN
      -- Registrar como divergência (possível match mas baixa confiança)
      v_divergence_count := v_divergence_count + 1;
    END IF;
  END LOOP;
  
  -- Atualizar statísticas de import
  UPDATE bank_statement_imports SET
    matched_count = matched_count + v_matched_count,
    unmatched_count = (SELECT COUNT(*) FROM bank_transactions WHERE import_id = p_import_id AND is_matched = false),
    divergence_count = v_divergence_count,
    status = 'completed'
  WHERE id = p_import_id;
  
  RETURN jsonb_build_object(
    'matched', v_matched_count,
    'divergences', v_divergence_count,
    'success', true
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNÇÃO: reconcile_bank_transaction()
-- Marca transação como reconciliada
-- ============================================================================
CREATE OR REPLACE FUNCTION reconcile_bank_transaction(
  p_transaction_id BIGINT,
  p_approved BOOLEAN
) RETURNS JSONB AS $$
BEGIN
  UPDATE bank_transactions SET
    is_reconciled = true,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_transaction_id;
  
  IF p_approved THEN
    -- Se aprovada, confirmar o match
    UPDATE receivable_payments SET
      status = 'completed'
    WHERE id = (SELECT matched_to_payment_id FROM bank_transactions WHERE id = p_transaction_id);
  ELSE
    -- Se rejeitada, desmarcar match
    UPDATE bank_transactions SET
      is_matched = false,
      matched_to_payment_id = NULL,
      match_score = 0
    WHERE id = p_transaction_id;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================
ALTER TABLE bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_imports_select
  ON bank_statement_imports FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE POLICY bank_tx_select
  ON bank_transactions FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

-- ============================================================================
-- COMMIT
-- ============================================================================
-- ✅ bank_statement_imports: Rastreamento de importações
-- ✅ bank_transactions: Transações importadas
-- ✅ fuzzy_match_transactions(): Matching engine
-- ✅ reconcile_bank_transaction(): Reconciliação manual
-- ✅ RLS Policies
