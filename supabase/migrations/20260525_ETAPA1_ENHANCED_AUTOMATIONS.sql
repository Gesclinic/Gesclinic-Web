-- ============================================================================
-- MIGRATION: ETAPA 1 - Enhanced Appointment Financial Automations
-- 
-- Adds:
-- 1. financial_automation_queue (async processing)
-- 2. dre_metrics (DRE tracking)
-- 3. financial_indicators (KPIs)
-- 4. Triggers for automation orchestration
-- 5. Functions for automatic updates
-- ============================================================================

-- ============================================================================
-- 1. TABELA: financial_automation_queue
-- Propósito: Queue for async financial automation processing
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_automation_queue (
  id BIGSERIAL PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'APPOINTMENT_ATTENDED', 'PAYMENT_RECEIVED', etc
  payload JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_automation_queue_clinic_id 
  ON financial_automation_queue(clinic_id);

CREATE INDEX idx_financial_automation_queue_status 
  ON financial_automation_queue(status);

CREATE INDEX idx_financial_automation_queue_appointment_id 
  ON financial_automation_queue(appointment_id);

CREATE INDEX idx_financial_automation_queue_created_at 
  ON financial_automation_queue(created_at DESC);

-- RLS for financial_automation_queue
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

-- ============================================================================
-- 2. TABELA: dre_metrics
-- Propósito: Monthly DRE tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS dre_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  
  -- Revenue
  gross_revenue DECIMAL(12, 2) DEFAULT 0,
  appointment_revenue DECIMAL(12, 2) DEFAULT 0,
  procedure_revenue DECIMAL(12, 2) DEFAULT 0,
  exam_revenue DECIMAL(12, 2) DEFAULT 0,
  other_revenue DECIMAL(12, 2) DEFAULT 0,
  
  -- Deductions
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  returned_amount DECIMAL(12, 2) DEFAULT 0,
  net_revenue DECIMAL(12, 2) DEFAULT 0,
  
  -- Costs
  medical_repasse DECIMAL(12, 2) DEFAULT 0,
  variable_costs DECIMAL(12, 2) DEFAULT 0,
  fixed_costs DECIMAL(12, 2) DEFAULT 0,
  operational_expenses DECIMAL(12, 2) DEFAULT 0,
  
  -- Results
  ebitda DECIMAL(12, 2) DEFAULT 0,
  operating_result DECIMAL(12, 2) DEFAULT 0,
  financial_result DECIMAL(12, 2) DEFAULT 0,
  net_result DECIMAL(12, 2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id, month)
);

CREATE INDEX idx_dre_metrics_clinic_month 
  ON dre_metrics(clinic_id, month);

CREATE INDEX idx_dre_metrics_clinic_id 
  ON dre_metrics(clinic_id);

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

-- ============================================================================
-- 3. TABELA: financial_indicators
-- Propósito: Real-time KPIs
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Revenue
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  pending_revenue DECIMAL(12, 2) DEFAULT 0,
  today_revenue DECIMAL(12, 2) DEFAULT 0,
  month_to_date_revenue DECIMAL(12, 2) DEFAULT 0,
  
  -- Receivables
  total_receivables DECIMAL(12, 2) DEFAULT 0,
  overdue_receivables DECIMAL(12, 2) DEFAULT 0,
  upcoming_receivables DECIMAL(12, 2) DEFAULT 0,
  
  -- Payables
  total_payables DECIMAL(12, 2) DEFAULT 0,
  overdue_payables DECIMAL(12, 2) DEFAULT 0,
  upcoming_payables DECIMAL(12, 2) DEFAULT 0,
  
  -- Balance
  current_balance DECIMAL(12, 2) DEFAULT 0,
  average_daily_balance DECIMAL(12, 2) DEFAULT 0,
  
  -- Health
  liquidity_ratio DECIMAL(5, 2) DEFAULT 1.0,
  financial_health VARCHAR(20) DEFAULT 'healthy', -- 'healthy', 'warning', 'critical'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_indicators_clinic_id 
  ON financial_indicators(clinic_id);

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

-- ============================================================================
-- 4. FUNÇÃO: fn_update_cashflow_predicted()
-- Propósito: Auto-update predicted cashflow when appointment attended
-- ============================================================================

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
  -- Calculate predicted date (3 days forward)
  v_predicted_date := CURRENT_DATE + INTERVAL '3 days';

  -- Try to find existing transaction for this date
  SELECT id INTO v_transaction_id
  FROM financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'INCOME'
    AND status = 'PREDICTED'
    AND category = 'appointment'
    AND date = v_predicted_date
  LIMIT 1;

  IF v_transaction_id IS NOT NULL THEN
    -- Update existing
    UPDATE financial_transactions
    SET amount = amount + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_transaction_id;
  ELSE
    -- Create new
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

-- ============================================================================
-- 5. FUNÇÃO: fn_update_dre_metrics()
-- Propósito: Auto-update DRE metrics when appointment attended
-- ============================================================================

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
  -- Format: YYYY-MM
  v_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Try to find existing metric
  SELECT id INTO v_metric_id
  FROM dre_metrics
  WHERE clinic_id = p_clinic_id AND month = v_month;

  IF v_metric_id IS NOT NULL THEN
    -- Update existing
    UPDATE dre_metrics
    SET gross_revenue = gross_revenue + p_amount,
        appointment_revenue = appointment_revenue + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_metric_id;
  ELSE
    -- Create new
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

-- ============================================================================
-- 6. FUNÇÃO: fn_update_financial_indicators()
-- Propósito: Auto-update KPIs when appointment attended
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_financial_indicators(
  p_clinic_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_indicator_id UUID;
BEGIN
  -- Try to find existing indicator
  SELECT id INTO v_indicator_id
  FROM financial_indicators
  WHERE clinic_id = p_clinic_id;

  IF v_indicator_id IS NOT NULL THEN
    -- Update existing
    UPDATE financial_indicators
    SET total_revenue = total_revenue + p_amount,
        pending_revenue = pending_revenue + p_amount,
        today_revenue = today_revenue + p_amount,
        month_to_date_revenue = month_to_date_revenue + p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_indicator_id;
  ELSE
    -- Create new
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

-- ============================================================================
-- 7. FUNÇÃO: fn_orchestrate_appointment_automations()
-- Propósito: Main orchestrator for all automation
-- ============================================================================

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
  -- 1. Update cashflow
  v_cashflow_result := fn_update_cashflow_predicted(p_appointment_id, p_clinic_id, p_amount);

  -- 2. Update DRE metrics
  v_dre_result := fn_update_dre_metrics(p_appointment_id, p_clinic_id, p_amount);

  -- 3. Update financial indicators
  v_indicators_result := fn_update_financial_indicators(p_clinic_id, p_amount);

  -- Return combined result
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

-- ============================================================================
-- 8. TRIGGER: Enhanced trg_create_ar_on_appointment_attended
-- Now also runs all automations
-- ============================================================================

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

COMMENT ON TRIGGER trg_create_ar_with_automations ON appointments IS
  'ETAPA 1: Enhanced - Auto-create AR, update cashflow, DRE, indicators';

-- ============================================================================
-- 9. TRIGGER FUNCTION: fn_orchestrate_appointment_automations_trigger()
-- Wrapper to call orchestrator from trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_orchestrate_appointment_automations_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Call orchestrator
  v_result := fn_orchestrate_appointment_automations(
    NEW.id,
    NEW.clinic_id,
    COALESCE(NEW.estimated_value, 0)
  );

  -- Log result
  RAISE NOTICE '[ETAPA1] Automation orchestrated: %', v_result;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[ETAPA1] Automation failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. INDEX: Performance optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_status_value 
  ON appointments(clinic_id, status, estimated_value DESC);

-- ============================================================================
-- DONE: Migration for ETAPA 1 complete
-- ============================================================================

-- Verify tables created
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'financial_automation_queue',
    'dre_metrics',
    'financial_indicators'
  )
ORDER BY table_name;
