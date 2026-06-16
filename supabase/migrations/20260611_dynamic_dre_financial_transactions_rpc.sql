-- Dynamic DRE RPCs backed by the current financial_transactions schema.
-- Keeps the existing UI contract used by dynamicDREApi.ts.

CREATE OR REPLACE FUNCTION public.calculate_dre_for_period(
  p_clinic_id uuid,
  p_start_date date,
  p_end_date date,
  p_competence_type text DEFAULT 'accrual'
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross_revenue numeric := 0;
  v_revenue_deductions numeric := 0;
  v_cogs numeric := 0;
  v_admin_expense numeric := 0;
  v_clinic_expense numeric := 0;
  v_commercial_expense numeric := 0;
  v_financial_expense numeric := 0;
  v_tax_expense numeric := 0;
  v_net_revenue numeric := 0;
  v_gross_profit numeric := 0;
  v_total_expense numeric := 0;
  v_ebitda numeric := 0;
  v_net_income numeric := 0;
  v_gross_profit_margin numeric := 0;
  v_ebitda_margin numeric := 0;
  v_net_margin numeric := 0;
BEGIN
  WITH dre_transactions AS (
    SELECT
      ft.type::text AS type,
      ft.category::text AS category,
      ft.transaction_type::text AS transaction_type,
      ft.amount,
      COALESCE(ft.competency_date, ft.transaction_date, ft.due_date, ft.created_at::date) AS accrual_date,
      COALESCE(ft.transaction_date, ft.competency_date, ft.due_date, ft.created_at::date) AS cash_date,
      ft.status::text AS status
    FROM public.financial_transactions ft
    WHERE ft.clinic_id = p_clinic_id
      AND ft.status::text <> 'canceled'
      AND (
        (
          COALESCE(p_competence_type, 'accrual') = 'cash'
          AND ft.status::text IN ('processed', 'paid')
          AND COALESCE(ft.transaction_date, ft.competency_date, ft.due_date, ft.created_at::date) BETWEEN p_start_date AND p_end_date
        )
        OR
        (
          COALESCE(p_competence_type, 'accrual') <> 'cash'
          AND ft.status::text IN ('pending', 'scheduled', 'processed', 'paid')
          AND COALESCE(ft.competency_date, ft.transaction_date, ft.due_date, ft.created_at::date) BETWEEN p_start_date AND p_end_date
        )
      )
  )
  SELECT
    COALESCE(SUM(CASE WHEN type = 'revenue' OR transaction_type IN ('INCOME', 'FEE') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'deduction' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'cost' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' AND category = 'payroll' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' AND category IN ('rent', 'utilities', 'maintenance', 'materials', 'equipment', 'software') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' AND category IN ('marketing', 'commission') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' AND category NOT IN ('payroll', 'rent', 'utilities', 'maintenance', 'materials', 'equipment', 'software', 'marketing', 'commission', 'tax') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' AND category = 'tax' THEN amount ELSE 0 END), 0)
  INTO
    v_gross_revenue,
    v_revenue_deductions,
    v_cogs,
    v_admin_expense,
    v_clinic_expense,
    v_commercial_expense,
    v_financial_expense,
    v_tax_expense
  FROM dre_transactions;

  v_net_revenue := v_gross_revenue - v_revenue_deductions;
  v_gross_profit := v_net_revenue - v_cogs;
  v_total_expense := v_admin_expense + v_clinic_expense + v_commercial_expense + v_financial_expense;
  v_ebitda := v_gross_profit - v_total_expense;
  v_net_income := v_ebitda - v_tax_expense;

  v_gross_profit_margin := CASE WHEN v_net_revenue > 0 THEN ROUND((v_gross_profit / v_net_revenue * 100)::numeric, 2) ELSE 0 END;
  v_ebitda_margin := CASE WHEN v_net_revenue > 0 THEN ROUND((v_ebitda / v_net_revenue * 100)::numeric, 2) ELSE 0 END;
  v_net_margin := CASE WHEN v_net_revenue > 0 THEN ROUND((v_net_income / v_net_revenue * 100)::numeric, 2) ELSE 0 END;

  RETURN jsonb_build_object(
    'period_start', p_start_date,
    'period_end', p_end_date,
    'competence_type', COALESCE(p_competence_type, 'accrual'),
    'revenue', jsonb_build_object(
      'gross_revenue', v_gross_revenue,
      'revenue_deductions', v_revenue_deductions,
      'net_revenue', v_net_revenue
    ),
    'costs_and_profit', jsonb_build_object(
      'cogs', v_cogs,
      'gross_profit', v_gross_profit,
      'gross_profit_margin', v_gross_profit_margin
    ),
    'expenses', jsonb_build_object(
      'admin_expense', v_admin_expense,
      'clinic_expense', v_clinic_expense,
      'commercial_expense', v_commercial_expense,
      'financial_expense', v_financial_expense,
      'total_operating_expense', v_total_expense
    ),
    'result', jsonb_build_object(
      'ebitda', v_ebitda,
      'ebitda_margin', v_ebitda_margin,
      'tax_expense', v_tax_expense,
      'net_income', v_net_income,
      'net_margin', v_net_margin
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.compare_dre_periods(
  p_clinic_id uuid,
  p_period1_start date,
  p_period1_end date,
  p_period2_start date,
  p_period2_end date
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dre1 jsonb;
  v_dre2 jsonb;
  v_revenue1 numeric;
  v_revenue2 numeric;
  v_income1 numeric;
  v_income2 numeric;
BEGIN
  v_dre1 := public.calculate_dre_for_period(p_clinic_id, p_period1_start, p_period1_end, 'accrual');
  v_dre2 := public.calculate_dre_for_period(p_clinic_id, p_period2_start, p_period2_end, 'accrual');

  v_revenue1 := COALESCE((v_dre1->'revenue'->>'net_revenue')::numeric, 0);
  v_revenue2 := COALESCE((v_dre2->'revenue'->>'net_revenue')::numeric, 0);
  v_income1 := COALESCE((v_dre1->'result'->>'net_income')::numeric, 0);
  v_income2 := COALESCE((v_dre2->'result'->>'net_income')::numeric, 0);

  RETURN jsonb_build_object(
    'period_1', jsonb_build_object('start', p_period1_start, 'end', p_period1_end, 'dre', v_dre1),
    'period_2', jsonb_build_object('start', p_period2_start, 'end', p_period2_end, 'dre', v_dre2),
    'revenue', jsonb_build_object(
      'net_revenue_var', v_revenue2 - v_revenue1,
      'net_revenue_var_pct', CASE WHEN v_revenue1 <> 0 THEN ROUND(((v_revenue2 - v_revenue1) / ABS(v_revenue1) * 100)::numeric, 2) ELSE 0 END
    ),
    'profit', jsonb_build_object(
      'net_income_var', v_income2 - v_income1,
      'net_income_var_pct', CASE WHEN v_income1 <> 0 THEN ROUND(((v_income2 - v_income1) / ABS(v_income1) * 100)::numeric, 2) ELSE 0 END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_dre_for_period(uuid, date, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compare_dre_periods(uuid, date, date, date, date) TO authenticated, service_role;