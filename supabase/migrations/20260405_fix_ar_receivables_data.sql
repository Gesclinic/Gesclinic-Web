-- ============================================================================
-- CORREÇÃO: Atualizar registros de AR com valores e pagador faltando
-- Quando o registro foi criado com R$ 0.00 ou Pagador vazio
-- ============================================================================

-- Função para corrigir um registro de AR
CREATE OR REPLACE FUNCTION fix_ar_receivable_data(
  p_ar_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ar RECORD;
  v_appointment RECORD;
  v_patient RECORD;
  v_service RECORD;
  v_final_value DECIMAL;
  v_payer_name TEXT;
BEGIN
  -- 1️⃣ Obter dados do AR
  SELECT id, appointment_id, paciente_id, valor_bruto, payer_name
  INTO v_ar
  FROM ar_receivables
  WHERE id = p_ar_id
  LIMIT 1;

  IF v_ar IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registro de AR não encontrado'
    );
  END IF;

  -- 2️⃣ Obter dados do appointment
  SELECT id, patient_id, service_id, value
  INTO v_appointment
  FROM appointments
  WHERE id = v_ar.appointment_id
  LIMIT 1;

  IF v_appointment IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Agendamento não encontrado'
    );
  END IF;

  -- 3️⃣ Obter dados do paciente para nome e email
  SELECT name, email, cpf, phone
  INTO v_patient
  FROM patients
  WHERE id = v_ar.paciente_id
  LIMIT 1;

  -- 4️⃣ Determinar o valor final (prioridade: appointment > serviço)
  v_final_value := COALESCE(NULLIF(v_appointment.value, 0), 0);
  
  IF v_final_value = 0 AND v_appointment.service_id IS NOT NULL THEN
    SELECT price INTO v_final_value
    FROM services
    WHERE id = v_appointment.service_id
    LIMIT 1;
  END IF;

  -- Se ainda for 0, retornar erro
  IF v_final_value = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Não foi possível determinar o valor (appointment e serviço com preço 0)'
    );
  END IF;

  -- 5️⃣ Montar nome do pagador
  v_payer_name := COALESCE(v_patient.name, 'Paciente Particular');

  -- 6️⃣ Atualizar o registro
  UPDATE ar_receivables
  SET
    payer_name = v_payer_name,
    valor_bruto = v_final_value,
    updated_at = NOW()
  WHERE id = p_ar_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Registro atualizado com sucesso',
    'ar_id', p_ar_id,
    'payer_name', v_payer_name,
    'new_value', v_final_value,
    'old_value', v_ar.valor_bruto
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- ============================================================================
-- Executar correção em todos os registros com valor = 0
-- ============================================================================

DO $$ 
DECLARE
  v_ar_record RECORD;
  v_result JSON;
  v_count INT := 0;
BEGIN
  -- Iterar sobre todos os registros com valor_bruto = 0
  FOR v_ar_record IN 
    SELECT id FROM ar_receivables WHERE valor_bruto = 0 ORDER BY created_at DESC
  LOOP
    v_result := fix_ar_receivable_data(v_ar_record.id);
    
    IF (v_result->>'success')::BOOLEAN THEN
      v_count := v_count + 1;
      RAISE NOTICE 'Corrigido AR %: % → R$ %', 
        v_ar_record.id,
        v_result->>'payer_name',
        v_result->>'new_value';
    ELSE
      RAISE WARNING 'Erro ao corrigir AR %: %', 
        v_ar_record.id,
        v_result->>'message';
    END IF;
  END LOOP;

  RAISE NOTICE 'Total de registros corrigidos: %', v_count;
END $$;

-- ============================================================================
-- Comentários
-- ============================================================================
COMMENT ON FUNCTION fix_ar_receivable_data IS 'Corrige um registro de AR preenchendo valor e pagador com dados do appointment/serviço/paciente';
