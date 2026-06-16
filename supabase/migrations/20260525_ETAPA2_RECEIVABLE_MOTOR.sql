-- ============================================================================
-- MIGRATION: ETAPA 2 - Automatic Receivable Motor
-- 
-- Adds:
-- 1. ar_receivable_installments (parcelamento)
-- 2. ar_payments (payments with methods)
-- 3. ar_payment_splits (split payments)
-- 4. Functions for automatic installment management
-- 5. Triggers for status management
-- ============================================================================

-- ============================================================================
-- 1. TABELA: ar_receivable_installments
-- Propósito: Parcelas de contas a receber
-- ============================================================================

CREATE TABLE IF NOT EXISTS ar_receivable_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  installment_number INT NOT NULL,           -- 1, 2, 3, ...
  total_installments INT NOT NULL,           -- Total de parcelas
  
  amount DECIMAL(12, 2) NOT NULL,            -- Valor da parcela
  paid_amount DECIMAL(12, 2) DEFAULT 0,      -- Valor pago
  
  status VARCHAR(20) DEFAULT 'pending',      -- pending, partial, received, overdue, cancelled
  due_date DATE NOT NULL,
  
  interest_applied DECIMAL(12, 2) DEFAULT 0,
  fine_applied DECIMAL(12, 2) DEFAULT 0,
  discount_applied DECIMAL(12, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(receivable_id, installment_number)
);

CREATE INDEX idx_ar_receivable_installments_receivable_id 
  ON ar_receivable_installments(receivable_id);

CREATE INDEX idx_ar_receivable_installments_clinic_id 
  ON ar_receivable_installments(clinic_id);

CREATE INDEX idx_ar_receivable_installments_status_date 
  ON ar_receivable_installments(status, due_date);

CREATE INDEX idx_ar_receivable_installments_due_date 
  ON ar_receivable_installments(due_date DESC);

ALTER TABLE ar_receivable_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_receivable_installments_clinic_isolation" 
  ON ar_receivable_installments 
  FOR ALL 
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. TABELA: ar_payments
-- Propósito: Registro de pagamentos (com suporte a múltiplos métodos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES ar_receivable_installments(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  payment_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,      -- 'pix', 'credit_card', 'debit_card', 'money', 'check', 'transfer', 'other'
  payment_date DATE NOT NULL,
  
  -- Charges
  applied_interest DECIMAL(12, 2) DEFAULT 0,
  applied_fine DECIMAL(12, 2) DEFAULT 0,
  applied_discount DECIMAL(12, 2) DEFAULT 0,
  
  -- References
  transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ar_payments_receivable_id 
  ON ar_payments(receivable_id);

CREATE INDEX idx_ar_payments_clinic_id 
  ON ar_payments(clinic_id);

CREATE INDEX idx_ar_payments_payment_method 
  ON ar_payments(payment_method);

CREATE INDEX idx_ar_payments_payment_date 
  ON ar_payments(payment_date DESC);

CREATE INDEX idx_ar_payments_installment_id 
  ON ar_payments(installment_id);

ALTER TABLE ar_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_payments_clinic_isolation" 
  ON ar_payments 
  FOR ALL 
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. TABELA: ar_payment_splits
-- Propósito: Split de pagamento (ex: 60% PIX + 40% Cartão)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ar_payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES ar_payments(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  split_number INT NOT NULL,                 -- Ordem do split
  total_splits INT NOT NULL,                 -- Total de splits
  
  split_method VARCHAR(50) NOT NULL,        -- 'pix', 'credit_card', etc
  split_amount DECIMAL(12, 2) NOT NULL,
  split_percentage DECIMAL(5, 2) NOT NULL,  -- 60.00%, 40.00%, etc
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(payment_id, split_number)
);

CREATE INDEX idx_ar_payment_splits_payment_id 
  ON ar_payment_splits(payment_id);

CREATE INDEX idx_ar_payment_splits_clinic_id 
  ON ar_payment_splits(clinic_id);

ALTER TABLE ar_payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_payment_splits_clinic_isolation" 
  ON ar_payment_splits 
  FOR ALL 
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. FUNÇÃO: fn_create_installments()
-- Propósito: Create installment records for a receivable
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_create_installments(
  p_receivable_id UUID,
  p_clinic_id UUID,
  p_total_amount DECIMAL,
  p_installment_count INT,
  p_first_due_date DATE
)
RETURNS TABLE(installment_id UUID, installment_number INT, amount DECIMAL, due_date DATE) AS $$
DECLARE
  v_amount_per_installment DECIMAL;
  v_current_date DATE;
  v_i INT;
BEGIN
  v_amount_per_installment := p_total_amount / p_installment_count;
  v_current_date := p_first_due_date;
  
  FOR v_i IN 1..p_installment_count LOOP
    INSERT INTO ar_receivable_installments (
      receivable_id, clinic_id, installment_number, total_installments,
      amount, due_date, created_at
    ) VALUES (
      p_receivable_id, p_clinic_id, v_i, p_installment_count,
      ROUND(v_amount_per_installment::NUMERIC, 2),
      v_current_date, CURRENT_TIMESTAMP
    )
    RETURNING 
      ar_receivable_installments.id, 
      ar_receivable_installments.installment_number,
      ar_receivable_installments.amount,
      ar_receivable_installments.due_date
    INTO installment_id, installment_number, amount, due_date;
    
    RETURN NEXT;
    
    -- Add one month for next installment
    v_current_date := v_current_date + INTERVAL '1 month';
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FUNÇÃO: fn_calculate_receivable_charges()
-- Propósito: Calculate interest, fine, discount automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_calculate_receivable_charges(
  p_installment_id UUID,
  p_principal DECIMAL,
  p_interest_rate_per_day DECIMAL DEFAULT 0.001,
  p_fine_percentage DECIMAL DEFAULT 0.02,
  p_discount_percentage DECIMAL DEFAULT 0
)
RETURNS TABLE(
  principal DECIMAL,
  interest DECIMAL,
  fine DECIMAL,
  discount DECIMAL,
  total DECIMAL,
  days_overdue INT
) AS $$
DECLARE
  v_due_date DATE;
  v_days_overdue INT;
  v_interest DECIMAL;
  v_fine DECIMAL;
  v_discount DECIMAL;
BEGIN
  -- Get due date from installment
  SELECT due_date INTO v_due_date
  FROM ar_receivable_installments
  WHERE id = p_installment_id;
  
  -- Calculate days overdue
  v_days_overdue := GREATEST(0, CURRENT_DATE - v_due_date);
  
  -- Calculate charges
  v_interest := CASE 
    WHEN v_days_overdue > 0 THEN p_principal * p_interest_rate_per_day * v_days_overdue
    ELSE 0
  END;
  
  v_fine := CASE
    WHEN v_days_overdue > 0 THEN p_principal * p_fine_percentage
    ELSE 0
  END;
  
  v_discount := p_principal * p_discount_percentage;
  
  principal := p_principal;
  interest := ROUND(v_interest::NUMERIC, 2);
  fine := ROUND(v_fine::NUMERIC, 2);
  discount := ROUND(v_discount::NUMERIC, 2);
  total := ROUND((p_principal + v_interest + v_fine - v_discount)::NUMERIC, 2);
  days_overdue := v_days_overdue;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. FUNÇÃO: fn_mark_overdue_installments()
-- Propósito: Auto-mark overdue installments (should be called daily)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_mark_overdue_installments(p_clinic_id UUID)
RETURNS TABLE(updated INT) AS $$
DECLARE
  v_updated INT;
BEGIN
  -- Update installments past due date
  UPDATE ar_receivable_installments
  SET status = 'overdue'
  WHERE clinic_id = p_clinic_id
    AND due_date < CURRENT_DATE
    AND status IN ('pending', 'partial')
    AND paid_amount < amount;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  updated := v_updated;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. FUNÇÃO: fn_update_receivable_status()
-- Propósito: Update parent receivable status based on installments
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_receivable_status(p_receivable_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_amount DECIMAL;
  v_total_paid DECIMAL;
  v_is_overdue BOOLEAN;
  v_new_status VARCHAR(20);
BEGIN
  -- Get totals
  SELECT 
    SUM(amount),
    SUM(paid_amount),
    BOOL_OR(status = 'overdue')
  INTO v_total_amount, v_total_paid, v_is_overdue
  FROM ar_receivable_installments
  WHERE receivable_id = p_receivable_id;
  
  -- Determine status
  v_new_status := CASE
    WHEN v_total_paid >= v_total_amount THEN 'received'
    WHEN v_total_paid > 0 AND v_total_paid < v_total_amount THEN 
      CASE WHEN v_is_overdue THEN 'overdue' ELSE 'partial' END
    WHEN v_is_overdue THEN 'overdue'
    ELSE 'pending'
  END;
  
  -- Update parent receivable
  UPDATE ar_receivables
  SET 
    status = v_new_status,
    paid_amount = COALESCE(v_total_paid, 0),
    remaining_amount = COALESCE(v_total_amount - v_total_paid, 0),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_receivable_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGER: fn_trg_update_receivable_after_payment()
-- Propósito: Update receivable status after payment is recorded
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_update_receivable_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update parent receivable status
  PERFORM fn_update_receivable_status(NEW.receivable_id);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error updating receivable status: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_receivable_after_payment ON ar_payments;

CREATE TRIGGER trg_update_receivable_after_payment
  AFTER INSERT ON ar_payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_update_receivable_after_payment();

-- ============================================================================
-- 9. TRIGGER: fn_trg_update_installment_status()
-- Propósito: Update installment status after payment
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If installment_id provided, update its status
  IF NEW.installment_id IS NOT NULL THEN
    UPDATE ar_receivable_installments
    SET status = CASE
      WHEN (paid_amount + NEW.payment_amount) >= amount THEN 'received'
      WHEN (paid_amount + NEW.payment_amount) > 0 THEN 'partial'
      ELSE 'pending'
    END,
    paid_amount = paid_amount + NEW.payment_amount,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.installment_id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error updating installment status: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_installment_status ON ar_payments;

CREATE TRIGGER trg_update_installment_status
  BEFORE INSERT ON ar_payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_update_installment_status();

-- ============================================================================
-- 10. VIEW: vw_receivables_with_installments
-- Propósito: Simplified view of receivables + installments
-- ============================================================================

CREATE OR REPLACE VIEW vw_receivables_with_installments AS
SELECT 
  ar.id as receivable_id,
  ar.clinic_id,
  ar.patient_name,
  ar.payer_type,
  ar.total_amount,
  ar.paid_amount,
  ar.remaining_amount,
  ar.status,
  ar.due_date,
  COUNT(ari.id) as installment_count,
  SUM(CASE WHEN ari.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN ari.status = 'partial' THEN 1 ELSE 0 END) as partial_count,
  SUM(CASE WHEN ari.status = 'received' THEN 1 ELSE 0 END) as received_count,
  SUM(CASE WHEN ari.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
FROM ar_receivables ar
LEFT JOIN ar_receivable_installments ari ON ar.id = ari.receivable_id
GROUP BY ar.id, ar.clinic_id, ar.patient_name, ar.payer_type, 
         ar.total_amount, ar.paid_amount, ar.remaining_amount, 
         ar.status, ar.due_date;

-- ============================================================================
-- 11. STORED PROCEDURE: sp_mark_all_overdue_for_clinic()
-- Propósito: Scheduled job to mark overdue (run daily)
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_mark_all_overdue_for_clinic(p_clinic_id UUID)
RETURNS TABLE(
  installments_updated INT,
  receivables_updated INT
) AS $$
DECLARE
  v_inst_updated INT := 0;
  v_recv_updated INT := 0;
BEGIN
  -- Mark overdue installments
  UPDATE ar_receivable_installments
  SET status = 'overdue'
  WHERE clinic_id = p_clinic_id
    AND due_date < CURRENT_DATE
    AND status IN ('pending', 'partial')
    AND paid_amount < amount;
  
  GET DIAGNOSTICS v_inst_updated = ROW_COUNT;
  
  -- Update parent receivables
  UPDATE ar_receivables
  SET status = 'overdue'
  WHERE clinic_id = p_clinic_id
    AND due_date < CURRENT_DATE
    AND status IN ('pending', 'partial')
    AND paid_amount < total_amount;
  
  GET DIAGNOSTICS v_recv_updated = ROW_COUNT;
  
  installments_updated := v_inst_updated;
  receivables_updated := v_recv_updated;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. INDEXES: Performance optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ar_receivables_clinic_status_date 
  ON ar_receivables(clinic_id, status, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_ar_receivables_overdue 
  ON ar_receivables(clinic_id, due_date, paid_amount)
  WHERE status IN ('pending', 'partial');

-- ============================================================================
-- DONE: Migration for ETAPA 2 complete
-- ============================================================================

SELECT 
  'ETAPA 2: Receivable Motor' as etapa,
  COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name LIKE 'ar_%'
GROUP BY etapa;
