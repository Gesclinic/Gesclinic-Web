-- Consolidate DRE revenue calculation on canonical receivable_payments
-- ar_payments is legacy/compatibility only; active DRE revenue must come from receivable_payments.

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
    SELECT COALESCE(SUM(rp.amount_paid), 0)
    INTO v_gross_revenue
    FROM receivable_payments rp
    WHERE rp.clinic_id = p_clinic_id
      AND rp.payment_date::DATE >= p_start_date
      AND rp.payment_date::DATE <= p_end_date
      AND COALESCE(rp.status, 'completed') IN ('completed', 'settled');

    v_net_revenue := v_gross_revenue;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_operating_expenses
    FROM ap_bills bi
    WHERE bi.clinic_id = p_clinic_id
      AND bi.due_date >= p_start_date
      AND bi.due_date <= p_end_date;

    SELECT COALESCE(SUM(commission_net), 0)
    INTO v_medical_commissions
    FROM medical_commission_ledger mcl
    WHERE mcl.clinic_id = p_clinic_id
      AND DATE(mcl.created_at) >= p_start_date
      AND DATE(mcl.created_at) <= p_end_date;

    v_operating_income := v_net_revenue - v_total_operating_expenses - v_medical_commissions;
    v_net_income := v_operating_income;

    IF v_gross_revenue > 0 THEN
      v_gross_margin_pct := 100;
      v_operating_margin_pct := (v_operating_income / v_gross_revenue) * 100;
      v_net_margin_pct := (v_net_income / v_gross_revenue) * 100;
    END IF;

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
      NULL::UUID, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL,
      0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, false, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_auto_update_dre_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
  v_period_month DATE;
BEGIN
  v_period_month := DATE_TRUNC('month', COALESCE(NEW.payment_date::DATE, CURRENT_DATE))::DATE;

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

DO $$
BEGIN
  IF to_regclass('public.ar_payments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_auto_update_dre_on_payment ON ar_payments;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_auto_update_dre_on_payment ON receivable_payments;
CREATE TRIGGER trg_auto_update_dre_on_payment
AFTER INSERT OR UPDATE ON receivable_payments
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_dre_on_payment();
