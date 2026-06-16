-- =============================================================================
-- ETAPA 4: MEDICAL REPASSE MOTOR - SQL MIGRATION
-- =============================================================================
-- Gerencia modelos de comissão médica com 4 tipos
-- Auto-cria AP Bills quando appointment é attended
-- =============================================================================

-- =========================================
-- TABLE 1: Medical Commission Models
-- =========================================

CREATE TABLE IF NOT EXISTS medical_commission_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'fixed_percent', 'rate_table', 'specific_insurance', 'specific_procedure'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Tax configuration
  base_tax_type VARCHAR(50) DEFAULT 'iss', -- 'iss', 'inss', 'ir', 'none'
  base_tax_percentage DECIMAL(5, 2) DEFAULT 5.00,
  
  -- Limits
  min_commission_amount DECIMAL(14, 2) DEFAULT 0,
  max_commission_amount DECIMAL(14, 2) DEFAULT NULL,
  apply_withholding BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_professional FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_medical_commission_clinic_id ON medical_commission_models(clinic_id);
CREATE INDEX idx_medical_commission_professional_id ON medical_commission_models(professional_id);
CREATE INDEX idx_medical_commission_is_active ON medical_commission_models(clinic_id, is_active);
CREATE UNIQUE INDEX idx_medical_commission_professional_active 
  ON medical_commission_models(clinic_id, professional_id) 
  WHERE is_active = true;

-- RLS
ALTER TABLE medical_commission_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_commission_models"
  ON medical_commission_models FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "clinic_admin_can_manage_commission_models"
  ON medical_commission_models FOR INSERT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'director')
    )
  );

CREATE POLICY "clinic_admin_can_update_commission_models"
  ON medical_commission_models FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'director')
    )
  );

-- =========================================
-- TABLE 2: Fixed Percent Configuration
-- =========================================

CREATE TABLE IF NOT EXISTS commission_fixed_percent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  model_id UUID NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES medical_commission_models(id) ON DELETE CASCADE
);

CREATE INDEX idx_commission_fixed_percent_model_id ON commission_fixed_percent(model_id);
CREATE INDEX idx_commission_fixed_percent_clinic_id ON commission_fixed_percent(clinic_id);

ALTER TABLE commission_fixed_percent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_fixed_percent"
  ON commission_fixed_percent FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

-- =========================================
-- TABLE 3: Rate Tables (Procedure/Insurance)
-- =========================================

CREATE TABLE IF NOT EXISTS commission_rate_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  model_id UUID NOT NULL,
  procedure_code VARCHAR(50),
  procedure_name VARCHAR(255),
  commission_percentage DECIMAL(5, 2) NOT NULL,
  min_amount DECIMAL(14, 2) DEFAULT 0,
  max_amount DECIMAL(14, 2) DEFAULT NULL,
  insurance_code VARCHAR(50), -- Para modelos de seguro específico
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES medical_commission_models(id) ON DELETE CASCADE
);

CREATE INDEX idx_commission_rate_model_id ON commission_rate_tables(model_id);
CREATE INDEX idx_commission_rate_procedure ON commission_rate_tables(clinic_id, procedure_code);
CREATE INDEX idx_commission_rate_insurance ON commission_rate_tables(clinic_id, insurance_code);

ALTER TABLE commission_rate_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_rate_tables"
  ON commission_rate_tables FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

-- =========================================
-- TABLE 4: Medical Commission Calculations (Ledger)
-- =========================================

CREATE TABLE IF NOT EXISTS medical_commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  appointment_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  model_id UUID NOT NULL,
  appointment_value DECIMAL(14, 2) NOT NULL,
  commission_gross DECIMAL(14, 2) NOT NULL,
  tax_type VARCHAR(50) NOT NULL,
  tax_percentage DECIMAL(5, 2) NOT NULL,
  tax_amount DECIMAL(14, 2) NOT NULL,
  commission_net DECIMAL(14, 2) NOT NULL,
  ap_bill_id UUID,
  status VARCHAR(50) DEFAULT 'calculated', -- 'calculated', 'bill_created', 'paid', 'cancelled'
  calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  bill_created_at TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_professional FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES medical_commission_models(id) ON DELETE CASCADE
);

CREATE INDEX idx_commission_ledger_clinic ON medical_commission_ledger(clinic_id);
CREATE INDEX idx_commission_ledger_appointment ON medical_commission_ledger(appointment_id);
CREATE INDEX idx_commission_ledger_professional ON medical_commission_ledger(professional_id);
CREATE INDEX idx_commission_ledger_date ON medical_commission_ledger(calculation_date);

ALTER TABLE medical_commission_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_commission_ledger"
  ON medical_commission_ledger FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()
    )
  );

-- =========================================
-- FUNCTION 1: Calculate Commission
-- =========================================

CREATE OR REPLACE FUNCTION fn_calculate_commission(
  p_clinic_id UUID,
  p_professional_id UUID,
  p_appointment_value DECIMAL,
  p_procedure_code VARCHAR DEFAULT NULL,
  p_insurance_code VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  commission_gross DECIMAL,
  commission_percentage DECIMAL,
  tax_type VARCHAR,
  tax_percentage DECIMAL,
  tax_amount DECIMAL,
  commission_net DECIMAL,
  model_id UUID,
  model_type VARCHAR
) AS $$
DECLARE
  v_model RECORD;
  v_commission_pct DECIMAL := 0;
  v_commission_gross DECIMAL;
  v_tax_amount DECIMAL;
  v_commission_net DECIMAL;
BEGIN
  -- 1. Get active model for professional
  SELECT * INTO v_model
  FROM medical_commission_models
  WHERE clinic_id = p_clinic_id
    AND professional_id = p_professional_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_model IS NULL THEN
    RAISE EXCEPTION 'No active commission model found';
  END IF;

  -- 2. Calculate percentage based on model type
  IF v_model.type = 'fixed_percent' THEN
    SELECT percentage INTO v_commission_pct
    FROM commission_fixed_percent
    WHERE model_id = v_model.id
    LIMIT 1;
    
  ELSIF v_model.type IN ('rate_table', 'specific_procedure', 'specific_insurance') THEN
    SELECT commission_percentage INTO v_commission_pct
    FROM commission_rate_tables
    WHERE model_id = v_model.id
      AND (
        (v_model.type = 'specific_procedure' AND procedure_code = p_procedure_code) OR
        (v_model.type = 'specific_insurance' AND insurance_code = p_insurance_code) OR
        v_model.type = 'rate_table'
      )
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- 3. Calculate commission
  v_commission_gross := p_appointment_value * (v_commission_pct / 100);
  
  -- Apply model limits
  IF v_commission_gross < v_model.min_commission_amount THEN
    v_commission_gross := v_model.min_commission_amount;
  END IF;
  
  IF v_model.max_commission_amount IS NOT NULL AND 
     v_commission_gross > v_model.max_commission_amount THEN
    v_commission_gross := v_model.max_commission_amount;
  END IF;

  -- 4. Calculate taxes
  v_tax_amount := v_commission_gross * (v_model.base_tax_percentage / 100);
  v_commission_net := v_commission_gross - v_tax_amount;

  RETURN QUERY SELECT
    v_commission_gross,
    v_commission_pct,
    v_model.base_tax_type,
    v_model.base_tax_percentage,
    v_tax_amount,
    v_commission_net,
    v_model.id,
    v_model.type;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- FUNCTION 2: Create AP Bill for Repasse
-- =========================================

CREATE OR REPLACE FUNCTION fn_create_ap_bill_for_repasse(
  p_clinic_id UUID,
  p_appointment_id UUID,
  p_professional_id UUID,
  p_appointment_value DECIMAL
)
RETURNS TABLE(
  ap_bill_id UUID,
  commission_gross DECIMAL,
  commission_net DECIMAL,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_calc RECORD;
  v_professional RECORD;
  v_ap_bill_id UUID;
  v_error TEXT := NULL;
BEGIN
  BEGIN
    -- 1. Calculate commission
    SELECT INTO v_calc *
    FROM fn_calculate_commission(
      p_clinic_id,
      p_professional_id,
      p_appointment_value
    );

    -- 2. Get professional data
    SELECT id, name, document_number, email, phone
    INTO v_professional
    FROM professionals
    WHERE id = p_professional_id
      AND clinic_id = p_clinic_id;

    IF v_professional IS NULL THEN
      RAISE EXCEPTION 'Professional not found';
    END IF;

    -- 3. Create AP Bill
    INSERT INTO ap_bills (
      clinic_id,
      vendor_id,
      vendor_name,
      vendor_document,
      vendor_email,
      vendor_phone,
      appointment_id,
      description,
      bill_date,
      due_date,
      gross_amount,
      tax_amount,
      tax_type,
      net_amount,
      status
    ) VALUES (
      p_clinic_id,
      p_professional_id,
      v_professional.name,
      v_professional.document_number,
      v_professional.email,
      v_professional.phone,
      p_appointment_id,
      'Comissão Médica',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '10 days',
      v_calc.commission_gross,
      v_calc.tax_amount,
      v_calc.tax_type,
      v_calc.commission_net,
      'pending'
    )
    RETURNING id INTO v_ap_bill_id;

    -- 4. Create ledger entry
    INSERT INTO medical_commission_ledger (
      clinic_id,
      appointment_id,
      professional_id,
      model_id,
      appointment_value,
      commission_gross,
      tax_type,
      tax_percentage,
      tax_amount,
      commission_net,
      ap_bill_id,
      status,
      bill_created_at
    ) VALUES (
      p_clinic_id,
      p_appointment_id,
      p_professional_id,
      v_calc.model_id,
      p_appointment_value,
      v_calc.commission_gross,
      v_calc.tax_type,
      v_calc.tax_percentage,
      v_calc.tax_amount,
      v_calc.commission_net,
      v_ap_bill_id,
      'bill_created',
      CURRENT_TIMESTAMP
    );

    RETURN QUERY SELECT
      v_ap_bill_id,
      v_calc.commission_gross,
      v_calc.commission_net,
      true,
      NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::DECIMAL,
      NULL::DECIMAL,
      false,
      v_error;
  END;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- TRIGGER: Auto-create AP Bill on Attended Appointment
-- =========================================

CREATE OR REPLACE FUNCTION fn_auto_create_ap_bill_for_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Only process when appointment is marked as attended
  IF NEW.status = 'attended' AND OLD.status != 'attended' THEN
    IF NEW.professional_id IS NOT NULL AND NEW.estimated_value > 0 THEN
      SELECT INTO v_result *
      FROM fn_create_ap_bill_for_repasse(
        NEW.clinic_id,
        NEW.id,
        NEW.professional_id,
        COALESCE(NEW.estimated_value, 0)
      );

      IF v_result.success = false THEN
        RAISE WARNING 'Failed to create AP bill for repasse: %', v_result.error_message;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_auto_create_ap_bill_for_appointment ON appointments;

CREATE TRIGGER trg_auto_create_ap_bill_for_appointment
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_ap_bill_for_appointment();

-- =========================================
-- VIEW: Monthly Repasse Summary
-- =========================================

CREATE OR REPLACE VIEW vw_monthly_repasse_summary AS
SELECT
  mcl.clinic_id,
  p.id as professional_id,
  p.name as professional_name,
  TO_CHAR(mcl.calculation_date, 'YYYY-MM') as month,
  COUNT(mcl.id) as commission_count,
  SUM(mcl.appointment_value) as total_appointment_value,
  SUM(mcl.commission_gross) as total_commission_gross,
  SUM(mcl.tax_amount) as total_tax_amount,
  SUM(mcl.commission_net) as total_commission_net,
  COUNT(CASE WHEN mcl.status = 'bill_created' THEN 1 END) as bills_created,
  COUNT(CASE WHEN mcl.status = 'paid' THEN 1 END) as bills_paid
FROM medical_commission_ledger mcl
JOIN professionals p ON mcl.professional_id = p.id
GROUP BY mcl.clinic_id, p.id, p.name, TO_CHAR(mcl.calculation_date, 'YYYY-MM');

-- =========================================
-- VIEW: Professional Commission Models Status
-- =========================================

CREATE OR REPLACE VIEW vw_professional_commission_models AS
SELECT
  mcm.clinic_id,
  p.id as professional_id,
  p.name as professional_name,
  mcm.id as model_id,
  mcm.model_name,
  mcm.type,
  mcm.is_active,
  mcm.base_tax_type,
  mcm.base_tax_percentage,
  COUNT(mcl.id) as total_appointments_with_model,
  COALESCE(SUM(mcl.commission_net), 0) as total_commission_net
FROM medical_commission_models mcm
JOIN professionals p ON mcm.professional_id = p.id
LEFT JOIN medical_commission_ledger mcl ON mcm.id = mcl.model_id
GROUP BY mcm.clinic_id, p.id, p.name, mcm.id, mcm.model_name, mcm.type, 
         mcm.is_active, mcm.base_tax_type, mcm.base_tax_percentage;

-- =========================================
-- STORED PROCEDURE: Batch Create AP Bills
-- =========================================

CREATE OR REPLACE FUNCTION sp_batch_create_ap_bills_for_month(
  p_clinic_id UUID,
  p_month VARCHAR -- 'YYYY-MM'
)
RETURNS TABLE(
  created_count INT,
  failed_count INT,
  total_commission DECIMAL,
  error_message TEXT
) AS $$
DECLARE
  v_created_count INT := 0;
  v_failed_count INT := 0;
  v_total_commission DECIMAL := 0;
  v_appointment RECORD;
  v_result RECORD;
BEGIN
  -- Process all attended appointments without AP bills for the month
  FOR v_appointment IN
    SELECT a.id, a.clinic_id, a.professional_id, a.estimated_value
    FROM appointments a
    WHERE a.clinic_id = p_clinic_id
      AND a.status = 'attended'
      AND TO_CHAR(a.appointment_date, 'YYYY-MM') = p_month
      AND NOT EXISTS (
        SELECT 1 FROM medical_commission_ledger mcl
        WHERE mcl.appointment_id = a.id
      )
  LOOP
    SELECT INTO v_result *
    FROM fn_create_ap_bill_for_repasse(
      p_clinic_id,
      v_appointment.id,
      v_appointment.professional_id,
      v_appointment.estimated_value
    );

    IF v_result.success THEN
      v_created_count := v_created_count + 1;
      v_total_commission := v_total_commission + v_result.commission_gross;
    ELSE
      v_failed_count := v_failed_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_created_count,
    v_failed_count,
    v_total_commission,
    NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    0,
    0,
    0::DECIMAL,
    SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

CREATE INDEX idx_appointments_professional_status 
  ON appointments(clinic_id, professional_id, status);

CREATE INDEX idx_medical_commission_ledger_professional_month 
  ON medical_commission_ledger(professional_id, DATE_TRUNC('month', calculation_date));

-- =========================================
-- FINAL VALIDATIONS
-- =========================================

-- Verify tables created
SELECT COUNT(*) as tables_created FROM (
  SELECT 'medical_commission_models' UNION ALL
  SELECT 'commission_fixed_percent' UNION ALL
  SELECT 'commission_rate_tables' UNION ALL
  SELECT 'medical_commission_ledger'
) AS t;

-- Verify functions created
SELECT COUNT(*) as functions_created FROM pg_proc
WHERE proname IN (
  'fn_calculate_commission',
  'fn_create_ap_bill_for_repasse',
  'fn_auto_create_ap_bill_for_appointment',
  'sp_batch_create_ap_bills_for_month'
);

-- Verify views created
SELECT COUNT(*) as views_created FROM pg_views
WHERE viewname IN (
  'vw_monthly_repasse_summary',
  'vw_professional_commission_models'
);

COMMIT;
