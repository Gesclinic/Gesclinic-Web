-- ============================================================================
-- PHASE 1: APPOINTMENT ↔ FINANCIAL INTEGRATION TRIGGERS & RPCs
-- ============================================================================
-- Purpose: Auto-create AR (receivable), TISS guides, and calculate repasse 
-- Date: April 11, 2026
-- ============================================================================

-- Function 1: Create AR receivable from appointment
CREATE OR REPLACE FUNCTION create_ar_receivable_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_payer_name TEXT;
  v_existing_ar_id UUID;
BEGIN
  SELECT id INTO v_existing_ar_id
  FROM ar_receivables
  WHERE appointment_id = NEW.id
    AND clinic_id = NEW.clinic_id
  LIMIT 1;
  
  IF v_existing_ar_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.payer_id IS NOT NULL THEN
    SELECT fantasy_name INTO v_payer_name
    FROM health_insurances
    WHERE id = NEW.payer_id
    LIMIT 1;
    
    IF v_payer_name IS NULL THEN
      v_payer_name := 'CONVÊNIO DESCONHECIDO';
    END IF;
  ELSE
    v_payer_name := 'PARTICULAR';
  END IF;

  INSERT INTO ar_receivables (
    clinic_id,
    appointment_id,
    payer_name,
    valor,
    status,
    origem,
    descricao,
    created_at,
    updated_at
  ) VALUES (
    NEW.clinic_id,
    NEW.id,
    v_payer_name,
    COALESCE(NEW.total_value, 0),
    'open',
    'agenda',
    format('Auto-gerado de agendamento #%s', NEW.id),
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---

-- Function 2: Create TISS guide from appointment
CREATE OR REPLACE FUNCTION create_tiss_guide_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_guide_id UUID;
  v_guide_number TEXT;
BEGIN
  IF NEW.payer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_guide_id
  FROM billing_guides
  WHERE appointment_id = NEW.id
    AND clinic_id = NEW.clinic_id
  LIMIT 1;
  
  IF v_existing_guide_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_guide_number := format('GUIA-%s-%s-%s', 
    NEW.clinic_id::text,
    TO_CHAR(NOW(), 'YYYYMMDD'),
    NEW.id::text
  );

  INSERT INTO billing_guides (
    clinic_id,
    appointment_id,
    payer_id,
    guide_number,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.clinic_id,
    NEW.id,
    NEW.payer_id,
    v_guide_number,
    'draft',
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---

-- Function 3: Cancel AR receivable from appointment
CREATE OR REPLACE FUNCTION cancel_ar_receivable_from_appointment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ar_receivables
  SET 
    status = 'canceled',
    updated_at = NOW()
  WHERE appointment_id = NEW.id
    AND clinic_id = NEW.clinic_id
    AND status NOT IN ('received', 'canceled');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---

-- Trigger 1: Auto-create AR when appointment attended
DROP TRIGGER IF EXISTS trg_create_ar_on_appointment_attended ON appointments;

CREATE TRIGGER trg_create_ar_on_appointment_attended
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (
    NEW.status = 'attended' 
    AND (OLD.status IS DISTINCT FROM 'attended')
  )
  EXECUTE FUNCTION create_ar_receivable_from_appointment();

---

-- Trigger 2: Auto-create TISS guide when appointment attended (convênio only)
DROP TRIGGER IF EXISTS trg_create_tiss_guide_on_appointment_attended ON appointments;

CREATE TRIGGER trg_create_tiss_guide_on_appointment_attended
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (
    NEW.status = 'attended' 
    AND (OLD.status IS DISTINCT FROM 'attended')
    AND NEW.payer_id IS NOT NULL
  )
  EXECUTE FUNCTION create_tiss_guide_from_appointment();

---

-- Trigger 3: Auto-cancel AR when appointment cancelled
DROP TRIGGER IF EXISTS trg_cancel_ar_on_appointment_canceled ON appointments;

CREATE TRIGGER trg_cancel_ar_on_appointment_canceled
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (
    NEW.status = 'canceled'
    AND (OLD.status IS DISTINCT FROM 'canceled')
  )
  EXECUTE FUNCTION cancel_ar_receivable_from_appointment();

---

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ar_receivables_appointment_clinic 
  ON ar_receivables(appointment_id, clinic_id);

CREATE INDEX IF NOT EXISTS idx_billing_guides_appointment_clinic 
  ON billing_guides(appointment_id, clinic_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status_clinic 
  ON appointments(clinic_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_repasse_config_servico_active 
  ON repasse_config_servico(clinic_id, service_id, ativo);

-- ============================================================================
-- END PHASE 1
-- ============================================================================
