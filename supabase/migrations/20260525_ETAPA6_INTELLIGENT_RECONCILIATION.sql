-- =============================================================================
-- ETAPA 6: INTELLIGENT BANK RECONCILIATION ENGINE - SQL MIGRATION
-- =============================================================================
-- Auto-concilia transações PIX, TED, Cartão
-- Suporta fuzzy matching + exact matching
-- Score de confiança (0.0-1.0)
-- Importa OFX, CSV, XLSX
-- =============================================================================

-- =========================================
-- TABLE 1: Bank Import Transactions
-- =========================================

CREATE TABLE IF NOT EXISTS bank_import_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  bank_account_id UUID NOT NULL,
  external_id VARCHAR(255) NOT NULL, -- ID externo da transação (para evitar duplicatas)
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(14, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'credit', 'debit'
  balance_after DECIMAL(14, 2),
  payment_method VARCHAR(50), -- 'pix', 'ted', 'credit_card', 'debit_card', 'boleto', 'check', 'other'
  raw_data JSONB, -- Dados brutos do arquivo
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reconciled', 'partial_match', 'no_match', 'manual_review'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_account FOREIGN KEY (bank_account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE,
  CONSTRAINT unique_external_id UNIQUE(bank_account_id, external_id)
);

-- Índices
CREATE INDEX idx_bank_import_clinic ON bank_import_transactions(clinic_id);
CREATE INDEX idx_bank_import_account ON bank_import_transactions(bank_account_id);
CREATE INDEX idx_bank_import_date ON bank_import_transactions(transaction_date);
CREATE INDEX idx_bank_import_status ON bank_import_transactions(clinic_id, status);
CREATE INDEX idx_bank_import_amount ON bank_import_transactions(amount);

-- RLS
ALTER TABLE bank_import_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_bank_imports"
  ON bank_import_transactions FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "clinic_admin_can_manage_bank_imports"
  ON bank_import_transactions FOR INSERT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'director', 'accountant')
    )
  );

-- =========================================
-- TABLE 2: Bank Reconciliations
-- =========================================

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  bank_import_id UUID NOT NULL,
  payment_id UUID,
  receivable_id UUID,
  confidence_score DECIMAL(3, 2) DEFAULT 0.0, -- 0.0 a 1.0
  match_type VARCHAR(50), -- 'exact', 'amount_and_date_or_method', 'amount_and_date', 'amount_only', 'fuzzy'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'matched', 'partial_match', 'manual_review', 'reconciled', 'rejected'
  reconciliation_notes TEXT,
  reject_reason TEXT,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_import FOREIGN KEY (bank_import_id) REFERENCES bank_import_transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES ar_payments(id) ON DELETE SET NULL,
  CONSTRAINT fk_receivable FOREIGN KEY (receivable_id) REFERENCES ar_receivables(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_bank_reconciliation_clinic ON bank_reconciliations(clinic_id);
CREATE INDEX idx_bank_reconciliation_status ON bank_reconciliations(clinic_id, status);
CREATE INDEX idx_bank_reconciliation_score ON bank_reconciliations(confidence_score DESC);
CREATE INDEX idx_bank_reconciliation_import ON bank_reconciliations(bank_import_id);
CREATE INDEX idx_bank_reconciliation_payment ON bank_reconciliations(payment_id);
CREATE INDEX idx_bank_reconciliation_receivable ON bank_reconciliations(receivable_id);

-- RLS
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_reconciliations"
  ON bank_reconciliations FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "clinic_admin_can_manage_reconciliations"
  ON bank_reconciliations FOR INSERT, UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'director', 'accountant')
    )
  );

-- =========================================
-- TABLE 3: Reconciliation Audit Log
-- =========================================

CREATE TABLE IF NOT EXISTS reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  reconciliation_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'confirmed', 'rejected', 'manual_review'
  user_id UUID,
  notes TEXT,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_reconciliation FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id) ON DELETE CASCADE
);

CREATE INDEX idx_reconciliation_audit_clinic ON reconciliation_audit_log(clinic_id);
CREATE INDEX idx_reconciliation_audit_recon ON reconciliation_audit_log(reconciliation_id);

-- =========================================
-- FUNCTION 1: Calculate Match Score
-- =========================================

CREATE OR REPLACE FUNCTION fn_calculate_match_score(
  p_import_amount DECIMAL,
  p_payment_amount DECIMAL,
  p_import_date DATE,
  p_payment_date DATE,
  p_import_method VARCHAR,
  p_payment_method VARCHAR,
  p_import_desc TEXT,
  p_payer_name TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL := 0;
  v_amount_diff DECIMAL;
  v_day_diff INT;
BEGIN
  -- 1. Amount match (40 points)
  v_amount_diff := ABS(p_import_amount - p_payment_amount);
  IF v_amount_diff < 0.01 THEN
    v_score := v_score + 40; -- Exact
  ELSIF (v_amount_diff / p_payment_amount) < 0.05 THEN
    v_score := v_score + 20; -- Within 5%
  END IF;

  -- 2. Date match (30 points)
  v_day_diff := ABS(EXTRACT(DAY FROM (p_import_date - p_payment_date)));
  IF v_day_diff = 0 THEN
    v_score := v_score + 30; -- Same day
  ELSIF v_day_diff <= 1 THEN
    v_score := v_score + 25; -- Next day
  ELSIF v_day_diff <= 3 THEN
    v_score := v_score + 15; -- Within 3 days
  END IF;

  -- 3. Payment method match (20 points)
  IF p_import_method = p_payment_method THEN
    v_score := v_score + 20;
  END IF;

  -- 4. Description match (10 points)
  IF LOWER(p_import_desc) LIKE CONCAT('%', LOWER(LEFT(p_payer_name, 5)), '%') THEN
    v_score := v_score + 10;
  END IF;

  -- Normalize to 0-1
  RETURN v_score::DECIMAL / 100;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- FUNCTION 2: Auto-match Transactions
-- =========================================

CREATE OR REPLACE FUNCTION fn_auto_match_transactions(
  p_clinic_id UUID,
  p_bank_account_id UUID,
  p_min_confidence DECIMAL DEFAULT 0.70
)
RETURNS TABLE(
  matched_count INT,
  partial_match_count INT,
  unmatched_count INT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_matched_count INT := 0;
  v_partial_count INT := 0;
  v_unmatched_count INT := 0;
  v_import_tx RECORD;
  v_best_payment RECORD;
  v_best_score DECIMAL;
  v_current_score DECIMAL;
  v_error_msg TEXT := NULL;
BEGIN
  BEGIN
    -- Process all pending import transactions
    FOR v_import_tx IN
      SELECT * FROM bank_import_transactions
      WHERE clinic_id = p_clinic_id
        AND bank_account_id = p_bank_account_id
        AND status = 'pending'
      ORDER BY transaction_date DESC
    LOOP
      v_best_score := 0;
      v_best_payment := NULL;

      -- Find best matching payment
      FOR v_best_payment IN
        SELECT ap.*, ar.payer_name
        FROM ar_payments ap
        JOIN ar_receivables ar ON ap.receivable_id = ar.id
        WHERE ap.clinic_id = p_clinic_id
          AND ap.payment_date >= v_import_tx.transaction_date - INTERVAL '5 days'
          AND ap.payment_date <= v_import_tx.transaction_date + INTERVAL '5 days'
      LOOP
        v_current_score := fn_calculate_match_score(
          v_import_tx.amount,
          v_best_payment.payment_amount,
          v_import_tx.transaction_date,
          v_best_payment.payment_date,
          v_import_tx.payment_method,
          v_best_payment.payment_method,
          v_import_tx.description,
          v_best_payment.payer_name
        );

        IF v_current_score > v_best_score THEN
          v_best_score := v_current_score;
        END IF;
      END LOOP;

      -- Create reconciliation if score is high enough
      IF v_best_score >= p_min_confidence THEN
        INSERT INTO bank_reconciliations (
          clinic_id,
          bank_import_id,
          payment_id,
          receivable_id,
          confidence_score,
          match_type,
          status
        ) VALUES (
          p_clinic_id,
          v_import_tx.id,
          v_best_payment.id,
          v_best_payment.receivable_id,
          v_best_score,
          CASE 
            WHEN v_best_score >= 0.95 THEN 'exact'
            WHEN v_best_score >= 0.85 THEN 'amount_and_date_or_method'
            WHEN v_best_score >= 0.70 THEN 'amount_and_date'
            ELSE 'amount_only'
          END,
          CASE WHEN v_best_score >= 0.95 THEN 'matched' ELSE 'partial_match' END
        );

        IF v_best_score >= 0.95 THEN
          v_matched_count := v_matched_count + 1;
          UPDATE bank_import_transactions SET status = 'reconciled' WHERE id = v_import_tx.id;
        ELSE
          v_partial_count := v_partial_count + 1;
          UPDATE bank_import_transactions SET status = 'partial_match' WHERE id = v_import_tx.id;
        END IF;
      ELSE
        v_unmatched_count := v_unmatched_count + 1;
        UPDATE bank_import_transactions SET status = 'no_match' WHERE id = v_import_tx.id;
      END IF;
    END LOOP;

    RETURN QUERY SELECT
      v_matched_count,
      v_partial_count,
      v_unmatched_count,
      true,
      NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT
      0,
      0,
      0,
      false,
      v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- TRIGGER: Auto-log Reconciliation Changes
-- =========================================

CREATE OR REPLACE FUNCTION fn_log_reconciliation_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO reconciliation_audit_log (
    clinic_id,
    reconciliation_id,
    action,
    old_status,
    new_status
  ) VALUES (
    NEW.clinic_id,
    NEW.id,
    CASE
      WHEN OLD IS NULL THEN 'created'
      WHEN NEW.status = 'reconciled' THEN 'confirmed'
      WHEN NEW.status = 'rejected' THEN 'rejected'
      WHEN NEW.status = 'manual_review' THEN 'manual_review'
      ELSE 'updated'
    END,
    COALESCE(OLD.status, NULL),
    NEW.status
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_reconciliation_change ON bank_reconciliations;

CREATE TRIGGER trg_log_reconciliation_change
AFTER INSERT OR UPDATE ON bank_reconciliations
FOR EACH ROW
EXECUTE FUNCTION fn_log_reconciliation_change();

-- =========================================
-- TRIGGER: Auto-create Settlement on Reconciliation
-- =========================================

CREATE OR REPLACE FUNCTION fn_auto_create_settlement_on_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- When reconciliation is confirmed, auto-create settlement
  IF NEW.status = 'reconciled' AND (OLD.status IS NULL OR OLD.status != 'reconciled') THEN
    IF NEW.payment_id IS NOT NULL AND NEW.receivable_id IS NOT NULL THEN
      -- Call settlement motor
      SELECT INTO v_result *
      FROM fn_process_settlement_atomically(
        NEW.clinic_id,
        NEW.receivable_id,
        NEW.payment_id,
        (SELECT payment_amount FROM ar_payments WHERE id = NEW.payment_id)
      );

      IF NOT v_result.success THEN
        RAISE WARNING 'Failed to create settlement: %', v_result.error_message;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_settlement_on_reconciliation ON bank_reconciliations;

CREATE TRIGGER trg_auto_create_settlement_on_reconciliation
AFTER UPDATE ON bank_reconciliations
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_settlement_on_reconciliation();

-- =========================================
-- VIEW: Reconciliation Dashboard
-- =========================================

CREATE OR REPLACE VIEW vw_reconciliation_dashboard AS
SELECT
  bit.clinic_id,
  COUNT(DISTINCT bit.id) as total_imports,
  COUNT(CASE WHEN bit.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN bit.status = 'reconciled' THEN 1 END) as reconciled_count,
  COUNT(CASE WHEN bit.status = 'partial_match' THEN 1 END) as partial_match_count,
  COUNT(CASE WHEN bit.status = 'no_match' THEN 1 END) as no_match_count,
  SUM(CASE WHEN bit.transaction_type = 'credit' THEN bit.amount ELSE 0 END) as total_credits,
  SUM(CASE WHEN bit.transaction_type = 'debit' THEN bit.amount ELSE 0 END) as total_debits,
  MIN(bit.transaction_date) as earliest_date,
  MAX(bit.transaction_date) as latest_date
FROM bank_import_transactions bit
GROUP BY bit.clinic_id;

-- =========================================
-- VIEW: Unmatched Transactions
-- =========================================

CREATE OR REPLACE VIEW vw_unmatched_transactions AS
SELECT
  bit.clinic_id,
  bit.id as import_id,
  bit.transaction_date,
  bit.description,
  bit.amount,
  bit.payment_method,
  COUNT(DISTINCT ap.id) as potential_matches
FROM bank_import_transactions bit
LEFT JOIN ar_payments ap ON (
  bit.clinic_id = ap.clinic_id
  AND ABS(bit.amount - ap.payment_amount) < 0.01
  AND bit.transaction_date = ap.payment_date
)
WHERE bit.status = 'no_match'
GROUP BY bit.clinic_id, bit.id, bit.transaction_date, bit.description, 
         bit.amount, bit.payment_method;

-- =========================================
-- STORED PROCEDURE: Batch Reconcile Matched
-- =========================================

CREATE OR REPLACE FUNCTION sp_batch_reconcile_matched(
  p_clinic_id UUID,
  p_bank_account_id UUID DEFAULT NULL
)
RETURNS TABLE(
  processed_count INT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_processed_count INT := 0;
  v_error_msg TEXT := NULL;
  v_recon RECORD;
BEGIN
  BEGIN
    -- Get all matched reconciliations
    FOR v_recon IN
      SELECT id FROM bank_reconciliations
      WHERE clinic_id = p_clinic_id
        AND status = 'matched'
        AND (p_bank_account_id IS NULL OR bank_account_id = p_bank_account_id)
    LOOP
      UPDATE bank_reconciliations
      SET status = 'reconciled', reconciled_at = CURRENT_TIMESTAMP
      WHERE id = v_recon.id;

      v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN QUERY SELECT
      v_processed_count,
      true,
      NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT
      0,
      false,
      v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

CREATE INDEX idx_bank_import_date_amount 
  ON bank_import_transactions(transaction_date, amount);

CREATE INDEX idx_bank_reconciliation_status_score 
  ON bank_reconciliations(clinic_id, status, confidence_score DESC);

CREATE INDEX idx_reconciliation_audit_date 
  ON reconciliation_audit_log(created_at DESC);

-- =========================================
-- FINAL VALIDATIONS
-- =========================================

-- Verify tables created
SELECT COUNT(*) as tables_created FROM (
  SELECT 'bank_import_transactions' UNION ALL
  SELECT 'bank_reconciliations' UNION ALL
  SELECT 'reconciliation_audit_log'
) AS t;

-- Verify functions created
SELECT COUNT(*) as functions_created FROM pg_proc
WHERE proname IN (
  'fn_calculate_match_score',
  'fn_auto_match_transactions',
  'fn_log_reconciliation_change',
  'fn_auto_create_settlement_on_reconciliation',
  'sp_batch_reconcile_matched'
);

-- Verify views created
SELECT COUNT(*) as views_created FROM pg_views
WHERE viewname IN (
  'vw_reconciliation_dashboard',
  'vw_unmatched_transactions'
);

COMMIT;
