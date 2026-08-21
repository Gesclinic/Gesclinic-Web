-- ============================================================================
-- Consolidated from 20260405_appointment_financial_integration.sql
-- ============================================================================

-- ============================================================================
-- APPOINTMENT TO FINANCIAL INTEGRATION
-- Quando um atendimento ├® finalizado, gera automaticamente:
-- 1. Medical Production (produ├º├úo m├®dica)
-- 2. Medical Repasse (c├ílculo de repasse)
-- 3. Financial Transactions (fluxo de caixa)
-- ============================================================================

-- ­ƒöº Limpar fun├º├Áes antigas se existirem (para evitar conflito de assinatura)
DROP FUNCTION IF EXISTS finalize_appointment_financial(UUID);
DROP FUNCTION IF EXISTS finalize_appointment_financial(UUID, DECIMAL);
DROP FUNCTION IF EXISTS calculate_monthly_repasse(UUID, UUID, DATE);
DROP FUNCTION IF EXISTS process_appointment_medical_production(UUID, DECIMAL);

-- 1´©ÅÔâú Fun├º├úo RPC: Processar produ├º├úo quando appointment ├® finalizado
CREATE OR REPLACE FUNCTION process_appointment_medical_production(
  p_appointment_id UUID,
  p_appointment_value DECIMAL DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment RECORD;
  v_clinic_id UUID;
  v_professional_id UUID;
  v_value DECIMAL;
  v_production_id UUID;
  v_transaction_id UUID;
  l_response JSON;
BEGIN
  -- Obter dados do agendamento
  SELECT
    id, clinic_id, professional_id,
    appointment_date, value,
    COALESCE(status, 'unknown') as status
  INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id
  LIMIT 1;

  IF v_appointment IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Agendamento n├úo encontrado',
      'appointment_id', p_appointment_id
    );
  END IF;

  v_clinic_id := v_appointment.clinic_id;
  v_professional_id := v_appointment.professional_id;
  v_value := COALESCE(p_appointment_value, v_appointment.value, 0);

  -- Se o valor for 0, tente obter do servi├ºo
  IF v_value = 0 THEN
    SELECT price INTO v_value
    FROM services
    WHERE id = (SELECT service_id FROM appointments WHERE id = p_appointment_id)
    LIMIT 1;
    v_value := COALESCE(v_value, 0);
  END IF;

  -- Se ainda for 0, retornar erro
  IF v_value = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'N├úo foi poss├¡vel determinar o valor do atendimento',
      'appointment_id', p_appointment_id
    );
  END IF;

  -- 1´©ÅÔâú Criar registro de produ├º├úo m├®dica
  INSERT INTO medical_production (
    id,
    clinic_id,
    professional_id,
    atendimento_id,
    tipo,
    valor_bruto,
    valor_liquido,
    data_atendimento,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_clinic_id,
    v_professional_id,
    p_appointment_id,
    'consulta', -- Type (pode ser alterado conforme service)
    v_value,
    v_value * 0.75, -- Assumindo 25% de desconto/taxa
    v_appointment.appointment_date,
    NOW()
  )
  RETURNING id INTO v_production_id;

  -- 2´©ÅÔâú Criar transa├º├úo financeira de receita
  INSERT INTO financial_transactions (
    id,
    clinic_id,
    description,
    amount,
    type,
    category,
    status,
    professional_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_clinic_id,
    'Receita - Consulta (' || TO_CHAR(v_appointment.appointment_date, 'DD/MM/YYYY') || ')',
    v_value,
    'revenue',
    'appointment',
    'processed',
    v_professional_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'message', 'Produ├º├úo m├®dica processada com sucesso',
    'production_id', v_production_id,
    'transaction_id', v_transaction_id,
    'amount', v_value,
    'professional_id', v_professional_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- 2´©ÅÔâú Fun├º├úo RPC: Calcular repasse mensal
CREATE OR REPLACE FUNCTION calculate_monthly_repasse(
  p_clinic_id UUID,
  p_professional_id UUID,
  p_month DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_total_production DECIMAL;
  v_total_liquid DECIMAL;
  v_repasse_prof DECIMAL;
  v_repasse_clinic DECIMAL;
  v_repasse_id UUID;
  v_config RECORD;
BEGIN
  -- Definir per├¡odo do m├¬s
  v_start_date := DATE_TRUNC('month', p_month)::DATE;
  v_end_date := (DATE_TRUNC('month', p_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Obter configura├º├úo de repasse
  SELECT
    percentual_profissional, percentual_clinica
  INTO v_config
  FROM medical_repasse_config
  WHERE clinic_id = p_clinic_id
    AND professional_id = p_professional_id
    AND ativo = TRUE
  LIMIT 1;

  -- Se n├úo tiver config, usar default (70/30)
  IF v_config IS NULL THEN
    v_config.percentual_profissional := 70;
    v_config.percentual_clinica := 30;
  END IF;

  -- Calcular totais de produ├º├úo
  SELECT
    SUM(valor_bruto),
    SUM(valor_liquido)
  INTO v_total_production, v_total_liquid
  FROM medical_production
  WHERE clinic_id = p_clinic_id
    AND professional_id = p_professional_id
    AND data_atendimento >= v_start_date
    AND data_atendimento <= v_end_date;

  v_total_production := COALESCE(v_total_production, 0);
  v_total_liquid := COALESCE(v_total_liquid, 0);

  -- Calcular distribui├º├úo
  v_repasse_prof := v_total_liquid * (v_config.percentual_profissional / 100);
  v_repasse_clinic := v_total_liquid * (v_config.percentual_clinica / 100);

  -- Verificar se j├í existe repasse para este per├¡odo
  DELETE FROM medical_repasse
  WHERE clinic_id = p_clinic_id
    AND professional_id = p_professional_id
    AND periodo_inicio = v_start_date
    AND periodo_fim = v_end_date;

  -- Inserir novo repasse
  INSERT INTO medical_repasse (
    id,
    clinic_id,
    professional_id,
    periodo_inicio,
    periodo_fim,
    total_bruto,
    total_liquido,
    valor_profissional,
    valor_clinica,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_clinic_id,
    p_professional_id,
    v_start_date,
    v_end_date,
    v_total_production,
    v_total_liquid,
    v_repasse_prof,
    v_repasse_clinic,
    'pendente',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_repasse_id;

  -- Retornar resultado
  RETURN json_build_object(
    'success', true,
    'message', 'Repasse calculado com sucesso',
    'repasse_id', v_repasse_id,
    'periodo_inicio', v_start_date,
    'periodo_fim', v_end_date,
    'total_producao', v_total_production,
    'total_liquido', v_total_liquid,
    'valor_profissional', v_repasse_prof,
    'valor_clinica', v_repasse_clinic,
    'percentual_profissional', v_config.percentual_profissional,
    'percentual_clinica', v_config.percentual_clinica
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- 3´©ÅÔâú Fun├º├úo RPC: Processar completo quando appointment ├® finalizado
CREATE OR REPLACE FUNCTION finalize_appointment_financial(
  p_appointment_id UUID,
  p_appointment_value DECIMAL DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_apt RECORD;
  v_prod_result JSON;
  v_repasse_result JSON;
  v_clinic_id UUID;
  v_professional_id UUID;
  v_appointment_month DATE;
  v_value DECIMAL;
BEGIN
  -- Obter dados do appointment
  SELECT
    id, clinic_id, professional_id,
    appointment_date, value, service_id
  INTO v_apt
  FROM appointments
  WHERE id = p_appointment_id
  LIMIT 1;

  IF v_apt IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Appointment not found');
  END IF;

  v_clinic_id := v_apt.clinic_id;
  v_professional_id := v_apt.professional_id;
  v_appointment_month := DATE_TRUNC('month', v_apt.appointment_date)::DATE;

  -- Determinar valor (prioridade: par├ómetro > appointment > servi├ºo)
  v_value := COALESCE(NULLIF(p_appointment_value, 0), v_apt.value);

  IF v_value = 0 OR v_value IS NULL THEN
    SELECT price INTO v_value
    FROM services
    WHERE id = v_apt.service_id
    LIMIT 1;
  END IF;

  v_value := COALESCE(v_value, 0);

  -- 1´©ÅÔâú Processar produ├º├úo
  v_prod_result := process_appointment_medical_production(
    p_appointment_id,
    v_value
  );

  -- 2´©ÅÔâú Recalcular repasse do m├¬s
  v_repasse_result := calculate_monthly_repasse(
    v_clinic_id,
    v_professional_id,
    v_appointment_month
  );

  -- Retornar resultado combinado
  RETURN json_build_object(
    'success', (v_prod_result->>'success')::BOOLEAN AND (v_repasse_result->>'success')::BOOLEAN,
    'production', v_prod_result,
    'repasse', v_repasse_result,
    'message', 'Atendimento finalizado com processamento financeiro completo',
    'value_used', v_value
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- Coment├írios
COMMENT ON FUNCTION process_appointment_medical_production IS 'Cria registro de produ├º├úo m├®dica e transa├º├úo financeira quando atendimento ├® finalizado';
COMMENT ON FUNCTION calculate_monthly_repasse IS 'Calcula distribui├º├úo de repasse m├®dico (70/30) por per├¡odo';
COMMENT ON FUNCTION finalize_appointment_financial IS 'Processa completo: produ├º├úo + repasse + transa├º├Áes';

-- ============================================================================
-- Consolidated from 20260405_diagnostic_appointment_id.sql
-- ============================================================================

-- ============================================================================
-- DIAGN├ôSTICO: Verificar se appointment_id est├í preenchido
-- ============================================================================

-- 1´©ÅÔâú Ver registros com appointment_id
SELECT
  id,
  appointment_id,
  payer_name,
  valor_bruto,
  descricao,
  origem
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 2´©ÅÔâú Verificar se o appointment_id existe na tabela appointments
-- ============================================================================
SELECT
  ar.id as ar_id,
  ar.appointment_id,
  ar.payer_name,
  apt.id as apt_id,
  apt.patient_id,
  apt.appointment_date,
  apt.status
FROM ar_receivables ar
LEFT JOIN appointments apt ON ar.appointment_id = apt.id
ORDER BY ar.created_at DESC
LIMIT 5;

-- ============================================================================
-- Consolidated from 20260405_diagnostic_ar.sql
-- ============================================================================

-- ============================================================================
-- DIAGN├ôSTICO: Checar estrutura e dados reais da tabela ar_receivables
-- ============================================================================

-- 1´©ÅÔâú Ver campos da tabela
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ar_receivables'
ORDER BY ordinal_position;

-- ============================================================================
-- 2´©ÅÔâú Ver TODOS os registros (├║ltimos 5)
-- ============================================================================
SELECT *
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 3´©ÅÔâú Resumo dos valores
-- ============================================================================
SELECT
  COUNT(*) as total_registros,
  COUNT(DISTINCT valor_bruto) as valores_unicos,
  MIN(valor_bruto) as valor_minimo,
  MAX(valor_bruto) as valor_maximo,
  AVG(valor_bruto) as valor_medio,
  COUNT(CASE WHEN valor_bruto = 0 THEN 1 END) as com_valor_zero,
  COUNT(CASE WHEN payer_name IS NULL OR payer_name = '' OR payer_name = '-' THEN 1 END) as pagador_vazio
FROM ar_receivables;

-- ============================================================================
-- Consolidated from 20260405_fix_ar_dates.sql
-- ============================================================================

-- ============================================================================
-- CORRE├ç├âO: Atualizar data_vencimento para 5 dias a partir de hoje
-- ============================================================================

-- 1´©ÅÔâú Ver registros antes da corre├º├úo
SELECT
  id,
  payer_name,
  valor_bruto,
  data_emissao,
  data_vencimento,
  created_at
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 2´©ÅÔâú Atualizar data_emissao como hoje e data_vencimento como +5 dias
-- ============================================================================
UPDATE ar_receivables
SET
  data_emissao = CURRENT_DATE,
  data_vencimento = CURRENT_DATE + INTERVAL '5 days',
  updated_at = NOW()
WHERE valor_bruto > 0
ORDER BY created_at DESC
LIMIT 2;

-- ============================================================================
-- 3´©ÅÔâú Ver resultado ap├│s corre├º├úo
-- ============================================================================
SELECT
  id,
  payer_name,
  valor_bruto,
  data_emissao,
  data_vencimento,
  status
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Consolidated from 20260405_fix_ar_receivables_data.sql
-- ============================================================================

-- ============================================================================
-- CORRE├ç├âO: Atualizar registros de AR com valores e pagador faltando
-- Quando o registro foi criado com R$ 0.00 ou Pagador vazio
-- ============================================================================

-- Fun├º├úo para corrigir um registro de AR
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
  -- 1´©ÅÔâú Obter dados do AR
  SELECT id, appointment_id, paciente_id, valor_bruto, payer_name
  INTO v_ar
  FROM ar_receivables
  WHERE id = p_ar_id
  LIMIT 1;

  IF v_ar IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registro de AR n├úo encontrado'
    );
  END IF;

  -- 2´©ÅÔâú Obter dados do appointment
  SELECT id, patient_id, service_id, value
  INTO v_appointment
  FROM appointments
  WHERE id = v_ar.appointment_id
  LIMIT 1;

  IF v_appointment IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Agendamento n├úo encontrado'
    );
  END IF;

  -- 3´©ÅÔâú Obter dados do paciente para nome e email
  SELECT name, email, cpf, phone
  INTO v_patient
  FROM patients
  WHERE id = v_ar.paciente_id
  LIMIT 1;

  -- 4´©ÅÔâú Determinar o valor final (prioridade: appointment > servi├ºo)
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
      'message', 'N├úo foi poss├¡vel determinar o valor (appointment e servi├ºo com pre├ºo 0)'
    );
  END IF;

  -- 5´©ÅÔâú Montar nome do pagador
  v_payer_name := COALESCE(v_patient.name, 'Paciente Particular');

  -- 6´©ÅÔâú Atualizar o registro
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
-- Executar corre├º├úo em todos os registros com valor = 0
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
      RAISE NOTICE 'Corrigido AR %: % ÔåÆ R$ %',
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
-- Coment├írios
-- ============================================================================
COMMENT ON FUNCTION fix_ar_receivable_data IS 'Corrige um registro de AR preenchendo valor e pagador com dados do appointment/servi├ºo/paciente';

-- ============================================================================
-- Consolidated from 20260405_fix_ar_simple.sql
-- ============================================================================

-- ============================================================================
-- CORRE├ç├âO SIMPLES: Atualizar AR com valor 0 para valor do servi├ºo
-- ============================================================================

-- 1´©ÅÔâú Visualizar os registros que precisam corrigir
SELECT
  ar.id,
  ar.payer_name,
  ar.valor_bruto,
  apt.value as appointment_value,
  svc.price as service_price,
  p.name as patient_name
FROM ar_receivables ar
LEFT JOIN appointments apt ON ar.appointment_id = apt.id
LEFT JOIN services svc ON apt.service_id = svc.id
LEFT JOIN patients p ON ar.paciente_id = p.id
WHERE ar.valor_bruto = 0
ORDER BY ar.created_at DESC;

-- ============================================================================
-- 2´©ÅÔâú CORRIGIR VALOR: usar pre├ºo do servi├ºo ou valor do appointment
-- ============================================================================
UPDATE ar_receivables
SET
  valor_bruto = COALESCE(
    (SELECT apt.value FROM appointments apt WHERE apt.id = ar_receivables.appointment_id AND apt.value > 0 LIMIT 1),
    (SELECT svc.price FROM appointments apt
     JOIN services svc ON apt.service_id = svc.id
     WHERE apt.id = ar_receivables.appointment_id AND svc.price > 0 LIMIT 1),
    0
  ),
  updated_at = NOW()
WHERE ar_receivables.valor_bruto = 0;

-- ============================================================================
-- 3´©ÅÔâú CORRIGIR PAGADOR: usar nome do paciente
-- ============================================================================
UPDATE ar_receivables
SET
  payer_name = COALESCE(
    (SELECT p.name FROM patients p WHERE p.id = ar_receivables.paciente_id LIMIT 1),
    'Paciente Particular'
  ),
  updated_at = NOW()
WHERE ar_receivables.payer_name IS NULL OR ar_receivables.payer_name = '-' OR ar_receivables.payer_name = '';

-- ============================================================================
-- 4´©ÅÔâú VALIDAR: mostrar registros ap├│s corre├º├úo
-- ============================================================================
SELECT
  id,
  payer_name,
  valor_bruto,
  data_vencimento,
  status,
  updated_at
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 10;
