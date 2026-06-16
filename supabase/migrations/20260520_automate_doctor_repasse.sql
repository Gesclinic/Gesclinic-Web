-- ============================================================================
-- MIGRATION: 20260520_automate_doctor_repasse.sql
-- PURPOSE: ETAPA 4 - Repasse médico automático com múltiplos modelos
-- STATUS: Ativa
-- DATE: 2026-05-20
-- ============================================================================

-- ============================================================================
-- 1. TABELA EXPAND: repasse_medico_config
-- (Já existe, apenas documentando campos necessários)
-- Deve ter campos: percentual, tipo_base, regime_code, comissao_tipo
-- ============================================================================

-- ============================================================================
-- 2. TABELA: doctor_commission_calculations
-- Rastreia todos os cálculos de comissão (auditoria)
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_commission_calculations (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  
  -- Origem
  receivable_id BIGINT NOT NULL,
  appointment_id UUID NOT NULL,
  
  -- Config aplicada
  config_id BIGINT,
  regime_code TEXT,
  commission_model TEXT, -- 'percentage_gross', 'percentage_net', 'fixed', 'tiered', 'custom'
  
  -- Valores
  base_amount NUMERIC(12,2) NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_fixed NUMERIC(12,2) DEFAULT 0,
  taxes_iss NUMERIC(12,2) DEFAULT 0,
  taxes_inss NUMERIC(12,2) DEFAULT 0,
  taxes_irpf NUMERIC(12,2) DEFAULT 0,
  retention_total NUMERIC(12,2) DEFAULT 0,
  commission_net NUMERIC(12,2),
  
  -- Status
  status TEXT DEFAULT 'calculated', -- calculated, scheduled, paid, canceled
  payment_date DATE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_commission_calcs_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_commission_calcs_professional FOREIGN KEY (professional_id) REFERENCES professionals(id),
  CONSTRAINT fk_commission_calcs_receivable FOREIGN KEY (receivable_id) REFERENCES ar_invoices(id),
  CONSTRAINT fk_commission_calcs_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

CREATE INDEX idx_commission_calcs_clinic ON doctor_commission_calculations(clinic_id);
CREATE INDEX idx_commission_calcs_professional ON doctor_commission_calculations(professional_id);
CREATE INDEX idx_commission_calcs_status ON doctor_commission_calculations(status);
CREATE INDEX idx_commission_calcs_created_at ON doctor_commission_calculations(created_at DESC);
CREATE INDEX idx_commission_calcs_appointment ON doctor_commission_calculations(appointment_id);

-- ============================================================================
-- 3. FUNÇÃO: calculate_doctor_commission()
-- Motor de cálculo de comissão baseado em múltiplos modelos
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_doctor_commission(
  p_clinic_id UUID,
  p_professional_id UUID,
  p_receivable_id BIGINT,
  p_appointment_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_config RECORD;
  v_receivable RECORD;
  v_appointment RECORD;
  v_base_amount NUMERIC(12,2);
  v_commission_percent NUMERIC(5,2) := 0;
  v_commission_fixed NUMERIC(12,2) := 0;
  v_commission_gross NUMERIC(12,2) := 0;
  v_taxes_iss NUMERIC(12,2) := 0;
  v_taxes_inss NUMERIC(12,2) := 0;
  v_taxes_irpf NUMERIC(12,2) := 0;
  v_retention_total NUMERIC(12,2) := 0;
  v_commission_net NUMERIC(12,2);
  v_calculation_id BIGINT;
  v_result JSONB;
BEGIN
  -- 1. Buscar config de comissão do médico
  SELECT * INTO v_config FROM repasse_medico_config
  WHERE clinic_id = p_clinic_id 
    AND professional_id = p_professional_id 
    AND is_active = true
  LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('error', 'No commission config found for this professional');
  END IF;
  
  -- 2. Buscar receivable
  SELECT * INTO v_receivable FROM ar_invoices WHERE id = p_receivable_id LIMIT 1;
  
  IF v_receivable IS NULL THEN
    RETURN jsonb_build_object('error', 'Receivable not found');
  END IF;
  
  -- 3. Buscar appointment
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id LIMIT 1;
  
  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('error', 'Appointment not found');
  END IF;
  
  -- 4. Determinar base de cálculo
  IF v_config.tipo_base = 'BRUTO' THEN
    v_base_amount := v_receivable.valor_bruto;
  ELSIF v_config.tipo_base = 'LIQUIDO' THEN
    v_base_amount := v_receivable.valor_liquido;
  ELSIF v_config.tipo_base = 'APPOINTMENT' THEN
    v_base_amount := v_appointment.value;
  ELSE
    v_base_amount := v_receivable.valor_bruto; -- default
  END IF;
  
  -- 5. Calcular comissão baseado no modelo
  IF v_config.comissao_tipo = 'PERCENTUAL' THEN
    v_commission_gross := v_base_amount * v_config.percentual / 100;
    v_commission_percent := v_config.percentual;
    
  ELSIF v_config.comissao_tipo = 'FIXO' THEN
    v_commission_gross := v_config.percentual; -- campo "percentual" é usado como fixed value
    v_commission_fixed := v_config.percentual;
    
  ELSIF v_config.comissao_tipo = 'FAIXA' THEN
    -- Comissão por faixa (ex: 5% até 1000, 7% acima de 1000)
    IF v_base_amount > 1000 THEN
      v_commission_gross := v_base_amount * 0.07; -- exemplo
      v_commission_percent := 7;
    ELSE
      v_commission_gross := v_base_amount * 0.05;
      v_commission_percent := 5;
    END IF;
    
  ELSIF v_config.comissao_tipo = 'TABELA' THEN
    -- Tabela customizada por procedimento/convênio
    -- TODO: Implementar lookup em tabela separada
    v_commission_gross := v_base_amount * v_config.percentual / 100;
    v_commission_percent := v_config.percentual;
  END IF;
  
  -- 6. Calcular retenções (ISS, INSS, IRPF)
  -- ISS (customizável)
  v_taxes_iss := v_commission_gross * COALESCE(v_config.iss_customizado, 5) / 100;
  
  -- INSS (11% para contribuinte individual, simplificado)
  v_taxes_inss := v_commission_gross * 0.11;
  
  -- IRPF (baseado em faixa, simplificado)
  IF v_commission_gross > 5000 THEN
    v_taxes_irpf := (v_commission_gross - 5000) * 0.15; -- exemplo
  END IF;
  
  -- Total de retenções
  v_retention_total := v_taxes_iss + v_taxes_inss + v_taxes_irpf;
  
  -- 7. Comissão líquida
  v_commission_net := v_commission_gross - v_retention_total;
  
  -- 8. Registrar cálculo
  INSERT INTO doctor_commission_calculations (
    clinic_id,
    professional_id,
    receivable_id,
    appointment_id,
    config_id,
    regime_code,
    commission_model,
    base_amount,
    commission_percent,
    commission_fixed,
    taxes_iss,
    taxes_inss,
    taxes_irpf,
    retention_total,
    commission_net,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    p_professional_id,
    p_receivable_id,
    p_appointment_id,
    v_config.id,
    v_config.regime_code,
    v_config.comissao_tipo,
    v_base_amount,
    v_commission_percent,
    v_commission_fixed,
    v_taxes_iss,
    v_taxes_inss,
    v_taxes_irpf,
    v_retention_total,
    v_commission_net,
    'calculated',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_calculation_id;
  
  -- 9. Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'calculation_id', v_calculation_id,
    'base_amount', v_base_amount,
    'commission_gross', v_commission_gross,
    'taxes', jsonb_build_object(
      'iss', v_taxes_iss,
      'inss', v_taxes_inss,
      'irpf', v_taxes_irpf,
      'total', v_retention_total
    ),
    'commission_net', v_commission_net,
    'config', jsonb_build_object(
      'regime', v_config.regime_code,
      'model', v_config.comissao_tipo,
      'base_type', v_config.tipo_base
    )
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNÇÃO: schedule_doctor_commission()
-- Agenda uma comissão para pagamento futuro
-- ============================================================================
CREATE OR REPLACE FUNCTION schedule_doctor_commission(
  p_calculation_id BIGINT,
  p_clinic_id UUID,
  p_payment_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_calculation RECORD;
  v_payable_id BIGINT;
  v_result JSONB;
BEGIN
  -- Buscar cálculo
  SELECT * INTO v_calculation FROM doctor_commission_calculations
  WHERE id = p_calculation_id AND clinic_id = p_clinic_id LIMIT 1;
  
  IF v_calculation IS NULL THEN
    RETURN jsonb_build_object('error', 'Calculation not found');
  END IF;
  
  -- Criar AP Bill para comissão (contas a pagar)
  INSERT INTO ap_bills (
    clinic_id,
    fornecedor,
    valor,
    data_emissao,
    data_vencimento,
    status,
    descricao,
    origem,
    referencia_origem,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    (SELECT name FROM professionals WHERE id = v_calculation.professional_id),
    v_calculation.commission_net,
    CURRENT_DATE,
    p_payment_date,
    'pending',
    format('Comissão por atendimento #%s', v_calculation.appointment_id),
    'doctor_commission',
    v_calculation.id::TEXT,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_payable_id;
  
  -- Atualizar calculation status
  UPDATE doctor_commission_calculations SET
    status = 'scheduled',
    payment_date = p_payment_date,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_calculation_id;
  
  -- Criar entrada de cash flow para comissão a pagar (saída prevista)
  INSERT INTO cash_flow_entries (
    clinic_id,
    type,
    amount,
    description,
    origin,
    reference_id,
    reference_type,
    is_projected,
    projected_date,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'saida',
    v_calculation.commission_net,
    format('Comissão agendada: %s', (SELECT name FROM professionals WHERE id = v_calculation.professional_id)),
    'doctor_commission',
    p_calculation_id::TEXT,
    'commission',
    true, -- projeção
    p_payment_date,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'payable_id', v_payable_id,
    'payment_date', p_payment_date,
    'message', 'Commission scheduled for payment'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. FUNÇÃO: get_doctor_commission_summary()
-- Resumo de comissões para um médico em período
-- ============================================================================
CREATE OR REPLACE FUNCTION get_doctor_commission_summary(
  p_professional_id UUID,
  p_clinic_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_summary RECORD;
BEGIN
  SELECT
    COUNT(*)::INT as total_appointments,
    SUM(base_amount)::NUMERIC as total_base,
    SUM(commission_gross)::NUMERIC as total_commission_gross,
    SUM(retention_total)::NUMERIC as total_taxes,
    SUM(commission_net)::NUMERIC as total_commission_net,
    COUNT(CASE WHEN status = 'calculated' THEN 1 END)::INT as pending_calculations,
    COUNT(CASE WHEN status = 'scheduled' THEN 1 END)::INT as scheduled,
    COUNT(CASE WHEN status = 'paid' THEN 1 END)::INT as paid
  INTO v_summary
  FROM doctor_commission_calculations
  WHERE professional_id = p_professional_id
    AND clinic_id = p_clinic_id
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;
  
  v_result := jsonb_build_object(
    'professional_id', p_professional_id,
    'period_start', p_start_date,
    'period_end', p_end_date,
    'total_appointments', v_summary.total_appointments,
    'financials', jsonb_build_object(
      'total_base', v_summary.total_base,
      'total_commission_gross', v_summary.total_commission_gross,
      'total_taxes', v_summary.total_taxes,
      'total_commission_net', v_summary.total_commission_net,
      'average_commission_per_appointment', CASE 
        WHEN v_summary.total_appointments > 0 
        THEN (v_summary.total_commission_net / v_summary.total_appointments)::NUMERIC(12,2)
        ELSE 0 END
    ),
    'status', jsonb_build_object(
      'pending', v_summary.pending_calculations,
      'scheduled', v_summary.scheduled,
      'paid', v_summary.paid
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. TRIGGER: Ao receber appointmentum, calcular comissão automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_auto_calculate_commission_on_receivable_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_appointment RECORD;
  v_result JSONB;
BEGIN
  -- Só processar se receivable foi marcada como recebida
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    -- Buscar appointment associado
    SELECT * INTO v_appointment FROM appointments WHERE id = NEW.appointment_id LIMIT 1;
    
    IF v_appointment IS NOT NULL THEN
      -- Calcular comissão do médico
      v_result := calculate_doctor_commission(
        NEW.clinic_id,
        v_appointment.professional_id,
        NEW.id,
        NEW.appointment_id
      );
      
      -- Se sucesso, agendar para pagamento (15 dias depois)
      IF (v_result->>'success')::BOOLEAN THEN
        v_result := schedule_doctor_commission(
          (v_result->>'calculation_id')::BIGINT,
          NEW.clinic_id,
          CURRENT_DATE + INTERVAL '15 days'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_calculate_commission ON ar_invoices;
CREATE TRIGGER trg_auto_calculate_commission
AFTER UPDATE ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_calculate_commission_on_receivable_paid();

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================
ALTER TABLE doctor_commission_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY doctor_commission_calcs_select
  ON doctor_commission_calculations FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE POLICY doctor_commission_calcs_insert
  ON doctor_commission_calculations FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')));

-- ============================================================================
-- COMMIT
-- ============================================================================
-- ✅ doctor_commission_calculations: Rastreamento de cálculos
-- ✅ calculate_doctor_commission(): Motor multi-modelo de comissão
-- ✅ schedule_doctor_commission(): Agendamento de pagamentos
-- ✅ get_doctor_commission_summary(): Análise de comissões
-- ✅ Trigger automático ao receber
-- ✅ RLS Policies
