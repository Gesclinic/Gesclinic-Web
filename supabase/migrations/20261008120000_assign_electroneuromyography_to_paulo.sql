-- Atribui exames de eletroneuromiografia ao Dr. Paulo, independentemente do solicitante.

CREATE OR REPLACE FUNCTION public.assign_electroneuromyography_repasse_professional()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_rule public.payer_report_repasse_rules%ROWTYPE;
BEGIN
  IF public.payer_report_normalized_name(NEW.procedure_name) NOT LIKE '%ELETRONEUROMIOGRAFIA%' THEN
    RETURN NEW;
  END IF;

  SELECT rule.* INTO v_rule
  FROM public.payer_report_repasse_rules rule
  JOIN public.professionals professional ON professional.id = rule.professional_id
  WHERE rule.clinic_id = NEW.clinic_id
    AND rule.source_key = NEW.source_key
    AND rule.active
    AND public.payer_report_normalized_name(professional.name) = 'PAULOEDUARDOMESTRINELLICARRILHO'
  ORDER BY rule.updated_at DESC
  LIMIT 1;

  IF v_rule.id IS NULL THEN
    RAISE EXCEPTION 'Regra de repasse do Dr. Paulo não encontrada para %', NEW.source_key;
  END IF;

  NEW.rule_id := v_rule.id;
  NEW.professional_id := v_rule.professional_id;
  NEW.professional_percentage := v_rule.professional_percentage;
  NEW.professional_amount := round(NEW.net_after_tax * v_rule.professional_percentage / 100, 2);
  NEW.clinic_amount := round(NEW.net_after_tax * v_rule.clinic_percentage / 100, 2);
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
    'professional_override', 'electroneuromyography_to_paulo'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_electroneuromyography_professional
  ON public.payer_report_repasse_items;
CREATE TRIGGER trg_assign_electroneuromyography_professional
BEFORE INSERT OR UPDATE OF procedure_name, professional_id
ON public.payer_report_repasse_items
FOR EACH ROW
EXECUTE FUNCTION public.assign_electroneuromyography_repasse_professional();

DO $$
DECLARE
  v_clinic_id constant uuid := 'dcee437c-fd14-463c-b25e-a318f5da60b7';
  v_import record;
  v_paulo_id uuid;
BEGIN
  SELECT id INTO v_paulo_id
  FROM public.professionals
  WHERE clinic_id = v_clinic_id
    AND public.payer_report_normalized_name(name) = 'PAULOEDUARDOMESTRINELLICARRILHO'
  ORDER BY active DESC, created_at
  LIMIT 1;

  IF v_paulo_id IS NULL THEN
    RAISE EXCEPTION 'Dr. Paulo não encontrado na clínica %', v_clinic_id;
  END IF;

  FOR v_import IN
    SELECT DISTINCT payment_import.id
    FROM public.payer_payment_imports payment_import
    JOIN public.payer_payment_import_lines line ON line.import_id = payment_import.id
    WHERE payment_import.clinic_id = v_clinic_id
      AND public.payer_report_normalized_name(COALESCE(
        line.raw_data#>>'{_repasse,procedure_name}',
        line.raw_data->>'NOME PROCEDIMENTO',
        line.procedure_code
      )) LIKE '%ELETRONEUROMIOGRAFIA%'
  LOOP
    PERFORM public.process_payer_report_repasse(v_clinic_id, v_import.id);
  END LOOP;

  UPDATE public.appointments appointment
  SET professional_id = v_paulo_id, updated_at = now()
  FROM public.payer_report_operational_links link
  JOIN public.payer_report_repasse_items item ON item.import_line_id = link.import_line_id
  WHERE appointment.id = link.appointment_id
    AND link.clinic_id = v_clinic_id
    AND item.professional_id = v_paulo_id
    AND public.payer_report_normalized_name(item.procedure_name) LIKE '%ELETRONEUROMIOGRAFIA%';

  UPDATE public.billing_guides guide
  SET professional_id = v_paulo_id,
      profissional = (SELECT name FROM public.professionals WHERE id = v_paulo_id),
      data_atualizacao = now()
  FROM public.payer_report_operational_links link
  JOIN public.payer_report_repasse_items item ON item.import_line_id = link.import_line_id
  WHERE guide.id = link.billing_guide_id
    AND link.clinic_id = v_clinic_id
    AND item.professional_id = v_paulo_id
    AND public.payer_report_normalized_name(item.procedure_name) LIKE '%ELETRONEUROMIOGRAFIA%';

  UPDATE public.billing_work_items work_item
  SET professional_id = v_paulo_id, updated_at = now()
  FROM public.payer_report_operational_links link
  JOIN public.payer_report_repasse_items item ON item.import_line_id = link.import_line_id
  WHERE work_item.id = link.billing_work_item_id
    AND link.clinic_id = v_clinic_id
    AND item.professional_id = v_paulo_id
    AND public.payer_report_normalized_name(item.procedure_name) LIKE '%ELETRONEUROMIOGRAFIA%';

  UPDATE public.ar_invoices invoice
  SET professional_id = v_paulo_id, updated_at = now()
  FROM public.payer_report_operational_links link
  JOIN public.payer_report_repasse_items item ON item.import_line_id = link.import_line_id
  WHERE invoice.id = link.invoice_id
    AND link.clinic_id = v_clinic_id
    AND item.professional_id = v_paulo_id
    AND public.payer_report_normalized_name(item.procedure_name) LIKE '%ELETRONEUROMIOGRAFIA%';

  UPDATE public.ap_bills payable
  SET supplier_id = calculation.professional_id,
      supplier_name = professional.name,
      vendor_name = professional.name,
      amount = calculation.net_repasse_amount,
      net_amount = calculation.net_repasse_amount,
      balance_amount = GREATEST(calculation.net_repasse_amount - COALESCE(payable.paid_value, 0), 0),
      updated_at = now()
  FROM public.medical_repasse_calculations calculation
  JOIN public.professionals professional ON professional.id = calculation.professional_id
  WHERE payable.id = calculation.ap_bill_id
    AND calculation.clinic_id = v_clinic_id
    AND calculation.metadata->>'source' = 'payer_report'
    AND lower(COALESCE(payable.status, '')) NOT IN ('paid', 'pago');
END $$;

COMMENT ON FUNCTION public.assign_electroneuromyography_repasse_professional() IS
  'Força exames de eletroneuromiografia para a produção e repasse do Dr. Paulo Eduardo Mestrinelli Carrilho.';
