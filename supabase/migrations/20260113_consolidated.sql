-- ============================================================================
-- Consolidated from 20260113_COMPREHENSIVE_INIT.sql
-- ============================================================================

-- ============================================================
-- COMPREHENSIVE GESCLINIC DATABASE INITIALIZATION
-- ============================================================
-- Complete database schema for Gesclinic Web
-- Execute this script in order to set up all required tables
-- ============================================================

-- ============================================================
-- 1. BASE TABLES (Cl├¡nicas e Usu├írios)
-- ============================================================

CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  cnpj TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinics_name ON clinics(name);
CREATE INDEX IF NOT EXISTS idx_clinics_cnpj ON clinics(cnpj);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- 2. CORE MODULES: Agenda/Appointments
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birthdate DATE,
  document_id TEXT,
  gender VARCHAR(10),

  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  emergency_contact TEXT,
  emergency_phone TEXT,

  allergies TEXT,
  medical_notes TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_document ON patients(document_id);

CREATE TABLE IF NOT EXISTS patient_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_media_patient ON patient_media(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_media_clinic ON patient_media(clinic_id);

CREATE TABLE IF NOT EXISTS patients_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_files_patient ON patients_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_files_clinic ON patients_files(clinic_id);

CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  specialization TEXT,
  license_number TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_professionals_clinic ON professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_professionals_name ON professionals(name);
CREATE INDEX IF NOT EXISTS idx_professionals_active ON professionals(active);

CREATE TABLE IF NOT EXISTS professional_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  day_of_week INT,
  start_time TIME,
  end_time TIME,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_professional_schedules_professional ON professional_schedules(professional_id);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  code VARCHAR(50),
  name TEXT NOT NULL,
  description TEXT,

  duration_minutes INT,
  price DECIMAL(12, 2),

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_clinic ON services(clinic_id);
-- REMOVED: CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

CREATE TABLE IF NOT EXISTS service_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  code VARCHAR(50),
  name TEXT NOT NULL,
  description TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_groups_clinic ON service_groups(clinic_id);
-- REMOVED: CREATE INDEX IF NOT EXISTS idx_service_groups_code ON service_groups(code);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID REFERENCES patients(id),
  professional_id UUID REFERENCES professionals(id),
  service_id UUID REFERENCES services(id),

  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  end_time TIME,

  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE TABLE IF NOT EXISTS appointment_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  notification_type VARCHAR(50),
  sent_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointment_notification_logs_appointment ON appointment_notification_logs(appointment_id);

-- ============================================================
-- 3. PAYERS/PLANOS
-- ============================================================

CREATE TABLE IF NOT EXISTS payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  code VARCHAR(50),
  name TEXT NOT NULL,
  cnpj TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payers_clinic ON payers(clinic_id);
-- REMOVED: CREATE INDEX IF NOT EXISTS idx_payers_code ON payers(code);
CREATE INDEX IF NOT EXISTS idx_payers_name ON payers(name);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  payer_id UUID REFERENCES payers(id),

  name TEXT NOT NULL,
  code VARCHAR(50),
  description TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'clinic_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_plans_clinic ON plans(clinic_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'payer_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_plans_payer ON plans(payer_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS professional_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES payers(id),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_professional_payers_professional ON professional_payers(professional_id);

CREATE TABLE IF NOT EXISTS service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES payers(id),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  price DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_prices_service ON service_prices(service_id);
CREATE INDEX IF NOT EXISTS idx_service_prices_payer ON service_prices(payer_id);

CREATE TABLE IF NOT EXISTS professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_professional_services_professional ON professional_services(professional_id);

-- ============================================================
-- 4. FINANCIAL: Plano de Contas
-- ============================================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  code VARCHAR(50),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type in ('revenue', 'expense', 'asset', 'liability')),
  dre_group TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_clinic ON chart_of_accounts(clinic_id);
-- REMOVED: CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(type);

CREATE TABLE IF NOT EXISTS account_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  code VARCHAR(50),
  name TEXT NOT NULL,
  type TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_plans_clinic ON account_plans(clinic_id);

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  name TEXT NOT NULL,
  description TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_clinic ON cost_centers(clinic_id);

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  name TEXT NOT NULL,
  description TEXT,
  account_type VARCHAR(50),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_clinic ON finance_accounts(clinic_id);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  name TEXT NOT NULL,
  bank_name VARCHAR(100),
  account_number VARCHAR(100),

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_clinic ON bank_accounts(clinic_id);

-- ============================================================
-- 5. CONTAS A PAGAR (AP - Accounts Payable)
-- ============================================================

CREATE TABLE IF NOT EXISTS ap_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  supplier_id UUID,
  supplier_name TEXT,

  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  paid_value DECIMAL(12, 2) DEFAULT 0,

  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'open',

  payment_method VARCHAR(100),
  chart_account_id UUID REFERENCES chart_of_accounts(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  category_id UUID REFERENCES account_plans(id),

  recurring_config_id UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ap_bills_clinic ON ap_bills(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_status ON ap_bills(status);
CREATE INDEX IF NOT EXISTS idx_ap_bills_due_date ON ap_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_bills_paid_at ON ap_bills(paid_at);

-- NOTE: ap_items table is created by 20260111_ap_items_and_taxes.sql
-- Skipping ap_items definition to avoid conflicts

-- ============================================================
-- 6. CONTAS A RECEBER (AR - Accounts Receivable)
-- ============================================================

CREATE TABLE IF NOT EXISTS ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  patient_id UUID,
  patient_name TEXT,

  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  received_value DECIMAL(12, 2) DEFAULT 0,

  due_date DATE,
  received_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'open',

  payment_method VARCHAR(100),
  chart_account_id UUID REFERENCES chart_of_accounts(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ar_invoices_clinic ON ar_invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status ON ar_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_due_date ON ar_invoices(due_date);

CREATE TABLE IF NOT EXISTS ar_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  patient_id UUID,
  patient_name TEXT,

  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  received_value DECIMAL(12, 2) DEFAULT 0,

  due_date DATE,
  received_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'open',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ar_receivables_clinic ON ar_receivables(clinic_id);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  invoice_number TEXT,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,

  issued_date DATE,
  due_date DATE,
  paid_date DATE,

  status VARCHAR(50) DEFAULT 'open',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================================
-- 7. CONTAS RECURSIVAS
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  supplier_id UUID,
  supplier_name TEXT NOT NULL,

  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,

  frequency VARCHAR(50) NOT NULL,
  day_of_month INT,

  chart_account_id UUID REFERENCES chart_of_accounts(id),
  cost_center_id UUID REFERENCES cost_centers(id),

  active BOOLEAN DEFAULT TRUE,
  next_due_date DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recurring_clinic ON recurring_accounts_payable(clinic_id);

-- ============================================================
-- 8. FLUXO DE CAIXA
-- ============================================================
-- NOTE: cash_flow is created as a VIEW by 20260112_create_cash_flow.sql
-- This file skips the table definition to avoid conflicts

-- ============================================================
-- 9. REPASSE M├ëDICO
-- ============================================================

CREATE TABLE IF NOT EXISTS repasse_medico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  professional_id UUID,
  professional_name TEXT,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  total_appointments INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  amount_due DECIMAL(12, 2) DEFAULT 0,
  amount_paid DECIMAL(12, 2) DEFAULT 0,

  status VARCHAR(50) DEFAULT 'pending',

  payment_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repasse_medico_clinic ON repasse_medico(clinic_id);
CREATE INDEX IF NOT EXISTS idx_repasse_medico_professional ON repasse_medico(professional_id);
CREATE INDEX IF NOT EXISTS idx_repasse_medico_period ON repasse_medico(period_start, period_end);

CREATE TABLE IF NOT EXISTS repasse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  professional_id UUID,

  percentage DECIMAL(5, 2),
  fixed_amount DECIMAL(12, 2),

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repasse_config_clinic ON repasse_config(clinic_id);

CREATE TABLE IF NOT EXISTS repasse_ajuste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  repasse_id UUID NOT NULL REFERENCES repasse_medico(id) ON DELETE CASCADE,

  description TEXT,
  adjustment_amount DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repasse_ajuste_repasse ON repasse_ajuste(repasse_id);

-- ============================================================
-- 10. ESTOQUE (Stock Management)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  code VARCHAR(50),
  name TEXT NOT NULL,
  description TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_categories_clinic ON stock_categories(clinic_id);
CREATE INDEX IF NOT EXISTS idx_stock_categories_code ON stock_categories(code);

CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  category_id UUID REFERENCES stock_categories(id),

  name TEXT NOT NULL,
  description TEXT,
  sku VARCHAR(100),

  quantity_on_hand DECIMAL(12, 2) DEFAULT 0,
  minimum_quantity DECIMAL(12, 2),
  unit_cost DECIMAL(12, 2),

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_items_clinic ON stock_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_sku ON stock_items(sku);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),

  movement_type VARCHAR(50), -- 'entry', 'exit', 'adjustment'
  quantity DECIMAL(12, 2) NOT NULL,

  reference_type VARCHAR(50),
  reference_id UUID,

  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_clinic ON stock_movements(clinic_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

CREATE TABLE IF NOT EXISTS stock_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  name TEXT NOT NULL,
  cnpj TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_suppliers_clinic ON stock_suppliers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_stock_suppliers_name ON stock_suppliers(name);

CREATE TABLE IF NOT EXISTS stock_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  code VARCHAR(50),
  name VARCHAR(20) NOT NULL,
  description TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_units_clinic ON stock_units(clinic_id);
-- REMOVED: CREATE INDEX IF NOT EXISTS idx_stock_units_code ON stock_units(code);

CREATE TABLE IF NOT EXISTS stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  name TEXT NOT NULL,
  description TEXT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_locations_clinic ON stock_locations(clinic_id);

CREATE TABLE IF NOT EXISTS stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  request_number VARCHAR(50),
  requester_id UUID,

  purpose TEXT,
  status VARCHAR(50) DEFAULT 'pending',

  approval_status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_requests_clinic ON stock_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON stock_requests(status);

CREATE TABLE IF NOT EXISTS stock_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),

  quantity_requested DECIMAL(12, 2),
  quantity_approved DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_request_items_request ON stock_request_items(stock_request_id);

-- ============================================================
-- 11. OR├çAMENTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID REFERENCES patients(id),

  number TEXT,
  status VARCHAR(50) DEFAULT 'draft',

  total_amount DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_clinic ON orcamentos(clinic_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_patient ON orcamentos(patient_id);

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,

  description TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(12, 2),
  total_price DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento ON orcamento_itens(orcamento_id);

CREATE TABLE IF NOT EXISTS orcamento_profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orcamento_profissionais_orcamento ON orcamento_profissionais(orcamento_id);

CREATE TABLE IF NOT EXISTS orcamento_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,

  description TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orcamento_materiais_orcamento ON orcamento_materiais(orcamento_id);

-- ============================================================
-- 12. LAUDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS laudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  title TEXT NOT NULL,
  content TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_laudos_clinic ON laudos(clinic_id);

-- ============================================================
-- 13. CONCILIA├ç├âO BANC├üRIA
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(100),
  account_number VARCHAR(100),
  account_holder VARCHAR(255),

  bank_balance DECIMAL(12, 2) DEFAULT 0,
  system_balance DECIMAL(12, 2) DEFAULT 0,
  last_reconciliation_date DATE,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinic_bank_accounts_clinic ON clinic_bank_accounts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_bank_accounts_active ON clinic_bank_accounts(active);

CREATE TABLE IF NOT EXISTS conciliation_bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  bank_account_id UUID REFERENCES clinic_bank_accounts(id),

  statement_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  bank_id VARCHAR(255),

  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  linked_financial_id UUID,
  linked_type VARCHAR(20),
  divergence_reason TEXT,

  import_batch_id UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_conciliation_bank_statements_clinic ON conciliation_bank_statements(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conciliation_bank_statements_status ON conciliation_bank_statements(status);
CREATE INDEX IF NOT EXISTS idx_conciliation_bank_statements_date ON conciliation_bank_statements(statement_date);
CREATE INDEX IF NOT EXISTS idx_conciliation_bank_statements_account ON conciliation_bank_statements(bank_account_id);

CREATE TABLE IF NOT EXISTS conciliation_link_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_statement_id UUID NOT NULL REFERENCES conciliation_bank_statements(id) ON DELETE CASCADE,

  financial_id UUID,
  financial_type VARCHAR(20),

  action VARCHAR(50) NOT NULL,
  action_notes TEXT,

  user_id UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conciliation_link_history_statement ON conciliation_link_history(bank_statement_id);
CREATE INDEX IF NOT EXISTS idx_conciliation_link_history_financial ON conciliation_link_history(financial_id);
CREATE INDEX IF NOT EXISTS idx_conciliation_link_history_created ON conciliation_link_history(created_at);

CREATE TABLE IF NOT EXISTS conciliation_auto_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  rule_name VARCHAR(255) NOT NULL,
  description TEXT,

  pattern_keywords TEXT[],
  min_amount DECIMAL(12, 2),
  max_amount DECIMAL(12, 2),
  transaction_type VARCHAR(20),

  default_category_id UUID REFERENCES chart_of_accounts(id),
  default_cost_center_id UUID REFERENCES cost_centers(id),
  default_payment_method VARCHAR(100),
  auto_create_if_no_match BOOLEAN DEFAULT FALSE,

  active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conciliation_auto_rules_clinic ON conciliation_auto_rules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conciliation_auto_rules_active ON conciliation_auto_rules(active);

CREATE TABLE IF NOT EXISTS conciliation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_statement_id UUID NOT NULL REFERENCES conciliation_bank_statements(id) ON DELETE CASCADE,

  suggested_financial_id UUID,
  suggested_type VARCHAR(20),

  match_score DECIMAL(3, 2),
  match_reason VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conciliation_suggestions_statement ON conciliation_suggestions(bank_statement_id);
CREATE INDEX IF NOT EXISTS idx_conciliation_suggestions_financial ON conciliation_suggestions(suggested_financial_id);

CREATE TABLE IF NOT EXISTS conciliation_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),

  bank_name VARCHAR(255),
  account_number VARCHAR(100),
  import_date DATE,

  total_records INT DEFAULT 0,
  total_amount_credit DECIMAL(12, 2) DEFAULT 0,
  total_amount_debit DECIMAL(12, 2) DEFAULT 0,

  import_status VARCHAR(50) DEFAULT 'processing',
  import_error_message TEXT,

  imported_by UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conciliation_import_batches_clinic ON conciliation_import_batches(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conciliation_import_batches_date ON conciliation_import_batches(import_date);

-- ============================================================
-- 14. TRIGGERS AUTOM├üTICOS PARA UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinics_timestamp ON clinics;
CREATE TRIGGER trg_clinics_timestamp
BEFORE UPDATE ON clinics
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_patients_timestamp ON patients;
CREATE TRIGGER trg_patients_timestamp
BEFORE UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_professionals_timestamp ON professionals;
CREATE TRIGGER trg_professionals_timestamp
BEFORE UPDATE ON professionals
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_appointments_timestamp ON appointments;
CREATE TRIGGER trg_appointments_timestamp
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_services_timestamp ON services;
CREATE TRIGGER trg_services_timestamp
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_ap_bills_timestamp ON ap_bills;
CREATE TRIGGER trg_ap_bills_timestamp
BEFORE UPDATE ON ap_bills
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_ar_invoices_timestamp ON ar_invoices;
CREATE TRIGGER trg_ar_invoices_timestamp
BEFORE UPDATE ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- NOTE: cash_flow is a VIEW, not a table, so no trigger
-- DROP TRIGGER IF EXISTS trg_cash_flow_timestamp ON cash_flow;

DROP TRIGGER IF EXISTS trg_conciliation_bank_statements_timestamp ON conciliation_bank_statements;
CREATE TRIGGER trg_conciliation_bank_statements_timestamp
BEFORE UPDATE ON conciliation_bank_statements
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_clinic_bank_accounts_timestamp ON clinic_bank_accounts;
CREATE TRIGGER trg_clinic_bank_accounts_timestamp
BEFORE UPDATE ON clinic_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_stock_items_timestamp ON stock_items;
CREATE TRIGGER trg_stock_items_timestamp
BEFORE UPDATE ON stock_items
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_orcamentos_timestamp ON orcamentos;
CREATE TRIGGER trg_orcamentos_timestamp
BEFORE UPDATE ON orcamentos
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- END OF SCHEMA
-- ============================================================

-- ============================================================================
-- Consolidated from 20260113_add_clinic_fields.sql
-- ============================================================================

-- Adicionar campos faltantes na tabela clinics
-- Data: 13/01/2026

-- Verificar se as colunas j├í existem e adicionar se necess├írio
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS clinic_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS fantasy_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS zipcode TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'matriz' CHECK (clinic_type IN ('matriz', 'filial')),
ADD COLUMN IF NOT EXISTS parent_clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Criar ├¡ndices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clinics_clinic_code ON clinics(clinic_code);
CREATE INDEX IF NOT EXISTS idx_clinics_clinic_type ON clinics(clinic_type);
CREATE INDEX IF NOT EXISTS idx_clinics_parent_clinic_id ON clinics(parent_clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(status);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_clinics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clinics_updated_at_trigger ON clinics;

CREATE TRIGGER update_clinics_updated_at_trigger
BEFORE UPDATE ON clinics
FOR EACH ROW
EXECUTE FUNCTION update_clinics_updated_at();

-- ============================================================================
-- Consolidated from 20260113_add_users_fields.sql
-- ============================================================================

-- Adicionar campos faltantes na tabela users
-- Data: 13/01/2026

-- Adicionar colunas faltantes na tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'recepcao',
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Criar ├¡ndices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;

CREATE TRIGGER update_users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();
