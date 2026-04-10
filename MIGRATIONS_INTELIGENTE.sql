-- ============================================================
-- GESCLINIC SUPABASE - MIGRATIONS INTELIGENTES
-- ============================================================
-- Data: 15 de Janeiro de 2026
-- Status: Cria tabelas base primeiro, depois aplicar extensions
-- ============================================================

-- ============================================================
-- FASE 1: CRIAR TABELAS BASE (FOUNDATION)
-- ============================================================

-- 1. CLINICS (Base)
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

-- 2. USERS (Base)
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

-- 3. PATIENTS (Base)
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

-- 4. PROFESSIONALS (Base)
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

-- 5. SERVICES (Base)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  code VARCHAR(50),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_clinic ON services(clinic_id);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

-- 6. SERVICE GROUPS (Base)
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

-- 7. ROOMS (Base)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  unit VARCHAR(100),
  description TEXT,
  capacity INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_clinic ON rooms(clinic_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);

-- 8. APPOINTMENTS (Base)
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

-- 9. PAYERS (Base)
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
CREATE INDEX IF NOT EXISTS idx_payers_name ON payers(name);

-- 10. PLANS (Base) - TEXT ID
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  clinic_id UUID,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  code VARCHAR(50),
  max_users INT DEFAULT 1,
  max_doctors INT DEFAULT 1,
  has_financial BOOLEAN DEFAULT FALSE,
  has_stock BOOLEAN DEFAULT FALSE,
  has_reports BOOLEAN DEFAULT FALSE,
  has_multi_unit BOOLEAN DEFAULT FALSE,
  stripe_product_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);

-- 11. CHART OF ACCOUNTS (Base)
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
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(type);

-- 12. ACCOUNT PLANS (Base)
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

-- 13. COST CENTERS (Base)
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_clinic ON cost_centers(clinic_id);

-- 14. AP BILLS (Contas a Pagar)
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

-- 15. AP ITEMS
CREATE TABLE IF NOT EXISTS ap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ap_bill_id UUID NOT NULL REFERENCES ap_bills(id) ON DELETE CASCADE,
  description TEXT,
  quantity DECIMAL(12, 2),
  unit_price DECIMAL(12, 2),
  amount DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ap_items_ap_bill ON ap_items(ap_bill_id);

-- 16. AR RECEIVABLES (Contas a Receber)
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
CREATE INDEX IF NOT EXISTS idx_ar_receivables_status ON ar_receivables(status);

-- ============================================================
-- FASE 2: CRIAR TABELAS COMPLEMENTARES
-- ============================================================

-- 17. ROLES (RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

INSERT INTO roles (name, label, description) VALUES
  ('admin', 'Administrador', 'Acesso total ao sistema'),
  ('gestor', 'Gestor', 'Visão executiva, financeiro e operacional'),
  ('financeiro', 'Financeiro', 'Controle de finanças e faturamento'),
  ('profissional', 'Profissional', 'Agenda, pacientes e repasse'),
  ('recepcao', 'Recepção', 'Agenda e lista de pacientes')
ON CONFLICT (name) DO NOTHING;

-- 18. PERMISSIONS (RBAC)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  module TEXT,
  action TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 19. ROLE_PERMISSIONS (RBAC)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- 20. USER_ROLES (RBAC)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_clinic_id ON user_roles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ============================================================
-- FASE 3: ADICIONAR COLUNAS COMPLEMENTARES
-- ============================================================

-- Adicionar colunas a clinics
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS clinic_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS fantasy_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS clinic_type TEXT DEFAULT 'matriz' CHECK (clinic_type IN ('matriz', 'filial')),
ADD COLUMN IF NOT EXISTS parent_clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7);

-- Adicionar colunas a users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso'));

-- Adicionar colunas a patients
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS cell_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number VARCHAR(20),
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS payer_id UUID,
ADD COLUMN IF NOT EXISTS plan_id UUID,
ADD COLUMN IF NOT EXISTS insurance_id_number TEXT,
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_relationship VARCHAR(100),
ADD COLUMN IF NOT EXISTS record_number TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS prontuario_numero VARCHAR(50) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_patients_prontuario ON patients(prontuario_numero);
CREATE INDEX IF NOT EXISTS idx_patients_cell_phone ON patients(cell_phone);

-- Adicionar colunas a professionals
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Adicionar colunas a services
ALTER TABLE services
ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 30,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);

-- Adicionar colunas a rooms
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_rooms_code_clinic ON rooms(code, clinic_id);

-- Adicionar colunas a appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id);

-- Adicionar colunas a ar_receivables
ALTER TABLE ar_receivables
ADD COLUMN IF NOT EXISTS data_vencimento DATE,
ADD COLUMN IF NOT EXISTS data_recebimento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(10,2);

-- ============================================================
-- FASE 4: TABELAS DE AUDITORIA
-- ============================================================

-- 21. APPOINTMENT AUDIT LOGS
CREATE TABLE IF NOT EXISTS appointment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_role TEXT,
  performed_at TIMESTAMPTZ DEFAULT now(),
  context JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_appointment_id ON appointment_audit_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_performed_at ON appointment_audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_action_type ON appointment_audit_logs(action_type);

-- 22. APPOINTMENT FINANCIAL AUDIT LOGS
CREATE TABLE IF NOT EXISTS appointment_financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  financial_event_type TEXT NOT NULL,
  related_entity TEXT,
  related_entity_id UUID,
  amount NUMERIC(12,2),
  previous_amount NUMERIC(12,2),
  status TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_role TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_financial_audit_logs_appointment_id ON appointment_financial_audit_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_financial_audit_logs_event_type ON appointment_financial_audit_logs(financial_event_type);

-- 23. SUGGESTION AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.suggestion_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  action_taken VARCHAR(50) NOT NULL,
  result JSONB,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_audit_logs_clinic_id ON public.suggestion_audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_audit_logs_executed_at ON public.suggestion_audit_logs(executed_at);

-- ============================================================
-- FASE 5: TABELAS DE SUBSCRIÇÃO E PAGAMENTO
-- ============================================================

-- 24. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2),
  price_annual DECIMAL(10, 2),
  max_users INT DEFAULT 5,
  max_patients INT DEFAULT 1000,
  max_appointments_per_month INT,
  features JSONB DEFAULT '{"agenda": false, "financeiro": false, "estoque": false}'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  trial_days INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);

-- 25. CLINIC SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly',
  next_billing_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  payment_method JSONB,
  payment_status TEXT CHECK (payment_status IN ('pending', 'active', 'past_due', 'canceled')) DEFAULT 'pending',
  status TEXT CHECK (status IN ('active', 'trial', 'suspended', 'canceled', 'expired')) DEFAULT 'trial',
  is_trial BOOLEAN DEFAULT TRUE,
  trial_ended_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic ON clinic_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_plan ON clinic_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_status ON clinic_subscriptions(status);

-- 26. PAYMENT HISTORY
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES clinic_subscriptions(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  period_start DATE,
  period_end DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_history_clinic ON payment_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id);

-- 27. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES clinic_subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  invoice_number VARCHAR(50) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  issued_at TIMESTAMP WITH TIME ZONE,
  due_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);

-- ============================================================
-- FASE 6: TABELAS COMPLEMENTARES
-- ============================================================

-- 28. PROFESSIONAL SERVICES
CREATE TABLE IF NOT EXISTS professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  duration_minutes_override INT,
  competence_level VARCHAR(50) DEFAULT 'standard',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(professional_id, service_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_services_professional_clinic ON professional_services(professional_id, clinic_id);

-- 29. SERVICE PRICES
CREATE TABLE IF NOT EXISTS service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES payers(id),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  price DECIMAL(12, 2),
  base_price DECIMAL(12, 2),
  co_pay DECIMAL(12, 2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_prices_service ON service_prices(service_id);

-- 30. PROFESSIONAL SCHEDULES
CREATE TABLE IF NOT EXISTS professional_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  day_of_week INT,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_professional_schedules_professional ON professional_schedules(professional_id);

-- ============================================================
-- FASE 7: VIEWS E FUNCIONALIDADES
-- ============================================================

-- View: Indicadores da Agenda
DROP VIEW IF EXISTS v_agenda_indicators_daily CASCADE;

CREATE VIEW v_agenda_indicators_daily AS
WITH appointments_data AS (
  SELECT 
    a.clinic_id,
    a.scheduled_date::date as appt_date,
    a.id,
    a.status,
    a.professional_id,
    COALESCE(a.value, s.price, 0) as value
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
  WHERE a.clinic_id IS NOT NULL
)
SELECT 
  clinic_id,
  appt_date as indicator_date,
  COUNT(*) as total_agendamentos,
  COUNT(CASE WHEN status = 'confirmado' THEN 1 END) as confirmados,
  COUNT(CASE WHEN status = 'falta' THEN 1 END) as faltas,
  COUNT(DISTINCT professional_id) as profissionais_ativos,
  COALESCE(SUM(value), 0) as receita_estimada,
  NOW() as calculated_at
FROM appointments_data
GROUP BY clinic_id, appt_date;

-- Função: Cashflow Summary
DROP FUNCTION IF EXISTS public.cashflow_summary(UUID, DATE, DATE) CASCADE;

CREATE FUNCTION public.cashflow_summary(
  p_clinic_id UUID,
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  ap_open NUMERIC,
  ap_paid NUMERIC,
  ar_open NUMERIC,
  ar_received NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH ap AS (
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('open','scheduled','partial') AND due_date BETWEEN p_start AND p_end THEN amount END), 0) AS open,
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at BETWEEN p_start AND p_end THEN amount END), 0) AS paid
    FROM public.ap_bills
    WHERE clinic_id = p_clinic_id
  ), ar AS (
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('open','planned','partial','overdue') AND data_vencimento BETWEEN p_start AND p_end THEN valor_liquido END), 0) AS open,
      COALESCE(SUM(CASE WHEN status = 'received' AND data_recebimento BETWEEN p_start AND p_end THEN valor_liquido END), 0) AS received
    FROM public.ar_receivables
    WHERE clinic_id = p_clinic_id
  )
  SELECT ap.open, ap.paid, ar.open, ar.received FROM ap CROSS JOIN ar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FASE 8: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_financial_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "clinics_select_own" ON clinics;
CREATE POLICY "clinics_select_own"
  ON clinics FOR SELECT
  USING (id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "users_select_own_clinic" ON users;
CREATE POLICY "users_select_own_clinic"
  ON users FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "patients_select" ON patients;
CREATE POLICY "patients_select"
  ON patients FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "professionals_select" ON professionals;
CREATE POLICY "professionals_select"
  ON professionals FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select"
  ON appointments FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "ap_bills_select" ON ap_bills;
CREATE POLICY "ap_bills_select"
  ON ap_bills FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "ar_receivables_select" ON ar_receivables;
CREATE POLICY "ar_receivables_select"
  ON ar_receivables FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "appointment_audit_logs_select" ON appointment_audit_logs;
CREATE POLICY "appointment_audit_logs_select"
  ON appointment_audit_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "clinic_subscriptions_select" ON clinic_subscriptions;
CREATE POLICY "clinic_subscriptions_select"
  ON clinic_subscriptions FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "subscription_plans_select" ON subscription_plans;
CREATE POLICY "subscription_plans_select"
  ON subscription_plans FOR SELECT
  USING (true);

-- ============================================================
-- ✅ SETUP COMPLETO
-- ============================================================

SELECT '✅ TODAS AS TABELAS E ESTRUTURAS FORAM CRIADAS COM SUCESSO!' as status;
SELECT NOW() as completion_timestamp;

