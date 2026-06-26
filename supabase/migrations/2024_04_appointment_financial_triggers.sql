-- ================================================================
-- APPOINTMENT → FINANCIAL INTEGRATION TRIGGERS
-- ================================================================
-- 
-- Phases:
-- 1. Appointment Completed Trigger
--    - Detects: appointments.status = 'completed'
--    - Action: Call RPC to create financial records
--    - Error: Logs, doesn't block appointment
--
-- 2. Receivable Created Trigger
--    - Detects: ar_invoices INSERT
--    - Action: Update cashflow, DRE, indicators
--
-- 3. Receivable Updated Trigger
--    - Detects: ar_invoices UPDATE
--    - Action: Propagate changes to cache
--
-- 4. Core RPC: create_receivable_from_appointment
--    - Orchestrates all financial processing
--
-- ================================================================

-- ================================================================
-- STEP 1: Create financial_audit_logs table
-- ================================================================
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointment FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_clinic_appointment 
  ON public.financial_audit_logs(clinic_id, appointment_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_clinic_created_at 
  ON public.financial_audit_logs(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_appointment_id 
  ON public.financial_audit_logs(appointment_id);

-- Enable RLS
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read logs for their clinic
CREATE POLICY "Users can read audit logs for their clinic" ON public.financial_audit_logs
  FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() LIMIT 1));

-- RLS Policy: Users can write logs for their clinic
CREATE POLICY "Users can insert audit logs for their clinic" ON public.financial_audit_logs
  FOR INSERT
  WITH CHECK (clinic_id = (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() LIMIT 1));

-- ================================================================
-- STEP 2: RPC Function - Core Integration Logic
-- ================================================================
CREATE OR REPLACE FUNCTION public.create_receivable_from_appointment(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_rule_id BIGINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_appointment RECORD;
  v_payer_type VARCHAR;
  v_payer_id UUID;
  v_receivable RECORD;
  v_mapping RECORD;
  v_tax_calc JSONB;
  v_gross_value DECIMAL;
  v_net_value DECIMAL;
  v_total_taxes DECIMAL;
  v_error_msg TEXT;
  v_result JSONB;
BEGIN
  -- ========== STEP 1: Validate & Fetch Appointment ==========
  BEGIN
    SELECT 
      id, clinic_id, status, patient_id, professional_id, 
      payer_id, payer_type, value, attended_at
    INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id 
      AND clinic_id = p_clinic_id
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'completed')
    LIMIT 1;

    IF v_appointment IS NULL THEN
      RAISE EXCEPTION 'Appointment not found or invalid status: %', p_appointment_id;
    END IF;

    -- Log fetch success
    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'APPOINTMENT_FETCHED', 
      jsonb_build_object('appointment_id', v_appointment.id, 'status', v_appointment.status));

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Error fetching appointment: ' || SQLERRM;
    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'FETCH_ERROR', 
      jsonb_build_object('error', v_error_msg));
    RAISE EXCEPTION '%', v_error_msg;
  END;

  -- ========== STEP 2: Check if Already Has Receivable ==========
  DECLARE
    v_existing_mapping RECORD;
  BEGIN
    SELECT * INTO v_existing_mapping
    FROM appointment_to_receivable_mapping
    WHERE appointment_id = p_appointment_id 
      AND status = 'active'
    LIMIT 1;

    IF v_existing_mapping IS NOT NULL THEN
      INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
      VALUES (p_clinic_id, p_appointment_id, 'RECEIVABLE_ALREADY_EXISTS', 
        jsonb_build_object('mapping_id', v_existing_mapping.id, 'receivable_id', v_existing_mapping.receivable_id));
      
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Appointment already has active receivable',
        'mapping_id', v_existing_mapping.id
      );
    END IF;
  END;

  -- ========== STEP 3: Validate Appointment Data ==========
  BEGIN
    IF v_appointment.value IS NULL OR v_appointment.value <= 0 THEN
      INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
      VALUES (p_clinic_id, p_appointment_id, 'ZERO_VALUE_SKIPPED', 
        jsonb_build_object('value', v_appointment.value));
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Appointment has zero value - receivable not created',
        'appointment_id', p_appointment_id
      );
    END IF;

    IF v_appointment.patient_id IS NULL THEN
      RAISE EXCEPTION 'Appointment missing patient_id';
    END IF;

    IF v_appointment.professional_id IS NULL THEN
      RAISE EXCEPTION 'Appointment missing professional_id';
    END IF;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Validation error: ' || SQLERRM;
    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'VALIDATION_ERROR', 
      jsonb_build_object('error', v_error_msg));
    RAISE EXCEPTION '%', v_error_msg;
  END;

  -- ========== STEP 4: Determine Payer ==========
  BEGIN
    v_payer_type := COALESCE(v_appointment.payer_type, 'PARTICULAR');
    v_payer_id := v_appointment.payer_id;

    IF v_payer_type NOT IN ('CONVENIO', 'PARTICULAR') THEN
      v_payer_type := 'PARTICULAR';
    END IF;

    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'PAYER_DETERMINED', 
      jsonb_build_object('payer_type', v_payer_type, 'payer_id', v_payer_id));
  END;

  -- ========== STEP 5: Calculate Taxes (Simplified for this version) ==========
  BEGIN
    v_gross_value := v_appointment.value;
    
    -- TODO: Call external tax calculation engine here
    -- For now: Simple calculation with default rates
    v_total_taxes := v_gross_value * 0.15; -- 15% default tax
    v_net_value := v_gross_value - v_total_taxes;

    v_tax_calc := jsonb_build_object(
      'gross_value', v_gross_value,
      'total_taxes', v_total_taxes,
      'net_value', v_net_value,
      'payer_type', v_payer_type,
      'calculation_method', 'simplified'
    );

    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'TAX_CALCULATED', v_tax_calc);
  END;

  -- ========== STEP 6: Create Receivable (AR Invoice) ==========
  BEGIN
    INSERT INTO ar_invoices (
      clinic_id, appointment_id, payer_type, payer_rule_id,
      valor_bruto, descontos, impostos, repasse_medico, valor_liquido,
      status, data_emissao, data_vencimento,
      origem, descricao, metodo_pagamento_default
    ) VALUES (
      p_clinic_id, p_appointment_id, v_payer_type, p_rule_id,
      v_gross_value, 0, v_total_taxes, 0, v_net_value,
      'pending', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
      'Agenda', 'Auto-generated from appointment completion', 'pix'
    )
    RETURNING * INTO v_receivable;

    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'RECEIVABLE_CREATED', 
      jsonb_build_object('receivable_id', v_receivable.id, 'valor_liquido', v_net_value));
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Error creating receivable: ' || SQLERRM;
    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'RECEIVABLE_CREATE_ERROR', 
      jsonb_build_object('error', v_error_msg));
    RAISE EXCEPTION '%', v_error_msg;
  END;

  -- ========== STEP 7: Create Mapping ==========
  BEGIN
    INSERT INTO appointment_to_receivable_mapping (
      clinic_id, appointment_id, receivable_id, rule_id,
      appointment_value, discount_applied, tax_applied, status
    ) VALUES (
      p_clinic_id, p_appointment_id, v_receivable.id, p_rule_id,
      v_gross_value, 0, v_total_taxes, 'active'
    )
    RETURNING * INTO v_mapping;

    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'MAPPING_CREATED', 
      jsonb_build_object('mapping_id', v_mapping.id));
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Error creating mapping: ' || SQLERRM;
    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'MAPPING_CREATE_ERROR', 
      jsonb_build_object('error', v_error_msg));
    -- Don't fail here - receivable was created
  END;

  -- ========== STEP 8: Update Cashflow (Optional) ==========
  BEGIN
    INSERT INTO cash_flow_entries (
      clinic_id, type, amount, description, origin, reference_id, reference_type,
      is_projected, projected_date
    ) VALUES (
      p_clinic_id, 'entrada', v_net_value,
      'Cash flow entry from appointment receivable: ' || p_appointment_id,
      'appointment', v_receivable.id::text, 'receivable',
      true, CURRENT_DATE + INTERVAL '30 days'
    );

    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'CASHFLOW_CREATED', 
      jsonb_build_object('amount', v_net_value));
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'CASHFLOW_CREATE_WARNING', 
      jsonb_build_object('error', SQLERRM));
  END;

  -- ========== FINAL: Return Success ==========
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Receivable created successfully',
    'appointment_id', p_appointment_id,
    'receivable_id', v_receivable.id,
    'mapping_id', COALESCE(v_mapping.id, NULL),
    'values', jsonb_build_object(
      'gross', v_gross_value,
      'taxes', v_total_taxes,
      'net', v_net_value
    )
  );

  INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
  VALUES (p_clinic_id, p_appointment_id, 'PROCESS_COMPLETED', v_result);

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  v_error_msg := 'RPC Error: ' || SQLERRM;
  INSERT INTO financial_audit_logs(clinic_id, appointment_id, event_type, event_data)
  VALUES (p_clinic_id, p_appointment_id, 'PROCESS_ERROR', 
    jsonb_build_object('error', v_error_msg));
  
  RETURN jsonb_build_object(
    'success', false,
    'error', v_error_msg,
    'appointment_id', p_appointment_id
  );
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- STEP 3: Trigger - On Appointment Completed
-- ================================================================
CREATE OR REPLACE FUNCTION public.trigger_appointment_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Call RPC to create financial records
    SELECT create_receivable_from_appointment(NEW.id, NEW.clinic_id) INTO v_result;
    
    -- Log the trigger execution
    INSERT INTO financial_audit_logs (
      clinic_id, appointment_id, event_type, event_data
    ) VALUES (
      NEW.clinic_id, NEW.id, 'TRIGGER_APPOINTMENT_COMPLETED', 
      jsonb_build_object('result', v_result)
    );
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block appointment update
  INSERT INTO financial_audit_logs (
    clinic_id, appointment_id, event_type, event_data
  ) VALUES (
    NEW.clinic_id, NEW.id, 'TRIGGER_ERROR', 
    jsonb_build_object('error', SQLERRM)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_appointment_completed ON appointments;
CREATE TRIGGER trg_appointment_completed
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_appointment_completed();

-- ================================================================
-- STEP 4: Trigger - On Receivable Created (for cascading updates)
-- ================================================================
CREATE OR REPLACE FUNCTION public.trigger_receivable_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Log receivable creation
  INSERT INTO financial_audit_logs (
    clinic_id, appointment_id, event_type, event_data
  ) VALUES (
    NEW.clinic_id, NEW.appointment_id, 'TRIGGER_RECEIVABLE_CREATED', 
    jsonb_build_object(
      'receivable_id', NEW.id,
      'valor_liquido', NEW.valor_liquido,
      'status', NEW.status
    )
  );
  
  -- TODO: Update DRE
  -- TODO: Update financial indicators
  -- TODO: Notify users
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO financial_audit_logs (
    clinic_id, appointment_id, event_type, event_data
  ) VALUES (
    NEW.clinic_id, NEW.appointment_id, 'TRIGGER_RECEIVABLE_CREATE_ERROR', 
    jsonb_build_object('error', SQLERRM)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_receivable_created ON ar_invoices;
CREATE TRIGGER trg_receivable_created
AFTER INSERT ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_receivable_created();

-- ================================================================
-- STEP 5: Trigger - On Receivable Updated (for cascading updates)
-- ================================================================
CREATE OR REPLACE FUNCTION public.trigger_receivable_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status changed
  IF NEW.status != OLD.status THEN
    INSERT INTO financial_audit_logs (
      clinic_id, appointment_id, event_type, event_data
    ) VALUES (
      NEW.clinic_id, NEW.appointment_id, 'TRIGGER_RECEIVABLE_UPDATED', 
      jsonb_build_object(
        'receivable_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'valor_liquido', NEW.valor_liquido
      )
    );
    
    -- TODO: Update financial indicators if status changed
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO financial_audit_logs (
    clinic_id, appointment_id, event_type, event_data
  ) VALUES (
    NEW.clinic_id, NEW.appointment_id, 'TRIGGER_RECEIVABLE_UPDATE_ERROR', 
    jsonb_build_object('error', SQLERRM)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_receivable_updated ON ar_invoices;
CREATE TRIGGER trg_receivable_updated
AFTER UPDATE ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_receivable_updated();

-- ================================================================
-- VERIFICATION SCRIPT
-- ================================================================
-- Run this to verify setup:
--
-- SELECT * FROM financial_audit_logs ORDER BY created_at DESC LIMIT 20;
-- SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_%';
-- SELECT routine_name FROM information_schema.routines 
--   WHERE routine_name LIKE 'trigger_%' OR routine_name = 'create_receivable_from_appointment';
--
-- ================================================================
