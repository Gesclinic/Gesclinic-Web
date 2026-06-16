-- ============================================================================
-- MIGRATION: ETAPA 3 - Automatic Payment Settlement & Reversal Motor
-- 
-- Adds:
-- 1. payment_settlements (registro de liquidações)
-- 2. payment_reversals (estornos de pagamento)
-- 3. Functions for automatic balance updates
-- 4. Triggers for consistency
-- 5. Concurrency control
-- ============================================================================

-- ============================================================================
-- 1. TABELA: payment_settlements
-- Propósito: Record each payment settlement (when money is actually received)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES ar_payments(id) ON DELETE SET NULL,
  
  amount DECIMAL(12, 2) NOT NULL,
  settlement_type VARCHAR(50) NOT NULL,      -- 'pix', 'ted', 'credit_card', 'debit_card', 'money', 'check'
  settlement_date DATE NOT NULL,
  
  bank_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
  transaction_reference VARCHAR(255),        -- PIX key, TED number, etc
  
  status VARCHAR(20) DEFAULT 'pending',      -- 'pending', 'confirmed', 'paid', 'failed', 'reversed'
  failure_reason TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  
  -- Concurrency control
  version INT DEFAULT 1
);

CREATE INDEX idx_payment_settlements_clinic_id 
  ON payment_settlements(clinic_id);

CREATE INDEX idx_payment_settlements_receivable_id 
  ON payment_settlements(receivable_id);

CREATE INDEX idx_payment_settlements_status 
  ON payment_settlements(status);

CREATE INDEX idx_payment_settlements_settlement_date 
  ON payment_settlements(settlement_date DESC);

CREATE INDEX idx_payment_settlements_bank_account_id 
  ON payment_settlements(bank_account_id);

ALTER TABLE payment_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_settlements_clinic_isolation" 
  ON payment_settlements 
  FOR ALL 
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. TABELA: payment_reversals
-- Propósito: Track payment reversals/refunds
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  settlement_id UUID NOT NULL REFERENCES payment_settlements(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
  
  reversal_amount DECIMAL(12, 2) NOT NULL,
  reversal_reason VARCHAR(255) NOT NULL,    -- 'customer_request', 'duplicate', 'error', 'dispute', etc
  reversal_date DATE NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending',      -- 'pending', 'processing', 'completed', 'failed'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX idx_payment_reversals_clinic_id 
  ON payment_reversals(clinic_id);

CREATE INDEX idx_payment_reversals_settlement_id 
  ON payment_reversals(settlement_id);

CREATE INDEX idx_payment_reversals_receivable_id 
  ON payment_reversals(receivable_id);

CREATE INDEX idx_payment_reversals_status 
  ON payment_reversals(status);

CREATE INDEX idx_payment_reversals_reversal_date 
  ON payment_reversals(reversal_date DESC);

ALTER TABLE payment_reversals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_reversals_clinic_isolation" 
  ON payment_reversals 
  FOR ALL 
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. FUNÇÃO: fn_validate_settlement_concurrency()
-- Propósito: Prevent race conditions on settlement
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_validate_settlement_concurrency(
  p_receivable_id UUID,
  p_amount DECIMAL,
  p_expected_version INT
)
RETURNS TABLE(valid BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_current_version INT;
  v_remaining_amount DECIMAL;
BEGIN
  -- Lock the receivable row
  SELECT paid_amount, total_amount - paid_amount, 1
  INTO v_current_version, v_remaining_amount, v_current_version
  FROM ar_receivables
  WHERE id = p_receivable_id
  FOR UPDATE NOWAIT;

  -- Check version
  IF v_current_version != p_expected_version THEN
    valid := FALSE;
    error_message := 'Version mismatch - another settlement in progress';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check amount
  IF p_amount > v_remaining_amount THEN
    valid := FALSE;
    error_message := format('Settlement amount (%.2f) exceeds remaining (%.2f)', p_amount, v_remaining_amount);
    RETURN NEXT;
    RETURN;
  END IF;

  valid := TRUE;
  error_message := NULL;
  RETURN NEXT;
EXCEPTION WHEN lock_not_available THEN
  valid := FALSE;
  error_message := 'Receivable locked by concurrent operation';
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. FUNÇÃO: fn_update_bank_account_balance()
-- Propósito: Atomic balance update
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_bank_account_balance(
  p_account_id UUID,
  p_clinic_id UUID,
  p_amount DECIMAL,
  p_operation VARCHAR
)
RETURNS TABLE(new_balance DECIMAL, success BOOLEAN) AS $$
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Lock account row
  SELECT current_balance INTO v_current_balance
  FROM financial_accounts
  WHERE id = p_account_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    success := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Calculate new balance
  v_new_balance := CASE
    WHEN p_operation = 'ADD' THEN v_current_balance + p_amount
    WHEN p_operation = 'SUBTRACT' THEN v_current_balance - p_amount
    ELSE v_current_balance
  END;

  -- Update balance
  UPDATE financial_accounts
  SET 
    current_balance = v_new_balance,
    last_movement_date = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_account_id;

  new_balance := v_new_balance;
  success := TRUE;
  RETURN NEXT;
EXCEPTION WHEN lock_not_available THEN
  success := FALSE;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FUNÇÃO: fn_process_settlement_atomically()
-- Propósito: Process settlement with all side effects in one transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_process_settlement_atomically(
  p_settlement_id UUID,
  p_clinic_id UUID,
  p_amount DECIMAL
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT,
  new_balance DECIMAL,
  transaction_id UUID
) AS $$
DECLARE
  v_settlement RECORD;
  v_result_valid BOOLEAN;
  v_result_error TEXT;
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Fetch settlement
  SELECT * INTO v_settlement
  FROM payment_settlements
  WHERE id = p_settlement_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF v_settlement IS NULL THEN
    success := FALSE;
    error_message := 'Settlement not found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Validate receivable concurrency
  SELECT valid, error_message
  INTO v_result_valid, v_result_error
  FROM fn_validate_settlement_concurrency(v_settlement.receivable_id, p_amount, 1);

  IF NOT v_result_valid THEN
    success := FALSE;
    error_message := v_result_error;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Update bank account balance
  SELECT new_balance, success
  INTO v_new_balance, v_result_valid
  FROM fn_update_bank_account_balance(v_settlement.bank_account_id, p_clinic_id, p_amount, 'ADD');

  IF NOT v_result_valid THEN
    success := FALSE;
    error_message := 'Failed to update bank account balance';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Create financial transaction
  INSERT INTO financial_transactions (
    clinic_id, type, status, category, amount, date,
    description, settlement_id, bank_account_id, created_at
  ) VALUES (
    p_clinic_id, 'INCOME', 'PAID', 'payment_settlement', p_amount,
    CURRENT_DATE, format('Payment settlement: %s', v_settlement.settlement_type),
    p_settlement_id, v_settlement.bank_account_id, CURRENT_TIMESTAMP
  )
  RETURNING id INTO v_transaction_id;

  -- Update settlement status
  UPDATE payment_settlements
  SET status = 'paid', processed_at = CURRENT_TIMESTAMP
  WHERE id = p_settlement_id;

  success := TRUE;
  error_message := NULL;
  new_balance := v_new_balance;
  transaction_id := v_transaction_id;
  RETURN NEXT;
EXCEPTION WHEN OTHERS THEN
  success := FALSE;
  error_message := SQLERRM;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. TRIGGER: fn_trg_handle_settlement_processed()
-- Propósito: Update receivable after settlement
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_handle_settlement_processed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Update receivable
    UPDATE ar_receivables
    SET 
      paid_amount = paid_amount + NEW.amount,
      remaining_amount = GREATEST(0, total_amount - (paid_amount + NEW.amount)),
      status = CASE
        WHEN (paid_amount + NEW.amount) >= total_amount THEN 'received'
        WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'
        ELSE 'pending'
      END,
      last_payment_date = NEW.settlement_date,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.receivable_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[fn_trg_handle_settlement_processed] Error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_settlement_processed ON payment_settlements;

CREATE TRIGGER trg_handle_settlement_processed
  AFTER UPDATE ON payment_settlements
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_handle_settlement_processed();

-- ============================================================================
-- 7. TRIGGER: fn_trg_handle_reversal_completed()
-- Propósito: Handle reversal completion
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_handle_reversal_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Reverse bank balance
    PERFORM fn_update_bank_account_balance(
      (SELECT bank_account_id FROM payment_settlements WHERE id = NEW.settlement_id),
      NEW.clinic_id,
      NEW.reversal_amount,
      'SUBTRACT'
    );

    -- Revert receivable to pending
    UPDATE ar_receivables
    SET 
      paid_amount = paid_amount - NEW.reversal_amount,
      remaining_amount = total_amount - (paid_amount - NEW.reversal_amount),
      status = 'pending',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.receivable_id;

    -- Mark settlement as reversed
    UPDATE payment_settlements
    SET status = 'reversed'
    WHERE id = NEW.settlement_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[fn_trg_handle_reversal_completed] Error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_reversal_completed ON payment_reversals;

CREATE TRIGGER trg_handle_reversal_completed
  AFTER UPDATE ON payment_reversals
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_handle_reversal_completed();

-- ============================================================================
-- 8. VIEW: vw_settlement_summary
-- Propósito: Settlement summary for dashboard
-- ============================================================================

CREATE OR REPLACE VIEW vw_settlement_summary AS
SELECT 
  ps.clinic_id,
  ps.settlement_type,
  ps.settlement_date,
  COUNT(*) as total_settlements,
  SUM(ps.amount) as total_amount,
  SUM(CASE WHEN ps.status = 'paid' THEN 1 ELSE 0 END) as paid_count,
  SUM(CASE WHEN ps.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN ps.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN ps.status = 'reversed' THEN 1 ELSE 0 END) as reversed_count
FROM payment_settlements ps
GROUP BY ps.clinic_id, ps.settlement_type, ps.settlement_date;

-- ============================================================================
-- 9. VIEW: vw_receivables_with_settlements
-- Propósito: Show receivables with settlement history
-- ============================================================================

CREATE OR REPLACE VIEW vw_receivables_with_settlements AS
SELECT 
  ar.id as receivable_id,
  ar.clinic_id,
  ar.patient_name,
  ar.total_amount,
  ar.paid_amount,
  ar.remaining_amount,
  ar.status,
  COUNT(ps.id) as settlement_count,
  SUM(CASE WHEN ps.status = 'paid' THEN ps.amount ELSE 0 END) as total_settled,
  MAX(ps.settlement_date) as last_settlement_date
FROM ar_receivables ar
LEFT JOIN payment_settlements ps ON ar.id = ps.receivable_id
GROUP BY ar.id, ar.clinic_id, ar.patient_name, ar.total_amount, 
         ar.paid_amount, ar.remaining_amount, ar.status;

-- ============================================================================
-- 10. STORED PROCEDURE: sp_process_pending_settlements()
-- Propósito: Process pending settlements (batch job)
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_process_pending_settlements(p_clinic_id UUID)
RETURNS TABLE(
  processed INT,
  failed INT,
  total_amount DECIMAL
) AS $$
DECLARE
  v_processed INT := 0;
  v_failed INT := 0;
  v_total_amount DECIMAL := 0;
  v_settlement RECORD;
  v_result_success BOOLEAN;
BEGIN
  -- Process each pending settlement
  FOR v_settlement IN
    SELECT id, amount FROM payment_settlements
    WHERE clinic_id = p_clinic_id AND status = 'pending'
    ORDER BY created_at ASC
  LOOP
    SELECT success FROM fn_process_settlement_atomically(
      v_settlement.id, p_clinic_id, v_settlement.amount
    ) INTO v_result_success;

    IF v_result_success THEN
      v_processed := v_processed + 1;
      v_total_amount := v_total_amount + v_settlement.amount;
    ELSE
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  processed := v_processed;
  failed := v_failed;
  total_amount := v_total_amount;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. INDEXES: Performance optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_settlements_clinic_status_date 
  ON payment_settlements(clinic_id, status, settlement_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_reversals_clinic_status_date 
  ON payment_reversals(clinic_id, status, reversal_date DESC);

-- ============================================================================
-- DONE: Migration for ETAPA 3 complete
-- ============================================================================

SELECT 
  'ETAPA 3: Payment Settlement Motor' as etapa,
  COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE 'payment_%'
GROUP BY etapa;
