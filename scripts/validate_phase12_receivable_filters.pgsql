DO $$
DECLARE
  v_invoice_id uuid := '12f6b19d-bda7-45de-8896-5d7302f5a012';
BEGIN
  DELETE FROM public.ar_invoices WHERE id = v_invoice_id;

  INSERT INTO public.ar_invoices (
    id,
    clinic_id,
    professional_id,
    payer_id,
    payer_type,
    patient_name,
    description,
    amount,
    service_value,
    gross_amount,
    net_value,
    invoice_date,
    due_date,
    competency_date,
    status,
    payment_method,
    unit_name,
    specialty_name,
    glosa_value,
    insurance_billing_status,
    tiss_xml_status,
    insurance_return_status,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_invoice_id,
    'dcee437c-fd14-463c-b25e-a318f5da60b7',
    '82f334fb-8c4d-48b2-990b-53c5b6f7db83',
    '7f86e1d2-cf0b-450f-abb2-35af77a56f5b',
    'CONVENIO',
    'VALIDACAO FASE 12 PACIENTE',
    'Validacao Fase 12 Filtros Enterprise',
    780.00,
    780.00,
    800.00,
    780.00,
    '2099-12-10',
    '2099-12-20',
    '2099-12-10',
    'open',
    'pix',
    'Unidade Validacao F12',
    'Especialidade Validacao F12',
    35.00,
    'FATURADO',
    'GERADO',
    'GLOSADO',
    jsonb_build_object('source', 'validacao_fase12_filters'),
    now(),
    now()
  );
END $$;

CREATE TEMP TABLE phase12_filter_validation_result AS
SELECT
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012' AND payer_id = '7f86e1d2-cf0b-450f-abb2-35af77a56f5b') AS payer_filter,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012' AND payer_type ILIKE 'CONVENIO') AS payer_type_filter,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012' AND unit_name ILIKE '%Validacao F12%') AS unit_filter,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012' AND specialty_name ILIKE '%Validacao F12%') AS specialty_filter,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012' AND insurance_billing_status = 'FATURADO') AS insurance_status_filter,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012' AND tiss_xml_status = 'GERADO') AS tiss_status_filter,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012' AND insurance_return_status = 'GLOSADO') AS return_status_filter,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012' AND payment_method = 'pix' AND glosa_value > 0 AND net_value BETWEEN 700 AND 800) AS finance_filter;

DELETE FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012';

SELECT
  to_jsonb(v) AS validation_counts,
  (SELECT count(*) FROM public.ar_invoices WHERE id = '12f6b19d-bda7-45de-8896-5d7302f5a012') AS invoices_remaining
FROM phase12_filter_validation_result v;