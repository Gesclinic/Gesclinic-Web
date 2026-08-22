-- ============================================================================
-- Consolidated from 20260115_CLEAN_AND_REINIT.sql
-- ============================================================================

/*
 * Legacy manual reset script. It is intentionally disabled in the migration
 * chain because the following schema script only alters existing tables.
 * Executing this block would delete the schema created by prior migrations.
 *
-- ============================================================
-- CLEAN ALL TABLES AND REINITIALIZE
-- ============================================================
-- Drop all existing tables to start fresh
-- This ensures all columns are properly created

-- Disable triggers before dropping
DROP TRIGGER IF EXISTS trg_stock_items_timestamp ON stock_items;
DROP TRIGGER IF EXISTS trg_orcamentos_timestamp ON orcamentos;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS conciliation_auto_rules CASCADE;
DROP TABLE IF EXISTS conciliations CASCADE;
DROP TABLE IF EXISTS conciliation_lines CASCADE;
DROP TABLE IF EXISTS bank_statement_lines CASCADE;
DROP TABLE IF EXISTS bank_statements CASCADE;
DROP TABLE IF EXISTS professional_repasse CASCADE;
DROP TABLE IF EXISTS professional_payments CASCADE;
DROP TABLE IF EXISTS repasse_medico CASCADE;
DROP TABLE IF EXISTS recurring_accounts_payable CASCADE;
DROP TABLE IF EXISTS ar_receivables CASCADE;
DROP TABLE IF EXISTS accounts_receivable CASCADE;
DROP TABLE IF EXISTS accounts_payable CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS ap_bill_comments CASCADE;
DROP TABLE IF EXISTS ap_items CASCADE;
DROP TABLE IF EXISTS ap_bills CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP TABLE IF EXISTS account_plans CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;
DROP TABLE IF EXISTS stock_request_items CASCADE;
DROP TABLE IF EXISTS stock_requests CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_locations CASCADE;
DROP TABLE IF EXISTS stock_items CASCADE;
DROP TABLE IF EXISTS stock_suppliers CASCADE;
DROP TABLE IF EXISTS stock_units CASCADE;
DROP TABLE IF EXISTS stock_categories CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS schedule_unavailability CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS professional_schedules CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS payers CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_groups CASCADE;
DROP TABLE IF EXISTS patient_document_types CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS patients_files CASCADE;
DROP TABLE IF EXISTS patient_media CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS orcamentos CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS ap_bills_with_category;
DROP VIEW IF EXISTS cash_flow;
DROP VIEW IF EXISTS dre_monthly;
DROP VIEW IF EXISTS view_ar_receivables_v1;
DROP VIEW IF EXISTS repasse_dashboard;

-- Confirmation
SELECT 'All tables and views dropped successfully!' as status;
*/

-- The original rooms migration has a legacy hyphenated version that the CLI
-- does not apply. Ensure the dependency exists before appointments references it.
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  unit VARCHAR(100),
  description TEXT,
  capacity INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rooms_clinic ON rooms(clinic_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);

-- ============================================================================
-- Consolidated from 20260115_add_missing_appointments_columns.sql
-- ============================================================================

-- Add missing columns to appointments table
-- room_id: para rastrear a sala do atendimento
-- value: para armazenar o valor/pre├ºo do atendimento

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

-- Create index for room_id for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id);

-- ============================================================================
-- Consolidated from 20260115_base_sistema_schema.sql
-- ============================================================================

-- ============================================================
-- ETAPA 1: REFACTOR BASE DO SISTEMA - SCHEMA CORRETO
-- Gesclinic Web - 15 de janeiro de 2026
-- ============================================================
-- Este script cria/valida todas as tabelas necess├írias para
-- o novo m├│dulo "Base do Sistema", garantindo:
-- 1. Tabelas obrigat├│rias existem
-- 2. Estrutura consistente em todas
-- 3. ├ìndices para performance
-- 4. Valida├º├Áes de FK
-- ============================================================

-- ============================================================
-- PARTE 1: TABELAS CORE (Servi├ºos e Profissionais)
-- ============================================================

-- Garantir que services tem estrutura correta
-- Adicionar colunas se n├úo existirem
ALTER TABLE IF EXISTS services
  ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Criar ├¡ndices importantes
CREATE INDEX IF NOT EXISTS idx_services_clinic_active ON services(clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_services_code_clinic ON services(code, clinic_id) WHERE active = TRUE;

-- Garantir que professionals tem estrutura correta
ALTER TABLE IF EXISTS professionals
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_professionals_clinic_active ON professionals(clinic_id, active);

-- ============================================================
-- PARTE 2: V├ìNCULO PROFISSIONAL X SERVI├çO
-- ============================================================

-- Tabela: professional_services (v├¡nculo de quem faz qual servi├ºo)
CREATE TABLE IF NOT EXISTS professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Dura├º├úo espec├¡fica para este profissional neste servi├ºo (sobrescreve padr├úo)
  duration_minutes_override INT,

  -- Compet├¬ncia/n├¡vel de experi├¬ncia
  competence_level VARCHAR(50) DEFAULT 'standard', -- junior, standard, expert

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(professional_id, service_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_services_professional_clinic ON professional_services(professional_id, clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_professional_services_service_clinic ON professional_services(service_id, clinic_id, active);

-- ============================================================
-- PARTE 3: CONV├èNIOS E SEGUROS (Health Insurances)
-- ============================================================

-- Tabela: health_insurances (conv├¬nios e seguros)
CREATE TABLE IF NOT EXISTS health_insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,

  -- Tipo de conv├¬nio
  type VARCHAR(50), -- 'private_insurance', 'health_plan', 'government', 'direct_pay', 'other'

  -- Documentos da operadora
  cnpj TEXT,
  registration_number TEXT,

  -- Contato
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Configura├º├Áes
  requires_authorization BOOLEAN DEFAULT FALSE,
  authorization_lead_time_days INT DEFAULT 0,

  -- Status
  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(code, clinic_id),
  UNIQUE(cnpj, clinic_id) WHERE cnpj IS NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_insurances_clinic ON health_insurances(clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_health_insurances_code ON health_insurances(code, clinic_id);

-- ============================================================
-- PARTE 4: PRE├çOS DE SERVI├çOS (por Conv├¬nio/Pagador)
-- ============================================================

-- Validar/estender service_prices
ALTER TABLE IF EXISTS service_prices
  ADD COLUMN IF NOT EXISTS health_insurance_id UUID REFERENCES health_insurances(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS base_price DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS co_pay DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_service_prices_health_insurance ON service_prices(health_insurance_id) WHERE health_insurance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_prices_service_health_insurance ON service_prices(service_id, health_insurance_id);

-- ============================================================
-- PARTE 5: SALAS E RECURSOS
-- ============================================================

-- Validar/estender rooms
ALTER TABLE IF EXISTS rooms
  ADD COLUMN IF NOT EXISTS code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Se is_active existe, sincronizar com active
UPDATE rooms SET active = is_active WHERE active IS NULL AND is_active IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_clinic_active ON rooms(clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_rooms_code_clinic ON rooms(code, clinic_id) WHERE active = TRUE;

-- Tabela: resources (equipamentos, insumos, instrumentos)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Tipo de recurso
  type VARCHAR(50), -- 'equipment', 'consumable', 'instrument', 'furniture', 'other'

  -- Se ├® consum├¡vel, controlar estoque
  is_consumable BOOLEAN DEFAULT FALSE,

  -- Informa├º├Áes de manuten├º├úo
  requires_maintenance BOOLEAN DEFAULT FALSE,
  last_maintenance_date DATE,
  maintenance_interval_days INT,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(code, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_resources_clinic ON resources(clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_resources_code ON resources(code, clinic_id);

-- Tabela: room_resources (aloca├º├úo de recursos em salas)
CREATE TABLE IF NOT EXISTS room_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Quantidade do recurso na sala
  quantity INT DEFAULT 1,

  -- Se ├® recurso fixo/permanente ou m├│vel
  is_fixed BOOLEAN DEFAULT FALSE,

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(room_id, resource_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_room_resources_room_clinic ON room_resources(room_id, clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_room_resources_resource_clinic ON room_resources(resource_id, clinic_id, active);

-- ============================================================
-- PARTE 6: REGRAS DE AGENDA (Agenda Rules)
-- ============================================================

-- Tabela: agenda_rules (regras de como agendar um servi├ºo)
CREATE TABLE IF NOT EXISTS agenda_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Dura├º├úo padr├úo do atendimento (minutos)
  default_duration_minutes INT NOT NULL,

  -- Intervalo de tempo m├¡nimo entre agendamentos (minutos)
  interval_minutes INT DEFAULT 0,

  -- Tempo m├íximo permitido ap├│s ├║ltima consulta (dias)
  -- Null = sem limite
  max_days_in_future INT,

  -- Tempo m├¡nimo antes de poder agendar (dias)
  -- Ex: "deve agendar com pelo menos 2 dias de anteced├¬ncia"
  min_days_in_advance INT DEFAULT 0,

  -- Permite agendamentos no mesmo dia?
  allow_same_day_booking BOOLEAN DEFAULT TRUE,

  -- Qual profissional ├® obrigat├│rio?
  requires_specific_professional BOOLEAN DEFAULT FALSE,

  -- Qual sala ├® obrigat├│ria?
  requires_specific_room BOOLEAN DEFAULT FALSE,

  -- M├íximo de atendimentos por dia para este servi├ºo
  max_per_day INT,

  -- Se a cl├¡nica quer confirmar antes de confirmar pro paciente
  requires_clinic_confirmation BOOLEAN DEFAULT FALSE,

  -- Ativo?
  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(service_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_rules_service_clinic ON agenda_rules(service_id, clinic_id, active);

-- ============================================================
-- PARTE 7: REGRAS DE REPASSE (Revenue Rules)
-- ============================================================

-- Tabela: revenue_rules (regras de como repassar ao profissional)
CREATE TABLE IF NOT EXISTS revenue_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Tipo de repasse
  repasse_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_value', 'commission', 'none'

  -- Percentual (0-100) ou valor fixo
  percentage DECIMAL(5, 2), -- Para percentage
  fixed_amount DECIMAL(12, 2), -- Para fixed_value

  -- M├¡nimo e m├íximo
  min_value DECIMAL(12, 2),
  max_value DECIMAL(12, 2),

  -- De quem recebe o repasse?
  -- Pode ser pro profissional OU pro grupo de profissionais
  repasse_to VARCHAR(50), -- 'professional', 'clinic', 'group'

  -- Quando aplica?
  applies_to_status VARCHAR(100), -- 'all', 'confirmed', 'completed', 'paid'

  -- Ativo?
  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revenue_rules_professional_clinic ON revenue_rules(professional_id, clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_revenue_rules_service_clinic ON revenue_rules(service_id, clinic_id, active);

-- ============================================================
-- PARTE 8: DISPONIBILIDADE DE PROFISSIONAIS
-- ============================================================

-- Estender professional_schedules se necess├írio
ALTER TABLE IF EXISTS professional_schedules
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_professional_schedules_clinic ON professional_schedules(clinic_id);

-- ============================================================
-- PARTE 9: VALIDA├ç├òES E CONSTRAINTS
-- ============================================================

-- Trigger para atualizar updated_at em services
CREATE OR REPLACE FUNCTION update_services_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_services_updated_at ON services;
CREATE TRIGGER trigger_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_timestamp();

-- Mesmo para professionals
CREATE OR REPLACE FUNCTION update_professionals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_professionals_updated_at ON professionals;
CREATE TRIGGER trigger_professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION update_professionals_timestamp();

-- ============================================================
-- PARTE 10: VIEWS ├ÜTEIS PARA QUERIES
-- ============================================================

-- View: Servi├ºos com info de profissionais vinculados
CREATE OR REPLACE VIEW view_services_with_professionals AS
SELECT
  s.id,
  s.clinic_id,
  s.code,
  s.name,
  s.description,
  s.duration_minutes,
  s.price,
  s.active,
  COUNT(DISTINCT ps.professional_id) as professional_count,
  STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as professional_names
FROM services s
LEFT JOIN professional_services ps ON s.id = ps.service_id AND ps.active = TRUE
LEFT JOIN professionals p ON ps.professional_id = p.id AND p.active = TRUE
WHERE s.active = TRUE
GROUP BY s.id, s.clinic_id, s.code, s.name, s.description, s.duration_minutes, s.price, s.active;

-- View: Profissionais com seus servi├ºos
CREATE OR REPLACE VIEW view_professionals_with_services AS
SELECT
  p.id,
  p.clinic_id,
  p.name,
  p.specialization,
  p.active,
  COUNT(DISTINCT ps.service_id) as service_count,
  STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) as service_names
FROM professionals p
LEFT JOIN professional_services ps ON p.id = ps.professional_id AND ps.active = TRUE
LEFT JOIN services s ON ps.service_id = s.id AND s.active = TRUE
WHERE p.active = TRUE
GROUP BY p.id, p.clinic_id, p.name, p.specialization, p.active;

-- View: Pre├ºos de servi├ºos por conv├¬nio
CREATE OR REPLACE VIEW view_service_prices_by_insurance AS
SELECT
  sp.id,
  sp.service_id,
  s.name as service_name,
  sp.health_insurance_id,
  hi.name as health_insurance_name,
  sp.price,
  sp.base_price,
  sp.co_pay,
  sp.clinic_id,
  sp.active
FROM service_prices sp
LEFT JOIN services s ON sp.service_id = s.id
LEFT JOIN health_insurances hi ON sp.health_insurance_id = hi.id
WHERE sp.active = TRUE;

-- ============================================================
-- PARTE 11: DADOS DE TESTE (Comentados)
-- ============================================================

/*
-- Exemplo de como adicionar um conv├¬nio:
INSERT INTO health_insurances (clinic_id, code, name, type, contact_person, active)
VALUES (
  (SELECT id FROM clinics LIMIT 1),
  'UN001',
  'Unimed',
  'private_insurance',
  'Contato Unimed',
  TRUE
)
ON CONFLICT (code, clinic_id) DO NOTHING;

-- Exemplo de vincular profissional a servi├ºo:
INSERT INTO professional_services (professional_id, service_id, clinic_id, competence_level)
VALUES (
  (SELECT id FROM professionals LIMIT 1),
  (SELECT id FROM services LIMIT 1),
  (SELECT id FROM clinics LIMIT 1),
  'standard'
)
ON CONFLICT (professional_id, service_id, clinic_id) DO NOTHING;

-- Exemplo de criar regra de agenda:
INSERT INTO agenda_rules (service_id, clinic_id, default_duration_minutes, max_days_in_future, active)
VALUES (
  (SELECT id FROM services LIMIT 1),
  (SELECT id FROM clinics LIMIT 1),
  30,
  90,
  TRUE
)
ON CONFLICT (service_id, clinic_id) DO NOTHING;
*/

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
-- Status: Ô£à Pronto para Supabase
-- Pr├│xima: ETAPA 2 - API Modules
-- ============================================================

-- ============================================================================
-- Consolidated from 20260115_create_agenda_indicators.sql
-- ============================================================================

-- ============================================
-- INDICADORES DA AGENDA
-- Views e Fun├º├Áes para c├ílculo de KPIs
-- ============================================

-- ============================================
-- 1. VIEW: Indicadores Operacionais por Dia
-- ============================================
CREATE OR REPLACE VIEW v_agenda_indicators_daily AS
WITH date_range AS (
  -- Pega o dia de hoje para a cl├¡nica
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

-- ============================================
-- 2. VIEW: Indicadores de Tempo (baseado em auditoria)
-- ============================================
CREATE OR REPLACE VIEW v_agenda_time_indicators AS
WITH audit_data AS (
  SELECT
    aal.appointment_id,
    a.clinic_id,
    a.professional_id,
    a.scheduled_date::date as appt_date,
    -- Tempo de agendamento at├® check-in
    (
      SELECT EXTRACT(EPOCH FROM (MAX(CASE WHEN action_type = 'CHECKIN_STARTED' THEN performed_at END) -
                                          MIN(CASE WHEN action_type = 'APPOINTMENT_CREATED' THEN performed_at END)))
      FROM appointment_audit_logs
      WHERE appointment_id = aal.appointment_id
    ) as time_agendamento_checkin_seconds,
    -- Tempo de check-in at├® atendimento
    (
      SELECT EXTRACT(EPOCH FROM (MAX(CASE WHEN action_type = 'ATTENDANCE_STARTED' THEN performed_at END) -
                                          MAX(CASE WHEN action_type = 'CHECKIN_STARTED' THEN performed_at END)))
      FROM appointment_audit_logs
      WHERE appointment_id = aal.appointment_id
    ) as time_checkin_atendimento_seconds
  FROM appointment_audit_logs aal
  LEFT JOIN appointments a ON aal.appointment_id = a.id
  WHERE a.scheduled_date::date = CURRENT_DATE
  GROUP BY aal.appointment_id, a.clinic_id, a.professional_id, a.scheduled_date
)
SELECT
  clinic_id,
  professional_id,
  appt_date as indicator_date,
  ROUND(AVG(time_agendamento_checkin_seconds)::numeric / 60, 1) as tempo_medio_agendamento_checkin_minutos,
  ROUND(AVG(time_checkin_atendimento_seconds)::numeric / 60, 1) as tempo_medio_checkin_atendimento_minutos,
  NOW() as calculated_at
FROM audit_data
WHERE clinic_id IS NOT NULL
GROUP BY clinic_id, professional_id, appt_date;

-- ============================================
-- 3. VIEW: Indicadores Financeiros
-- ============================================
CREATE OR REPLACE VIEW v_agenda_financial_indicators AS
WITH financial_data AS (
  SELECT
    a.clinic_id,
    a.scheduled_date::date as appt_date,
    a.scheduled_date::time as appt_time,
    EXTRACT(HOUR FROM a.scheduled_date::timestamp) as hour_of_day,
    COALESCE(a.value, s.price, 0) as appointment_value
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
  WHERE a.scheduled_date::date >= CURRENT_DATE
    AND a.scheduled_date::date <= (CURRENT_DATE + INTERVAL '30 days')
    AND a.status IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado')
)
SELECT
  clinic_id,
  appt_date as indicator_date,
  ROUND(SUM(appointment_value)::numeric, 2) as receita_estimada_dia,
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN SUM(appointment_value)::numeric / (
        SELECT COUNT(DISTINCT hour_of_day)
        FROM financial_data
        WHERE clinic_id = fd.clinic_id
          AND appt_date = fd.appt_date
      )
      ELSE 0
    END, 2
  ) as receita_estimada_por_hora,
  -- Meta padr├úo (pode vir de configura├º├úo da cl├¡nica depois)
  COALESCE(
    (SELECT CAST(settings->>'daily_revenue_target' AS NUMERIC) FROM clinics WHERE id = clinic_id),
    5000.00
  ) as meta_dia,
  NOW() as calculated_at
FROM financial_data fd
GROUP BY clinic_id, appt_date;

-- ============================================
-- 4. FUN├ç├âO RPC: Indicadores Consolidados por Data
-- ============================================
CREATE OR REPLACE FUNCTION get_agenda_indicators(
  p_clinic_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_professional_id UUID DEFAULT NULL
)
RETURNS TABLE (
  indicator_date DATE,
  total_slots BIGINT,
  slots_ocupados BIGINT,
  slots_pendentes BIGINT,
  slots_livres BIGINT,
  taxa_ocupacao_percent NUMERIC,
  total_agendamentos BIGINT,
  confirmados BIGINT,
  faltas BIGINT,
  encaixes BIGINT,
  profissionais_ativos BIGINT,
  receita_estimada NUMERIC,
  receita_por_hora NUMERIC,
  meta_dia NUMERIC,
  percentual_meta_atingida NUMERIC,
  tempo_medio_checkin_minutos NUMERIC,
  status TEXT
) AS $$
WITH operational AS (
  SELECT
    vaid.clinic_id,
    vaid.indicator_date,
    vaid.total_slots,
    vaid.slots_ocupados,
    vaid.slots_pendentes,
    vaid.slots_livres,
    vaid.taxa_ocupacao_percent,
    vaid.total_agendamentos,
    vaid.confirmados,
    vaid.faltas,
    vaid.encaixes,
    vaid.profissionais_ativos,
    vaid.receita_estimada
  FROM v_agenda_indicators_daily vaid
  WHERE vaid.clinic_id = p_clinic_id
    AND vaid.indicator_date = p_date
),
financial AS (
  SELECT
    vafi.clinic_id,
    vafi.indicator_date,
    vafi.receita_estimada_por_hora,
    vafi.meta_dia
  FROM v_agenda_financial_indicators vafi
  WHERE vafi.clinic_id = p_clinic_id
    AND vafi.indicator_date = p_date
),
timing AS (
  SELECT
    vati.clinic_id,
    vati.indicator_date,
    COALESCE(AVG(vati.tempo_medio_checkin_atendimento_minutos), 0) as avg_checkin_time
  FROM v_agenda_time_indicators vati
  WHERE vati.clinic_id = p_clinic_id
    AND vati.indicator_date = p_date
    AND (p_professional_id IS NULL OR vati.professional_id = p_professional_id)
  GROUP BY vati.clinic_id, vati.indicator_date
)
SELECT
  o.indicator_date,
  o.total_slots,
  o.slots_ocupados,
  o.slots_pendentes,
  o.slots_livres,
  o.taxa_ocupacao_percent,
  o.total_agendamentos,
  o.confirmados,
  o.faltas,
  o.encaixes,
  o.profissionais_ativos,
  o.receita_estimada,
  COALESCE(f.receita_estimada_por_hora, 0),
  f.meta_dia,
  ROUND(
    CASE
      WHEN f.meta_dia > 0 THEN (o.receita_estimada / f.meta_dia * 100)
      ELSE 0
    END, 2
  ),
  COALESCE(t.avg_checkin_time, 0),
  CASE
    WHEN o.taxa_ocupacao_percent >= 80 THEN 'saud├ível'
    WHEN o.taxa_ocupacao_percent >= 40 THEN 'normal'
    ELSE 'cr├¡tico'
  END as status
FROM operational o
LEFT JOIN financial f ON o.clinic_id = f.clinic_id AND o.indicator_date = f.indicator_date
LEFT JOIN timing t ON o.clinic_id = t.clinic_id AND o.indicator_date = t.indicator_date;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- 5. FUN├ç├âO RPC: Indicadores por Profissional
-- ============================================
CREATE OR REPLACE FUNCTION get_professional_indicators(
  p_clinic_id UUID,
  p_professional_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  agendamentos_dia BIGINT,
  confirmados BIGINT,
  finalizado BIGINT,
  faltas BIGINT,
  tempo_medio_atendimento_minutos NUMERIC,
  receita_estimada NUMERIC,
  status TEXT
) AS $$
WITH prof_data AS (
  SELECT
    a.professional_id,
    p.name as professional_name,
    COUNT(*) as total_appts,
    COUNT(CASE WHEN a.status = 'confirmado' THEN 1 END) as confirmados,
    COUNT(CASE WHEN a.status = 'finalizado' THEN 1 END) as finalizado,
    COUNT(CASE WHEN a.status = 'falta' THEN 1 END) as faltas,
    COALESCE(AVG(EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 60), 0) as avg_duration,
    COALESCE(SUM(COALESCE(a.value, s.price)), 0) as revenue
  FROM appointments a
  LEFT JOIN professionals p ON a.professional_id = p.id
  LEFT JOIN services s ON a.service_id = s.id
  WHERE a.clinic_id = p_clinic_id
    AND a.professional_id = p_professional_id
    AND a.scheduled_date::date = p_date
  GROUP BY a.professional_id, p.name
)
SELECT
  pd.professional_id,
  pd.professional_name,
  pd.total_appts,
  pd.confirmados,
  pd.finalizado,
  pd.faltas,
  ROUND(pd.avg_duration::numeric, 1),
  pd.revenue,
  CASE
    WHEN pd.total_appts >= 8 THEN 'produtivo'
    WHEN pd.total_appts >= 4 THEN 'normal'
    ELSE 'baixa_ocupacao'
  END
FROM prof_data pd;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- 6. ├ìndices para Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
  ON appointments(clinic_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments(status)
  WHERE status IN ('confirmado', 'liberado_para_atendimento', 'finalizado', 'falta');

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_action_date
  ON appointment_audit_logs(action_type, performed_at DESC);

-- ============================================
-- 7. Coment├írios para Documenta├º├úo
-- ============================================
COMMENT ON VIEW v_agenda_indicators_daily IS 'Indicadores operacionais da agenda por dia e cl├¡nica';
COMMENT ON VIEW v_agenda_time_indicators IS 'Indicadores de tempo de atendimento baseado em auditoria';
COMMENT ON VIEW v_agenda_financial_indicators IS 'Indicadores financeiros e de receita estimada';
COMMENT ON FUNCTION get_agenda_indicators IS 'Retorna indicadores consolidados da agenda para um dia espec├¡fico';
COMMENT ON FUNCTION get_professional_indicators IS 'Retorna indicadores espec├¡ficos de um profissional em um dia';

-- ============================================================================
-- Consolidated from 20260115_fix_agenda_indicators.sql
-- ============================================================================

-- ============================================
-- CORRE├ç├âO: INDICADORES DA AGENDA
-- Views e Fun├º├Áes para c├ílculo de KPIs
-- ============================================

-- ============================================
-- 1. VIEW: Indicadores Operacionais por Dia
-- ============================================
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

-- ============================================
-- 2. VIEW: Indicadores de Tempo (baseado em auditoria)
-- ============================================
DROP VIEW IF EXISTS v_agenda_time_indicators CASCADE;

CREATE VIEW v_agenda_time_indicators AS
WITH audit_data AS (
  SELECT
    aal.appointment_id,
    a.clinic_id,
    a.professional_id,
    a.scheduled_date::date as appt_date,
    EXTRACT(EPOCH FROM (
      MAX(CASE WHEN aal.action_type = 'CHECKIN_STARTED' THEN aal.performed_at END) -
      MIN(CASE WHEN aal.action_type = 'APPOINTMENT_CREATED' THEN aal.performed_at END)
    )) as time_agendamento_checkin_seconds,
    EXTRACT(EPOCH FROM (
      MAX(CASE WHEN aal.action_type = 'ATTENDANCE_STARTED' THEN aal.performed_at END) -
      MAX(CASE WHEN aal.action_type = 'CHECKIN_STARTED' THEN aal.performed_at END)
    )) as time_checkin_atendimento_seconds
  FROM appointment_audit_logs aal
  LEFT JOIN appointments a ON aal.appointment_id = a.id
  WHERE a.scheduled_date::date = CURRENT_DATE
  GROUP BY aal.appointment_id, a.clinic_id, a.professional_id, a.scheduled_date
)
SELECT
  clinic_id,
  professional_id,
  appt_date as indicator_date,
  ROUND(AVG(time_agendamento_checkin_seconds)::numeric / 60, 1) as tempo_medio_agendamento_checkin_minutos,
  ROUND(AVG(time_checkin_atendimento_seconds)::numeric / 60, 1) as tempo_medio_checkin_atendimento_minutos,
  NOW() as calculated_at
FROM audit_data
WHERE clinic_id IS NOT NULL
GROUP BY clinic_id, professional_id, appt_date;

-- ============================================
-- 3. VIEW: Indicadores Financeiros
-- ============================================
DROP VIEW IF EXISTS v_agenda_financial_indicators CASCADE;

CREATE VIEW v_agenda_financial_indicators AS
WITH financial_data AS (
  SELECT
    a.clinic_id,
    a.scheduled_date::date as appt_date,
    a.scheduled_date::time as appt_time,
    EXTRACT(HOUR FROM a.scheduled_date::timestamp) as hour_of_day,
    COALESCE(a.value, s.price, 0) as appointment_value
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
  WHERE a.scheduled_date::date >= CURRENT_DATE
    AND a.scheduled_date::date <= (CURRENT_DATE + INTERVAL '30 days')
    AND a.status IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado')
)
SELECT
  clinic_id,
  appt_date as indicator_date,
  ROUND(SUM(appointment_value)::numeric, 2) as receita_estimada_dia,
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN SUM(appointment_value)::numeric / (
        SELECT COUNT(DISTINCT hour_of_day)
        FROM financial_data
        WHERE clinic_id = fd.clinic_id
          AND appt_date = fd.appt_date
      )
      ELSE 0
    END, 2
  ) as receita_estimada_por_hora,
  COALESCE(
    (SELECT CAST(settings->>'daily_revenue_target' AS NUMERIC) FROM clinics WHERE id = clinic_id),
    5000.00
  ) as meta_dia,
  NOW() as calculated_at
FROM financial_data fd
GROUP BY clinic_id, appt_date;

-- ============================================
-- 4. FUN├ç├âO RPC: Indicadores Consolidados por Data
-- ============================================
DROP FUNCTION IF EXISTS get_agenda_indicators(UUID, DATE, UUID);

CREATE FUNCTION get_agenda_indicators(
  p_clinic_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_professional_id UUID DEFAULT NULL
)
RETURNS TABLE (
  indicator_date DATE,
  total_slots BIGINT,
  slots_ocupados BIGINT,
  slots_pendentes BIGINT,
  slots_livres BIGINT,
  taxa_ocupacao_percent NUMERIC,
  total_agendamentos BIGINT,
  confirmados BIGINT,
  faltas BIGINT,
  encaixes BIGINT,
  profissionais_ativos BIGINT,
  receita_estimada NUMERIC,
  receita_por_hora NUMERIC,
  meta_dia NUMERIC,
  percentual_meta_atingida NUMERIC,
  tempo_medio_checkin_minutos NUMERIC,
  status TEXT
) AS $$
WITH operational AS (
  SELECT
    vaid.clinic_id,
    vaid.indicator_date,
    vaid.total_slots,
    vaid.slots_ocupados,
    vaid.slots_pendentes,
    vaid.slots_livres,
    vaid.taxa_ocupacao_percent,
    vaid.total_agendamentos,
    vaid.confirmados,
    vaid.faltas,
    vaid.encaixes,
    vaid.profissionais_ativos,
    vaid.receita_estimada
  FROM v_agenda_indicators_daily vaid
  WHERE vaid.clinic_id = p_clinic_id
    AND vaid.indicator_date = p_date
),
financial AS (
  SELECT
    vafi.clinic_id,
    vafi.indicator_date,
    vafi.receita_estimada_por_hora,
    vafi.meta_dia
  FROM v_agenda_financial_indicators vafi
  WHERE vafi.clinic_id = p_clinic_id
    AND vafi.indicator_date = p_date
),
timing AS (
  SELECT
    vati.clinic_id,
    vati.indicator_date,
    COALESCE(AVG(vati.tempo_medio_checkin_atendimento_minutos), 0) as avg_checkin_time
  FROM v_agenda_time_indicators vati
  WHERE vati.clinic_id = p_clinic_id
    AND vati.indicator_date = p_date
    AND (p_professional_id IS NULL OR vati.professional_id = p_professional_id)
  GROUP BY vati.clinic_id, vati.indicator_date
)
SELECT
  o.indicator_date,
  o.total_slots,
  o.slots_ocupados,
  o.slots_pendentes,
  o.slots_livres,
  o.taxa_ocupacao_percent,
  o.total_agendamentos,
  o.confirmados,
  o.faltas,
  o.encaixes,
  o.profissionais_ativos,
  o.receita_estimada,
  COALESCE(f.receita_estimada_por_hora, 0),
  f.meta_dia,
  ROUND(
    CASE
      WHEN f.meta_dia > 0 THEN (o.receita_estimada / f.meta_dia * 100)
      ELSE 0
    END, 2
  ),
  COALESCE(t.avg_checkin_time, 0),
  CASE
    WHEN o.taxa_ocupacao_percent >= 80 THEN 'saud├ível'
    WHEN o.taxa_ocupacao_percent >= 40 THEN 'normal'
    ELSE 'cr├¡tico'
  END as status
FROM operational o
LEFT JOIN financial f ON o.clinic_id = f.clinic_id AND o.indicator_date = f.indicator_date
LEFT JOIN timing t ON o.clinic_id = t.clinic_id AND o.indicator_date = t.indicator_date;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- 5. FUN├ç├âO RPC: Indicadores por Profissional
-- ============================================
DROP FUNCTION IF EXISTS get_professional_indicators(UUID, UUID, DATE);

CREATE FUNCTION get_professional_indicators(
  p_clinic_id UUID,
  p_professional_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  agendamentos_dia BIGINT,
  confirmados BIGINT,
  finalizado BIGINT,
  faltas BIGINT,
  tempo_medio_atendimento_minutos NUMERIC,
  receita_estimada NUMERIC,
  status TEXT
) AS $$
WITH prof_data AS (
  SELECT
    a.professional_id,
    p.name as professional_name,
    COUNT(*) as total_appts,
    COUNT(CASE WHEN a.status = 'confirmado' THEN 1 END) as confirmados,
    COUNT(CASE WHEN a.status = 'finalizado' THEN 1 END) as finalizado,
    COUNT(CASE WHEN a.status = 'falta' THEN 1 END) as faltas,
    COALESCE(AVG(EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 60), 0) as avg_duration,
    COALESCE(SUM(COALESCE(a.value, s.price)), 0) as revenue
  FROM appointments a
  LEFT JOIN professionals p ON a.professional_id = p.id
  LEFT JOIN services s ON a.service_id = s.id
  WHERE a.clinic_id = p_clinic_id
    AND a.professional_id = p_professional_id
    AND a.scheduled_date::date = p_date
  GROUP BY a.professional_id, p.name
)
SELECT
  pd.professional_id,
  pd.professional_name,
  pd.total_appts,
  pd.confirmados,
  pd.finalizado,
  pd.faltas,
  ROUND(pd.avg_duration::numeric, 1),
  pd.revenue,
  CASE
    WHEN pd.total_appts >= 8 THEN 'produtivo'
    WHEN pd.total_appts >= 4 THEN 'normal'
    ELSE 'baixa_ocupacao'
  END
FROM prof_data pd;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- 6. Coment├írios para Documenta├º├úo
-- ============================================
COMMENT ON VIEW v_agenda_indicators_daily IS 'Indicadores operacionais da agenda por dia e cl├¡nica';
COMMENT ON VIEW v_agenda_time_indicators IS 'Indicadores de tempo de atendimento baseado em auditoria';
COMMENT ON VIEW v_agenda_financial_indicators IS 'Indicadores financeiros e de receita estimada';
COMMENT ON FUNCTION get_agenda_indicators(UUID, DATE, UUID) IS 'Retorna indicadores consolidados da agenda para um dia espec├¡fico';
COMMENT ON FUNCTION get_professional_indicators(UUID, UUID, DATE) IS 'Retorna indicadores espec├¡ficos de um profissional em um dia';
