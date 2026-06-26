⚡ APLICAR SQL EM 30 SEGUNDOS - COPIAR E COLAR

═══════════════════════════════════════════════════════════════════════════════════

PASSO 1: Copiar SQL abaixo
PASSO 2: Ir para https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
PASSO 3: Colar em editor branco
PASSO 4: Clicar em "RUN"
PASSO 5: Aguardar sucesso

═══════════════════════════════════════════════════════════════════════════════════
SQL COMPLETO PRONTO PARA COLAR (Comece aqui!)
═══════════════════════════════════════════════════════════════════════════════════

-- ================================================================
-- APPOINTMENT FINANCIAL INTEGRATION TRIGGERS & AUTOMATION
-- 2024-04-XX | Production Ready
-- ================================================================

-- Create financial_audit_logs table with RLS
CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  appointment_id UUID,
  event_type TEXT NOT NULL DEFAULT 'UNKNOWN',
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_clinic_appointment 
  ON financial_audit_logs(clinic_id, appointment_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_clinic_created_at 
  ON financial_audit_logs(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_appointment_id 
  ON financial_audit_logs(appointment_id);

ALTER TABLE financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit logs for their clinic" ON financial_audit_logs;
CREATE POLICY "Users can view audit logs for their clinic"
  ON financial_audit_logs FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert audit logs for their clinic" ON financial_audit_logs;
CREATE POLICY "Users can insert audit logs for their clinic"
  ON financial_audit_logs FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

-- RPC: Create receivable from appointment
CREATE OR REPLACE FUNCTION create_receivable_from_appointment(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_rule_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment RECORD;
  v_payer_id UUID;
  v_payer_type TEXT;
  v_value_gross NUMERIC;
  v_value_taxes NUMERIC;
  v_value_net NUMERIC;
  v_receivable_id UUID;
  v_mapping_id UUID;
  v_error_msg TEXT;
BEGIN
  -- Step 1: Fetch and validate appointment
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id AND clinic_id = p_clinic_id;
  
  IF v_appointment IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or access denied';
  END IF;
  
  -- Log: Start processing
  INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
  VALUES (
    p_clinic_id, p_appointment_id,
    'APPOINTMENT_DATA_FETCHED',
    jsonb_build_object('appointment', v_appointment)
  );
  
  -- Step 2: Check if receivable already exists
  IF EXISTS (
    SELECT 1 FROM appointment_to_receivable_mapping
    WHERE appointment_id = p_appointment_id
  ) THEN
    INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
    VALUES (p_clinic_id, p_appointment_id, 'MAPPING_ALREADY_EXISTS', jsonb_build_object());
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Mapping already exists for this appointment'
    );
  END IF;
  
  -- Step 3: Validate data integrity
  IF v_appointment.patient_id IS NULL OR
     v_appointment.professional_id IS NULL OR
     v_appointment.value_total IS NULL THEN
    INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
    VALUES (
      p_clinic_id, p_appointment_id,
      'APPOINTMENT_DATA_VALIDATION_FAILED',
      jsonb_build_object(
        'patient_id', v_appointment.patient_id,
        'professional_id', v_appointment.professional_id,
        'value_total', v_appointment.value_total
      )
    );
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required appointment data'
    );
  END IF;
  
  -- Step 4: Determine payer
  SELECT payer_id INTO v_payer_id
  FROM appointments WHERE id = p_appointment_id;
  
  v_payer_type := COALESCE(
    (SELECT payer_type FROM payers WHERE id = v_payer_id),
    'particular'
  );
  
  -- Step 5: Calculate taxes
  v_value_gross := v_appointment.value_total;
  v_value_taxes := ROUND(v_value_gross * 0.15, 2); -- 15% for now, extensible
  v_value_net := ROUND(v_value_gross - v_value_taxes, 2);
  
  -- Step 6: Create receivable in ar_invoices
  INSERT INTO ar_invoices (
    clinic_id,
    appointment_id,
    payer_id,
    valor_gross,
    impostos_totais,
    valor_liquido,
    status,
    payment_status
  ) VALUES (
    p_clinic_id,
    p_appointment_id,
    v_payer_id,
    v_value_gross,
    v_value_taxes,
    v_value_net,
    'open',
    'pending'
  )
  RETURNING id INTO v_receivable_id;
  
  INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
  VALUES (
    p_clinic_id, p_appointment_id,
    'RECEIVABLE_CREATED',
    jsonb_build_object(
      'receivable_id', v_receivable_id,
      'valor_gross', v_value_gross,
      'impostos_totais', v_value_taxes,
      'valor_liquido', v_value_net
    )
  );
  
  -- Step 7: Create mapping
  INSERT INTO appointment_to_receivable_mapping (
    appointment_id,
    receivable_id
  ) VALUES (
    p_appointment_id,
    v_receivable_id
  )
  RETURNING id INTO v_mapping_id;
  
  INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
  VALUES (
    p_clinic_id, p_appointment_id,
    'MAPPING_CREATED',
    jsonb_build_object('mapping_id', v_mapping_id)
  );
  
  -- Step 8: Update cashflow
  INSERT INTO cash_flow_entries (
    clinic_id,
    appointment_id,
    type,
    valor,
    reference_id
  ) VALUES (
    p_clinic_id,
    p_appointment_id,
    'projected',
    v_value_net,
    v_receivable_id
  );
  
  INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
  VALUES (
    p_clinic_id, p_appointment_id,
    'CASHFLOW_UPDATED',
    jsonb_build_object('valor_net', v_value_net)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'receivable_id', v_receivable_id,
    'valor_gross', v_value_gross,
    'impostos_totais', v_value_taxes,
    'valor_liquido', v_value_net,
    'status', 'created'
  );
  
EXCEPTION WHEN OTHERS THEN
  v_error_msg := SQLERRM;
  INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
  VALUES (
    p_clinic_id, p_appointment_id,
    'RPC_CREATION_ERROR',
    jsonb_build_object('error', v_error_msg)
  );
  RETURN jsonb_build_object(
    'success', false,
    'error', v_error_msg
  );
END;
$$;

-- Trigger: When appointment is completed, create receivable
CREATE OR REPLACE FUNCTION trigger_appointment_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    v_result := create_receivable_from_appointment(NEW.id, NEW.clinic_id);
    
    INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
    VALUES (
      NEW.clinic_id, NEW.id,
      'TRIGGER_APPOINTMENT_COMPLETED',
      jsonb_build_object('result', v_result)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
  VALUES (
    NEW.clinic_id, NEW.id,
    'TRIGGER_APPOINTMENT_COMPLETED_ERROR',
    jsonb_build_object('error', SQLERRM)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_completed ON appointments;
CREATE TRIGGER trg_appointment_completed
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_appointment_completed();

-- Trigger: When receivable is created, log event
CREATE OR REPLACE FUNCTION trigger_receivable_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
  VALUES (
    NEW.clinic_id, NEW.appointment_id,
    'RECEIVABLE_CREATED_EVENT',
    jsonb_build_object(
      'receivable_id', NEW.id,
      'valor_total', NEW.valor_gross,
      'status', NEW.status
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_receivable_created ON ar_invoices;
CREATE TRIGGER trg_receivable_created
AFTER INSERT ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_receivable_created();

-- Trigger: When receivable is updated, log changes
CREATE OR REPLACE FUNCTION trigger_receivable_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
    VALUES (
      NEW.clinic_id, NEW.appointment_id,
      'RECEIVABLE_STATUS_UPDATED',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'valor_liquido', NEW.valor_liquido
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO financial_audit_logs (clinic_id, appointment_id, event_type, event_data)
  VALUES (
    NEW.clinic_id, NEW.appointment_id,
    'TRIGGER_RECEIVABLE_UPDATE_ERROR',
    jsonb_build_object('error', SQLERRM)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_receivable_updated ON ar_invoices;
CREATE TRIGGER trg_receivable_updated
AFTER UPDATE ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_receivable_updated();

-- Verification script
SELECT * FROM financial_audit_logs ORDER BY created_at DESC LIMIT 20;
SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_%';

═══════════════════════════════════════════════════════════════════════════════════
APÓS RODAR (copie e execute uma de cada vez para verificar):
═══════════════════════════════════════════════════════════════════════════════════

1️⃣  Verificar triggers criados:
SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_%';
→ Resultado esperado: 3 linhas

2️⃣  Verificar tabela audit:
SELECT * FROM financial_audit_logs LIMIT 1;
→ Resultado esperado: colunas (id, clinic_id, appointment_id, event_type, event_data, created_at)

3️⃣  Verificar RPC:
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'create_receivable_from_appointment';
→ Resultado esperado: 1 linha

═══════════════════════════════════════════════════════════════════════════════════
TUDO PRONTO! Próximos passos:
═══════════════════════════════════════════════════════════════════════════════════

✅ SQL aplicado em Supabase
⏳ Próximo: npm run dev + testar clique em agendamento
⏳ Próximo: Finalizar atendimento e verificar receivable criado

═══════════════════════════════════════════════════════════════════════════════════
