-- =============================================================================
-- COMPREHENSIVE SQL MIGRATION - ETAPAS 1-6 CONSOLIDATED (CORRECTED)
-- This file includes all base tables, ETAPAs 1-6 with IF NOT EXISTS for idempotency
-- =============================================================================

-- ============= BASE DEPENDENCIES =============

CREATE TABLE IF NOT EXISTS user_clinic_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_clinic UNIQUE(user_id, clinic_id)
);

ALTER TABLE IF EXISTS user_clinic_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_can_view_own_roles ON user_clinic_roles;
CREATE POLICY users_can_view_own_roles ON user_clinic_roles FOR SELECT USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS ar_payer_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT unique_payer_type UNIQUE(clinic_id, name)
);

ALTER TABLE IF EXISTS ar_payer_type ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinic_users_can_view_payer_types ON ar_payer_type;
CREATE POLICY clinic_users_can_view_payer_types ON ar_payer_type FOR SELECT 
USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS ar_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  payer_name VARCHAR(255) NOT NULL,
  payer_email VARCHAR(255),
  payer_phone VARCHAR(20),
  payer_type_id UUID,
  appointment_id UUID,
  total_amount DECIMAL(14, 2) NOT NULL,
  amount_received DECIMAL(14, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_payer_type FOREIGN KEY (payer_type_id) REFERENCES ar_payer_type(id) ON DELETE SET NULL
);

ALTER TABLE IF EXISTS ar_receivables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinic_users_can_view_receivables ON ar_receivables;
CREATE POLICY clinic_users_can_view_receivables ON ar_receivables FOR SELECT 
USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ar_receivables_clinic ON ar_receivables(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ar_receivables_status ON ar_receivables(clinic_id, status);

CREATE TABLE IF NOT EXISTS ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  receivable_id UUID NOT NULL,
  payment_amount DECIMAL(14, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_receivable FOREIGN KEY (receivable_id) REFERENCES ar_receivables(id) ON DELETE CASCADE
);

ALTER TABLE IF EXISTS ar_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinic_users_can_view_payments ON ar_payments;
CREATE POLICY clinic_users_can_view_payments ON ar_payments FOR SELECT 
USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ar_payments_clinic ON ar_payments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_receivable ON ar_payments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_date ON ar_payments(payment_date);

-- ============= ETAPA 1: AUTOMAÇÕES FINANCEIRAS =============

CREATE TABLE IF NOT EXISTS financial_automation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  appointment_id UUID,
  automation_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_financial_automation_queue_clinic_id ON financial_automation_queue(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_automation_queue_status ON financial_automation_queue(clinic_id, status);

CREATE TABLE IF NOT EXISTS dre_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  month DATE NOT NULL,
  revenue DECIMAL(14, 2) DEFAULT 0,
  expenses DECIMAL(14, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dre_metrics_clinic_id ON dre_metrics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_dre_metrics_clinic_month ON dre_metrics(clinic_id, month);

CREATE TABLE IF NOT EXISTS financial_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  indicator_name VARCHAR(100),
  indicator_value DECIMAL(14, 4),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_financial_indicators_clinic_id ON financial_indicators(clinic_id);

-- ============= ETAPA 2: MOTOR RECEBIMENTO =============

CREATE TABLE IF NOT EXISTS ar_receivable_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  receivable_id UUID NOT NULL,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_receivable FOREIGN KEY (receivable_id) REFERENCES ar_receivables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_receivable_installments_clinic_id ON ar_receivable_installments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ar_receivable_installments_receivable_id ON ar_receivable_installments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_ar_receivable_installments_status_date ON ar_receivable_installments(clinic_id, status, due_date);

CREATE TABLE IF NOT EXISTS ar_payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  payment_id UUID NOT NULL,
  split_amount DECIMAL(14, 2),
  split_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES ar_payments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_payment_splits_clinic_id ON ar_payment_splits(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ar_payment_splits_payment_id ON ar_payment_splits(payment_id);

-- ============= ETAPA 3: PAYMENT SETTLEMENT =============

CREATE TABLE IF NOT EXISTS payment_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  payment_id UUID NOT NULL,
  receivable_id UUID NOT NULL,
  settlement_amount DECIMAL(14, 2) NOT NULL,
  settlement_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES ar_payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_receivable FOREIGN KEY (receivable_id) REFERENCES ar_receivables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_settlements_clinic_id ON payment_settlements(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payment_settlements_status ON payment_settlements(status);

CREATE TABLE IF NOT EXISTS payment_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  settlement_id UUID,
  receivable_id UUID NOT NULL,
  reversal_amount DECIMAL(14, 2) NOT NULL,
  reversal_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_settlement FOREIGN KEY (settlement_id) REFERENCES payment_settlements(id) ON DELETE SET NULL,
  CONSTRAINT fk_receivable FOREIGN KEY (receivable_id) REFERENCES ar_receivables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_reversals_clinic_id ON payment_reversals(clinic_id);

-- ============= ETAPA 4: REPASSE MÉDICO =============

CREATE TABLE IF NOT EXISTS medical_commission_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  professional_id UUID,
  model_name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  base_tax_type VARCHAR(50),
  base_tax_percentage DECIMAL(5, 2),
  min_commission_amount DECIMAL(14, 2),
  max_commission_amount DECIMAL(14, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_medical_commission_clinic_id ON medical_commission_models(clinic_id);

CREATE TABLE IF NOT EXISTS commission_fixed_percent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  model_id UUID NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES medical_commission_models(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commission_rate_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  model_id UUID NOT NULL,
  procedure_code VARCHAR(50),
  procedure_name VARCHAR(255),
  commission_percentage DECIMAL(5, 2),
  insurance_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES medical_commission_models(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medical_commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  appointment_id UUID,
  professional_id UUID,
  model_id UUID,
  appointment_value DECIMAL(14, 2),
  commission_gross DECIMAL(14, 2),
  tax_type VARCHAR(50),
  tax_percentage DECIMAL(5, 2),
  tax_amount DECIMAL(14, 2),
  commission_net DECIMAL(14, 2),
  ap_bill_id UUID,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- ============= ETAPA 6: CONCILIAÇÃO INTELIGENTE =============

CREATE TABLE IF NOT EXISTS bank_import_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  bank_account_id UUID,
  external_id VARCHAR(255),
  transaction_date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(14, 2) NOT NULL,
  transaction_type VARCHAR(50),
  balance_after DECIMAL(14, 2),
  payment_method VARCHAR(50),
  raw_data JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bank_import_clinic ON bank_import_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bank_import_date ON bank_import_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_import_status ON bank_import_transactions(clinic_id, status);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  bank_import_id UUID NOT NULL,
  payment_id UUID,
  receivable_id UUID,
  confidence_score DECIMAL(3, 2) DEFAULT 0.0,
  match_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  reconciliation_notes TEXT,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_import FOREIGN KEY (bank_import_id) REFERENCES bank_import_transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_clinic ON bank_reconciliations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_status ON bank_reconciliations(clinic_id, status);

CREATE TABLE IF NOT EXISTS reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  reconciliation_id UUID NOT NULL,
  action VARCHAR(50),
  user_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_reconciliation FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_audit_clinic ON reconciliation_audit_log(clinic_id);

-- ============= FINAL VALIDATION =============

SELECT COUNT(*) as total_tables FROM (
  SELECT 'user_clinic_roles' as table_name WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_clinic_roles')
  UNION ALL
  SELECT 'ar_payer_type' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ar_payer_type')
  UNION ALL
  SELECT 'ar_receivables' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ar_receivables')
  UNION ALL
  SELECT 'ar_payments' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ar_payments')
  UNION ALL
  SELECT 'ar_receivable_installments' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ar_receivable_installments')
  UNION ALL
  SELECT 'ar_payment_splits' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ar_payment_splits')
  UNION ALL
  SELECT 'payment_settlements' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_settlements')
  UNION ALL
  SELECT 'payment_reversals' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_reversals')
  UNION ALL
  SELECT 'medical_commission_models' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'medical_commission_models')
  UNION ALL
  SELECT 'commission_fixed_percent' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'commission_fixed_percent')
  UNION ALL
  SELECT 'commission_rate_tables' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'commission_rate_tables')
  UNION ALL
  SELECT 'medical_commission_ledger' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'medical_commission_ledger')
  UNION ALL
  SELECT 'bank_import_transactions' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bank_import_transactions')
  UNION ALL
  SELECT 'bank_reconciliations' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bank_reconciliations')
  UNION ALL
  SELECT 'reconciliation_audit_log' WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reconciliation_audit_log')
) as created_tables;

COMMIT;
