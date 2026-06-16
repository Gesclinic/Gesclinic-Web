-- ============================================================
-- CONTAS A PAGAR ENTERPRISE HOSPITALAR - COMPLEMENTO
-- ============================================================
-- Reutiliza ap_bills e objetos existentes. Nao cria financial_payables.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payable_status') THEN
    ALTER TYPE payable_status ADD VALUE IF NOT EXISTS 'APPROVING';
    ALTER TYPE payable_status ADD VALUE IF NOT EXISTS 'APPROVED';
    ALTER TYPE payable_status ADD VALUE IF NOT EXISTS 'BLOCKED';
    ALTER TYPE payable_status ADD VALUE IF NOT EXISTS 'REVERSED';
  END IF;
END $$;

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'ap_bills'
      AND c.contype = 'c'
      AND a.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE ap_bills DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE ap_bills
DROP CONSTRAINT IF EXISTS ap_bills_status_enterprise_check;

ALTER TABLE ap_bills
ADD CONSTRAINT ap_bills_status_enterprise_check
CHECK (status IN ('OPEN', 'APPROVING', 'APPROVED', 'OVERDUE', 'PARTIAL', 'PAID', 'NEGOTIATED', 'CANCELED', 'REVERSED', 'BLOCKED'));

ALTER TABLE ap_bills
ADD COLUMN IF NOT EXISTS supplier_document TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS unit_id UUID,
ADD COLUMN IF NOT EXISTS unit_name TEXT,
ADD COLUMN IF NOT EXISTS financial_account_id UUID,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS dre_classification TEXT,
ADD COLUMN IF NOT EXISTS cost_allocations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS installment_total INTEGER,
ADD COLUMN IF NOT EXISTS parent_payable_id UUID,
ADD COLUMN IF NOT EXISTS approval_stage TEXT DEFAULT 'LAUNCHED',
ADD COLUMN IF NOT EXISTS approval_reason TEXT,
ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS canceled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_ap_bills_financial_account ON ap_bills(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_competency_clinic ON ap_bills(clinic_id, competency_date);
CREATE INDEX IF NOT EXISTS idx_ap_bills_dre_classification ON ap_bills(dre_classification);
CREATE INDEX IF NOT EXISTS idx_ap_bills_approval_stage ON ap_bills(approval_stage);
CREATE INDEX IF NOT EXISTS idx_ap_bills_parent_payable ON ap_bills(parent_payable_id);

CREATE OR REPLACE FUNCTION before_ap_bills_insert_or_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_amount := calculate_payable_net_amount(
    NEW.amount,
    NEW.interest_amount,
    NEW.fine_amount,
    NEW.discount_amount
  );

  NEW.balance_amount := NEW.net_amount - COALESCE(NEW.paid_value, 0);

  IF NEW.status IN ('CANCELED', 'NEGOTIATED', 'BLOCKED', 'REVERSED') THEN
    RETURN NEW;
  END IF;

  IF NEW.balance_amount <= 0 THEN
    NEW.status := 'PAID';
    NEW.approval_stage := 'PAID';
  ELSIF NEW.status IN ('APPROVING', 'APPROVED') THEN
    RETURN NEW;
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

CREATE OR REPLACE FUNCTION audit_ap_bills_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_clinic_id UUID;
  v_ap_bill_id UUID;
  v_changed_by UUID;
  v_approval_stage TEXT;
  v_dre_classification TEXT;
  v_action TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_clinic_id := OLD.clinic_id;
    v_ap_bill_id := OLD.id;
    v_changed_by := OLD.created_by;
    v_approval_stage := OLD.approval_stage;
    v_dre_classification := OLD.dre_classification;
    v_action := 'deleted';
  ELSE
    v_clinic_id := NEW.clinic_id;
    v_ap_bill_id := NEW.id;
    v_changed_by := NEW.created_by;
    v_approval_stage := NEW.approval_stage;
    v_dre_classification := NEW.dre_classification;
    v_action := CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'PAID' AND COALESCE(OLD.status, '') <> 'PAID' THEN 'paid'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'CANCELED' AND COALESCE(OLD.status, '') <> 'CANCELED' THEN 'canceled'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
    END;
  END IF;

  INSERT INTO payables_audit (
    clinic_id,
    ap_bill_id,
    action,
    old_values,
    new_values,
    changed_by,
    metadata
  )
  VALUES (
    v_clinic_id,
    v_ap_bill_id,
    v_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    v_changed_by,
    jsonb_build_object(
      'enterprise', true,
      'approval_stage', v_approval_stage,
      'dre_classification', v_dre_classification
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP VIEW IF EXISTS payables_summary;

CREATE VIEW payables_summary AS
SELECT
  ap_bills.clinic_id,
  COUNT(*) AS total_payables,
  COALESCE(SUM(CASE WHEN ap_bills.status = 'OPEN' THEN ap_bills.net_amount ELSE 0 END), 0) AS open_amount,
  COALESCE(SUM(CASE WHEN ap_bills.status = 'APPROVING' THEN ap_bills.net_amount ELSE 0 END), 0) AS approving_amount,
  COALESCE(SUM(CASE WHEN ap_bills.status = 'APPROVED' THEN ap_bills.net_amount ELSE 0 END), 0) AS approved_amount,
  COALESCE(SUM(CASE WHEN ap_bills.status = 'OVERDUE' THEN ap_bills.net_amount ELSE 0 END), 0) AS overdue_amount,
  COALESCE(SUM(CASE WHEN ap_bills.status = 'PAID' THEN ap_bills.net_amount ELSE 0 END), 0) AS paid_amount,
  COALESCE(SUM(CASE WHEN ap_bills.status = 'PARTIAL' THEN ap_bills.balance_amount ELSE 0 END), 0) AS partial_amount,
  COALESCE(SUM(CASE WHEN ap_bills.status = 'BLOCKED' THEN ap_bills.net_amount ELSE 0 END), 0) AS blocked_amount,
  COALESCE(SUM(CASE WHEN ap_bills.due_date = CURRENT_DATE AND ap_bills.status NOT IN ('PAID', 'CANCELED', 'REVERSED') THEN ap_bills.balance_amount ELSE 0 END), 0) AS due_today_amount,
  COALESCE(SUM(CASE WHEN ap_bills.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND ap_bills.status NOT IN ('PAID', 'CANCELED', 'REVERSED') THEN ap_bills.balance_amount ELSE 0 END), 0) AS due_next_7_days_amount,
  COALESCE(SUM(CASE WHEN ap_bills.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND ap_bills.status NOT IN ('PAID', 'CANCELED', 'REVERSED') THEN ap_bills.balance_amount ELSE 0 END), 0) AS due_next_30_days_amount,
  COALESCE(SUM(CASE WHEN ap_bills.dre_classification = 'OPERATIONAL' THEN ap_bills.net_amount ELSE 0 END), 0) AS operational_amount,
  COALESCE(SUM(CASE WHEN ap_bills.dre_classification = 'ADMINISTRATIVE' THEN ap_bills.net_amount ELSE 0 END), 0) AS administrative_amount,
  COALESCE(SUM(CASE WHEN ap_bills.dre_classification = 'ASSISTENTIAL' THEN ap_bills.net_amount ELSE 0 END), 0) AS assistential_amount,
  COALESCE(SUM(CASE WHEN ap_bills.status NOT IN ('PAID', 'CANCELED', 'REVERSED') THEN ap_bills.balance_amount ELSE 0 END), 0) AS forecast_outflow_amount,
  COALESCE(SUM(CASE WHEN ap_bills.status = 'PAID' THEN ap_bills.paid_value ELSE 0 END), 0) AS realized_outflow_amount,
  COUNT(CASE WHEN ap_bills.due_date < CURRENT_DATE AND ap_bills.status NOT IN ('PAID', 'CANCELED', 'REVERSED') THEN 1 END) AS overdue_count,
  COUNT(CASE WHEN ap_bills.due_date = CURRENT_DATE AND ap_bills.status NOT IN ('PAID', 'CANCELED', 'REVERSED') THEN 1 END) AS due_today_count,
  COUNT(CASE WHEN ap_bills.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND ap_bills.status NOT IN ('PAID', 'CANCELED', 'REVERSED') THEN 1 END) AS due_next_7_days_count,
  COUNT(CASE WHEN ap_bills.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND ap_bills.status NOT IN ('PAID', 'CANCELED', 'REVERSED') THEN 1 END) AS due_next_30_days_count
FROM ap_bills
WHERE ap_bills.status NOT IN ('CANCELED', 'REVERSED')
GROUP BY ap_bills.clinic_id;