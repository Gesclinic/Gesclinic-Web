-- ============================================================================
-- APPOINTMENT TO FINANCIAL INTEGRATION
-- Quando um atendimento é finalizado, gera automaticamente:
-- 1. Medical Production (produção médica)
-- 2. Medical Repasse (cálculo de repasse)
-- 3. Financial Transactions (fluxo de caixa)
-- ============================================================================

-- 🔧 Limpar funções antigas se existirem (para evitar conflito de assinatura)
DROP FUNCTION IF EXISTS finalize_appointment_financial(UUID);
DROP FUNCTION IF EXISTS finalize_appointment_financial(UUID, DECIMAL);
DROP FUNCTION IF EXISTS calculate_monthly_repasse(UUID, UUID, DATE);
DROP FUNCTION IF EXISTS process_appointment_medical_production(UUID, DECIMAL);

-- 1️⃣ Função RPC: Processar produção quando appointment é finalizado
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
      'message', 'Agendamento não encontrado',
      'appointment_id', p_appointment_id
    );
  END IF;

  v_clinic_id := v_appointment.clinic_id;
  v_professional_id := v_appointment.professional_id;
  v_value := COALESCE(p_appointment_value, v_appointment.value, 0);

  -- Se o valor for 0, tente obter do serviço
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
      'message', 'Não foi possível determinar o valor do atendimento',
      'appointment_id', p_appointment_id
    );
  END IF;

  -- 1️⃣ Criar registro de produção médica
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

  -- 2️⃣ Criar transação financeira de receita
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
    'message', 'Produção médica processada com sucesso',
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

-- 2️⃣ Função RPC: Calcular repasse mensal
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
  -- Definir período do mês
  v_start_date := DATE_TRUNC('month', p_month)::DATE;
  v_end_date := (DATE_TRUNC('month', p_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Obter configuração de repasse
  SELECT 
    percentual_profissional, percentual_clinica
  INTO v_config
  FROM medical_repasse_config
  WHERE clinic_id = p_clinic_id 
    AND professional_id = p_professional_id
    AND ativo = TRUE
  LIMIT 1;

  -- Se não tiver config, usar default (70/30)
  IF v_config IS NULL THEN
    v_config.percentual_profissional := 70;
    v_config.percentual_clinica := 30;
  END IF;

  -- Calcular totais de produção
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

  -- Calcular distribuição
  v_repasse_prof := v_total_liquid * (v_config.percentual_profissional / 100);
  v_repasse_clinic := v_total_liquid * (v_config.percentual_clinica / 100);

  -- Verificar se já existe repasse para este período
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

-- 3️⃣ Função RPC: Processar completo quando appointment é finalizado
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

  -- Determinar valor (prioridade: parâmetro > appointment > serviço)
  v_value := COALESCE(NULLIF(p_appointment_value, 0), v_apt.value);
  
  IF v_value = 0 OR v_value IS NULL THEN
    SELECT price INTO v_value
    FROM services
    WHERE id = v_apt.service_id
    LIMIT 1;
  END IF;

  v_value := COALESCE(v_value, 0);

  -- 1️⃣ Processar produção
  v_prod_result := process_appointment_medical_production(
    p_appointment_id,
    v_value
  );

  -- 2️⃣ Recalcular repasse do mês
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

-- Comentários
COMMENT ON FUNCTION process_appointment_medical_production IS 'Cria registro de produção médica e transação financeira quando atendimento é finalizado';
COMMENT ON FUNCTION calculate_monthly_repasse IS 'Calcula distribuição de repasse médico (70/30) por período';
COMMENT ON FUNCTION finalize_appointment_financial IS 'Processa completo: produção + repasse + transações';
