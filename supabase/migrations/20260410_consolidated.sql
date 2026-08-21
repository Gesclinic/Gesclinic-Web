-- ============================================================================
-- Consolidated from 20260410_ADD_TISS_FIELDS_APPOINTMENTS.sql
-- ============================================================================

-- ============================================================
-- Migration: Adicionar campos faltantes em appointments (sem excluir existentes)
-- Data: Abril 10, 2026
-- ============================================================

-- 1. Adicionar campos de faturamento/TISS em appointments
ALTER TABLE IF EXISTS appointments
ADD COLUMN IF NOT EXISTS total_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS guide_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS authorization_expiry DATE,
ADD COLUMN IF NOT EXISTS subscriber_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS dependent_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS dependent_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS dependent_birthdate DATE,
ADD COLUMN IF NOT EXISTS dependent_gender VARCHAR(1),
ADD COLUMN IF NOT EXISTS requires_authorization BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS billing_data JSONB,
ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS billing_xml TEXT,
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Criar ├¡ndices para otimizar queries TISS
CREATE INDEX IF NOT EXISTS idx_appointments_guide_number
  ON appointments(guide_number) WHERE guide_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_subscriber_number
  ON appointments(subscriber_number) WHERE subscriber_number IS NOT NULL;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================

-- ============================================================================
-- Consolidated from 20260410_CHECK_APPOINTMENTS_SCHEMA.sql
-- ============================================================================

-- ============================================================
-- VERIFICAR ESTRUTURA - Colunas da tabela appointments
-- Data: Abril 10, 2026
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
ORDER BY ordinal_position;

-- ============================================================================
-- Consolidated from 20260410_LISTAR_AGENDAMENTOS_UNIMED.sql
-- ============================================================================

-- ============================================================
-- TESTE - Preparar dados para fluxo TISS com agendamento existente
-- Data: Abril 10, 2026
-- ============================================================

-- 1. Listar agendamentos da Unimed com dados completos
SELECT
  a.id as appointment_id,
  a.scheduled_date,
  a.status as appointment_status,
  p.name as patient_name,
  p.cpf,
  pr.name as professional_name,
  pr.cbo_code,
  s.name as service_name,
  s.tuss_code,
  op.name as payer_name,
  op.registration_ans,
  bg.id as billing_guide_id,
  bg.guide_number as guide_number_tiss,
  bg.status as guide_status
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN professionals pr ON a.professional_id = pr.id
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN health_insurances op ON a.payer_id = op.id
LEFT JOIN billing_guides bg ON a.id = bg.appointment_id
WHERE op.name ILIKE '%unimed%'
  OR a.payer_id IN (SELECT id FROM health_insurances WHERE name ILIKE '%unimed%')
ORDER BY a.scheduled_date DESC
LIMIT 10;

-- ============================================================

-- 2. Verificar dados de Unimed no sistema
SELECT
  id,
  name,
  registration_ans,
  tiss_pattern,
  guide_format,
  tiss_endpoint,
  submission_method,
  active
FROM health_insurances
WHERE name ILIKE '%unimed%'
LIMIT 5;

-- ============================================================

-- 3. Se houver agendamento, verificar se tem billing_guide
SELECT DISTINCT
  a.id as appointment_id,
  COALESCE(bg.id, 'SEM GUIA') as billing_guide_status,
  a.status as appointment_status,
  CASE
    WHEN bg.id IS NULL THEN 'PRECISA CRIAR GUIA'
    WHEN bg.status = 'draft' THEN 'PRONTO PARA ENVIO TISS'
    WHEN bg.status IN ('submitted', 'processing', 'accepted') THEN 'J├ü SUBMETIDO'
    ELSE bg.status
  END as next_action
FROM appointments a
LEFT JOIN billing_guides bg ON a.id = bg.appointment_id
LEFT JOIN health_insurances op ON a.payer_id = op.id
WHERE op.name ILIKE '%unimed%'
  AND a.status = 'attended'  -- S├│ agendamentos completos
LIMIT 5;

-- ============================================================
-- FIM DO TESTE
-- ============================================================

-- ============================================================================
-- Consolidated from 20260410_VALIDAR_TISS_FIELDS.sql
-- ============================================================================

-- ============================================================
-- Valida├º├úo: Verificar se campos TISS foram criados com sucesso
-- ============================================================

-- 1. Verificar se coluna existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name IN (
  'diagnosis_code',
  'subscriber_number',
  'dependent_number',
  'dependent_name',
  'dependent_birthdate',
  'dependent_gender',
  'quantity',
  'authorization_expiry',
  'notes'
)
ORDER BY column_name;

-- 2. Listar todos os ├¡ndices criados para TISS
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'appointments'
AND indexname LIKE '%tiss%' OR indexname LIKE '%guide%' OR indexname LIKE '%subscriber%';

-- 3. Contar quantas colunas foram adicionadas
SELECT COUNT(*) as colunas_adicionadas
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name IN (
  'diagnosis_code',
  'subscriber_number',
  'dependent_number',
  'dependent_name',
  'dependent_birthdate',
  'dependent_gender',
  'quantity',
  'authorization_expiry',
  'notes'
);

-- 4. Mostrar estrutura completa da tabela appointments TISS
\d+ appointments

-- ============================================================================
-- Consolidated from 20260410_VALIDAR_TISS_TABLES.sql
-- ============================================================================

-- ============================================================
-- VALIDA├ç├âO - Verificar se tabelas TISS foram criadas corretamente
-- Data: Abril 10, 2026
-- ============================================================

-- 1. Verificar se tabelas TISS existem
SELECT
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_name IN ('tiss_submissions', 'tiss_audit_logs')
ORDER BY table_name;

-- ============================================================

-- 2. Verificar colunas da tabela tiss_submissions
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tiss_submissions'
ORDER BY ordinal_position;

-- ============================================================

-- 3. Verificar colunas da tabela tiss_audit_logs
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tiss_audit_logs'
ORDER BY ordinal_position;

-- ============================================================

-- 4. Verificar ├¡ndices criados
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('tiss_submissions', 'tiss_audit_logs')
ORDER BY tablename, indexname;

-- ============================================================

-- 5. Verificar RLS policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE tablename IN ('tiss_submissions', 'tiss_audit_logs')
ORDER BY tablename, policyname;

-- ============================================================

-- 6. Verificar se billing_guides tem colunas TISS
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'billing_guides'
  AND column_name IN ('status', 'last_submission_at')
ORDER BY ordinal_position;

-- ============================================================
-- FIM DAS VALIDA├ç├òES
-- ============================================================

-- ============================================================================
-- Consolidated from 20260410_create_tiss_tracking_tables.sql
-- ============================================================================

-- ============================================================
-- Migration: Criar Tabelas TISS (Submiss├Áes e Auditoria)
-- Data: Abril 10, 2026
-- ============================================================

-- 1. TISS_SUBMISSIONS - Rastreamento de submiss├Áes de guias
CREATE TABLE IF NOT EXISTS tiss_submissions (
  id VARCHAR(100) PRIMARY KEY,
  -- Links
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES billing_guides(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending: aguardando envio
    -- sent: enviado para operadora
    -- processing: operadora processando
    -- accepted: aceito pela operadora
    -- rejected: rejeitado pela operadora
    -- error: erro t├®cnico

  -- Conte├║do
  xml_content TEXT NOT NULL, -- XML TISS gerado
  response_data JSONB, -- Resposta da operadora (se recebida)

  -- Retry Logic
  attempt_count INT DEFAULT 1,
  max_attempts INT DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ├ìndices para performance
CREATE INDEX idx_tiss_submissions_clinic_guide
  ON tiss_submissions(clinic_id, guide_id);
CREATE INDEX idx_tiss_submissions_status
  ON tiss_submissions(clinic_id, status);
CREATE INDEX idx_tiss_submissions_retry
  ON tiss_submissions(clinic_id, next_retry_at)
  WHERE next_retry_at IS NOT NULL;

-- RLS para tiss_submissions
ALTER TABLE tiss_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tiss_submissions_clinic_policy ON tiss_submissions;
CREATE POLICY tiss_submissions_clinic_policy ON tiss_submissions
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================================

-- 2. TISS_AUDIT_LOGS - Hist├│rico de eventos TISS
CREATE TABLE IF NOT EXISTS tiss_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES billing_guides(id) ON DELETE CASCADE,

  -- Evento
  event VARCHAR(50) NOT NULL,
    -- SUBMITTED: guia enviada
    -- PROCESSING: operadora processando
    -- ACCEPTED: aceita
    -- REJECTED: rejeitada
    -- ERROR: erro
    -- RETRY_SUBMITTED: reenviada
  message TEXT NOT NULL,
  details TEXT, -- Detalhes do evento (XML snippet, erro, etc)

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ├ìndices
CREATE INDEX idx_tiss_audit_logs_guide
  ON tiss_audit_logs(clinic_id, guide_id, created_at DESC);
CREATE INDEX idx_tiss_audit_logs_event
  ON tiss_audit_logs(clinic_id, event, created_at DESC);

-- RLS para tiss_audit_logs
ALTER TABLE tiss_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tiss_audit_logs_clinic_policy ON tiss_audit_logs;
CREATE POLICY tiss_audit_logs_clinic_policy ON tiss_audit_logs
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================================

-- 3. Adicionar campos de status TISS em billing_guides (se n├úo existirem)
ALTER TABLE IF EXISTS billing_guides
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================

-- ============================================================================
-- Consolidated from 20260410_fix_joao_silva_plano_contas.sql
-- ============================================================================

-- Fix Jo├úo Silva appointment - add missing plano_contas_id
-- Appointment ID: f66bebad-25aa-450a-8376-c33025dcfdc2
-- Set to same plano_contas_id as Marcia: fc0654bd-66fb-498e-9ede-cccd3922d70a (Consultas)

UPDATE appointments
SET plano_contas_id = 'fc0654bd-66fb-498e-9ede-cccd3922d70a'
WHERE id = 'f66bebad-25aa-450a-8376-c33025dcfdc2'
AND clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

-- Verify the update
SELECT
  id,
  scheduled_date,
  scheduled_time,
  patients(name),
  plano_contas_id,
  payment_method
FROM appointments
WHERE id = 'f66bebad-25aa-450a-8376-c33025dcfdc2';
