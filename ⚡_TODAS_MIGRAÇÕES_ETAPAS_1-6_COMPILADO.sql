-- ============================================================================
-- 🔥 COMPILADO: ETAPAS 1-6 - TODAS AS MIGRAÇÕES
-- 
-- Copie TODO o conteúdo deste arquivo
-- Cole no Supabase → SQL Editor → New Query
-- Clique RUN
-- ============================================================================

-- ============================================================================
-- ETAPA 1: ENHANCED APPOINTMENT FINANCIAL AUTOMATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_automation_queue (
  id BIGSERIAL PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_automation_queue_clinic_id ON financial_automation_queue(clinic_id);
CREATE INDEX idx_financial_automation_queue_status ON financial_automation_queue(status);
CREATE INDEX idx_financial_automation_queue_appointment_id ON financial_automation_queue(appointment_id);
CREATE INDEX idx_financial_automation_queue_created_at ON financial_automation_queue(created_at DESC);

ALTER TABLE financial_automation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_automation_queue_clinic_isolation" 
  ON financial_automation_queue 
  FOR ALL 
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- TABLE: dre_metrics
CREATE TABLE IF NOT EXISTS dre_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  
  gross_revenue DECIMAL(12, 2) DEFAULT 0,
  appointment_revenue DECIMAL(12, 2) DEFAULT 0,
  procedure_revenue DECIMAL(12, 2) DEFAULT 0,
  exam_revenue DECIMAL(12, 2) DEFAULT 0,
  other_revenue DECIMAL(12, 2) DEFAULT 0,
  
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  returned_amount DECIMAL(12, 2) DEFAULT 0,
  net_revenue DECIMAL(12, 2) DEFAULT 0,
  
  medical_repasse DECIMAL(12, 2) DEFAULT 0,
  variable_costs DECIMAL(12, 2) DEFAULT 0,
  fixed_costs DECIMAL(12, 2) DEFAULT 0,
  operational_expenses DECIMAL(12, 2) DEFAULT 0,
  
  ebitda DECIMAL(12, 2) DEFAULT 0,
  operating_result DECIMAL(12, 2) DEFAULT 0,
  financial_result DECIMAL(12, 2) DEFAULT 0,
  net_result DECIMAL(12, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id, month)
);

CREATE INDEX idx_dre_metrics_clinic_month ON dre_metrics(clinic_id, month);
CREATE INDEX idx_dre_metrics_clinic_id ON dre_metrics(clinic_id);

ALTER TABLE dre_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dre_metrics_clinic_isolation" 
  ON dre_metrics 
  FOR ALL 
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- TABLE: financial_indicators
CREATE TABLE IF NOT EXISTS financial_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  pending_revenue DECIMAL(12, 2) DEFAULT 0,
  today_revenue DECIMAL(12, 2) DEFAULT 0,
  month_to_date_revenue DECIMAL(12, 2) DEFAULT 0,
  
  total_receivables DECIMAL(12, 2) DEFAULT 0,
  overdue_receivables DECIMAL(12, 2) DEFAULT 0,
  upcoming_receivables DECIMAL(12, 2) DEFAULT 0,
  
  total_payables DECIMAL(12, 2) DEFAULT 0,
  overdue_payables DECIMAL(12, 2) DEFAULT 0,
  upcoming_payables DECIMAL(12, 2) DEFAULT 0,
  
  current_balance DECIMAL(12, 2) DEFAULT 0,
  average_daily_balance DECIMAL(12, 2) DEFAULT 0,
  
  liquidity_ratio DECIMAL(5, 2) DEFAULT 1.0,
  financial_health VARCHAR(20) DEFAULT 'healthy',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_indicators_clinic_id ON financial_indicators(clinic_id);

ALTER TABLE financial_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_indicators_clinic_isolation" 
  ON financial_indicators 
  FOR ALL 
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- FUNÇÕES ETAPA 1

CREATE OR REPLACE FUNCTION fn_update_cashflow_predicted(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_predicted_date DATE;
  v_transaction_id UUID;
BEGIN
  v_predicted_date := CURRENT_DATE + INTERVAL '3 days';

  SELECT id INTO v_transaction_id
  FROM financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'INCOME'
    AND status = 'PREDICTED'
    AND category = 'appointment'
    AND date = v_predicted_date
  LIMIT 1;

  IF v_transaction_id IS NOT NULL THEN
    UPDATE financial_transactions
    SET amount = amount + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_transaction_id;
  ELSE
    INSERT INTO financial_transactions (
      clinic_id, type, status, category, amount, date, 
      description, created_at
    ) VALUES (
      p_clinic_id, 'INCOME', 'PREDICTED', 'appointment', p_amount,
      v_predicted_date, 'Receita prevista de atendimento', CURRENT_TIMESTAMP
    );
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'predicted_date', v_predicted_date,
    'amount', p_amount
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_update_dre_metrics(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_month VARCHAR(7);
  v_metric_id UUID;
BEGIN
  v_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  SELECT id INTO v_metric_id
  FROM dre_metrics
  WHERE clinic_id = p_clinic_id AND month = v_month;

  IF v_metric_id IS NOT NULL THEN
    UPDATE dre_metrics
    SET gross_revenue = gross_revenue + p_amount,
        appointment_revenue = appointment_revenue + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_metric_id;
  ELSE
    INSERT INTO dre_metrics (
      clinic_id, month, gross_revenue, appointment_revenue, created_at
    ) VALUES (
      p_clinic_id, v_month, p_amount, p_amount, CURRENT_TIMESTAMP
    );
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'month', v_month,
    'amount', p_amount
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_update_financial_indicators(
  p_clinic_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_indicator_id UUID;
BEGIN
  SELECT id INTO v_indicator_id
  FROM financial_indicators
  WHERE clinic_id = p_clinic_id;

  IF v_indicator_id IS NOT NULL THEN
    UPDATE financial_indicators
    SET total_revenue = total_revenue + p_amount,
        pending_revenue = pending_revenue + p_amount,
        today_revenue = today_revenue + p_amount,
        month_to_date_revenue = month_to_date_revenue + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_indicator_id;
  ELSE
    INSERT INTO financial_indicators (
      clinic_id, total_revenue, pending_revenue, 
      today_revenue, month_to_date_revenue, created_at
    ) VALUES (
      p_clinic_id, p_amount, p_amount, p_amount, p_amount, CURRENT_TIMESTAMP
    );
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'indicator_updated', true
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_orchestrate_appointment_automations(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_cashflow_result JSONB;
  v_dre_result JSONB;
  v_indicators_result JSONB;
BEGIN
  v_cashflow_result := fn_update_cashflow_predicted(p_appointment_id, p_clinic_id, p_amount);
  v_dre_result := fn_update_dre_metrics(p_appointment_id, p_clinic_id, p_amount);
  v_indicators_result := fn_update_financial_indicators(p_clinic_id, p_amount);

  v_result := jsonb_build_object(
    'success', true,
    'appointment_id', p_appointment_id,
    'cashflow', v_cashflow_result,
    'dre', v_dre_result,
    'indicators', v_indicators_result,
    'orchestrated_at', CURRENT_TIMESTAMP
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'appointment_id', p_appointment_id
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_orchestrate_appointment_automations_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := fn_orchestrate_appointment_automations(
    NEW.id,
    NEW.clinic_id,
    COALESCE(NEW.estimated_value, 0)
  );

  RAISE NOTICE '[ETAPA1] Automation orchestrated: %', v_result;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[ETAPA1] Automation failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_ar_with_automations ON appointments;

CREATE TRIGGER trg_create_ar_with_automations
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (
    NEW.status = 'attended' 
    AND (OLD.status IS DISTINCT FROM 'attended')
    AND NEW.estimated_value > 0
  )
  EXECUTE FUNCTION fn_orchestrate_appointment_automations_trigger();

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_status_value 
  ON appointments(clinic_id, status, estimated_value DESC);

-- ============================================================================
-- ETAPA 2: AUTOMATIC RECEIVABLE MOTOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS ar_receivable_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  installment_number INT NOT NULL,
  total_installments INT NOT NULL,
  
  amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'pending',
  due_date DATE NOT NULL,
  
  interest_applied DECIMAL(12, 2) DEFAULT 0,
  fine_applied DECIMAL(12, 2) DEFAULT 0,
  discount_applied DECIMAL(12, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(receivable_id, installment_number)
);

CREATE INDEX idx_ar_receivable_installments_receivable_id ON ar_receivable_installments(receivable_id);
CREATE INDEX idx_ar_receivable_installments_clinic_id ON ar_receivable_installments(clinic_id);
CREATE INDEX idx_ar_receivable_installments_status_date ON ar_receivable_installments(status, due_date);
CREATE INDEX idx_ar_receivable_installments_due_date ON ar_receivable_installments(due_date DESC);

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

CREATE TABLE IF NOT EXISTS ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES ar_receivable_installments(id) ON DELETE SET NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  payment_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  
  applied_interest DECIMAL(12, 2) DEFAULT 0,
  applied_fine DECIMAL(12, 2) DEFAULT 0,
  applied_discount DECIMAL(12, 2) DEFAULT 0,
  
  transaction_id UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ar_payments_receivable_id ON ar_payments(receivable_id);
CREATE INDEX idx_ar_payments_clinic_id ON ar_payments(clinic_id);
CREATE INDEX idx_ar_payments_payment_method ON ar_payments(payment_method);
CREATE INDEX idx_ar_payments_payment_date ON ar_payments(payment_date DESC);
CREATE INDEX idx_ar_payments_installment_id ON ar_payments(installment_id);

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

CREATE TABLE IF NOT EXISTS ar_payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES ar_payments(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  split_number INT NOT NULL,
  total_splits INT NOT NULL,
  
  split_method VARCHAR(50) NOT NULL,
  split_amount DECIMAL(12, 2) NOT NULL,
  split_percentage DECIMAL(5, 2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(payment_id, split_number)
);

CREATE INDEX idx_ar_payment_splits_payment_id ON ar_payment_splits(payment_id);
CREATE INDEX idx_ar_payment_splits_clinic_id ON ar_payment_splits(clinic_id);

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

-- FUNÇÕES ETAPA 2

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
    
    v_current_date := v_current_date + INTERVAL '1 month';
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  SELECT due_date INTO v_due_date
  FROM ar_receivable_installments
  WHERE id = p_installment_id;
  
  v_days_overdue := GREATEST(0, CURRENT_DATE - v_due_date);
  
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

CREATE OR REPLACE FUNCTION fn_mark_overdue_installments(p_clinic_id UUID)
RETURNS TABLE(updated INT) AS $$
DECLARE
  v_updated INT;
BEGIN
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

CREATE OR REPLACE FUNCTION fn_update_receivable_status(p_receivable_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_amount DECIMAL;
  v_total_paid DECIMAL;
  v_is_overdue BOOLEAN;
  v_new_status VARCHAR(20);
BEGIN
  SELECT 
    SUM(amount),
    SUM(paid_amount),
    BOOL_OR(status = 'overdue')
  INTO v_total_amount, v_total_paid, v_is_overdue
  FROM ar_receivable_installments
  WHERE receivable_id = p_receivable_id;
  
  v_new_status := CASE
    WHEN v_total_paid >= v_total_amount THEN 'received'
    WHEN v_total_paid > 0 AND v_total_paid < v_total_amount THEN 
      CASE WHEN v_is_overdue THEN 'overdue' ELSE 'partial' END
    WHEN v_is_overdue THEN 'overdue'
    ELSE 'pending'
  END;
  
  UPDATE ar_receivables
  SET 
    status = v_new_status,
    paid_amount = COALESCE(v_total_paid, 0),
    remaining_amount = COALESCE(v_total_amount - v_total_paid, 0),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_receivable_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fn_trg_update_receivable_after_payment()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION fn_trg_update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION sp_mark_all_overdue_for_clinic(p_clinic_id UUID)
RETURNS TABLE(
  installments_updated INT,
  receivables_updated INT
) AS $$
DECLARE
  v_inst_updated INT := 0;
  v_recv_updated INT := 0;
BEGIN
  UPDATE ar_receivable_installments
  SET status = 'overdue'
  WHERE clinic_id = p_clinic_id
    AND due_date < CURRENT_DATE
    AND status IN ('pending', 'partial')
    AND paid_amount < amount;
  
  GET DIAGNOSTICS v_inst_updated = ROW_COUNT;
  
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

CREATE INDEX IF NOT EXISTS idx_ar_receivables_clinic_status_date 
  ON ar_receivables(clinic_id, status, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_ar_receivables_overdue 
  ON ar_receivables(clinic_id, due_date, paid_amount)
  WHERE status IN ('pending', 'partial');

-- ============================================================================
-- ETAPA 3: AUTOMATIC PAYMENT SETTLEMENT & REVERSAL MOTOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES ar_payments(id) ON DELETE SET NULL,
  
  amount DECIMAL(12, 2) NOT NULL,
  settlement_type VARCHAR(50) NOT NULL,
  settlement_date DATE NOT NULL,
  
  bank_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
  transaction_reference VARCHAR(255),
  
  status VARCHAR(20) DEFAULT 'pending',
  failure_reason TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  
  version INT DEFAULT 1
);

CREATE INDEX idx_payment_settlements_clinic_id ON payment_settlements(clinic_id);
CREATE INDEX idx_payment_settlements_receivable_id ON payment_settlements(receivable_id);
CREATE INDEX idx_payment_settlements_status ON payment_settlements(status);
CREATE INDEX idx_payment_settlements_settlement_date ON payment_settlements(settlement_date DESC);
CREATE INDEX idx_payment_settlements_bank_account_id ON payment_settlements(bank_account_id);

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

CREATE TABLE IF NOT EXISTS payment_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  settlement_id UUID NOT NULL REFERENCES payment_settlements(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES ar_receivables(id) ON DELETE CASCADE,
  
  reversal_amount DECIMAL(12, 2) NOT NULL,
  reversal_reason VARCHAR(255) NOT NULL,
  reversal_date DATE NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX idx_payment_reversals_clinic_id ON payment_reversals(clinic_id);
CREATE INDEX idx_payment_reversals_settlement_id ON payment_reversals(settlement_id);
CREATE INDEX idx_payment_reversals_receivable_id ON payment_reversals(receivable_id);
CREATE INDEX idx_payment_reversals_status ON payment_reversals(status);
CREATE INDEX idx_payment_reversals_reversal_date ON payment_reversals(reversal_date DESC);

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

-- FUNÇÕES ETAPA 3

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
  SELECT paid_amount, total_amount - paid_amount, 1
  INTO v_current_version, v_remaining_amount, v_current_version
  FROM ar_receivables
  WHERE id = p_receivable_id
  FOR UPDATE NOWAIT;

  IF v_current_version != p_expected_version THEN
    valid := FALSE;
    error_message := 'Version mismatch - another settlement in progress';
    RETURN NEXT;
    RETURN;
  END IF;

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
  SELECT current_balance INTO v_current_balance
  FROM financial_accounts
  WHERE id = p_account_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    success := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  v_new_balance := CASE
    WHEN p_operation = 'ADD' THEN v_current_balance + p_amount
    WHEN p_operation = 'SUBTRACT' THEN v_current_balance - p_amount
    ELSE v_current_balance
  END;

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

  SELECT valid, error_message
  INTO v_result_valid, v_result_error
  FROM fn_validate_settlement_concurrency(v_settlement.receivable_id, p_amount, 1);

  IF NOT v_result_valid THEN
    success := FALSE;
    error_message := v_result_error;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT new_balance, success
  INTO v_new_balance, v_result_valid
  FROM fn_update_bank_account_balance(v_settlement.bank_account_id, p_clinic_id, p_amount, 'ADD');

  IF NOT v_result_valid THEN
    success := FALSE;
    error_message := 'Failed to update bank account balance';
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO financial_transactions (
    clinic_id, type, status, category, amount, date,
    description, settlement_id, bank_account_id, created_at
  ) VALUES (
    p_clinic_id, 'INCOME', 'PAID', 'payment_settlement', p_amount,
    CURRENT_DATE, format('Payment settlement: %s', v_settlement.settlement_type),
    p_settlement_id, v_settlement.bank_account_id, CURRENT_TIMESTAMP
  )
  RETURNING id INTO v_transaction_id;

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

CREATE OR REPLACE FUNCTION fn_trg_handle_settlement_processed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
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

CREATE OR REPLACE FUNCTION fn_trg_handle_reversal_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM fn_update_bank_account_balance(
      (SELECT bank_account_id FROM payment_settlements WHERE id = NEW.settlement_id),
      NEW.clinic_id,
      NEW.reversal_amount,
      'SUBTRACT'
    );

    UPDATE ar_receivables
    SET 
      paid_amount = paid_amount - NEW.reversal_amount,
      remaining_amount = total_amount - (paid_amount - NEW.reversal_amount),
      status = 'pending',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.receivable_id;

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

CREATE INDEX IF NOT EXISTS idx_payment_settlements_clinic_status_date 
  ON payment_settlements(clinic_id, status, settlement_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_reversals_clinic_status_date 
  ON payment_reversals(clinic_id, status, reversal_date DESC);

-- ============================================================================
-- ETAPA 4: MEDICAL REPASSE MOTOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS medical_commission_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  base_tax_type VARCHAR(50) DEFAULT 'iss',
  base_tax_percentage DECIMAL(5, 2) DEFAULT 5.00,
  
  min_commission_amount DECIMAL(14, 2) DEFAULT 0,
  max_commission_amount DECIMAL(14, 2) DEFAULT NULL,
  apply_withholding BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_professional FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

CREATE INDEX idx_medical_commission_clinic_id ON medical_commission_models(clinic_id);
CREATE INDEX idx_medical_commission_professional_id ON medical_commission_models(professional_id);
CREATE INDEX idx_medical_commission_is_active ON medical_commission_models(clinic_id, is_active);
CREATE UNIQUE INDEX idx_medical_commission_professional_active 
  ON medical_commission_models(clinic_id, professional_id) 
  WHERE is_active = true;

ALTER TABLE medical_commission_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_commission_models"
  ON medical_commission_models FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "clinic_admin_can_manage_commission_models"
  ON medical_commission_models FOR INSERT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'director')
    )
  );

CREATE POLICY "clinic_admin_can_update_commission_models"
  ON medical_commission_models FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'director')
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'director')
    )
  );

CREATE TABLE IF NOT EXISTS commission_fixed_percent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  model_id UUID NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES medical_commission_models(id) ON DELETE CASCADE
);

CREATE INDEX idx_commission_fixed_percent_model_id ON commission_fixed_percent(model_id);
CREATE INDEX idx_commission_fixed_percent_clinic_id ON commission_fixed_percent(clinic_id);

ALTER TABLE commission_fixed_percent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_fixed_percent"
  ON commission_fixed_percent FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS commission_rate_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  model_id UUID NOT NULL,
  procedure_code VARCHAR(50),
  procedure_name VARCHAR(255),
  commission_percentage DECIMAL(5, 2) NOT NULL,
  min_amount DECIMAL(14, 2) DEFAULT 0,
  max_amount DECIMAL(14, 2) DEFAULT NULL,
  insurance_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES medical_commission_models(id) ON DELETE CASCADE
);

CREATE INDEX idx_commission_rate_model_id ON commission_rate_tables(model_id);
CREATE INDEX idx_commission_rate_procedure ON commission_rate_tables(clinic_id, procedure_code);
CREATE INDEX idx_commission_rate_insurance ON commission_rate_tables(clinic_id, insurance_code);

ALTER TABLE commission_rate_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_rate_tables"
  ON commission_rate_tables FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS medical_commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  model_id UUID NOT NULL,
  appointment_value DECIMAL(14, 2) NOT NULL,
  commission_gross DECIMAL(14, 2) NOT NULL,
  tax_type VARCHAR(50) NOT NULL,
  tax_percentage DECIMAL(5, 2) NOT NULL,
  tax_amount DECIMAL(14, 2) NOT NULL,
  commission_net DECIMAL(14, 2) NOT NULL,
  ap_bill_id UUID,
  status VARCHAR(50) DEFAULT 'calculated',
  calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  bill_created_at TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_professional FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES medical_commission_models(id) ON DELETE CASCADE
);

CREATE INDEX idx_commission_ledger_clinic ON medical_commission_ledger(clinic_id);
CREATE INDEX idx_commission_ledger_appointment ON medical_commission_ledger(appointment_id);
CREATE INDEX idx_commission_ledger_professional ON medical_commission_ledger(professional_id);
CREATE INDEX idx_commission_ledger_date ON medical_commission_ledger(calculation_date);

ALTER TABLE medical_commission_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_commission_ledger"
  ON medical_commission_ledger FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

-- FUNÇÕES ETAPA 4

CREATE OR REPLACE FUNCTION fn_calculate_commission(
  p_clinic_id UUID,
  p_professional_id UUID,
  p_appointment_value DECIMAL,
  p_procedure_code VARCHAR DEFAULT NULL,
  p_insurance_code VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  commission_gross DECIMAL,
  commission_percentage DECIMAL,
  tax_type VARCHAR,
  tax_percentage DECIMAL,
  tax_amount DECIMAL,
  commission_net DECIMAL,
  model_id UUID,
  model_type VARCHAR
) AS $$
DECLARE
  v_model RECORD;
  v_commission_pct DECIMAL := 0;
  v_commission_gross DECIMAL;
  v_tax_amount DECIMAL;
  v_commission_net DECIMAL;
BEGIN
  SELECT * INTO v_model
  FROM medical_commission_models
  WHERE clinic_id = p_clinic_id
    AND professional_id = p_professional_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_model IS NULL THEN
    RAISE EXCEPTION 'No active commission model found';
  END IF;

  IF v_model.type = 'fixed_percent' THEN
    SELECT percentage INTO v_commission_pct
    FROM commission_fixed_percent
    WHERE model_id = v_model.id
    LIMIT 1;
    
  ELSIF v_model.type IN ('rate_table', 'specific_procedure', 'specific_insurance') THEN
    SELECT commission_percentage INTO v_commission_pct
    FROM commission_rate_tables
    WHERE model_id = v_model.id
      AND (
        (v_model.type = 'specific_procedure' AND procedure_code = p_procedure_code) OR
        (v_model.type = 'specific_insurance' AND insurance_code = p_insurance_code) OR
        v_model.type = 'rate_table'
      )
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  v_commission_gross := p_appointment_value * (v_commission_pct / 100);
  
  IF v_commission_gross < v_model.min_commission_amount THEN
    v_commission_gross := v_model.min_commission_amount;
  END IF;
  
  IF v_model.max_commission_amount IS NOT NULL AND 
     v_commission_gross > v_model.max_commission_amount THEN
    v_commission_gross := v_model.max_commission_amount;
  END IF;

  v_tax_amount := v_commission_gross * (v_model.base_tax_percentage / 100);
  v_commission_net := v_commission_gross - v_tax_amount;

  RETURN QUERY SELECT
    v_commission_gross,
    v_commission_pct,
    v_model.base_tax_type,
    v_model.base_tax_percentage,
    v_tax_amount,
    v_commission_net,
    v_model.id,
    v_model.type;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_create_ap_bill_for_repasse(
  p_clinic_id UUID,
  p_appointment_id UUID,
  p_professional_id UUID,
  p_appointment_value DECIMAL
)
RETURNS TABLE(
  ap_bill_id UUID,
  commission_gross DECIMAL,
  commission_net DECIMAL,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_calc RECORD;
  v_professional RECORD;
  v_ap_bill_id UUID;
  v_error TEXT := NULL;
BEGIN
  BEGIN
    SELECT INTO v_calc *
    FROM fn_calculate_commission(
      p_clinic_id,
      p_professional_id,
      p_appointment_value
    );

    SELECT id, name, document_number, email, phone
    INTO v_professional
    FROM professionals
    WHERE id = p_professional_id
      AND clinic_id = p_clinic_id;

    IF v_professional IS NULL THEN
      RAISE EXCEPTION 'Professional not found';
    END IF;

    INSERT INTO ap_bills (
      clinic_id,
      vendor_id,
      vendor_name,
      vendor_document,
      vendor_email,
      vendor_phone,
      appointment_id,
      description,
      bill_date,
      due_date,
      gross_amount,
      tax_amount,
      tax_type,
      net_amount,
      status
    ) VALUES (
      p_clinic_id,
      p_professional_id,
      v_professional.name,
      v_professional.document_number,
      v_professional.email,
      v_professional.phone,
      p_appointment_id,
      'Comissão Médica',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '10 days',
      v_calc.commission_gross,
      v_calc.tax_amount,
      v_calc.tax_type,
      v_calc.commission_net,
      'pending'
    )
    RETURNING id INTO v_ap_bill_id;

    INSERT INTO medical_commission_ledger (
      clinic_id,
      appointment_id,
      professional_id,
      model_id,
      appointment_value,
      commission_gross,
      tax_type,
      tax_percentage,
      tax_amount,
      commission_net,
      ap_bill_id,
      status,
      bill_created_at
    ) VALUES (
      p_clinic_id,
      p_appointment_id,
      p_professional_id,
      v_calc.model_id,
      p_appointment_value,
      v_calc.commission_gross,
      v_calc.tax_type,
      v_calc.tax_percentage,
      v_calc.tax_amount,
      v_calc.commission_net,
      v_ap_bill_id,
      'bill_created',
      CURRENT_TIMESTAMP
    );

    RETURN QUERY SELECT
      v_ap_bill_id,
      v_calc.commission_gross,
      v_calc.commission_net,
      true,
      NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::DECIMAL,
      NULL::DECIMAL,
      false,
      v_error;
  END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_auto_create_ap_bill_for_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  IF NEW.status = 'attended' AND OLD.status != 'attended' THEN
    IF NEW.professional_id IS NOT NULL AND NEW.estimated_value > 0 THEN
      SELECT INTO v_result *
      FROM fn_create_ap_bill_for_repasse(
        NEW.clinic_id,
        NEW.id,
        NEW.professional_id,
        COALESCE(NEW.estimated_value, 0)
      );

      IF v_result.success = false THEN
        RAISE WARNING 'Failed to create AP bill for repasse: %', v_result.error_message;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_ap_bill_for_appointment ON appointments;

CREATE TRIGGER trg_auto_create_ap_bill_for_appointment
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_ap_bill_for_appointment();

CREATE OR REPLACE VIEW vw_monthly_repasse_summary AS
SELECT
  mcl.clinic_id,
  p.id as professional_id,
  p.name as professional_name,
  TO_CHAR(mcl.calculation_date, 'YYYY-MM') as month,
  COUNT(mcl.id) as commission_count,
  SUM(mcl.appointment_value) as total_appointment_value,
  SUM(mcl.commission_gross) as total_commission_gross,
  SUM(mcl.tax_amount) as total_tax_amount,
  SUM(mcl.commission_net) as total_commission_net,
  COUNT(CASE WHEN mcl.status = 'bill_created' THEN 1 END) as bills_created,
  COUNT(CASE WHEN mcl.status = 'paid' THEN 1 END) as bills_paid
FROM medical_commission_ledger mcl
JOIN professionals p ON mcl.professional_id = p.id
GROUP BY mcl.clinic_id, p.id, p.name, TO_CHAR(mcl.calculation_date, 'YYYY-MM');

CREATE OR REPLACE VIEW vw_professional_commission_models AS
SELECT
  mcm.clinic_id,
  p.id as professional_id,
  p.name as professional_name,
  mcm.id as model_id,
  mcm.model_name,
  mcm.type,
  mcm.is_active,
  mcm.base_tax_type,
  mcm.base_tax_percentage,
  COUNT(mcl.id) as total_appointments_with_model,
  COALESCE(SUM(mcl.commission_net), 0) as total_commission_net
FROM medical_commission_models mcm
JOIN professionals p ON mcm.professional_id = p.id
LEFT JOIN medical_commission_ledger mcl ON mcm.id = mcl.model_id
GROUP BY mcm.clinic_id, p.id, p.name, mcm.id, mcm.model_name, mcm.type, 
         mcm.is_active, mcm.base_tax_type, mcm.base_tax_percentage;

CREATE OR REPLACE FUNCTION sp_batch_create_ap_bills_for_month(
  p_clinic_id UUID,
  p_month VARCHAR
)
RETURNS TABLE(
  created_count INT,
  failed_count INT,
  total_commission DECIMAL,
  error_message TEXT
) AS $$
DECLARE
  v_created_count INT := 0;
  v_failed_count INT := 0;
  v_total_commission DECIMAL := 0;
  v_appointment RECORD;
  v_result RECORD;
BEGIN
  FOR v_appointment IN
    SELECT a.id, a.clinic_id, a.professional_id, a.estimated_value
    FROM appointments a
    WHERE a.clinic_id = p_clinic_id
      AND a.status = 'attended'
      AND TO_CHAR(a.appointment_date, 'YYYY-MM') = p_month
      AND NOT EXISTS (
        SELECT 1 FROM medical_commission_ledger mcl
        WHERE mcl.appointment_id = a.id
      )
  LOOP
    SELECT INTO v_result *
    FROM fn_create_ap_bill_for_repasse(
      p_clinic_id,
      v_appointment.id,
      v_appointment.professional_id,
      v_appointment.estimated_value
    );

    IF v_result.success THEN
      v_created_count := v_created_count + 1;
      v_total_commission := v_total_commission + v_result.commission_gross;
    ELSE
      v_failed_count := v_failed_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_created_count,
    v_failed_count,
    v_total_commission,
    NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    0,
    0,
    0::DECIMAL,
    SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX idx_appointments_professional_status 
  ON appointments(clinic_id, professional_id, status);

CREATE INDEX idx_medical_commission_ledger_professional_month 
  ON medical_commission_ledger(professional_id, DATE_TRUNC('month', calculation_date));

-- ============================================================================
-- ETAPA 6: INTELLIGENT BANK RECONCILIATION ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_import_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  bank_account_id UUID NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(14, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  balance_after DECIMAL(14, 2),
  payment_method VARCHAR(50),
  raw_data JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_account FOREIGN KEY (bank_account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE,
  CONSTRAINT unique_external_id UNIQUE(bank_account_id, external_id)
);

CREATE INDEX idx_bank_import_clinic ON bank_import_transactions(clinic_id);
CREATE INDEX idx_bank_import_account ON bank_import_transactions(bank_account_id);
CREATE INDEX idx_bank_import_date ON bank_import_transactions(transaction_date);
CREATE INDEX idx_bank_import_status ON bank_import_transactions(clinic_id, status);
CREATE INDEX idx_bank_import_amount ON bank_import_transactions(amount);

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

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  bank_import_id UUID NOT NULL,
  payment_id UUID,
  receivable_id UUID,
  confidence_score DECIMAL(3, 2) DEFAULT 0.0,
  match_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  reconciliation_notes TEXT,
  reject_reason TEXT,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_import FOREIGN KEY (bank_import_id) REFERENCES bank_import_transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES ar_payments(id) ON DELETE SET NULL,
  CONSTRAINT fk_receivable FOREIGN KEY (receivable_id) REFERENCES ar_receivables(id) ON DELETE SET NULL
);

CREATE INDEX idx_bank_reconciliation_clinic ON bank_reconciliations(clinic_id);
CREATE INDEX idx_bank_reconciliation_status ON bank_reconciliations(clinic_id, status);
CREATE INDEX idx_bank_reconciliation_score ON bank_reconciliations(confidence_score DESC);
CREATE INDEX idx_bank_reconciliation_import ON bank_reconciliations(bank_import_id);
CREATE INDEX idx_bank_reconciliation_payment ON bank_reconciliations(payment_id);
CREATE INDEX idx_bank_reconciliation_receivable ON bank_reconciliations(receivable_id);

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
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'director', 'accountant')
    )
  );

CREATE TABLE IF NOT EXISTS reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  reconciliation_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
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

-- FUNÇÕES ETAPA 6

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
  v_amount_diff := ABS(p_import_amount - p_payment_amount);
  IF v_amount_diff < 0.01 THEN
    v_score := v_score + 40;
  ELSIF (v_amount_diff / p_payment_amount) < 0.05 THEN
    v_score := v_score + 20;
  END IF;

  v_day_diff := ABS(EXTRACT(DAY FROM (p_import_date - p_payment_date)));
  IF v_day_diff = 0 THEN
    v_score := v_score + 30;
  ELSIF v_day_diff <= 1 THEN
    v_score := v_score + 25;
  ELSIF v_day_diff <= 3 THEN
    v_score := v_score + 15;
  END IF;

  IF p_import_method = p_payment_method THEN
    v_score := v_score + 20;
  END IF;

  IF LOWER(p_import_desc) LIKE CONCAT('%', LOWER(LEFT(p_payer_name, 5)), '%') THEN
    v_score := v_score + 10;
  END IF;

  RETURN v_score::DECIMAL / 100;
END;
$$ LANGUAGE plpgsql;

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
    FOR v_import_tx IN
      SELECT * FROM bank_import_transactions
      WHERE clinic_id = p_clinic_id
        AND bank_account_id = p_bank_account_id
        AND status = 'pending'
      ORDER BY transaction_date DESC
    LOOP
      v_best_score := 0;
      v_best_payment := NULL;

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

CREATE OR REPLACE FUNCTION fn_auto_create_settlement_on_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  IF NEW.status = 'reconciled' AND (OLD.status IS NULL OR OLD.status != 'reconciled') THEN
    IF NEW.payment_id IS NOT NULL AND NEW.receivable_id IS NOT NULL THEN
      SELECT INTO v_result *
      FROM fn_process_settlement_atomically(
        NEW.clinic_id,
        NEW.receivable_id,
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
    FOR v_recon IN
      SELECT id FROM bank_reconciliations
      WHERE clinic_id = p_clinic_id
        AND status = 'matched'
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

CREATE INDEX idx_bank_import_date_amount 
  ON bank_import_transactions(transaction_date, amount);

CREATE INDEX idx_bank_reconciliation_status_score 
  ON bank_reconciliations(clinic_id, status, confidence_score DESC);

CREATE INDEX idx_reconciliation_audit_date 
  ON reconciliation_audit_log(created_at DESC);

-- ============================================================================
-- ✅ MIGRAÇÕES ETAPAS 1-6 COMPLETAS!
-- ============================================================================

COMMIT;
