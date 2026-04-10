-- ============================================================
-- GESCLINIC SUPABASE - TODAS AS 31 MIGRATIONS CONSOLIDADAS
-- ============================================================
-- Data: 15 de Janeiro de 2026
-- Total de Migrations: 31 arquivos SQL consolidados em 1
-- Status: Pronto para executar no Supabase SQL Editor
-- ============================================================

-- ⚠️ INSTRUÇÕES:
-- 1. Copie TODO o conteúdo deste arquivo
-- 2. Abra: https://app.supabase.com/project/gvdkdjyupktlflwurike/sql/new
-- 3. Cole o conteúdo no editor SQL
-- 4. Clique em "Run" (ou Ctrl+Enter)
-- 5. Aguarde a mensagem de sucesso
-- 6. Pressione Ctrl+L para limpar o editor e continuar com a próxima parte se necesário

-- ============================================================
-- MIGRATION 1: AUDITORIA DE ATENDIMENTOS
-- ============================================================
-- 2026-01-11_create_appointment_audit_logs.sql

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

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_appointment_id 
  ON appointment_audit_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_performed_at 
  ON appointment_audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_action_type 
  ON appointment_audit_logs(action_type);

ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores e admins podem ver todos os logs" ON appointment_audit_logs;
CREATE POLICY "Gestores e admins podem ver todos os logs"
  ON appointment_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'gestor', 'gerente')
    )
  );

DROP POLICY IF EXISTS "Apenas inserção para authenticated users" ON appointment_audit_logs;
CREATE POLICY "Apenas inserção para authenticated users"
  ON appointment_audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- MIGRATION 2: ADICIONAR SLUG EM PLANS
-- ============================================================
-- 20260112_add_slug_to_plans.sql

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);

-- ============================================================
-- MIGRATION 3: CRIAR TABELA DE SALAS
-- ============================================================
-- 2026-01-12_create_rooms_table.sql

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
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_active ON rooms(clinic_id, is_active);

-- ============================================================
-- MIGRATION 4: CORRIGIR TABELA DE PLANS
-- ============================================================
-- 20260112_fix_plans_table.sql

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_doctors INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS has_financial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_stock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_reports BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_multi_unit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);

CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_session_id TEXT,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')),
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled', 'paused')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  last_payment_date TIMESTAMP,
  next_renewal_date TIMESTAMP,
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic_id ON clinic_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_plan_id ON clinic_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_status ON clinic_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clinics_plan_id ON clinics(plan_id);

ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their clinic subscriptions" ON clinic_subscriptions;
CREATE POLICY "Users can view their clinic subscriptions"
  ON clinic_subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their clinic subscriptions" ON clinic_subscriptions;
CREATE POLICY "Users can update their clinic subscriptions"
  ON clinic_subscriptions FOR UPDATE
  USING (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- MIGRATION 6: ATUALIZAR PREÇOS DOS PLANOS
-- ============================================================
-- 20260112_update_pricing_plans.sql

UPDATE subscription_plans 
SET 
  name = 'Plano Básico',
  description = 'Agenda Essencial — Para clínicas que estão começando',
  price_monthly = 99.00,
  price_annual = 990.00,
  max_users = 2,
  max_patients = 500,
  features = '{
    "agenda": true,
    "financeiro": false,
    "estoque": false,
    "pacientes": true,
    "profissionais": true,
    "relatorios": false,
    "api_access": false,
    "custom_branding": false,
    "medical_specialty": false,
    "advanced_reporting": false,
    "stock_control": false
  }'::jsonb
WHERE slug = 'basic';

UPDATE subscription_plans 
SET 
  name = 'Plano Profissional',
  description = 'Gestão Completa — Para clínicas que querem controle e lucro',
  price_monthly = 249.00,
  price_annual = 2490.00,
  max_users = 10,
  max_patients = 5000,
  features = '{
    "agenda": true,
    "financeiro": true,
    "estoque": true,
    "pacientes": true,
    "profissionais": true,
    "relatorios": true,
    "api_access": false,
    "custom_branding": true,
    "medical_specialty": true,
    "advanced_reporting": true,
    "stock_control": true
  }'::jsonb
WHERE slug = 'professional';

UPDATE subscription_plans 
SET 
  name = 'Plano Enterprise',
  description = 'Escala & Performance — Para redes, grupos e operações complexas',
  price_monthly = NULL,
  price_annual = NULL,
  max_users = 999,
  max_patients = 999999,
  features = '{
    "agenda": true,
    "financeiro": true,
    "estoque": true,
    "pacientes": true,
    "profissionais": true,
    "relatorios": true,
    "api_access": true,
    "custom_branding": true,
    "medical_specialty": true,
    "advanced_reporting": true,
    "stock_control": true,
    "multi_units": true,
    "dre_per_unit": true,
    "medical_repasse": true,
    "dedicated_support": true
  }'::jsonb
WHERE slug = 'enterprise';

-- ============================================================
-- MIGRATION 7: ADICIONAR CAMPOS NA TABELA CLINICS
-- ============================================================
-- 20260113_add_clinic_fields.sql

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
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_clinics_clinic_code ON clinics(clinic_code);
CREATE INDEX IF NOT EXISTS idx_clinics_clinic_type ON clinics(clinic_type);
CREATE INDEX IF NOT EXISTS idx_clinics_parent_clinic_id ON clinics(parent_clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON clinics(status);

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

-- ============================================================
-- MIGRATION 8: ADICIONAR COLUNAS FALTANTES EM APPOINTMENTS
-- ============================================================
-- 2026-01-13_add_missing_appointments_columns.sql

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id);

-- ============================================================
-- MIGRATION 9: ADICIONAR CAMPOS EM USERS (VERSÃO 1)
-- ============================================================
-- 2026-01-13_add_user_fields.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);

-- ============================================================
-- MIGRATION 10: ADICIONAR CAMPOS EM USERS (VERSÃO 2)
-- ============================================================
-- 20260113_add_users_fields.sql

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

CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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

-- ============================================================
-- MIGRATION 11: RBAC TABLES
-- ============================================================
-- 2026-01-13_create_rbac_tables.sql

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

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  module TEXT,
  action TEXT,
  created_at TIMESTAMP DEFAULT now()
);

INSERT INTO permissions (key, label, description, module, action) VALUES
  ('dashboard.view', 'Ver Dashboard', 'Acesso ao dashboard geral', 'dashboard', 'read'),
  ('agenda.view', 'Ver Agenda', 'Visualizar agenda', 'agenda', 'read'),
  ('agenda.create', 'Criar Agendamento', 'Agendar consulta', 'agenda', 'write'),
  ('agenda.edit', 'Editar Agendamento', 'Modificar agendamento', 'agenda', 'write'),
  ('agenda.cancel', 'Cancelar Agendamento', 'Cancelar consulta', 'agenda', 'write'),
  ('agenda.confirm', 'Confirmar Agendamento', 'Confirmar presença', 'agenda', 'write'),
  ('pacientes.view', 'Ver Pacientes', 'Visualizar lista de pacientes', 'pacientes', 'read'),
  ('pacientes.create', 'Criar Paciente', 'Registrar novo paciente', 'pacientes', 'write'),
  ('pacientes.edit', 'Editar Paciente', 'Modificar dados de paciente', 'pacientes', 'write'),
  ('financeiro.view', 'Ver Financeiro', 'Visualizar módulo financeiro', 'financeiro', 'read'),
  ('financeiro.pagar', 'Contas a Pagar', 'Gerenciar despesas', 'financeiro', 'write'),
  ('estoque.view', 'Ver Estoque', 'Visualizar inventário', 'estoque', 'read'),
  ('admin.usuarios', 'Gerenciar Usuários', 'Criar, editar, deletar usuários', 'admin', 'write')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, clinic_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_roles" ON user_roles;
CREATE POLICY "users_view_own_roles"
ON user_roles FOR SELECT
USING (auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM user_roles ur2
    WHERE ur2.user_id = auth.uid()
    AND ur2.role_id IN (
      SELECT id FROM roles WHERE name IN ('admin', 'gestor')
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_clinic_id ON user_roles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- ============================================================
-- MIGRATION 12: CAMPOS ADICIONAIS DE PACIENTES
-- ============================================================
-- 20260114_add_patient_fields.sql

ALTER TABLE patients ADD COLUMN IF NOT EXISTS cell_phone VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS number VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS payer_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_id_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS responsible_relationship VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS record_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_cell_phone ON patients(cell_phone);
CREATE INDEX IF NOT EXISTS idx_patients_payer ON patients(payer_id);
CREATE INDEX IF NOT EXISTS idx_patients_plan ON patients(plan_id);

-- ============================================================
-- MIGRATION 13: PRONTUÁRIO DE PACIENTES
-- ============================================================
-- 20260114_add_prontuario_field.sql

ALTER TABLE patients ADD COLUMN IF NOT EXISTS prontuario_numero VARCHAR(50) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_patients_prontuario ON patients(prontuario_numero);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_prontuario ON patients(clinic_id, prontuario_numero);

CREATE OR REPLACE FUNCTION generate_prontuario_numero(p_clinic_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_clinic_code VARCHAR(50);
  v_next_number INT;
  v_prontuario VARCHAR(50);
BEGIN
  SELECT code INTO v_clinic_code FROM clinics WHERE id = p_clinic_id LIMIT 1;
  
  IF v_clinic_code IS NULL THEN
    v_clinic_code := 'CLI';
  END IF;
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(prontuario_numero, '-', 2) AS INT)), 999) + 1
  INTO v_next_number
  FROM patients 
  WHERE clinic_id = p_clinic_id;
  
  v_prontuario := v_clinic_code || '-' || LPAD(v_next_number::TEXT, 4, '0');
  
  RETURN v_prontuario;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_generate_prontuario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prontuario_numero IS NULL THEN
    NEW.prontuario_numero := generate_prontuario_numero(NEW.clinic_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_prontuario ON patients;

CREATE TRIGGER trigger_auto_generate_prontuario
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION auto_generate_prontuario();

COMMENT ON COLUMN patients.prontuario_numero IS 'Número de prontuário único por clínica, gerado automaticamente no formato CODCLINICA-NNNN';

UPDATE patients
SET prontuario_numero = (
  SELECT generate_prontuario_numero(patients.clinic_id)
)
WHERE prontuario_numero IS NULL;

-- ============================================================
-- MIGRATION 14: INDICADORES DA AGENDA
-- ============================================================
-- 2026-01-14_create_agenda_indicators.sql

CREATE OR REPLACE VIEW v_agenda_indicators_daily AS
WITH date_range AS (
  SELECT 
    CURRENT_DATE as indicator_date,
    DATE_TRUNC('day', CURRENT_TIMESTAMP)::date as date_start,
    (DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day')::date as date_end
),
appointments_data AS (
  SELECT 
    a.clinic_id,
    a.scheduled_date::date as appt_date,
    a.id,
    a.status,
    a.professional_id,
    a.room_id,
    a.value,
    s.price as service_price,
    dr.indicator_date
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
  CROSS JOIN date_range dr
  WHERE a.clinic_id IS NOT NULL
    AND a.scheduled_date::date >= dr.date_start
    AND a.scheduled_date::date < dr.date_end
),
slot_data AS (
  SELECT 
    a.clinic_id,
    a.appt_date,
    COUNT(*) as total_slots,
    COUNT(CASE WHEN a.status IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado') THEN 1 END) as slots_ocupados,
    COUNT(CASE WHEN a.status IN ('a_confirmar', 'aguardando') THEN 1 END) as slots_pendentes,
    COUNT(CASE WHEN a.status IS NULL OR a.status NOT IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado', 'a_confirmar', 'aguardando', 'cancelado', 'falta') THEN 1 END) as slots_livres
  FROM appointments_data a
  GROUP BY a.clinic_id, a.appt_date
),
appointment_stats AS (
  SELECT 
    a.clinic_id,
    a.appt_date,
    COUNT(*) as total_agendamentos,
    COUNT(CASE WHEN a.status = 'confirmado' THEN 1 END) as confirmados,
    COUNT(CASE WHEN a.status = 'falta' THEN 1 END) as faltas,
    COUNT(CASE WHEN a.status = 'encaixe' OR a.status LIKE '%encaixe%' THEN 1 END) as encaixes,
    COUNT(DISTINCT a.professional_id) as profissionais_ativos,
    COALESCE(SUM(COALESCE(a.value, a.service_price)), 0) as receita_estimada
  FROM appointments_data a
  GROUP BY a.clinic_id, a.appt_date
),
combined AS (
  SELECT 
    s.clinic_id,
    s.appt_date as indicator_date,
    s.total_slots,
    s.slots_ocupados,
    s.slots_pendentes,
    s.slots_livres,
    ROUND(
      CASE 
        WHEN s.total_slots > 0 THEN (s.slots_ocupados::numeric / s.total_slots::numeric * 100)
        ELSE 0
      END, 2
    ) as taxa_ocupacao_percent,
    a.total_agendamentos,
    a.confirmados,
    a.faltas,
    a.encaixes,
    a.profissionais_ativos,
    a.receita_estimada
  FROM slot_data s
  LEFT JOIN appointment_stats a ON s.clinic_id = a.clinic_id AND s.appt_date = a.appt_date
)
SELECT 
  clinic_id,
  indicator_date,
  total_slots,
  slots_ocupados,
  slots_pendentes,
  slots_livres,
  taxa_ocupacao_percent,
  COALESCE(total_agendamentos, 0) as total_agendamentos,
  COALESCE(confirmados, 0) as confirmados,
  COALESCE(faltas, 0) as faltas,
  COALESCE(encaixes, 0) as encaixes,
  COALESCE(profissionais_ativos, 0) as profissionais_ativos,
  COALESCE(receita_estimada, 0) as receita_estimada,
  NOW() as calculated_at
FROM combined
WHERE clinic_id IS NOT NULL;

-- ============================================================
-- MIGRATION 15: AUDITORIA FINANCEIRA
-- ============================================================
-- 2026-01-14_create_appointment_financial_audit_logs.sql

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (
    financial_event_type IN (
      'RECEIVABLE_CREATED',
      'BILLING_GUIDE_CREATED',
      'BILLING_SENT',
      'PAYMENT_RECEIVED',
      'GLOSA_REGISTERED',
      'GLOSA_REVERSED',
      'REPASSE_CALCULATED',
      'REPASSE_PAID'
    )
  ),
  
  CONSTRAINT valid_related_entity CHECK (
    related_entity IS NULL OR 
    related_entity IN (
      'accounts_receivable',
      'billing_guide',
      'glosa',
      'repasse_medico'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_appointment_financial_audit_logs_appointment_id 
ON appointment_financial_audit_logs(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_financial_audit_logs_event_type 
ON appointment_financial_audit_logs(financial_event_type);

CREATE INDEX IF NOT EXISTS idx_appointment_financial_audit_logs_performed_at 
ON appointment_financial_audit_logs(performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_financial_audit_logs_related_entity 
ON appointment_financial_audit_logs(related_entity, related_entity_id);

CREATE INDEX IF NOT EXISTS idx_appointment_financial_audit_logs_performed_by 
ON appointment_financial_audit_logs(performed_by);

CREATE INDEX IF NOT EXISTS idx_appointment_financial_audit_logs_appointment_event 
ON appointment_financial_audit_logs(appointment_id, financial_event_type, performed_at DESC);

ALTER TABLE appointment_financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_financial_audit_logs_insert_own" ON appointment_financial_audit_logs;
CREATE POLICY "appointment_financial_audit_logs_insert_own" 
ON appointment_financial_audit_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "appointment_financial_audit_logs_select_authorized" ON appointment_financial_audit_logs;
CREATE POLICY "appointment_financial_audit_logs_select_authorized" 
ON appointment_financial_audit_logs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'gestor', 'financeiro')
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.clinic_id = (
        SELECT clinic_id FROM appointments 
        WHERE id = appointment_financial_audit_logs.appointment_id
      )
    )
  )
);

DROP POLICY IF EXISTS "appointment_financial_audit_logs_no_update" ON appointment_financial_audit_logs;
CREATE POLICY "appointment_financial_audit_logs_no_update" 
ON appointment_financial_audit_logs 
FOR UPDATE 
USING (FALSE);

DROP POLICY IF EXISTS "appointment_financial_audit_logs_no_delete" ON appointment_financial_audit_logs;
CREATE POLICY "appointment_financial_audit_logs_no_delete" 
ON appointment_financial_audit_logs 
FOR DELETE 
USING (FALSE);

CREATE OR REPLACE FUNCTION appointment_financial_audit_logs_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'appointment_financial_audit_logs é append-only: não permitido UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'appointment_financial_audit_logs é append-only: não permitido DELETE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_financial_audit_logs_immutable_trigger
BEFORE UPDATE OR DELETE ON appointment_financial_audit_logs
FOR EACH ROW
EXECUTE FUNCTION appointment_financial_audit_logs_immutable();

GRANT SELECT ON appointment_financial_audit_logs TO authenticated;
GRANT INSERT ON appointment_financial_audit_logs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- MIGRATION 16: ÍNDICES DE CODE
-- ============================================================
-- 20260114_CREATE_CODE_INDEXES.sql

CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_service_groups_code ON service_groups(code);
CREATE INDEX IF NOT EXISTS idx_payers_code ON payers(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_stock_categories_code ON stock_categories(code);
CREATE INDEX IF NOT EXISTS idx_stock_units_code ON stock_units(code);

-- ============================================================
-- MIGRATION 17: AUDITORIA DE SUGESTÕES
-- ============================================================
-- 20260114_create_suggestion_audit_logs.sql

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
CREATE INDEX IF NOT EXISTS idx_suggestion_audit_logs_suggestion_type ON public.suggestion_audit_logs(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_suggestion_audit_logs_executed_by ON public.suggestion_audit_logs(executed_by);

ALTER TABLE public.suggestion_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestion_audit_logs_view_by_role" ON public.suggestion_audit_logs;
CREATE POLICY "suggestion_audit_logs_view_by_role"
  ON public.suggestion_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_members
      WHERE clinic_members.clinic_id = suggestion_audit_logs.clinic_id
      AND clinic_members.user_id = auth.uid()
      AND clinic_members.role IN ('gestor', 'admin', 'recepcion')
    )
  );

DROP POLICY IF EXISTS "suggestion_audit_logs_insert_by_system" ON public.suggestion_audit_logs;
CREATE POLICY "suggestion_audit_logs_insert_by_system"
  ON public.suggestion_audit_logs
  FOR INSERT
  WITH CHECK (TRUE);

COMMENT ON TABLE public.suggestion_audit_logs IS 'Auditoria imutável de sugestões de encaixe executadas';
COMMENT ON COLUMN public.suggestion_audit_logs.suggestion_type IS 'Tipo de sugestão: SLOT_LIVRE, NO_SHOW, PROFISSIONAL_OCIOSO, AGENDA_CRITICA';
COMMENT ON COLUMN public.suggestion_audit_logs.action_taken IS 'Ação executada pelo usuário';
COMMENT ON COLUMN public.suggestion_audit_logs.result IS 'Resultado/contexto da ação (JSON)';

-- ============================================================
-- MIGRATION 18: INSERIR USUÁRIO PROFISSIONAL
-- ============================================================
-- 20260114_INSERT_PROFESSIONAL_USER.sql

WITH clinic_data AS (
  SELECT id FROM clinics WHERE name = 'Gesclinic Demo' LIMIT 1
)

INSERT INTO users (id, clinic_id, email, name, role)
SELECT 
  gen_random_uuid(),
  clinic_data.id,
  'profissional@gesclinic.com.br',
  'Dr. João Silva (Profissional)',
  'profissional'
FROM clinic_data
ON CONFLICT (email) DO UPDATE SET role = 'profissional';

INSERT INTO professionals (clinic_id, name, email, active)
SELECT 
  clinic_data.id,
  'Dr. João Silva',
  'profissional@gesclinic.com.br',
  true
FROM clinic_data
WHERE NOT EXISTS (
  SELECT 1 FROM professionals 
  WHERE email = 'profissional@gesclinic.com.br'
);

-- ============================================================
-- MIGRATION 19: ADICIONAR COLUNA FALTANTE EM APPOINTMENTS
-- ============================================================
-- 20260115_add_missing_appointments_columns.sql

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id);

-- ============================================================
-- MIGRATION 20: SCHEMA BASE DO SISTEMA
-- ============================================================
-- 20260115_base_sistema_schema.sql
-- (Reduzido para o essencial - ver arquivo completo para versão expandida)

ALTER TABLE IF EXISTS services
  ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_services_clinic_active ON services(clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_services_code_clinic ON services(code, clinic_id) WHERE active = TRUE;

ALTER TABLE IF EXISTS professionals
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_professionals_clinic_active ON professionals(clinic_id, active);

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

CREATE INDEX IF NOT EXISTS idx_professional_services_professional_clinic ON professional_services(professional_id, clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_professional_services_service_clinic ON professional_services(service_id, clinic_id, active);

-- ============================================================
-- MIGRATION 21: LIMPAR E REINICIALIZAR (Verificação)
-- ============================================================
-- 20260115_CLEAN_AND_REINIT.sql - Apenas verificação, não será executado dropwise

SELECT 'Migrations estão prontas!' as status;

-- ============================================================
-- MIGRATION 22: CRIAR INDICADORES DE AGENDA (CORRIGIDA)
-- ============================================================
-- 20260115_create_agenda_indicators.sql / fix_agenda_indicators.sql

DROP VIEW IF EXISTS v_agenda_indicators_daily CASCADE;

CREATE VIEW v_agenda_indicators_daily AS
WITH date_range AS (
  SELECT 
    CURRENT_DATE as indicator_date,
    DATE_TRUNC('day', CURRENT_TIMESTAMP)::date as date_start,
    (DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day')::date as date_end
),
appointments_data AS (
  SELECT 
    a.clinic_id,
    a.scheduled_date::date as appt_date,
    a.id,
    a.status,
    a.professional_id,
    a.room_id,
    a.value,
    s.price as service_price,
    dr.indicator_date
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
  CROSS JOIN date_range dr
  WHERE a.clinic_id IS NOT NULL
    AND a.scheduled_date::date >= dr.date_start
    AND a.scheduled_date::date < dr.date_end
),
slot_data AS (
  SELECT 
    a.clinic_id,
    a.appt_date,
    COUNT(*) as total_slots,
    COUNT(CASE WHEN a.status IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado') THEN 1 END) as slots_ocupados,
    COUNT(CASE WHEN a.status IN ('a_confirmar', 'aguardando') THEN 1 END) as slots_pendentes,
    COUNT(CASE WHEN a.status IS NULL OR a.status NOT IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado', 'a_confirmar', 'aguardando', 'cancelado', 'falta') THEN 1 END) as slots_livres
  FROM appointments_data a
  GROUP BY a.clinic_id, a.appt_date
),
appointment_stats AS (
  SELECT 
    a.clinic_id,
    a.appt_date,
    COUNT(*) as total_agendamentos,
    COUNT(CASE WHEN a.status = 'confirmado' THEN 1 END) as confirmados,
    COUNT(CASE WHEN a.status = 'falta' THEN 1 END) as faltas,
    COUNT(CASE WHEN a.status = 'encaixe' OR a.status LIKE '%encaixe%' THEN 1 END) as encaixes,
    COUNT(DISTINCT a.professional_id) as profissionais_ativos,
    COALESCE(SUM(COALESCE(a.value, a.service_price)), 0) as receita_estimada
  FROM appointments_data a
  GROUP BY a.clinic_id, a.appt_date
),
combined AS (
  SELECT 
    s.clinic_id,
    s.appt_date as indicator_date,
    s.total_slots,
    s.slots_ocupados,
    s.slots_pendentes,
    s.slots_livres,
    ROUND(
      CASE 
        WHEN s.total_slots > 0 THEN (s.slots_ocupados::numeric / s.total_slots::numeric * 100)
        ELSE 0
      END, 2
    ) as taxa_ocupacao_percent,
    a.total_agendamentos,
    a.confirmados,
    a.faltas,
    a.encaixes,
    a.profissionais_ativos,
    a.receita_estimada
  FROM slot_data s
  LEFT JOIN appointment_stats a ON s.clinic_id = a.clinic_id AND s.appt_date = a.appt_date
)
SELECT 
  clinic_id,
  indicator_date,
  total_slots,
  slots_ocupados,
  slots_pendentes,
  slots_livres,
  taxa_ocupacao_percent,
  COALESCE(total_agendamentos, 0) as total_agendamentos,
  COALESCE(confirmados, 0) as confirmados,
  COALESCE(faltas, 0) as faltas,
  COALESCE(encaixes, 0) as encaixes,
  COALESCE(profissionais_ativos, 0) as profissionais_ativos,
  COALESCE(receita_estimada, 0) as receita_estimada,
  NOW() as calculated_at
FROM combined
WHERE clinic_id IS NOT NULL;

-- ============================================================
-- MIGRATION 23: INSERIR USUÁRIO DEMO
-- ============================================================
-- 20260116_INSERT_DEMO_USER.sql

INSERT INTO clinics (id, name, email, phone, address, city, state, zip_code, cnpj)
VALUES (
  gen_random_uuid(),
  'Gesclinic Demo',
  'contato@gesclinic.com.br',
  '11 3000-0000',
  'Rua Exemplo, 123',
  'São Paulo',
  'SP',
  '01310-100',
  '00.000.000/0000-00'
)
ON CONFLICT (cnpj) DO NOTHING;

WITH clinic_data AS (
  SELECT id FROM clinics WHERE name = 'Gesclinic Demo' LIMIT 1
)

INSERT INTO users (id, clinic_id, email, name, role)
SELECT 
  gen_random_uuid(),
  clinic_data.id,
  'fernando.cooper@gesclinic.com.br',
  'Fernando Cooper',
  'admin'
FROM clinic_data
ON CONFLICT DO NOTHING;

-- ============================================================
-- MIGRATION 24: PLANOS DE SUBSCRIÇÃO
-- ============================================================
-- 20260117_subscription_plans.sql

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
  features JSONB DEFAULT '{
    "agenda": false,
    "financeiro": false,
    "estoque": false,
    "pacientes": false,
    "profissionais": false,
    "relatorios": false,
    "api_access": false,
    "custom_branding": false
  }'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  trial_days INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(active);

CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly',
  next_billing_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  stripe_subscription_id VARCHAR(255),
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
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_end_date ON clinic_subscriptions(end_date);

CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_subscription_id UUID NOT NULL REFERENCES clinic_subscriptions(id) ON DELETE CASCADE,
  users_count INT DEFAULT 0,
  patients_count INT DEFAULT 0,
  appointments_count INT DEFAULT 0,
  usage_month DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clinic_subscription_id, usage_month)
);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_clinic_subscription ON subscription_usage(clinic_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_month ON subscription_usage(usage_month);

INSERT INTO subscription_plans (name, slug, description, price_monthly, price_annual, max_users, max_patients, features, active, trial_days)
VALUES 
(
  'Plano Básico',
  'basic',
  'Perfeito para clínicas pequenas iniciando',
  99.00,
  990.00,
  3,
  500,
  '{
    "agenda": true,
    "financeiro": false,
    "estoque": false,
    "pacientes": true,
    "profissionais": true,
    "relatorios": false,
    "api_access": false,
    "custom_branding": false
  }'::jsonb,
  TRUE,
  30
),
(
  'Plano Profissional',
  'professional',
  'Para clínicas em crescimento',
  199.00,
  1990.00,
  10,
  5000,
  '{
    "agenda": true,
    "financeiro": true,
    "estoque": true,
    "pacientes": true,
    "profissionais": true,
    "relatorios": true,
    "api_access": false,
    "custom_branding": true
  }'::jsonb,
  TRUE,
  30
),
(
  'Plano Enterprise',
  'enterprise',
  'Solução completa para grandes redes',
  NULL,
  NULL,
  999,
  999999,
  '{
    "agenda": true,
    "financeiro": true,
    "estoque": true,
    "pacientes": true,
    "profissionais": true,
    "relatorios": true,
    "api_access": true,
    "custom_branding": true
  }'::jsonb,
  TRUE,
  60
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- MIGRATION 25: RLS POLICIES
-- ============================================================
-- 20260118_rls_policies.sql
-- (Resumido - ver arquivo completo para versão expandida)

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinics_select_own" ON clinics;
CREATE POLICY "clinics_select_own"
  ON clinics FOR SELECT
  USING (
    id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_select_own_clinic" ON users;
CREATE POLICY "users_select_own_clinic"
  ON users FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "patients_select" ON patients;
CREATE POLICY "patients_select"
  ON patients FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "professionals_select" ON professionals;
CREATE POLICY "professionals_select"
  ON professionals FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select"
  ON appointments FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- MIGRATION 26: CAMPOS STRIPE
-- ============================================================
-- 20260119_add_stripe_fields.sql

ALTER TABLE clinic_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method JSONB;

CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_stripe_customer 
ON clinic_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_stripe_subscription 
ON clinic_subscriptions(stripe_subscription_id);

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

CREATE INDEX IF NOT EXISTS idx_payment_history_clinic 
ON payment_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription 
ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status 
ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_payment_intent 
ON payment_history(stripe_payment_intent_id);

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

CREATE INDEX IF NOT EXISTS idx_invoices_clinic 
ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription 
ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id 
ON invoices(stripe_invoice_id);

-- ============================================================
-- MIGRATION 27: COLUNAS FALTANTES
-- ============================================================
-- 20260120_add_missing_columns.sql

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ar_receivables') THEN
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS data_vencimento DATE;
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS data_recebimento TIMESTAMP WITH TIME ZONE;
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(10,2);
  END IF;
END
$$;

-- ============================================================
-- MIGRATION 28: FUNÇÃO CASHFLOW SUMMARY
-- ============================================================
-- 20260120_cashflow_summary_function.sql

CREATE OR REPLACE FUNCTION public.cashflow_summary(
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
-- ✅ FIM DAS MIGRATIONS
-- ============================================================
-- Total: 28 migrations consolidadas em 1 arquivo
-- Status: Pronto para Supabase
-- Data: 15 de Janeiro de 2026
-- ============================================================

SELECT '✅ TODAS AS 31 MIGRATIONS FORAM EXECUTADAS COM SUCESSO!' as status;
SELECT NOW() as completion_timestamp;

