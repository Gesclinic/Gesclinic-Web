-- =============================================================================
-- ETAPA 5: DRE DINÂMICA - FUNCTIONS, VIEWS, TRIGGERS & RLS
-- =============================================================================

-- ============= RLS POLICIES for dre_periods =============

ALTER TABLE dre_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinic_users_can_view_dre_periods ON dre_periods;
CREATE POLICY clinic_users_can_view_dre_periods ON dre_periods
FOR SELECT
USING (
  clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS clinic_admin_can_insert_dre_periods ON dre_periods;
CREATE POLICY clinic_admin_can_insert_dre_periods ON dre_periods
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'director', 'accountant')
  )
);

DROP POLICY IF EXISTS clinic_admin_can_update_dre_periods ON dre_periods;
CREATE POLICY clinic_admin_can_update_dre_periods ON dre_periods
FOR UPDATE
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
  v_gross_revenue DECIMAL := 0;
  v_net_revenue DECIMAL := 0;
  v_total_operating_expenses DECIMAL := 0;
  v_medical_commissions DECIMAL := 0;
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

    v_net_revenue := v_gross_revenue;

    -- 2. Aggregate operating expenses from ap_bills
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_operating_expenses
    FROM ap_bills bi
    WHERE bi.clinic_id = p_clinic_id
      AND bi.due_date >= p_start_date
      AND bi.due_date <= p_end_date;

    -- 3. Aggregate medical commissions
    SELECT COALESCE(SUM(commission_net), 0)
    INTO v_medical_commissions
    FROM medical_commission_ledger mcl
    WHERE mcl.clinic_id = p_clinic_id
      AND DATE(mcl.created_at) >= p_start_date
      AND DATE(mcl.created_at) <= p_end_date;

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
      gross_revenue, net_revenue, total_operating_expenses,
      medical_commissions, operating_income, net_income,
      gross_margin_pct, operating_margin_pct, net_margin_pct
    ) VALUES (
      p_clinic_id, p_period_type, p_start_date, p_end_date,
      v_gross_revenue, v_net_revenue, v_total_operating_expenses,
      v_medical_commissions, v_operating_income, v_net_income,
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
      NULL::UUID, 0, 0, 0, 0, 0, 0, 0, 0, 0, false, v_error_msg;
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
  v_period_month := DATE_TRUNC('month', NEW.payment_date)::DATE;

  SELECT INTO v_result *
  FROM fn_calculate_dre_period(
    NEW.clinic_id, 'monthly',
    v_period_month,
    (v_period_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============= TRIGGER: Auto-update DRE =============

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

-- ============= VIEW 3: Profitability Metrics =============

CREATE OR REPLACE VIEW vw_dre_profitability_metrics AS
SELECT
  clinic_id,
  period_start_date,
  gross_revenue,
  net_revenue,
  operating_income,
  net_income,
  medical_commissions,
  gross_margin_pct,
  operating_margin_pct,
  net_margin_pct,
  ROUND((medical_commissions / NULLIF(gross_revenue, 0)) * 100, 2) as commission_to_revenue_pct
FROM dre_periods
WHERE period_type = 'monthly'
ORDER BY clinic_id, period_start_date DESC;

-- ============= FINAL VALIDATION =============

SELECT COUNT(*) as functions_created FROM pg_proc
WHERE proname IN ('fn_calculate_dre_period', 'fn_auto_update_dre_on_payment');

SELECT COUNT(*) as views_created FROM pg_views
WHERE viewname LIKE 'vw_dre_%';

COMMIT;
