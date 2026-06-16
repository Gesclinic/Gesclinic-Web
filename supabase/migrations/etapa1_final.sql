-- ETAPA 1: Appointment Financial Integration - Final Setup
-- Insert default rules for clinics without rules
INSERT INTO appointment_financial_rules (clinic_id, name, description, is_active)
SELECT c.id, 'Regra Padrão', 'Automação de faturamento padrão', true
FROM clinics c
WHERE NOT EXISTS (SELECT 1 FROM appointment_financial_rules WHERE clinic_id = c.id);

-- RLS Policies for appointment_financial_rules
CREATE POLICY afr_select ON appointment_financial_rules 
FOR SELECT 
USING (clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY afr_insert ON appointment_financial_rules 
FOR INSERT 
WITH CHECK (clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')));

-- RLS Policies for appointment_to_receivable_mapping
CREATE POLICY atrm_select ON appointment_to_receivable_mapping 
FOR SELECT 
USING (clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()));

-- RLS Policies for appointment_financial_audit_logs
CREATE POLICY afal_select ON appointment_financial_audit_logs 
FOR SELECT 
USING (clinic_id IN (SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()));

-- Trigger function for appointment finalization
CREATE OR REPLACE FUNCTION trigger_appointment_finalized_create_receivable()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO appointment_financial_audit_logs (clinic_id, appointment_id, operation_type, operation_details, created_by)
    VALUES (NEW.clinic_id, NEW.id, 'receivable_created', jsonb_build_object('trigger', 'appointment_status_change'), 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on appointments table
CREATE TRIGGER trg_appointment_finalized_create_receivable
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION trigger_appointment_finalized_create_receivable();
