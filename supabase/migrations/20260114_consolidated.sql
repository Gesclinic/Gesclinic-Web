-- ============================================================================
-- Consolidated from 20260114_CREATE_CODE_INDEXES.sql
-- ============================================================================

-- Script para criar apenas os ├¡ndices de "code" ap├│s as tabelas existirem
-- Execute este script DEPOIS que todas as tabelas forem criadas

-- Verificar se as colunas existem e criar ├¡ndices
CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_service_groups_code ON service_groups(code);
CREATE INDEX IF NOT EXISTS idx_payers_code ON payers(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
-- NOTE: idx_stock_categories_code is created in 20260113_COMPREHENSIVE_INIT migration
CREATE INDEX IF NOT EXISTS idx_stock_units_code ON stock_units(code);

-- Confirma├º├úo
SELECT '├ìndices de code criados com sucesso!' as status;

-- ============================================================================
-- Consolidated from 20260114_INSERT_PROFESSIONAL_USER.sql
-- ============================================================================

-- ============================================================
-- INSERT PROFISSIONAL USER FOR TESTING MODO PROFISSIONAL
-- ============================================================
-- This inserts a test professional user to test Modo Profissional feature
-- Date: 2026-01-14

-- Get clinic ID
WITH clinic_data AS (
  SELECT id FROM clinics WHERE name = 'Gesclinic Demo' LIMIT 1
)

-- Insert Professional User
INSERT INTO users (id, clinic_id, email, name, role)
SELECT
  gen_random_uuid(),
  clinic_data.id,
  'profissional@gesclinic.com.br',
  'Dr. Jo├úo Silva (Profissional)',
  'profissional'
FROM clinic_data
ON CONFLICT (email) DO UPDATE SET role = 'profissional'
RETURNING id, email, name, role;

-- Create corresponding professional record
WITH clinic_data AS (
  SELECT id FROM clinics WHERE name = 'Gesclinic Demo' LIMIT 1
)
INSERT INTO professionals (clinic_id, name, email, active)
SELECT
  clinic_data.id,
  'Dr. Jo├úo Silva',
  'profissional@gesclinic.com.br',
  true
FROM clinic_data
WHERE NOT EXISTS (
  SELECT 1 FROM professionals
  WHERE email = 'profissional@gesclinic.com.br'
)
RETURNING id, name, email;

-- Confirmation
SELECT 'Professional user created successfully!' as status;

-- ============================================================================
-- Consolidated from 20260114_add_patient_fields.sql
-- ============================================================================

-- ============================================================
-- ADD MISSING PATIENT FIELDS
-- ============================================================
-- Adds additional columns to patients table for:
-- - Contact info (cell_phone)
-- - Address details (street, number, neighborhood)
-- - Payment/Insurance info (payer_id, plan_id, insurance_id_number)
-- - Responsible person (responsible_name, responsible_relationship)
-- - Medical record and photo (record_number, photo_url)

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

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_patients_cell_phone ON patients(cell_phone);
CREATE INDEX IF NOT EXISTS idx_patients_payer ON patients(payer_id);
CREATE INDEX IF NOT EXISTS idx_patients_plan ON patients(plan_id);

-- ============================================================================
-- Consolidated from 20260114_add_prontuario_field.sql
-- ============================================================================

-- ============================================================
-- ADD PRONTU├üRIO FIELD TO PATIENTS
-- ============================================================
-- Adiciona campo de n├║mero de prontu├írio com gera├º├úo autom├ítica

-- 1. Adicionar coluna de prontu├írio
ALTER TABLE patients ADD COLUMN IF NOT EXISTS prontuario_numero VARCHAR(50) UNIQUE;

-- 2. Adicionar ├¡ndice para melhor performance
CREATE INDEX IF NOT EXISTS idx_patients_prontuario ON patients(prontuario_numero);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_prontuario ON patients(clinic_id, prontuario_numero);

-- 3. Criar fun├º├úo para gerar n├║mero de prontu├írio autom├ítico
CREATE OR REPLACE FUNCTION generate_prontuario_numero(p_clinic_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_clinic_code VARCHAR(50);
  v_next_number INT;
  v_prontuario VARCHAR(50);
BEGIN
  -- Obter c├│digo da cl├¡nica
  SELECT code INTO v_clinic_code FROM clinics WHERE id = p_clinic_id LIMIT 1;

  IF v_clinic_code IS NULL THEN
    v_clinic_code := 'CLI';
  END IF;

  -- Gerar pr├│ximo n├║mero sequencial por cl├¡nica
  SELECT COALESCE(MAX(CAST(SPLIT_PART(prontuario_numero, '-', 2) AS INT)), 999) + 1
  INTO v_next_number
  FROM patients
  WHERE clinic_id = p_clinic_id;

  -- Formatar: CODCLINICA-0001
  v_prontuario := v_clinic_code || '-' || LPAD(v_next_number::TEXT, 4, '0');

  RETURN v_prontuario;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para auto-gerar prontu├írio ao criar paciente
CREATE OR REPLACE FUNCTION auto_generate_prontuario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prontuario_numero IS NULL THEN
    NEW.prontuario_numero := generate_prontuario_numero(NEW.clinic_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deletar trigger anterior se existir
DROP TRIGGER IF EXISTS trigger_auto_generate_prontuario ON patients;

-- Criar novo trigger
CREATE TRIGGER trigger_auto_generate_prontuario
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION auto_generate_prontuario();

-- 5. Coment├írio
COMMENT ON COLUMN patients.prontuario_numero IS 'N├║mero de prontu├írio ├║nico por cl├¡nica, gerado automaticamente no formato CODCLINICA-NNNN';

-- 6. GERAR PRONTU├üRIOS PARA PACIENTES EXISTENTES
-- Atualizar todos os pacientes que ainda n├úo t├¬m prontu├írio
UPDATE patients
SET prontuario_numero = (
  SELECT generate_prontuario_numero(patients.clinic_id)
)
WHERE prontuario_numero IS NULL;

-- ============================================================================
-- Consolidated from 20260114_create_suggestion_audit_logs.sql
-- ============================================================================

-- Migration: Criar tabela para auditoria de sugest├Áes
-- Data: 2026-01-14
-- Descri├º├úo: Registra todas as sugest├Áes executadas para an├ílise e auditoria

CREATE TABLE IF NOT EXISTS public.suggestion_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL,
  -- SLOT_LIVRE, NO_SHOW, PROFISSIONAL_OCIOSO, AGENDA_CRITICA
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  action_taken VARCHAR(50) NOT NULL,
  -- VER_LISTA_ESPERA, CRIAR_ENCAIXE, CONTATAR_PACIENTE, OTIMIZAR_AGENDA, IGNORADA
  result JSONB,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- ├ìndices
  CONSTRAINT suggestion_audit_logs_clinic_idx UNIQUE (clinic_id, executed_at)
);

-- ├ìndices para performance
CREATE INDEX idx_suggestion_audit_logs_clinic_id ON public.suggestion_audit_logs(clinic_id);
CREATE INDEX idx_suggestion_audit_logs_executed_at ON public.suggestion_audit_logs(executed_at);
CREATE INDEX idx_suggestion_audit_logs_suggestion_type ON public.suggestion_audit_logs(suggestion_type);
CREATE INDEX idx_suggestion_audit_logs_executed_by ON public.suggestion_audit_logs(executed_by);

-- RLS (Row Level Security)
ALTER TABLE public.suggestion_audit_logs ENABLE ROW LEVEL SECURITY;

-- Pol├¡tica: Gestor/Admin podem ver logs da sua cl├¡nica
CREATE POLICY "suggestion_audit_logs_view_by_role"
  ON public.suggestion_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.clinic_id = suggestion_audit_logs.clinic_id
      AND u.id = auth.uid()
      AND u.role IN ('gestor', 'admin', 'recepcao', 'recepcionista')
    )
  );

-- Pol├¡tica: Sistema pode inserir logs
CREATE POLICY "suggestion_audit_logs_insert_by_system"
  ON public.suggestion_audit_logs
  FOR INSERT
  WITH CHECK (TRUE);

-- Coment├írios
COMMENT ON TABLE public.suggestion_audit_logs IS 'Auditoria imut├ível de sugest├Áes de encaixe executadas';
COMMENT ON COLUMN public.suggestion_audit_logs.suggestion_type IS 'Tipo de sugest├úo: SLOT_LIVRE, NO_SHOW, PROFISSIONAL_OCIOSO, AGENDA_CRITICA';
COMMENT ON COLUMN public.suggestion_audit_logs.action_taken IS 'A├º├úo executada pelo usu├írio';
COMMENT ON COLUMN public.suggestion_audit_logs.result IS 'Resultado/contexto da a├º├úo (JSON)';
