DO $$
DECLARE
  v_clinic_id uuid;
  v_invoice_id uuid;
  v_payment_count integer;
  v_glosa_count integer;
  v_cleanup_invoice_count integer;
BEGIN
  SELECT id INTO v_clinic_id
  FROM public.clinics
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma clinica encontrada para validacao';
  END IF;

  INSERT INTO public.ar_invoices (
    clinic_id,
    patient_name,
    description,
    amount,
    received_value,
    due_date,
    status,
    payment_method,
    enterprise_status,
    gross_amount,
    paid_total,
    balance_amount,
    glosa_value,
    payment_split,
    metadata
  ) VALUES (
    v_clinic_id,
    'VALIDACAO AUTOMATICA CONTAS RECEBER',
    'Teste enterprise removido automaticamente',
    250.00,
    0.00,
    current_date + 10,
    'open',
    'pix',
    'PENDENTE',
    250.00,
    0.00,
    250.00,
    0.00,
    '[]'::jsonb,
    jsonb_build_object('validation', true, 'source', 'copilot_auto_validation')
  )
  RETURNING id INTO v_invoice_id;

  IF v_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Falha ao criar ar_invoices de validacao';
  END IF;

  INSERT INTO public.receivable_payments (
    clinic_id,
    ar_invoice_id,
    amount_paid,
    payment_method,
    payment_method_text,
    payment_reference,
    status,
    notes,
    metadata
  ) VALUES (
    v_clinic_id,
    v_invoice_id,
    100.00,
    'pix'::receivable_payment_method,
    'pix',
    'AUTO-VALIDATION',
    'completed',
    'Teste automatico removido automaticamente',
    jsonb_build_object('validation', true)
  );

  INSERT INTO public.receivable_glosas (
    clinic_id,
    ar_invoice_id,
    sent_amount,
    paid_amount,
    glosa_amount,
    reason,
    glosa_type,
    contestation_status,
    responsible,
    metadata
  ) VALUES (
    v_clinic_id,
    v_invoice_id,
    250.00,
    100.00,
    25.00,
    'Teste automatico removido automaticamente',
    'administrativa',
    'pendente',
    'Copilot validation',
    jsonb_build_object('validation', true)
  );

  SELECT count(*) INTO v_payment_count
  FROM public.receivable_payments
  WHERE ar_invoice_id = v_invoice_id;

  SELECT count(*) INTO v_glosa_count
  FROM public.receivable_glosas
  WHERE ar_invoice_id = v_invoice_id;

  IF v_payment_count <> 1 THEN
    RAISE EXCEPTION 'Falha na validacao de receivable_payments: %', v_payment_count;
  END IF;

  IF v_glosa_count <> 1 THEN
    RAISE EXCEPTION 'Falha na validacao de receivable_glosas: %', v_glosa_count;
  END IF;

  DELETE FROM public.receivable_glosas WHERE ar_invoice_id = v_invoice_id;
  DELETE FROM public.receivable_payments WHERE ar_invoice_id = v_invoice_id;
  DELETE FROM public.ar_invoices WHERE id = v_invoice_id;

  SELECT count(*) INTO v_cleanup_invoice_count
  FROM public.ar_invoices
  WHERE id = v_invoice_id;

  IF v_cleanup_invoice_count <> 0 THEN
    RAISE EXCEPTION 'Falha ao remover ar_invoices de validacao';
  END IF;

  RAISE NOTICE 'Validacao enterprise de Contas a Receber concluida: invoice %, pagamento ok, glosa ok, cleanup ok', v_invoice_id;
END $$;
