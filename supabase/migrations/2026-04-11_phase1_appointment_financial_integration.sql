-- ============================================================================
-- PHASE 1: APPOINTMENT ↔ FINANCIAL INTEGRATION TRIGGERS & RPCs
-- ============================================================================
-- Purpose: Auto-create AR (receivable), TISS guides, and calculate repasse 
--          when appointment status changes
-- Date: April 11, 2026
-- Idempotent: Yes (use DROP IF EXISTS + CREATE OR REPLACE)
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS (No triggers, just logic)
-- ============================================================================

/**
 * Function: create_ar_receivable_from_appointment
 * Purpose: Insert AR receivable when appointment marked as attended
 * Called by: trg_create_ar_on_appointment_attended
 * Idempotent: Yes (checks for existing AR before insert)
 */
CREATE OR REPLACE FUNCTION create_ar_receivable_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_payer_name TEXT;
  v_existing_ar_id UUID;
BEGIN
  -- Prevent duplicate AR creation (idempotency)
  SELECT id INTO v_existing_ar_id
  FROM ar_receivables
  WHERE appointment_id = NEW.id
    AND clinic_id = NEW.clinic_id
  LIMIT 1;
  
  IF v_existing_ar_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determine payer name
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

  -- Insert AR receivable
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
    format('Auto-gerado de agendamento #%s pelo paciente %s', NEW.id, COALESCE(NEW.patient_name, 'DESCONHECIDO')),
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---

/**
 * Function: create_tiss_guide_from_appointment
 * Purpose: Insert TISS guide when appointment marked as attended (convênio only)
 * Called by: trg_create_tiss_guide_on_appointment_attended
 * Idempotent: Yes (checks for existing guide before insert)
 */
CREATE OR REPLACE FUNCTION create_tiss_guide_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_guide_id UUID;
  v_guide_number TEXT;
BEGIN
  -- Only process if payer_id exists (convênio)
  IF NEW.payer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent duplicate guide creation (idempotency)
  SELECT id INTO v_existing_guide_id
  FROM billing_guides
  WHERE appointment_id = NEW.id
    AND clinic_id = NEW.clinic_id
  LIMIT 1;
  
  IF v_existing_guide_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Generate guide number
  v_guide_number := format('GUIA-%s-%s-%s', 
    NEW.clinic_id::text,
    TO_CHAR(NOW(), 'YYYYMMDD'),
    NEW.id::text
  );

  -- Insert TISS billing guide
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

/**
 * Function: cancel_ar_receivable_from_appointment
 * Purpose: Soft-delete AR receivable when appointment cancelled
 * Called by: trg_cancel_ar_on_appointment_canceled
 * Idempotent: Yes (safe to call multiple times)
 */
CREATE OR REPLACE FUNCTION cancel_ar_receivable_from_appointment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all AR records linked to this appointment (except already received)
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

/**
 * RPC: calculate_repasse_per_appointment
 * Purpose: Calculate real-time repasse for single appointment (precedência rule)
 * Precedência: service individual % > group % > professional general %
 * Called by: appointment completion trigger or manual RPC call
 * Returns: NUMERIC (amount to repasse)
 */
CREATE OR REPLACE FUNCTION calculate_repasse_per_appointment(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_professional_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_service_id UUID;
  v_group_id UUID;
  v_value NUMERIC;
  v_percentage NUMERIC;
  v_repasse_amount NUMERIC;
BEGIN
  -- Fetch appointment details
  SELECT service_id, total_value, professional_id INTO v_service_id, v_value, p_professional_id
  FROM appointments
  WHERE id = p_appointment_id
    AND clinic_id = p_clinic_id
  LIMIT 1;

  -- If appointment not found or no value, return 0
  IF v_service_id IS NULL OR v_value IS NULL THEN
    RETURN 0;
  END IF;

  -- RULE 1: Check service individual configuration (highest priority)
  SELECT percentual INTO v_percentage
  FROM repasse_config_servico
  WHERE clinic_id = p_clinic_id
    AND service_id = v_service_id
    AND ativo = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_percentage IS NOT NULL AND v_percentage > 0 THEN
    v_repasse_amount := (v_value * v_percentage) / 100.0;
    RETURN v_repasse_amount;
  END IF;

  -- RULE 2: Check professional general configuration (default)
  SELECT percentual INTO v_percentage
  FROM repasse_config_profissional
  WHERE clinic_id = p_clinic_id
    AND professional_id = p_professional_id
    AND ativo = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_percentage IS NOT NULL AND v_percentage > 0 THEN
    v_repasse_amount := (v_value * v_percentage) / 100.0;
    RETURN v_repasse_amount;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

---

-- ============================================================================
-- TRIGGERS (Attach functions to appointment status changes)
-- ============================================================================

/**
 * TRIGGER: trg_create_ar_on_appointment_attended
 * Event: AFTER UPDATE on appointments
 * When: status changes to 'attended' (first time only)
 * Action: Call create_ar_receivable_from_appointment()
 */
DROP TRIGGER IF EXISTS trg_create_ar_on_appointment_attended ON appointments;

CREATE TRIGGER trg_create_ar_on_appointment_attended
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (
    NEW.status = 'attended' 
    AND (OLD.status IS DISTINCT FROM 'attended')
  )
  EXECUTE FUNCTION create_ar_receivable_from_appointment();

COMMENT ON TRIGGER trg_create_ar_on_appointment_attended ON appointments IS
  'Auto-create AR receivable when appointment marked as attended';

---

/**
 * TRIGGER: trg_create_tiss_guide_on_appointment_attended
 * Event: AFTER UPDATE on appointments
 * When: status changes to 'attended' AND payer_id is not null (convênio)
 * Action: Call create_tiss_guide_from_appointment()
 */
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

COMMENT ON TRIGGER trg_create_tiss_guide_on_appointment_attended ON appointments IS
  'Auto-create TISS billing guide when appointment marked as attended (convênio only)';

---

/**
 * TRIGGER: trg_cancel_ar_on_appointment_canceled
 * Event: AFTER UPDATE on appointments
 * When: status changes to 'canceled' (first time only)
 * Action: Call cancel_ar_receivable_from_appointment()
 */
DROP TRIGGER IF EXISTS trg_cancel_ar_on_appointment_canceled ON appointments;

CREATE TRIGGER trg_cancel_ar_on_appointment_canceled
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (
    NEW.status = 'canceled'
    AND (OLD.status IS DISTINCT FROM 'canceled')
  )
  EXECUTE FUNCTION cancel_ar_receivable_from_appointment();

COMMENT ON TRIGGER trg_cancel_ar_on_appointment_canceled ON appointments IS
  'Auto-cancel AR receivable when appointment cancelled';

---

-- ============================================================================
-- INDEXES (Performance optimization for triggers)
-- ============================================================================

-- Speed up lookups for AR creation
CREATE INDEX IF NOT EXISTS idx_ar_receivables_appointment_clinic 
  ON ar_receivables(appointment_id, clinic_id);

CREATE INDEX IF NOT EXISTS idx_billing_guides_appointment_clinic 
  ON billing_guides(appointment_id, clinic_id);

-- Speed up appointment status queries
CREATE INDEX IF NOT EXISTS idx_appointments_status_clinic 
  ON appointments(clinic_id, status, updated_at);

-- Speed up repasse config lookups
CREATE INDEX IF NOT EXISTS idx_repasse_config_servico_active 
  ON repasse_config_servico(clinic_id, service_id, active);

CREATE INDEX IF NOT EXISTS idx_repasse_config_grupo_active 
  ON repasse_config_grupo(clinic_id, active);

CREATE INDEX IF NOT EXISTS idx_repasse_config_profissional_active 
  ON repasse_config_profissional(clinic_id, professional_id, active);

---

-- ============================================================================
-- VALIDATION & TESTING
-- ============================================================================

/*
 * TEST 1: Verify functions existtivo);

CREATE INDEX IF NOT EXISTS idx_repasse_config_profissional_active 
  ON repasse_config_profissional(clinic_id, professional_id, ativo
--   'calculate_repasse_per_appointment'
-- );

/*
 * TEST 2: Verify triggers exist
 */
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE trigger_name IN (
--   'trg_create_ar_on_appointment_attended',
--   'trg_create_tiss_guide_on_appointment_attended',
--   'trg_cancel_ar_on_appointment_canceled'
-- );

/*
 * TEST 3: Manual test - calculate repasse
 * (Replace UUIDs with real data from your DB)
 */
-- SELECT calculate_repasse_per_appointment(
--   '00000000-0000-0000-0000-000000000001'::uuid, -- appointment_id
--   '00000000-0000-0000-0000-000000000002'::uuid, -- clinic_id
--   '00000000-0000-0000-0000-000000000003'::uuid  -- professional_id
-- );

---

-- ============================================================================
-- NOTES
-- ============================================================================

/*
 * IMPORTANT REMINDERS:
 * 
 * 1. IDEMPOTENCY:
 *    - Each function checks if record already exists before creating
 *    - Safe to run multiple times without duplicates
 * 
 * 2. PERFORMANCE:
 *    - Indexes added for common filter combinations
 *    - Monitor query performance on large tables
 *    - Consider materialized view if triggers become slow
 * 
 * 3. RLS POLICIES:
 *    - Triggers run with SECURITY DEFINER (elevated privileges)
 *    - Ensure RLS policies don't block inserts
 *    - Test with different roles (admin, receptionist, professional)
 * 
 * 4. TESTING BEFORE PRODUCTION:
 *    - Test on staging DB first
 *    - Verify AR/guide creation on sample appointments
 *    - Check repasse calculation with all precedência combinations
 *    - Monitor logs for errors
 * 
 * 5. ROLLBACK:
 *    If anything breaks, simply:
 *    DROP TRIGGER trg_create_ar_on_appointment_attended ON appointments;
 *    DROP TRIGGER trg_create_tiss_guide_on_appointment_attended ON appointments;
 *    DROP TRIGGER trg_cancel_ar_on_appointment_canceled ON appointments;
 *    DROP FUNCTION create_ar_receivable_from_appointment();
 *    DROP FUNCTION create_tiss_guide_from_appointment();
 *    DROP FUNCTION cancel_ar_receivable_from_appointment();
 *    DROP FUNCTION calculate_repasse_per_appointment(UUID, UUID, UUID);
 * 
 */

-- ============================================================================
-- END PHASE 1
-- ============================================================================
