-- ============================================================================
-- FIX: Remover duplicatas de create_receivable_from_appointment e recriar
-- ============================================================================
-- Problema: A função foi criada múltiplas vezes, causando erro "not unique"
-- Solução: Remover todas e recriar com assinatura clara

-- 1. Remover todas as versões da função
DROP FUNCTION IF EXISTS public.create_receivable_from_appointment(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_receivable_from_appointment(UUID, UUID, BIGINT) CASCADE;

-- 2. Recriar a função com os 3 parâmetros (terceiro com DEFAULT)
CREATE OR REPLACE FUNCTION public.create_receivable_from_appointment(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_rule_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_appointment RECORD;
  v_payer_record RECORD;
  v_gross NUMERIC := 0;
  v_taxes NUMERIC := 0;
  v_net NUMERIC := 0;
  v_receivable_id BIGINT;
  v_payer_id UUID;
  v_payer_name TEXT := '';
  v_payer_type TEXT := 'patient';
BEGIN
  -- 1. Validar appointment
  SELECT * INTO v_appointment 
  FROM appointments 
  WHERE id = p_appointment_id AND clinic_id = p_clinic_id 
  LIMIT 1;
  
  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Appointment not found'
    );
  END IF;
  
  -- 2. Buscar dados do pagador
  IF v_appointment.payer_id IS NOT NULL THEN
    v_payer_id := v_appointment.payer_id;
    SELECT name INTO v_payer_name FROM payers WHERE id = v_payer_id LIMIT 1;
    v_payer_type := 'payer';
  ELSIF v_appointment.patient_id IS NOT NULL THEN
    v_payer_id := v_appointment.patient_id;
    SELECT name INTO v_payer_name FROM patients WHERE id = v_payer_id LIMIT 1;
    v_payer_type := 'patient';
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No payer or patient found'
    );
  END IF;
  
  -- 3. Calcular valores
  SELECT 
    COALESCE(SUM((quantity::NUMERIC) * (unit_price::NUMERIC)), 0) 
  INTO v_gross
  FROM appointment_services 
  WHERE appointment_id = p_appointment_id;
  
  -- Se não há serviços, usar valor padrão de 100
  IF v_gross = 0 THEN
    v_gross := 100;
  END IF;
  
  -- 4. Calcular impostos (ISSQN 5% + outros)
  v_taxes := v_gross * 0.05; -- ISSQN padrão 5%
  v_net := v_gross - v_taxes;
  
  -- 5. Criar receivable (ar_invoice)
  INSERT INTO ar_invoices (
    clinic_id,
    appointment_id,
    payer_id,
    payer_name,
    payer_type,
    amount,
    total_impostos,
    net_value,
    status,
    invoice_date,
    due_date,
    description,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    p_appointment_id,
    v_payer_id,
    COALESCE(v_payer_name, 'Unknown'),
    v_payer_type,
    v_gross,
    v_taxes,
    v_net,
    'pending',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'Faturamento de atendimento #' || p_appointment_id::TEXT,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_receivable_id;
  
  -- 6. Criar entrada de auditoria
  INSERT INTO financial_audit_logs (
    clinic_id,
    appointment_id,
    receivable_id,
    event_type,
    description,
    amount,
    created_at
  ) VALUES (
    p_clinic_id,
    p_appointment_id,
    v_receivable_id,
    'receivable_created',
    'Receivable created from appointment finalization',
    v_gross,
    CURRENT_TIMESTAMP
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Receivable created successfully',
    'receivable_id', v_receivable_id,
    'gross_amount', v_gross,
    'taxes', v_taxes,
    'net_amount', v_net,
    'payer_name', v_payer_name
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', 'Error creating receivable'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Garantir que o trigger usa a assinatura correta
-- Verificar se o trigger existe e está correto
DROP TRIGGER IF EXISTS on_appointment_completed ON appointments;

CREATE TRIGGER on_appointment_completed
AFTER UPDATE ON appointments
FOR EACH ROW
WHEN (OLD.status = 'scheduled' AND NEW.status = 'completed')
EXECUTE FUNCTION on_appointment_finalized();

-- 4. Verificação final
SELECT 
  routine_schema, 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_name = 'create_receivable_from_appointment' 
ORDER BY routine_schema;
