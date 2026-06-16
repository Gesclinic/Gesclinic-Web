-- =============================================================================
-- ETAPA 5: DRE DINÂMICA (DYNAMIC INCOME STATEMENT)
-- =============================================================================
-- Gera DRE em tempo real: dia, semana, mês, trimestre, ano
-- Integra: Receitas (ar_payments) + Despesas (ap_bills) + Comissões (medical_commission_ledger)
-- Calcula: Lucro Bruto, Operacional, Líquido + Indicadores (Margem, ROI, etc.)
-- Dashboard: 10+ views para análise financeira
-- =============================================================================

-- ============= TABLE 1: DRE Periods =============

CREATE TABLE IF NOT EXISTS dre_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  -- Receitas
  appointment_revenue DECIMAL(14, 2) DEFAULT 0,
  service_revenue DECIMAL(14, 2) DEFAULT 0,
  product_revenue DECIMAL(14, 2) DEFAULT 0,
  other_revenue DECIMAL(14, 2) DEFAULT 0,
  gross_revenue DECIMAL(14, 2) DEFAULT 0,
  -- Deduções
  discounts DECIMAL(14, 2) DEFAULT 0,
  cancellations DECIMAL(14, 2) DEFAULT 0,
  net_revenue DECIMAL(14, 2) DEFAULT 0,
  -- Despesas Operacionais
  personnel_expenses DECIMAL(14, 2) DEFAULT 0,
  rent_expenses DECIMAL(14, 2) DEFAULT 0,
  utilities_expenses DECIMAL(14, 2) DEFAULT 0,
  supplies_expenses DECIMAL(14, 2) DEFAULT 0,
  maintenance_expenses DECIMAL(14, 2) DEFAULT 0,
  marketing_expenses DECIMAL(14, 2) DEFAULT 0,
  professional_fees DECIMAL(14, 2) DEFAULT 0,
  depreciation_expenses DECIMAL(14, 2) DEFAULT 0,
  other_operating_expenses DECIMAL(14, 2) DEFAULT 0,
  total_operating_expenses DECIMAL(14, 2) DEFAULT 0,
  -- Comissões Médicas
  medical_commissions DECIMAL(14, 2) DEFAULT 0,
  tax_withholdings DECIMAL(14, 2) DEFAULT 0,
  -- Resultado
  operating_income DECIMAL(14, 2) DEFAULT 0, -- net_revenue - operating_expenses - commissions
  other_income DECIMAL(14, 2) DEFAULT 0,
  other_expenses DECIMAL(14, 2) DEFAULT 0,
  pre_tax_income DECIMAL(14, 2) DEFAULT 0,
  income_tax DECIMAL(14, 2) DEFAULT 0,
  net_income DECIMAL(14, 2) DEFAULT 0,
  -- Indicadores
  gross_margin_pct DECIMAL(5, 2) DEFAULT 0,
  operating_margin_pct DECIMAL(5, 2) DEFAULT 0,
  net_margin_pct DECIMAL(5, 2) DEFAULT 0,
  -- Controle
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP,
  locked_by_user_id UUID,
  is_projected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT unique_period UNIQUE(clinic_id, period_type, period_start_date)
);

ALTER TABLE dre_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinic_users_can_view_dre_periods ON dre_periods;
CREATE POLICY clinic_users_can_view_dre_periods
  ON dre_periods FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS clinic_admin_can_manage_dre_periods ON dre_periods;
CREATE POLICY clinic_admin_can_manage_dre_periods
  ON dre_periods FOR INSERT, UPDATE
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

CREATE INDEX IF NOT EXISTS idx_dre_periods_clinic ON dre_periods(clinic_id);
CREATE INDEX IF NOT EXISTS idx_dre_periods_period ON dre_periods(clinic_id, period_type, period_start_date);
CREATE INDEX IF NOT EXISTS idx_dre_periods_date_range ON dre_periods(clinic_id, period_end_date DESC);

-- ============= TABLE 2: DRE Details (Line Items) =============

CREATE TABLE IF NOT EXISTS dre_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  dre_period_id UUID NOT NULL,
  account_code VARCHAR(20), -- Chart of Accounts code
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50), -- 'revenue', 'expense', 'deduction', 'commission', 'tax'
  line_amount DECIMAL(14, 2) NOT NULL,
  source_table VARCHAR(50), -- 'ar_payments', 'ap_bills', 'medical_commission_ledger'
  source_record_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_dre_period FOREIGN KEY (dre_period_id) REFERENCES dre_periods(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dre_line_items_period ON dre_line_items(dre_period_id);
CREATE INDEX IF NOT EXISTS idx_dre_line_items_account ON dre_line_items(account_code);

-- ============= TABLE 3: DRE Projections =============

CREATE TABLE IF NOT EXISTS dre_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  projection_month DATE NOT NULL, -- First day of month
  scenario_name VARCHAR(100), -- 'conservative', 'base', 'optimistic'
  projected_revenue DECIMAL(14, 2),
  projected_expenses DECIMAL(14, 2),
  projected_commissions DECIMAL(14, 2),
  projected_net_income DECIMAL(14, 2),
  assumptions TEXT, -- JSON with growth rates, etc.
  created_by_user_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- ============= FUNCTION 1: Calculate DRE Period =============

CREATE OR REPLACE FUNCTION fn_calculate_dre_period(
  p_clinic_id UUID,
  p_period_type VARCHAR,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  period_id UUID,
  gross_revenue DECIMAL,
  net_revenue DECIMAL,
  operating_expenses DECIMAL,
  medical_commissions DECIMAL,
  operating_income DECIMAL,
  net_income DECIMAL,
  gross_margin_pct DECIMAL,
  operating_margin_pct DECIMAL,
  net_margin_pct DECIMAL,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_period_id UUID;
  v_appointment_revenue DECIMAL := 0;
  v_service_revenue DECIMAL := 0;
  v_product_revenue DECIMAL := 0;
  v_other_revenue DECIMAL := 0;
  v_gross_revenue DECIMAL := 0;
  v_discounts DECIMAL := 0;
  v_net_revenue DECIMAL := 0;
  v_personnel_expenses DECIMAL := 0;
  v_rent_expenses DECIMAL := 0;
  v_utilities_expenses DECIMAL := 0;
  v_supplies_expenses DECIMAL := 0;
  v_maintenance_expenses DECIMAL := 0;
  v_marketing_expenses DECIMAL := 0;
  v_professional_fees DECIMAL := 0;
  v_other_operating_expenses DECIMAL := 0;
  v_total_operating_expenses DECIMAL := 0;
  v_medical_commissions DECIMAL := 0;
  v_tax_withholdings DECIMAL := 0;
  v_operating_income DECIMAL := 0;
  v_net_income DECIMAL := 0;
  v_gross_margin_pct DECIMAL := 0;
  v_operating_margin_pct DECIMAL := 0;
  v_net_margin_pct DECIMAL := 0;
  v_error_msg TEXT := NULL;
BEGIN
  BEGIN
    -- 1. Aggregate revenues from ar_payments
    SELECT COALESCE(SUM(payment_amount), 0)
    INTO v_gross_revenue
    FROM ar_payments ap
    WHERE ap.clinic_id = p_clinic_id
      AND ap.payment_date >= p_start_date
      AND ap.payment_date <= p_end_date
      AND ap.status IN ('pending', 'settled');

    v_net_revenue := v_gross_revenue - v_discounts;

    -- 2. Aggregate operating expenses from ap_bills
    SELECT COALESCE(SUM(
      CASE WHEN bi.bill_type = 'personnel' THEN bi.amount ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN bi.bill_type = 'rent' THEN bi.amount ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN bi.bill_type = 'utilities' THEN bi.amount ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN bi.bill_type = 'supplies' THEN bi.amount ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN bi.bill_type IN ('maintenance', 'other') THEN bi.amount ELSE 0 END
    ), 0)
    INTO v_personnel_expenses, v_rent_expenses, v_utilities_expenses, 
         v_supplies_expenses, v_maintenance_expenses
    FROM ap_bills bi
    WHERE bi.clinic_id = p_clinic_id
      AND bi.due_date >= p_start_date
      AND bi.due_date <= p_end_date
      AND bi.status IN ('pending', 'paid', 'partial');

    v_total_operating_expenses := v_personnel_expenses + v_rent_expenses + 
                                   v_utilities_expenses + v_supplies_expenses + 
                                   v_maintenance_expenses + v_marketing_expenses + 
                                   v_professional_fees + v_other_operating_expenses;

    -- 3. Aggregate medical commissions
    SELECT COALESCE(SUM(commission_net), 0),
           COALESCE(SUM(tax_amount), 0)
    INTO v_medical_commissions, v_tax_withholdings
    FROM medical_commission_ledger mcl
    WHERE mcl.clinic_id = p_clinic_id
      AND mcl.created_at >= p_start_date::timestamp
      AND mcl.created_at < (p_end_date + INTERVAL '1 day')::timestamp
      AND mcl.status IN ('pending', 'paid');

    -- 4. Calculate results
    v_operating_income := v_net_revenue - v_total_operating_expenses - v_medical_commissions;
    v_net_income := v_operating_income;

    -- 5. Calculate margins
    IF v_gross_revenue > 0 THEN
      v_gross_margin_pct := ((v_gross_revenue - 0) / v_gross_revenue) * 100;
      v_operating_margin_pct := (v_operating_income / v_gross_revenue) * 100;
      v_net_margin_pct := (v_net_income / v_gross_revenue) * 100;
    END IF;

    -- 6. Insert or update dre_periods
    INSERT INTO dre_periods (
      clinic_id, period_type, period_start_date, period_end_date,
      appointment_revenue, service_revenue, product_revenue, other_revenue,
      gross_revenue, discounts, net_revenue,
      personnel_expenses, rent_expenses, utilities_expenses, supplies_expenses,
      maintenance_expenses, marketing_expenses, professional_fees, other_operating_expenses,
      total_operating_expenses, medical_commissions, tax_withholdings,
      operating_income, net_income,
      gross_margin_pct, operating_margin_pct, net_margin_pct
    ) VALUES (
      p_clinic_id, p_period_type, p_start_date, p_end_date,
      v_appointment_revenue, v_service_revenue, v_product_revenue, v_other_revenue,
      v_gross_revenue, v_discounts, v_net_revenue,
      v_personnel_expenses, v_rent_expenses, v_utilities_expenses, v_supplies_expenses,
      v_maintenance_expenses, v_marketing_expenses, v_professional_fees, v_other_operating_expenses,
      v_total_operating_expenses, v_medical_commissions, v_tax_withholdings,
      v_operating_income, v_net_income,
      v_gross_margin_pct, v_operating_margin_pct, v_net_margin_pct
    )
    ON CONFLICT (clinic_id, period_type, period_start_date) 
    DO UPDATE SET
      gross_revenue = v_gross_revenue,
      net_revenue = v_net_revenue,
      total_operating_expenses = v_total_operating_expenses,
      medical_commissions = v_medical_commissions,
      operating_income = v_operating_income,
      net_income = v_net_income,
      gross_margin_pct = v_gross_margin_pct,
      operating_margin_pct = v_operating_margin_pct,
      net_margin_pct = v_net_margin_pct,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_period_id;

    RETURN QUERY SELECT
      v_period_id,
      v_gross_revenue,
      v_net_revenue,
      v_total_operating_expenses,
      v_medical_commissions,
      v_operating_income,
      v_net_income,
      v_gross_margin_pct,
      v_operating_margin_pct,
      v_net_margin_pct,
      true,
      NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT
      NULL::UUID,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      false,
      v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============= FUNCTION 2: Auto-Update DRE on Payment =============

CREATE OR REPLACE FUNCTION fn_auto_update_dre_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
  v_period_month DATE;
BEGIN
  -- Calculate DRE for the month when payment is added/updated
  v_period_month := DATE_TRUNC('month', NEW.payment_date)::DATE;

  SELECT INTO v_result *
  FROM fn_calculate_dre_period(
    NEW.clinic_id,
    'monthly',
    v_period_month,
    (v_period_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============= FUNCTION 3: Generate DRE Comparison =============

CREATE OR REPLACE FUNCTION fn_get_dre_comparison(
  p_clinic_id UUID,
  p_current_period_start DATE,
  p_current_period_end DATE,
  p_previous_period_start DATE,
  p_previous_period_end DATE
)
RETURNS TABLE(
  metric_name VARCHAR,
  current_value DECIMAL,
  previous_value DECIMAL,
  variance DECIMAL,
  variance_pct DECIMAL,
  trend VARCHAR
) AS $$
DECLARE
  v_curr_revenue DECIMAL;
  v_prev_revenue DECIMAL;
  v_curr_expenses DECIMAL;
  v_prev_expenses DECIMAL;
  v_curr_income DECIMAL;
  v_prev_income DECIMAL;
BEGIN
  -- Get current period metrics
  SELECT gross_revenue, total_operating_expenses, net_income
  INTO v_curr_revenue, v_curr_expenses, v_curr_income
  FROM dre_periods
  WHERE clinic_id = p_clinic_id
    AND period_start_date = p_current_period_start
    AND period_end_date = p_current_period_end
  LIMIT 1;

  -- Get previous period metrics
  SELECT gross_revenue, total_operating_expenses, net_income
  INTO v_prev_revenue, v_prev_expenses, v_prev_income
  FROM dre_periods
  WHERE clinic_id = p_clinic_id
    AND period_start_date = p_previous_period_start
    AND period_end_date = p_previous_period_end
  LIMIT 1;

  -- Return comparisons
  RETURN QUERY SELECT
    'Gross Revenue'::VARCHAR,
    COALESCE(v_curr_revenue, 0),
    COALESCE(v_prev_revenue, 0),
    COALESCE(v_curr_revenue, 0) - COALESCE(v_prev_revenue, 0),
    CASE WHEN COALESCE(v_prev_revenue, 0) != 0 
      THEN ((COALESCE(v_curr_revenue, 0) - COALESCE(v_prev_revenue, 0)) / COALESCE(v_prev_revenue, 0)) * 100
      ELSE 0 END,
    CASE WHEN COALESCE(v_curr_revenue, 0) > COALESCE(v_prev_revenue, 0) THEN 'UP'
         WHEN COALESCE(v_curr_revenue, 0) < COALESCE(v_prev_revenue, 0) THEN 'DOWN'
         ELSE 'FLAT' END
  UNION ALL
  SELECT
    'Operating Expenses'::VARCHAR,
    COALESCE(v_curr_expenses, 0),
    COALESCE(v_prev_expenses, 0),
    COALESCE(v_curr_expenses, 0) - COALESCE(v_prev_expenses, 0),
    CASE WHEN COALESCE(v_prev_expenses, 0) != 0 
      THEN ((COALESCE(v_curr_expenses, 0) - COALESCE(v_prev_expenses, 0)) / COALESCE(v_prev_expenses, 0)) * 100
      ELSE 0 END,
    CASE WHEN COALESCE(v_curr_expenses, 0) > COALESCE(v_prev_expenses, 0) THEN 'UP'
         WHEN COALESCE(v_curr_expenses, 0) < COALESCE(v_prev_expenses, 0) THEN 'DOWN'
         ELSE 'FLAT' END
  UNION ALL
  SELECT
    'Net Income'::VARCHAR,
    COALESCE(v_curr_income, 0),
    COALESCE(v_prev_income, 0),
    COALESCE(v_curr_income, 0) - COALESCE(v_prev_income, 0),
    CASE WHEN COALESCE(v_prev_income, 0) != 0 
      THEN ((COALESCE(v_curr_income, 0) - COALESCE(v_prev_income, 0)) / COALESCE(v_prev_income, 0)) * 100
      ELSE 0 END,
    CASE WHEN COALESCE(v_curr_income, 0) > COALESCE(v_prev_income, 0) THEN 'UP'
         WHEN COALESCE(v_curr_income, 0) < COALESCE(v_prev_income, 0) THEN 'DOWN'
         ELSE 'FLAT' END;
END;
$$ LANGUAGE plpgsql;

-- ============= TRIGGER: Auto-update DRE on Payment =============

DROP TRIGGER IF EXISTS trg_auto_update_dre_on_payment ON ar_payments;
CREATE TRIGGER trg_auto_update_dre_on_payment
AFTER INSERT OR UPDATE ON ar_payments
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_dre_on_payment();

-- ============= VIEW 1: Monthly DRE Summary =============

CREATE OR REPLACE VIEW vw_dre_monthly_summary AS
SELECT
  clinic_id,
  period_start_date as month,
  gross_revenue,
  net_revenue,
  total_operating_expenses,
  medical_commissions,
  operating_income,
  net_income,
  gross_margin_pct,
  operating_margin_pct,
  net_margin_pct
FROM dre_periods
WHERE period_type = 'monthly'
  AND is_locked = false
ORDER BY clinic_id, period_start_date DESC;

-- ============= VIEW 2: YTD Performance =============

CREATE OR REPLACE VIEW vw_dre_ytd_performance AS
SELECT
  clinic_id,
  DATE_TRUNC('year', period_start_date)::DATE as fiscal_year,
  SUM(gross_revenue) as ytd_revenue,
  SUM(total_operating_expenses) as ytd_expenses,
  SUM(medical_commissions) as ytd_commissions,
  SUM(net_income) as ytd_net_income,
  COUNT(*) as months_completed,
  ROUND(AVG(operating_margin_pct), 2) as avg_operating_margin,
  ROUND(AVG(net_margin_pct), 2) as avg_net_margin
FROM dre_periods
WHERE period_type = 'monthly'
GROUP BY clinic_id, DATE_TRUNC('year', period_start_date);

-- ============= VIEW 3: Revenue Breakdown =============

CREATE OR REPLACE VIEW vw_dre_revenue_breakdown AS
SELECT
  clinic_id,
  period_start_date,
  appointment_revenue,
  service_revenue,
  product_revenue,
  other_revenue,
  ROUND(
    CASE WHEN gross_revenue > 0 
      THEN (appointment_revenue / gross_revenue) * 100 
      ELSE 0 
    END, 2
  ) as appointment_pct,
  ROUND(
    CASE WHEN gross_revenue > 0 
      THEN (service_revenue / gross_revenue) * 100 
      ELSE 0 
    END, 2
  ) as service_pct,
  ROUND(
    CASE WHEN gross_revenue > 0 
      THEN (product_revenue / gross_revenue) * 100 
      ELSE 0 
    END, 2
  ) as product_pct
FROM dre_periods
WHERE period_type = 'monthly'
ORDER BY clinic_id, period_start_date DESC;

-- ============= VIEW 4: Expense Breakdown =============

CREATE OR REPLACE VIEW vw_dre_expense_breakdown AS
SELECT
  clinic_id,
  period_start_date,
  personnel_expenses,
  rent_expenses,
  utilities_expenses,
  supplies_expenses,
  maintenance_expenses,
  marketing_expenses,
  professional_fees,
  depreciation_expenses,
  total_operating_expenses,
  ROUND((personnel_expenses / NULLIF(total_operating_expenses, 0)) * 100, 2) as personnel_pct,
  ROUND((rent_expenses / NULLIF(total_operating_expenses, 0)) * 100, 2) as rent_pct,
  ROUND((supplies_expenses / NULLIF(total_operating_expenses, 0)) * 100, 2) as supplies_pct
FROM dre_periods
WHERE period_type = 'monthly'
ORDER BY clinic_id, period_start_date DESC;

-- ============= VIEW 5: Profitability Metrics =============

CREATE OR REPLACE VIEW vw_dre_profitability_metrics AS
SELECT
  clinic_id,
  period_start_date,
  gross_revenue,
  net_revenue,
  operating_income,
  net_income,
  medical_commissions,
  tax_withholdings,
  gross_margin_pct,
  operating_margin_pct,
  net_margin_pct,
  ROUND((medical_commissions / NULLIF(gross_revenue, 0)) * 100, 2) as commission_to_revenue_pct,
  ROUND((tax_withholdings / NULLIF(gross_revenue, 0)) * 100, 2) as tax_to_revenue_pct
FROM dre_periods
WHERE period_type = 'monthly'
ORDER BY clinic_id, period_start_date DESC;

-- ============= FINAL VALIDATION =============

SELECT COUNT(*) as tables_created FROM (
  SELECT 'dre_periods' UNION ALL
  SELECT 'dre_line_items' UNION ALL
  SELECT 'dre_projections'
) as t;

SELECT COUNT(*) as functions_created FROM pg_proc
WHERE proname IN (
  'fn_calculate_dre_period',
  'fn_auto_update_dre_on_payment',
  'fn_get_dre_comparison'
);

SELECT COUNT(*) as views_created FROM pg_views
WHERE viewname LIKE 'vw_dre_%';

COMMIT;
