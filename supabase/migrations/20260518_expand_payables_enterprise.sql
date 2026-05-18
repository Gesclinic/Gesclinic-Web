-- ============================================================
-- EXPAND CONTAS A PAGAR FOR ENTERPRISE FEATURES
-- ============================================================
-- Adds: recurrence, installments, attachments, approval, audit
-- Date: 2026-05-18

-- ============================================================
-- 1. CREATE ENUMS
-- ============================================================

-- Status da Conta a Pagar
CREATE TYPE payable_status AS ENUM (
  'OPEN',
  'OVERDUE',
  'PARTIAL',
  'PAID',
  'CANCELED',
  'NEGOTIATED'
);

-- Tipo de Despesa
CREATE TYPE payable_type AS ENUM (
  'FIXED',
  'VARIABLE',
  'TAX',
  'PAYROLL',
  'SUPPLIER',
  'SERVICE',
  'RENT',
  'UTILITIES'
);

-- Método de Pagamento
CREATE TYPE payment_method_enum AS ENUM (
  'PIX',
  'TED',
  'DOC',
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_SLIP',
  'OTHER'
);

-- Tipo de Recorrência
CREATE TYPE recurrence_type AS ENUM (
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUAL',
  'ANNUAL'
);

-- ============================================================
-- 2. EXPAND ap_bills TABLE
-- ============================================================

ALTER TABLE ap_bills
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_series TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'SUPPLIER' CHECK (type IN ('FIXED', 'VARIABLE', 'TAX', 'PAYROLL', 'SUPPLIER', 'SERVICE', 'RENT', 'UTILITIES')),
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS competency_date DATE,
ADD COLUMN IF NOT EXISTS interest_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT,
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_installment_id UUID,
ADD COLUMN IF NOT EXISTS has_invoice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invoice_xml_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS payment_bank TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_forecast BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================================
-- 3. CREATE RECURRING CONFIG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payable_recurring_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  template_ap_bill_id UUID REFERENCES ap_bills(id) ON DELETE CASCADE,
  
  recurrence_type recurrence_type NOT NULL,
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  recurrence_end_date DATE,
  
  is_active BOOLEAN DEFAULT TRUE,
  last_generated_date DATE,
  next_generation_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT positive_interval CHECK (recurrence_interval > 0)
);

CREATE INDEX IF NOT EXISTS idx_payable_recurring_clinic ON payable_recurring_configs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payable_recurring_active ON payable_recurring_configs(is_active);

-- ============================================================
-- 4. CREATE PAYMENT ATTACHMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payable_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  ap_bill_id UUID NOT NULL REFERENCES ap_bills(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  
  attachment_type VARCHAR(50), -- 'invoice', 'proof', 'nfe', 'contract', 'other'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_file_type CHECK (attachment_type IN ('invoice', 'proof', 'nfe', 'contract', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_payable_attachments_bill ON payable_attachments(ap_bill_id);
CREATE INDEX IF NOT EXISTS idx_payable_attachments_clinic ON payable_attachments(clinic_id);

-- ============================================================
-- 5. CREATE PAYABLES AUDIT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payables_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  ap_bill_id UUID NOT NULL,
  
  action TEXT NOT NULL, -- 'created', 'updated', 'paid', 'canceled', 'deleted'
  
  old_values JSONB,
  new_values JSONB,
  
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_payables_audit_bill ON payables_audit(ap_bill_id);
CREATE INDEX IF NOT EXISTS idx_payables_audit_clinic ON payables_audit(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payables_audit_action ON payables_audit(action);

-- ============================================================
-- 6. ADD ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ap_bills_competency ON ap_bills(competency_date);
CREATE INDEX IF NOT EXISTS idx_ap_bills_supplier_id ON ap_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_chart_account ON ap_bills(chart_account_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_cost_center ON ap_bills(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_recurring ON ap_bills(is_recurring);
CREATE INDEX IF NOT EXISTS idx_ap_bills_installments ON ap_bills(parent_installment_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_created_by ON ap_bills(created_by);
CREATE INDEX IF NOT EXISTS idx_ap_bills_clinic_status_date ON ap_bills(clinic_id, status, due_date);

-- ============================================================
-- 7. CREATE FUNCTION: Calculate net amount
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_payable_net_amount(
  p_amount DECIMAL,
  p_interest DECIMAL,
  p_fine DECIMAL,
  p_discount DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN COALESCE(p_amount, 0) + COALESCE(p_interest, 0) + COALESCE(p_fine, 0) - COALESCE(p_discount, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 8. UPDATE FUNCTION: Auto calculate fields
-- ============================================================

CREATE OR REPLACE FUNCTION before_ap_bills_insert_or_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate net_amount
  NEW.net_amount := calculate_payable_net_amount(
    NEW.amount,
    NEW.interest_amount,
    NEW.fine_amount,
    NEW.discount_amount
  );
  
  -- Auto-calculate balance_amount
  NEW.balance_amount := NEW.net_amount - COALESCE(NEW.paid_value, 0);
  
  -- Update status based on balance
  IF NEW.balance_amount <= 0 THEN
    NEW.status := 'PAID';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.balance_amount > 0 THEN
    NEW.status := 'OVERDUE';
  ELSIF NEW.balance_amount > 0 AND NEW.balance_amount < NEW.net_amount THEN
    NEW.status := 'PARTIAL';
  ELSIF NEW.balance_amount = NEW.net_amount THEN
    NEW.status := 'OPEN';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_ap_bills_before_insert_update ON ap_bills;

CREATE TRIGGER trg_ap_bills_before_insert_update
BEFORE INSERT OR UPDATE ON ap_bills
FOR EACH ROW
EXECUTE FUNCTION before_ap_bills_insert_or_update();

-- ============================================================
-- 9. CREATE FUNCTION: Audit trigger
-- ============================================================

CREATE OR REPLACE FUNCTION audit_ap_bills_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payables_audit (
    clinic_id,
    ap_bill_id,
    action,
    old_values,
    new_values,
    changed_by
  )
  VALUES (
    NEW.clinic_id,
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    NEW.created_by
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate audit trigger
DROP TRIGGER IF EXISTS trg_ap_bills_audit ON ap_bills;

CREATE TRIGGER trg_ap_bills_audit
AFTER INSERT OR UPDATE OR DELETE ON ap_bills
FOR EACH ROW
EXECUTE FUNCTION audit_ap_bills_changes();

-- ============================================================
-- 10. ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE payable_recurring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payable_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. CREATE RLS POLICIES
-- ============================================================

-- Recurring Configs
CREATE POLICY "users_can_view_clinic_recurring_configs"
ON payable_recurring_configs FOR SELECT
USING (clinic_id IN (SELECT id FROM clinics WHERE id = payable_recurring_configs.clinic_id));

CREATE POLICY "users_can_create_recurring_configs"
ON payable_recurring_configs FOR INSERT
WITH CHECK (clinic_id IN (SELECT id FROM clinics WHERE id = payable_recurring_configs.clinic_id));

CREATE POLICY "users_can_update_recurring_configs"
ON payable_recurring_configs FOR UPDATE
USING (clinic_id IN (SELECT id FROM clinics WHERE id = payable_recurring_configs.clinic_id));

CREATE POLICY "users_can_delete_recurring_configs"
ON payable_recurring_configs FOR DELETE
USING (clinic_id IN (SELECT id FROM clinics WHERE id = payable_recurring_configs.clinic_id));

-- Attachments
CREATE POLICY "users_can_view_clinic_attachments"
ON payable_attachments FOR SELECT
USING (clinic_id IN (SELECT id FROM clinics WHERE id = payable_attachments.clinic_id));

CREATE POLICY "users_can_create_attachments"
ON payable_attachments FOR INSERT
WITH CHECK (clinic_id IN (SELECT id FROM clinics WHERE id = payable_attachments.clinic_id));

CREATE POLICY "users_can_delete_attachments"
ON payable_attachments FOR DELETE
USING (clinic_id IN (SELECT id FROM clinics WHERE id = payable_attachments.clinic_id));

-- Audit
CREATE POLICY "users_can_view_clinic_audit"
ON payables_audit FOR SELECT
USING (clinic_id IN (SELECT id FROM clinics WHERE id = payables_audit.clinic_id));

-- ============================================================
-- 12. UPDATE ap_bills RLS (if not already exist)
-- ============================================================

DROP POLICY IF EXISTS "users_can_view_clinic_bills" ON ap_bills;
DROP POLICY IF EXISTS "users_can_create_bills" ON ap_bills;
DROP POLICY IF EXISTS "users_can_update_bills" ON ap_bills;
DROP POLICY IF EXISTS "users_can_delete_bills" ON ap_bills;

CREATE POLICY "users_can_view_clinic_bills"
ON ap_bills FOR SELECT
USING (clinic_id IN (SELECT id FROM clinics WHERE id = ap_bills.clinic_id));

CREATE POLICY "users_can_create_bills"
ON ap_bills FOR INSERT
WITH CHECK (clinic_id IN (SELECT id FROM clinics WHERE id = ap_bills.clinic_id));

CREATE POLICY "users_can_update_bills"
ON ap_bills FOR UPDATE
USING (clinic_id IN (SELECT id FROM clinics WHERE id = ap_bills.clinic_id));

CREATE POLICY "users_can_delete_bills"
ON ap_bills FOR DELETE
USING (clinic_id IN (SELECT id FROM clinics WHERE id = ap_bills.clinic_id));

-- ============================================================
-- 13. CREATE VIEW: Payables Summary for Dashboard
-- ============================================================

CREATE OR REPLACE VIEW payables_summary AS
SELECT
  ap_bills.clinic_id,
  COUNT(*) as total_payables,
  SUM(CASE WHEN ap_bills.status = 'OPEN' THEN ap_bills.net_amount ELSE 0 END) as open_amount,
  SUM(CASE WHEN ap_bills.status = 'OVERDUE' THEN ap_bills.net_amount ELSE 0 END) as overdue_amount,
  SUM(CASE WHEN ap_bills.status = 'PAID' THEN ap_bills.net_amount ELSE 0 END) as paid_amount,
  SUM(CASE WHEN ap_bills.status = 'PARTIAL' THEN ap_bills.balance_amount ELSE 0 END) as partial_amount,
  COUNT(CASE WHEN ap_bills.due_date <= CURRENT_DATE AND ap_bills.status != 'PAID' THEN 1 END) as overdue_count,
  COUNT(CASE WHEN ap_bills.due_date = CURRENT_DATE THEN 1 END) as due_today_count,
  COUNT(CASE WHEN ap_bills.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND ap_bills.status != 'PAID' THEN 1 END) as due_next_30_days_count
FROM ap_bills
WHERE ap_bills.status != 'CANCELED'
GROUP BY ap_bills.clinic_id;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
