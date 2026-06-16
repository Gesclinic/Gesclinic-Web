-- ============================================================================
-- MIGRATION: 20260520_automate_appointment_to_receivable.sql
-- PURPOSE: Automação de Agenda → Financeiro
-- STATUS: Ativa
-- DATE: 2026-05-20
-- ============================================================================

-- ============================================================================
-- 1. TABELA: appointment_financial_rules
-- Armazena regras de conversão de appointment em receivable
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_financial_rules (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  
  -- Aplicação
  applies_to_status TEXT[] DEFAULT ARRAY['completed']::TEXT[], -- status de appointment para aplicar
  applies_to_service_type TEXT[] DEFAULT ARRAY['all']::TEXT[], -- tipos de serviço (all, consultation, procedure, etc)
  applies_to_professional_type TEXT[] DEFAULT ARRAY['all']::TEXT[], -- tipo profissional
  
  -- Regras de cálculo
  apply_discount_from_appointment BOOLEAN DEFAULT true, -- usar discount do appointment
  automatic_discount_percent NUMERIC(5,2) DEFAULT 0, -- desconto automático adicional (%)
  apply_tax BOOLEAN DEFAULT true, -- aplicar impostos
  tax_percent NUMERIC(5,2) DEFAULT 0, -- ISS/IPI (%)
  
  -- Repasse médico
  apply_doctor_commission BOOLEAN DEFAULT true, -- gerar repasse médico
  
  -- Pagamento automático
  auto_mark_as_received BOOLEAN DEFAULT false, -- marcar como recebido automaticamente
  payment_method_default TEXT DEFAULT 'cash', -- cash, pix, card, health_insurance
  
  -- Integração com fluxo
  auto_generate_cash_flow BOOLEAN DEFAULT true, -- criar entrada em cash_flow_entries
  cash_flow_account_id UUID, -- conta bancária padrão
  
  -- Meta
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_appointment_financial_rules_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE INDEX idx_appointment_financial_rules_clinic_active ON appointment_financial_rules(clinic_id, is_active);

-- ============================================================================
-- 2. TABELA: appointment_to_receivable_mapping
-- Rastreia conversões de appointment em receivable (auditoria de origem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_to_receivable_mapping (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  receivable_id BIGINT NOT NULL,
  rule_id BIGINT,
  
  -- Valores calculados
  appointment_value NUMERIC(12,2),
  discount_applied NUMERIC(12,2),
  tax_applied NUMERIC(12,2),
  doctor_commission_id UUID,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, canceled, reverted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_mapping_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT fk_mapping_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_mapping_receivable FOREIGN KEY (receivable_id) REFERENCES ar_invoices(id),
  CONSTRAINT fk_mapping_rule FOREIGN KEY (rule_id) REFERENCES appointment_financial_rules(id)
);

CREATE INDEX idx_appointment_to_receivable_mapping_appointment ON appointment_to_receivable_mapping(appointment_id);
CREATE INDEX idx_appointment_to_receivable_mapping_receivable ON appointment_to_receivable_mapping(receivable_id);

-- ============================================================================
-- 3. FUNÇÃO: validate_appointment_for_receivable()
-- Valida se appointment pode gerar receivable
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_appointment_for_receivable(
  p_appointment_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_appointment RECORD;
  v_patient RECORD;
  v_service RECORD;
  v_professional RECORD;
  v_errors JSONB[] := ARRAY[]::JSONB[];
  v_result JSONB;
BEGIN
  -- Buscar appointment
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id LIMIT 1;
  IF v_appointment IS NULL THEN
    v_errors := array_append(v_errors, jsonb_build_object('field', 'appointment', 'error', 'Appointment not found'));
    RETURN jsonb_build_object('valid', false, 'errors', v_errors);
  END IF;
  
  -- Validar status
  IF v_appointment.status NOT IN ('completed', 'no-show') THEN
    v_errors := array_append(v_errors, jsonb_build_object('field', 'status', 'error', 'Appointment status must be completed or no-show'));
  END IF;
  
  -- Validar paciente
  SELECT * INTO v_patient FROM patients WHERE id = v_appointment.patient_id LIMIT 1;
  IF v_patient IS NULL THEN
    v_errors := array_append(v_errors, jsonb_build_object('field', 'patient', 'error', 'Patient not found'));
  END IF;
  
  -- Validar serviço
  SELECT * INTO v_service FROM services WHERE id = v_appointment.service_id LIMIT 1;
  IF v_service IS NULL THEN
    v_errors := array_append(v_errors, jsonb_build_object('field', 'service', 'error', 'Service not found'));
  END IF;
  IF v_service IS NOT NULL AND v_service.is_billable = false THEN
    v_errors := array_append(v_errors, jsonb_build_object('field', 'service', 'error', 'Service is not billable'));
  END IF;
  
  -- Validar profissional
  SELECT * INTO v_professional FROM professionals WHERE id = v_appointment.professional_id LIMIT 1;
  IF v_professional IS NULL THEN
    v_errors := array_append(v_errors, jsonb_build_object('field', 'professional', 'error', 'Professional not found'));
  END IF;
  
  -- Validar valor
  IF v_appointment.value IS NULL OR v_appointment.value <= 0 THEN
    v_errors := array_append(v_errors, jsonb_build_object('field', 'value', 'error', 'Appointment value must be greater than 0'));
  END IF;
  
  -- Montar resultado
  v_result := jsonb_build_object(
    'valid', COALESCE(array_length(v_errors, 1) = 0, true),
    'errors', CASE WHEN array_length(v_errors, 1) > 0 THEN v_errors ELSE NULL END,
    'appointment', jsonb_build_object(
      'id', v_appointment.id,
      'patient_id', v_appointment.patient_id,
      'professional_id', v_appointment.professional_id,
      'service_id', v_appointment.service_id,
      'value', v_appointment.value,
      'status', v_appointment.status
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. FUNÇÃO: calculate_appointment_receivable_values()
-- Calcula descontos, impostos, comissão, valor líquido
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_appointment_receivable_values(
  p_appointment_id UUID,
  p_clinic_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_appointment RECORD;
  v_rule RECORD;
  v_service RECORD;
  v_professional RECORD;
  v_repasse_config RECORD;
  
  v_value_gross NUMERIC(12,2);
  v_discount_total NUMERIC(12,2) := 0;
  v_tax_total NUMERIC(12,2) := 0;
  v_commission_total NUMERIC(12,2) := 0;
  v_value_net NUMERIC(12,2);
  
  v_result JSONB;
BEGIN
  -- Buscar appointment
  SELECT * INTO v_appointment FROM appointments 
  WHERE id = p_appointment_id AND clinic_id = p_clinic_id LIMIT 1;
  
  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('error', 'Appointment not found');
  END IF;
  
  v_value_gross := COALESCE(v_appointment.value, 0);
  
  -- Buscar regra ativa
  SELECT * INTO v_rule FROM appointment_financial_rules 
  WHERE clinic_id = p_clinic_id AND is_active = true
  ORDER BY created_at DESC LIMIT 1;
  
  -- Buscar serviço
  SELECT * INTO v_service FROM services WHERE id = v_appointment.service_id LIMIT 1;
  
  -- Buscar profissional
  SELECT * INTO v_professional FROM professionals WHERE id = v_appointment.professional_id LIMIT 1;
  
  -- 1. DESCONTOS
  -- Desconto do appointment
  IF v_rule IS NOT NULL AND v_rule.apply_discount_from_appointment = true THEN
    v_discount_total := v_discount_total + COALESCE(v_appointment.discount, 0);
  END IF;
  
  -- Desconto automático %
  IF v_rule IS NOT NULL AND v_rule.automatic_discount_percent > 0 THEN
    v_discount_total := v_discount_total + (v_value_gross * v_rule.automatic_discount_percent / 100);
  END IF;
  
  -- 2. IMPOSTOS (ISS, IPI, etc)
  IF v_rule IS NOT NULL AND v_rule.apply_tax = true AND v_rule.tax_percent > 0 THEN
    v_tax_total := (v_value_gross - v_discount_total) * v_rule.tax_percent / 100;
  END IF;
  
  -- 3. COMISSÃO MÉDICA (se aplicável)
  IF v_rule IS NOT NULL AND v_rule.apply_doctor_commission = true AND v_professional IS NOT NULL THEN
    SELECT * INTO v_repasse_config FROM repasse_medico_config 
    WHERE clinic_id = p_clinic_id AND professional_id = v_appointment.professional_id 
    AND is_active = true LIMIT 1;
    
    IF v_repasse_config IS NOT NULL THEN
      -- Calcular comissão baseado na configuração
      IF v_repasse_config.tipo_base = 'BRUTO' THEN
        v_commission_total := v_value_gross * v_repasse_config.percentual / 100;
      ELSE -- LIQUIDO
        v_commission_total := (v_value_gross - v_discount_total - v_tax_total) * v_repasse_config.percentual / 100;
      END IF;
    END IF;
  END IF;
  
  -- 4. VALOR LÍQUIDO
  v_value_net := v_value_gross - v_discount_total - v_tax_total - v_commission_total;
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'appointment_id', v_appointment_id,
    'value_gross', v_value_gross,
    'discount_total', v_discount_total,
    'tax_total', v_tax_total,
    'commission_total', v_commission_total,
    'value_net', v_value_net,
    'breakdown', jsonb_build_object(
      'discount_appointment', COALESCE(v_appointment.discount, 0),
      'discount_rule_percent', CASE WHEN v_rule IS NOT NULL THEN v_rule.automatic_discount_percent ELSE 0 END,
      'tax_percent', CASE WHEN v_rule IS NOT NULL THEN v_rule.tax_percent ELSE 0 END,
      'commission_percent', CASE WHEN v_repasse_config IS NOT NULL THEN v_repasse_config.percentual ELSE 0 END,
      'commission_base', CASE WHEN v_repasse_config IS NOT NULL THEN v_repasse_config.tipo_base ELSE 'BRUTO' END
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. FUNÇÃO: create_receivable_from_appointment()
-- Cria receivable (AR Invoice) a partir de appointment finalizado
-- ============================================================================
CREATE OR REPLACE FUNCTION create_receivable_from_appointment(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_rule_id BIGINT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_appointment RECORD;
  v_values JSONB;
  v_receivable_id BIGINT;
  v_mapping_id BIGINT;
  v_doctor_commission_id UUID;
  v_validation JSONB;
  v_payer_type TEXT := 'patient'; -- patient, health_insurance
  v_payer_name TEXT;
  v_payer_id UUID;
  
BEGIN
  -- 1. Validar appointment
  v_validation := validate_appointment_for_receivable(p_appointment_id);
  IF (v_validation->>'valid')::BOOLEAN = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Validation failed', 'details', v_validation);
  END IF;
  
  -- 2. Buscar appointment
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id LIMIT 1;
  
  -- 3. Calcular valores
  v_values := calculate_appointment_receivable_values(p_appointment_id, p_clinic_id);
  
  -- 4. Determinar pagador
  -- Se houver convênio, paga convênio; senão, paciente
  IF v_appointment.health_insurance_id IS NOT NULL THEN
    v_payer_type := 'health_insurance';
    v_payer_id := v_appointment.health_insurance_id;
    SELECT name INTO v_payer_name FROM health_insurances WHERE id = v_payer_id LIMIT 1;
  ELSE
    v_payer_type := 'patient';
    v_payer_id := v_appointment.patient_id;
    SELECT name INTO v_payer_name FROM patients WHERE id = v_payer_id LIMIT 1;
  END IF;
  
  -- 5. Criar AR Invoice
  INSERT INTO ar_invoices (
    clinic_id,
    appointment_id,
    payer_type,
    payer_id,
    payer_name,
    valor_bruto,
    descontos,
    impostos,
    repasse_medico,
    valor_liquido,
    status,
    data_emissao,
    data_vencimento,
    origem,
    descricao,
    metodo_pagamento_default,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    p_appointment_id,
    v_payer_type,
    v_payer_id,
    v_payer_name,
    (v_values->>'value_gross')::NUMERIC,
    (v_values->>'discount_total')::NUMERIC,
    (v_values->>'tax_total')::NUMERIC,
    (v_values->>'commission_total')::NUMERIC,
    (v_values->>'value_net')::NUMERIC,
    'pending', -- status inicial
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days', -- vencimento padrão 30 dias
    'Agenda', -- origem
    'Faturamento automático de atendimento #' || v_appointment.id::TEXT,
    'pix', -- método padrão
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_receivable_id;
  
  -- 6. Criar mapping (rastreabilidade)
  INSERT INTO appointment_to_receivable_mapping (
    clinic_id,
    appointment_id,
    receivable_id,
    rule_id,
    appointment_value,
    discount_applied,
    tax_applied,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    p_appointment_id,
    v_receivable_id,
    p_rule_id,
    (v_values->>'value_gross')::NUMERIC,
    (v_values->>'discount_total')::NUMERIC,
    (v_values->>'tax_total')::NUMERIC,
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_mapping_id;
  
  -- 7. Criar entrada em cash_flow_entries (previsão)
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
    'entrada', -- income
    (v_values->>'value_gross')::NUMERIC,
    'Faturamento de atendimento: ' || v_payer_name,
    'appointment',
    v_receivable_id::TEXT,
    'receivable',
    true, -- é previsão
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'receivable_id', v_receivable_id,
    'mapping_id', v_mapping_id,
    'values', v_values,
    'message', 'Receivable created successfully from appointment'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGER: Quando appointment é finalizado, criar receivable automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_appointment_finalized_create_receivable()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
  v_rule RECORD;
BEGIN
  -- Só processar se status mudou para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Buscar regra ativa da clínica
    SELECT * INTO v_rule FROM appointment_financial_rules 
    WHERE clinic_id = NEW.clinic_id AND is_active = true
    LIMIT 1;
    
    -- Se houver regra, criar receivable
    IF v_rule IS NOT NULL THEN
      v_result := create_receivable_from_appointment(
        NEW.id,
        NEW.clinic_id,
        v_rule.id
      );
      
      -- Log da operação
      INSERT INTO appointment_financial_audit_logs (
        clinic_id,
        appointment_id,
        operation_type,
        operation_details,
        created_by,
        created_at
      ) VALUES (
        NEW.clinic_id,
        NEW.id,
        'receivable_created',
        v_result,
        'system',
        CURRENT_TIMESTAMP
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointment_finalized_create_receivable ON appointments;
CREATE TRIGGER trg_appointment_finalized_create_receivable
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_appointment_finalized_create_receivable();

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================
ALTER TABLE appointment_financial_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_to_receivable_mapping ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver regras da sua clínica
CREATE POLICY appointment_financial_rules_select_own_clinic
  ON appointment_financial_rules FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY appointment_financial_rules_insert_own_clinic
  ON appointment_financial_rules FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );

CREATE POLICY appointment_financial_rules_update_own_clinic
  ON appointment_financial_rules FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );

-- Policy: Mapeamentos (select/insert/update)
CREATE POLICY appointment_to_receivable_mapping_select
  ON appointment_to_receivable_mapping FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY appointment_to_receivable_mapping_insert
  ON appointment_to_receivable_mapping FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );

-- ============================================================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX idx_appointment_to_receivable_mapping_clinic_status 
  ON appointment_to_receivable_mapping(clinic_id, status);
CREATE INDEX idx_appointment_to_receivable_mapping_created_at 
  ON appointment_to_receivable_mapping(created_at DESC);

-- ============================================================================
-- 9. CRIAR REGRA DEFAULT PARA CLINICS EXISTENTES
-- ============================================================================
INSERT INTO appointment_financial_rules (clinic_id, name, description, is_active)
SELECT 
  id as clinic_id,
  'Regra Padrão',
  'Regra padrão de automação de faturamento',
  true
FROM clinics
WHERE id NOT IN (SELECT DISTINCT clinic_id FROM appointment_financial_rules)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMIT MESSAGES
-- ============================================================================
-- ✅ appointment_financial_rules: Tabela para armazenar regras de conversão
-- ✅ appointment_to_receivable_mapping: Rastreamento de conversões
-- ✅ validate_appointment_for_receivable(): Validação de appointments
-- ✅ calculate_appointment_receivable_values(): Cálculo de valores, descontos, impostos, comissão
-- ✅ create_receivable_from_appointment(): Função principal de criação
-- ✅ trg_appointment_finalized_create_receivable: Trigger automático
-- ✅ RLS Policies: Segurança multi-tenant
-- ✅ Índices para performance
-- ✅ Regra default para clinics existentes
