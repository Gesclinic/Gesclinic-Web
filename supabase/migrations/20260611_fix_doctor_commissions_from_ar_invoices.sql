CREATE OR REPLACE FUNCTION public.generate_doctor_commissions_v2(
  p_clinic_id uuid,
  p_month integer,
  p_year integer,
  p_mode character varying DEFAULT 'atendido'::character varying
)
RETURNS TABLE(success boolean, message text, records_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_records_created integer := 0;
BEGIN
  v_start_date := (p_year || '-' || lpad(p_month::text, 2, '0') || '-01')::date;
  v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;

  WITH invoice_rows AS (
    SELECT
      ai.clinic_id,
      ai.professional_id,
      ai.appointment_id,
      greatest(
        COALESCE(ai.net_value, ai.amount, ai.gross_amount, 0),
        0
      ) AS base_amount,
      greatest(
        COALESCE(ai.gross_amount, ai.net_value, ai.amount, 0),
        0
      ) AS gross_amount,
      greatest(
        COALESCE(
          ai.paid_total,
          ai.received_value,
          CASE
            WHEN lower(COALESCE(ai.status, '')) IN ('received', 'paid', 'settled', 'recebido', 'pago')
              THEN COALESCE(ai.net_value, ai.amount, ai.gross_amount, 0)
            ELSE 0
          END,
          0
        ),
        0
      ) AS paid_amount,
      greatest(COALESCE(ai.repasse_expected, 0), 0) AS repasse_expected
    FROM public.ar_invoices ai
    WHERE ai.clinic_id = p_clinic_id
      AND ai.professional_id IS NOT NULL
      AND COALESCE(ai.competency_date, ai.invoice_date, ai.due_date) >= v_start_date
      AND COALESCE(ai.competency_date, ai.invoice_date, ai.due_date) <= v_end_date
      AND lower(COALESCE(ai.status, '')) NOT IN ('canceled', 'cancelled', 'cancelado', 'reversed', 'estornado')
      AND COALESCE(ai.net_value, ai.amount, ai.gross_amount, 0) > 0
  ),
  invoice_totals AS (
    SELECT
      clinic_id,
      professional_id,
      COUNT(DISTINCT COALESCE(appointment_id, gen_random_uuid()))::integer AS total_services,
      SUM(gross_amount) AS gross_amount,
      SUM(paid_amount) AS total_paid,
      SUM(greatest(base_amount - paid_amount, 0)) AS total_pending,
      SUM(
        CASE
          WHEN repasse_expected > 0 AND lower(COALESCE(p_mode, 'atendido')) = 'recebido' AND base_amount > 0
            THEN repasse_expected * LEAST(paid_amount / base_amount, 1)
          WHEN repasse_expected > 0 THEN repasse_expected
          WHEN lower(COALESCE(p_mode, 'atendido')) = 'recebido' THEN paid_amount * 0.70
          ELSE base_amount * 0.70
        END
      ) AS net_amount
    FROM invoice_rows
    GROUP BY clinic_id, professional_id
  ),
  appointment_totals AS (
    SELECT
      a.clinic_id,
      a.professional_id,
      COUNT(*)::integer AS total_services,
      SUM(a.value) AS gross_amount,
      SUM(CASE WHEN lower(COALESCE(a.payment_status, '')) IN ('paid', 'received', 'settled', 'pago', 'recebido') THEN a.value ELSE 0 END) AS total_paid,
      SUM(CASE WHEN lower(COALESCE(a.payment_status, '')) IN ('paid', 'received', 'settled', 'pago', 'recebido') THEN 0 ELSE a.value END) AS total_pending,
      SUM(CASE WHEN lower(COALESCE(p_mode, 'atendido')) = 'recebido' AND lower(COALESCE(a.payment_status, '')) IN ('paid', 'received', 'settled', 'pago', 'recebido') THEN a.value * 0.70 WHEN lower(COALESCE(p_mode, 'atendido')) = 'recebido' THEN 0 ELSE a.value * 0.70 END) AS net_amount
    FROM public.appointments a
    WHERE a.clinic_id = p_clinic_id
      AND a.professional_id IS NOT NULL
      AND a.scheduled_date >= v_start_date
      AND a.scheduled_date <= v_end_date
      AND COALESCE(a.value, 0) > 0
      AND lower(COALESCE(a.status, '')) NOT IN ('canceled', 'cancelled', 'cancelado')
      AND NOT EXISTS (
        SELECT 1
        FROM invoice_totals it
        WHERE it.professional_id = a.professional_id
      )
    GROUP BY a.clinic_id, a.professional_id
  ),
  source_totals AS (
    SELECT * FROM invoice_totals
    UNION ALL
    SELECT * FROM appointment_totals
  ),
  upserted AS (
    INSERT INTO public.doctor_commissions (
      clinic_id,
      professional_id,
      reference_month,
      reference_year,
      calc_mode,
      total_services,
      gross_amount,
      total_paid,
      total_pending,
      net_amount,
      commission_percent,
      status,
      updated_at
    )
    SELECT
      st.clinic_id,
      st.professional_id,
      p_month,
      p_year,
      COALESCE(p_mode, 'atendido'),
      st.total_services,
      COALESCE(st.gross_amount, 0),
      COALESCE(st.total_paid, 0),
      COALESCE(st.total_pending, 0),
      COALESCE(st.net_amount, 0),
      CASE
        WHEN COALESCE(st.gross_amount, 0) > 0 THEN ROUND((COALESCE(st.net_amount, 0) / st.gross_amount) * 100, 2)
        ELSE 70
      END,
      'pending',
      now()
    FROM source_totals st
    WHERE COALESCE(st.gross_amount, 0) > 0
    ON CONFLICT (clinic_id, professional_id, reference_month, reference_year, calc_mode)
    DO UPDATE SET
      total_services = EXCLUDED.total_services,
      gross_amount = EXCLUDED.gross_amount,
      total_paid = EXCLUDED.total_paid,
      total_pending = EXCLUDED.total_pending,
      net_amount = EXCLUDED.net_amount,
      commission_percent = EXCLUDED.commission_percent,
      status = CASE WHEN public.doctor_commissions.status = 'paid' THEN public.doctor_commissions.status ELSE EXCLUDED.status END,
      updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_records_created FROM upserted;

  RETURN QUERY SELECT
    true,
    'Comissões geradas para ' || v_records_created || ' profissional(is) em ' || lpad(p_month::text, 2, '0') || '/' || p_year,
    v_records_created;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM, 0;
END;
$$;