-- ============================================================
-- ETAPA 1: REFACTOR BASE DO SISTEMA - SCHEMA CORRETO
-- Gesclinic Web - 15 de janeiro de 2026
-- ============================================================
-- Este script cria/valida todas as tabelas necessárias para
-- o novo módulo "Base do Sistema", garantindo:
-- 1. Tabelas obrigatórias existem
-- 2. Estrutura consistente em todas
-- 3. Índices para performance
-- 4. Validações de FK
-- ============================================================

-- ============================================================
-- PARTE 1: TABELAS CORE (Serviços e Profissionais)
-- ============================================================

-- Garantir que services tem estrutura correta
-- Adicionar colunas se não existirem
ALTER TABLE IF EXISTS services
  ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Criar índices importantes
CREATE INDEX IF NOT EXISTS idx_services_clinic_active ON services(clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_services_code_clinic ON services(code, clinic_id) WHERE active = TRUE;

-- Garantir que professionals tem estrutura correta
ALTER TABLE IF EXISTS professionals
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_professionals_clinic_active ON professionals(clinic_id, active);

-- ============================================================
-- PARTE 2: VÍNCULO PROFISSIONAL X SERVIÇO
-- ============================================================

-- Tabela: professional_services (vínculo de quem faz qual serviço)
CREATE TABLE IF NOT EXISTS professional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Duração específica para este profissional neste serviço (sobrescreve padrão)
  duration_minutes_override INT,
  
  -- Competência/nível de experiência
  competence_level VARCHAR(50) DEFAULT 'standard', -- junior, standard, expert
  
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(professional_id, service_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_services_professional_clinic ON professional_services(professional_id, clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_professional_services_service_clinic ON professional_services(service_id, clinic_id, active);

-- ============================================================
-- PARTE 3: CONVÊNIOS E SEGUROS (Health Insurances)
-- ============================================================

-- Tabela: health_insurances (convênios e seguros)
CREATE TABLE IF NOT EXISTS health_insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  
  -- Tipo de convênio
  type VARCHAR(50), -- 'private_insurance', 'health_plan', 'government', 'direct_pay', 'other'
  
  -- Documentos da operadora
  cnpj TEXT,
  registration_number TEXT,
  
  -- Contato
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Configurações
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
-- PARTE 4: PREÇOS DE SERVIÇOS (por Convênio/Pagador)
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
  
  -- Se é consumível, controlar estoque
  is_consumable BOOLEAN DEFAULT FALSE,
  
  -- Informações de manutenção
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

-- Tabela: room_resources (alocação de recursos em salas)
CREATE TABLE IF NOT EXISTS room_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Quantidade do recurso na sala
  quantity INT DEFAULT 1,
  
  -- Se é recurso fixo/permanente ou móvel
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

-- Tabela: agenda_rules (regras de como agendar um serviço)
CREATE TABLE IF NOT EXISTS agenda_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Duração padrão do atendimento (minutos)
  default_duration_minutes INT NOT NULL,
  
  -- Intervalo de tempo mínimo entre agendamentos (minutos)
  interval_minutes INT DEFAULT 0,
  
  -- Tempo máximo permitido após última consulta (dias)
  -- Null = sem limite
  max_days_in_future INT,
  
  -- Tempo mínimo antes de poder agendar (dias)
  -- Ex: "deve agendar com pelo menos 2 dias de antecedência"
  min_days_in_advance INT DEFAULT 0,
  
  -- Permite agendamentos no mesmo dia?
  allow_same_day_booking BOOLEAN DEFAULT TRUE,
  
  -- Qual profissional é obrigatório?
  requires_specific_professional BOOLEAN DEFAULT FALSE,
  
  -- Qual sala é obrigatória?
  requires_specific_room BOOLEAN DEFAULT FALSE,
  
  -- Máximo de atendimentos por dia para este serviço
  max_per_day INT,
  
  -- Se a clínica quer confirmar antes de confirmar pro paciente
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
  
  -- Mínimo e máximo
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

-- Estender professional_schedules se necessário
ALTER TABLE IF EXISTS professional_schedules
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_professional_schedules_clinic ON professional_schedules(clinic_id);

-- ============================================================
-- PARTE 9: VALIDAÇÕES E CONSTRAINTS
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
-- PARTE 10: VIEWS ÚTEIS PARA QUERIES
-- ============================================================

-- View: Serviços com info de profissionais vinculados
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

-- View: Profissionais com seus serviços
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

-- View: Preços de serviços por convênio
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
-- Exemplo de como adicionar um convênio:
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

-- Exemplo de vincular profissional a serviço:
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
-- Status: ✅ Pronto para Supabase
-- Próxima: ETAPA 2 - API Modules
-- ============================================================
