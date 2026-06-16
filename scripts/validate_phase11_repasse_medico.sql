DO $$
DECLARE
  v_clinic_id uuid := 'dcee437c-fd14-463c-b25e-a318f5da60b7';
  v_professional_id uuid := '82f334fb-8c4d-48b2-990b-53c5b6f7db83';
  v_invoice_id uuid := '11a6f1c9-7f74-4545-b4dc-6f94810c2c11';
BEGIN
  DELETE FROM public.doctor_commissions
  WHERE clinic_id = v_clinic_id
    AND professional_id = v_professional_id
    AND reference_month = 11
    AND reference_year = 2099
    AND calc_mode IN ('atendido', 'recebido');

  DELETE FROM public.ar_invoices WHERE id = v_invoice_id;

  INSERT INTO public.ar_invoices (
    id,
    clinic_id,
    professional_id,
    patient_name,
    description,
    amount,
    service_value,
    gross_amount,
    net_value,
    received_value,
    paid_total,
    invoice_date,
    due_date,
    competency_date,
    status,
    repasse_expected,
    repasse_model,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_invoice_id,
    v_clinic_id,
    v_professional_id,
    'VALIDACAO FASE 11 PACIENTE',
    'Validacao Fase 11 Repasse Medico',
    460.00,
    460.00,
    480.00,
    460.00,
    230.00,
    230.00,
    '2099-11-15',
    '2099-11-15',
    '2099-11-15',
    'partial',
    139.00,
    'appointment_services',
    jsonb_build_object('source', 'validacao_fase11_repasse_medico'),
    now(),
    now()
  );
END $$;

CREATE TEMP TABLE phase11_repasse_validation_result (
  calc_mode text,
  total_services integer,
  gross_amount numeric,
  total_paid numeric,
  total_pending numeric,
  net_amount numeric,
  commission_percent numeric,
  status text
);

SELECT * FROM public.generate_doctor_commissions_v2(
  'dcee437c-fd14-463c-b25e-a318f5da60b7',
  11,
  2099,
  'atendido'
);

INSERT INTO phase11_repasse_validation_result
SELECT
  'atendido',
  total_services,
  gross_amount,
  total_paid,
  total_pending,
  net_amount,
  commission_percent,
  status
FROM public.doctor_commissions
WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
  AND professional_id = '82f334fb-8c4d-48b2-990b-53c5b6f7db83'
  AND reference_month = 11
  AND reference_year = 2099
  AND calc_mode = 'atendido';

SELECT * FROM public.generate_doctor_commissions_v2(
  'dcee437c-fd14-463c-b25e-a318f5da60b7',
  11,
  2099,
  'recebido'
);

INSERT INTO phase11_repasse_validation_result
SELECT
  'recebido',
  total_services,
  gross_amount,
  total_paid,
  total_pending,
  net_amount,
  commission_percent,
  status
FROM public.doctor_commissions
WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
  AND professional_id = '82f334fb-8c4d-48b2-990b-53c5b6f7db83'
  AND reference_month = 11
  AND reference_year = 2099
  AND calc_mode = 'recebido';

DELETE FROM public.doctor_commissions
WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
  AND professional_id = '82f334fb-8c4d-48b2-990b-53c5b6f7db83'
  AND reference_month = 11
  AND reference_year = 2099
  AND calc_mode IN ('atendido', 'recebido');

DELETE FROM public.ar_invoices WHERE id = '11a6f1c9-7f74-4545-b4dc-6f94810c2c11';

SELECT
  jsonb_agg(to_jsonb(v) ORDER BY v.calc_mode) AS validation_rows,
  (SELECT count(*) FROM public.doctor_commissions WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7' AND professional_id = '82f334fb-8c4d-48b2-990b-53c5b6f7db83' AND reference_month = 11 AND reference_year = 2099) AS commissions_remaining,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '11a6f1c9-7f74-4545-b4dc-6f94810c2c11') AS invoices_remaining
FROM phase11_repasse_validation_result v;