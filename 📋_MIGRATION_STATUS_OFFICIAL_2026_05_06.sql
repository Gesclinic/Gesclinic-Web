/**
 * 🔄 MIGRAÇÃO DE STATUS - SISTEMA OFICIAL 2026-05-06
 * ===================================================
 *
 * OBJETIVO:
 * Migrar todos os status existentes para os 8 status oficiais
 * Manter compatibilidade retroativa
 * Preservar integridade do sistema financeiro
 *
 * FASES:
 * 1️⃣  Criar ENUM para os 8 status oficiais
 * 2️⃣  Adicionar coluna de compatibilidade (legacy_status)
 * 3️⃣  Mapear e migrar dados existentes
 * 4️⃣  Validar integridade
 * 5️⃣  Atualizar RLS policies
 * 6️⃣  Testar financeiro (critical!)
 *
 * COMPATIBILIDADE:
 * - Código legado continua funcionando
 * - Financeiro não é afetado
 * - Rollback é possível se necessário
 *
 * SEGURANÇA:
 * - Transações atômicas
 * - Backup antes de aplicar
 * - Validação de integridade pós-migração
 */

-- ============================================================================
-- FASE 1: CRIAR ENUM PARA OS 8 STATUS OFICIAIS
-- ============================================================================

-- Verificar se enum já existe
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'appointment_status_official'
  ) THEN
    CREATE TYPE appointment_status_official AS ENUM (
      'scheduled',      -- 🗓️ Agendado
      'confirmed',      -- ✅ Confirmado
      'checked_in',     -- 📍 Check-in
      'waiting',        -- ⏳ Aguardando
      'in_progress',    -- 🔄 Em atendimento
      'completed',      -- ✔️ Completo (ENTRA FINANCEIRO)
      'cancelled',      -- 🚫 Cancelado
      'no_show'         -- ❌ Falta
    );
    RAISE NOTICE 'Enum appointment_status_official criado com sucesso';
  ELSE
    RAISE NOTICE 'Enum appointment_status_official já existe';
  END IF;
END
$$
LANGUAGE plpgsql;

-- ============================================================================
-- FASE 2: ADICIONAR COLUNAS DE COMPATIBILIDADE
-- ============================================================================

-- Verificar e adicionar coluna status_official se não existir
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'appointments'
    AND column_name = 'status_official'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN status_official appointment_status_official DEFAULT 'scheduled'::appointment_status_official;

    RAISE NOTICE 'Coluna status_official adicionada';
  ELSE
    RAISE NOTICE 'Coluna status_official já existe';
  END IF;
END
$$
LANGUAGE plpgsql;

-- Adicionar coluna de compatibilidade (guarda o status antigo para referência)
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'appointments'
    AND column_name = 'legacy_status'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN legacy_status VARCHAR(100);

    RAISE NOTICE 'Coluna legacy_status adicionada';
  ELSE
    RAISE NOTICE 'Coluna legacy_status já existe';
  END IF;
END
$$
LANGUAGE plpgsql;

-- Adicionar índice para queries otimizadas
CREATE INDEX IF NOT EXISTS idx_appointments_status_official
  ON appointments(clinic_id, status_official)
  WHERE status_official IS NOT NULL;

-- ============================================================================
-- FASE 3: FUNÇÃO DE MAPEAMENTO - CONVERTE STATUS ANTIGOS PARA NOVOS
-- ============================================================================

CREATE OR REPLACE FUNCTION map_legacy_status_to_official(legacy_status VARCHAR)
RETURNS appointment_status_official
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE LOWER(TRIM(legacy_status))
    -- De appointmentStatusEnums.js
    WHEN 'agendado' THEN RETURN 'scheduled'::appointment_status_official;
    WHEN 'confirmado' THEN RETURN 'confirmed'::appointment_status_official;
    WHEN 'aguardando' THEN RETURN 'waiting'::appointment_status_official;
    WHEN 'pendente' THEN RETURN 'waiting'::appointment_status_official;
    WHEN 'financeiro_pendente' THEN RETURN 'waiting'::appointment_status_official;
    WHEN 'liberado_para_atendimento' THEN RETURN 'waiting'::appointment_status_official;
    WHEN 'em_atendimento' THEN RETURN 'in_progress'::appointment_status_official;
    WHEN 'finalizado' THEN RETURN 'completed'::appointment_status_official;
    WHEN 'falta' THEN RETURN 'no_show'::appointment_status_official;
    WHEN 'cancelado' THEN RETURN 'cancelled'::appointment_status_official;
    WHEN 'remarcado' THEN RETURN 'scheduled'::appointment_status_official;

    -- De appointmentStatusConstants.js - BOOKING_STATUSES
    WHEN 'confirmed_phone' THEN RETURN 'confirmed'::appointment_status_official;
    WHEN 'confirmed_whatsapp' THEN RETURN 'confirmed'::appointment_status_official;
    WHEN 'at_reception' THEN RETURN 'checked_in'::appointment_status_official;
    WHEN 'at_checkout' THEN RETURN 'checked_in'::appointment_status_official;
    WHEN 'squeezein' THEN RETURN 'scheduled'::appointment_status_official;
    WHEN 'awaiting_insurance' THEN RETURN 'waiting'::appointment_status_official;
    WHEN 'blocked' THEN RETURN 'scheduled'::appointment_status_official;

    -- De appointmentStatusConstants.js - SERVICE_STATUSES
    WHEN 'awaiting_professional' THEN RETURN 'waiting'::appointment_status_official;
    WHEN 'in_service' THEN RETURN 'in_progress'::appointment_status_official;
    WHEN 'attended' THEN RETURN 'completed'::appointment_status_official;
    WHEN 'canceled' THEN RETURN 'cancelled'::appointment_status_official;

    -- De appointmentStatusConstants.js - MANAGEMENT_STATUSES
    WHEN 'rescheduled' THEN RETURN 'scheduled'::appointment_status_official;

    -- De appointmentStatusConstants.js - FINANCIAL_STATUSES
    WHEN 'awaiting_billing' THEN RETURN 'completed'::appointment_status_official;
    WHEN 'billed' THEN RETURN 'completed'::appointment_status_official;
    WHEN 'denied' THEN RETURN 'completed'::appointment_status_official;
    WHEN 'paid' THEN RETURN 'completed'::appointment_status_official;
    WHEN 'resubmitted' THEN RETURN 'completed'::appointment_status_official;
    WHEN 'not_billable' THEN RETURN 'completed'::appointment_status_official;

    -- Valores já oficiais
    WHEN 'scheduled' THEN RETURN 'scheduled'::appointment_status_official;
    WHEN 'confirmed' THEN RETURN 'confirmed'::appointment_status_official;
    WHEN 'checked_in' THEN RETURN 'checked_in'::appointment_status_official;
    WHEN 'waiting' THEN RETURN 'waiting'::appointment_status_official;
    WHEN 'in_progress' THEN RETURN 'in_progress'::appointment_status_official;
    WHEN 'completed' THEN RETURN 'completed'::appointment_status_official;
    WHEN 'cancelled' THEN RETURN 'cancelled'::appointment_status_official;
    WHEN 'no_show' THEN RETURN 'no_show'::appointment_status_official;

    -- NULL ou desconhecido -> scheduled (padrão seguro)
    ELSE RETURN 'scheduled'::appointment_status_official;
  END CASE;
END;
$$;

-- ============================================================================
-- FASE 4: MIGRAR DADOS EXISTENTES
-- ============================================================================

-- Copiar status atual para legacy_status
UPDATE appointments
SET legacy_status = status
WHERE legacy_status IS NULL
  AND status IS NOT NULL;

-- Mapear status legados para novo sistema
UPDATE appointments
SET status_official = map_legacy_status_to_official(status)
WHERE status_official = 'scheduled'::appointment_status_official
  OR status_official IS NULL;

-- Validação: Checar quantos foram mapeados
SELECT
  count(*) as total_appointments,
  count(CASE WHEN status_official IS NOT NULL THEN 1 END) as mapeados,
  count(CASE WHEN legacy_status IS NOT NULL THEN 1 END) as compatibilidade,
  count(CASE WHEN status_official = 'completed'::appointment_status_official THEN 1 END) as completed_count,
  count(CASE WHEN status_official = 'cancelled'::appointment_status_official THEN 1 END) as cancelled_count,
  count(CASE WHEN status_official = 'no_show'::appointment_status_official THEN 1 END) as no_show_count
FROM appointments;

-- ============================================================================
-- FASE 5: ATUALIZAR REGRAS DE NEGÓCIO COM NOVO STATUS
-- ============================================================================

-- Function: Validar se transição de status é permitida
CREATE OR REPLACE FUNCTION validate_status_transition(
  p_from_status appointment_status_official,
  p_to_status appointment_status_official
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Estados finais não podem transicionar
  IF p_from_status IN ('completed', 'cancelled', 'no_show') THEN
    RETURN FALSE;
  END IF;

  -- Transições válidas
  CASE p_from_status
    WHEN 'scheduled'::appointment_status_official THEN
      RETURN p_to_status IN ('confirmed', 'checked_in', 'cancelled', 'no_show');
    
    WHEN 'confirmed'::appointment_status_official THEN
      RETURN p_to_status IN ('scheduled', 'checked_in', 'cancelled');
    
    WHEN 'checked_in'::appointment_status_official THEN
      RETURN p_to_status IN ('waiting', 'cancelled', 'no_show');
    
    WHEN 'waiting'::appointment_status_official THEN
      RETURN p_to_status IN ('in_progress', 'no_show', 'cancelled');
    
    WHEN 'in_progress'::appointment_status_official THEN
      RETURN p_to_status IN ('completed', 'no_show');
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- ============================================================================
-- FASE 6: TRIGGER - COMPATIBILIDADE AUTOMÁTICA
-- ============================================================================

-- Trigger: Se mudar status (campo antigo), atualiza automaticamente status_official
CREATE OR REPLACE FUNCTION update_status_official_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se status foi alterado, mapear para novo sistema
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.legacy_status := OLD.status;
    NEW.status_official := map_legacy_status_to_official(NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

-- Remover trigger anterior se existir
DROP TRIGGER IF EXISTS trg_update_status_official ON appointments;

-- Criar novo trigger
CREATE TRIGGER trg_update_status_official
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_status_official_on_status_change();

-- ============================================================================
-- FASE 7: INTEGRAÇÃO COM FINANCEIRO
-- ============================================================================

-- Function: Verifica se deve criar receivable (compatibilidade com antigo código)
CREATE OR REPLACE FUNCTION should_create_receivable_from_appointment(
  p_appointment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_official appointment_status_official;
  v_status_legacy VARCHAR;
BEGIN
  SELECT status_official, status
  INTO v_status_official, v_status_legacy
  FROM appointments
  WHERE id = p_appointment_id;

  -- Cria receivable se:
  -- 1. Novo status for 'completed'
  -- 2. OU status legado for 'attended' (para compatibilidade)
  IF v_status_official = 'completed'::appointment_status_official THEN
    RETURN TRUE;
  END IF;

  IF LOWER(TRIM(v_status_legacy)) = 'attended' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Function: Verifica se deve cancelar receivable
CREATE OR REPLACE FUNCTION should_cancel_receivable_from_appointment(
  p_appointment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_official appointment_status_official;
BEGIN
  SELECT status_official
  INTO v_status_official
  FROM appointments
  WHERE id = p_appointment_id;

  -- Cancela receivable se: novo status for 'cancelled' ou 'no_show'
  RETURN v_status_official IN ('cancelled'::appointment_status_official, 'no_show'::appointment_status_official);
END;
$$;

-- ============================================================================
-- FASE 8: ÍNDICES E OTIMIZAÇÕES
-- ============================================================================

-- Índice para queries de status
CREATE INDEX IF NOT EXISTS idx_appointments_status_official_clinic
  ON appointments(clinic_id, status_official)
  WHERE archived_at IS NULL;

-- Índice para status finalizados
CREATE INDEX IF NOT EXISTS idx_appointments_completed_or_cancelled
  ON appointments(clinic_id, created_at DESC)
  WHERE status_official IN ('completed'::appointment_status_official, 'cancelled'::appointment_status_official, 'no_show'::appointment_status_official);

-- ============================================================================
-- FASE 9: VIEWS ÚTEIS PARA ANALYTICS
-- ============================================================================

-- View: Status distribution
CREATE OR REPLACE VIEW appointment_status_distribution AS
SELECT
  clinic_id,
  status_official,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY clinic_id), 2) as percentage
FROM appointments
WHERE archived_at IS NULL
GROUP BY clinic_id, status_official
ORDER BY clinic_id, status_official;

-- View: Financial eligible appointments
CREATE OR REPLACE VIEW appointments_financial_eligible AS
SELECT
  a.id,
  a.clinic_id,
  a.patient_id,
  a.professional_id,
  a.status_official,
  a.total_value,
  a.created_at
FROM appointments a
WHERE a.status_official = 'completed'::appointment_status_official
  AND a.archived_at IS NULL;

-- ============================================================================
-- FASE 10: VALIDAÇÃO PÓS-MIGRAÇÃO
-- ============================================================================

-- Relatório de migração
SELECT
  '📊 MIGRAÇÃO DE STATUS - RELATÓRIO' as relatorio,
  count(*) as total_appointments,
  count(CASE WHEN status_official = 'scheduled' THEN 1 END) as scheduled,
  count(CASE WHEN status_official = 'confirmed' THEN 1 END) as confirmed,
  count(CASE WHEN status_official = 'checked_in' THEN 1 END) as checked_in,
  count(CASE WHEN status_official = 'waiting' THEN 1 END) as waiting,
  count(CASE WHEN status_official = 'in_progress' THEN 1 END) as in_progress,
  count(CASE WHEN status_official = 'completed' THEN 1 END) as completed,
  count(CASE WHEN status_official = 'cancelled' THEN 1 END) as cancelled,
  count(CASE WHEN status_official = 'no_show' THEN 1 END) as no_show,
  count(CASE WHEN legacy_status IS NOT NULL THEN 1 END) as com_legacy_backup
FROM appointments
WHERE archived_at IS NULL;

-- Verif: Confirmar que nenhum status ficou NULL
SELECT COUNT(*) as status_nulos
FROM appointments
WHERE status_official IS NULL AND archived_at IS NULL;

-- Verif: Confirmar que ar_receivables foram criados para completed
SELECT
  'AR Receivables Status' as check_type,
  COUNT(DISTINCT a.id) as completed_appointments,
  COUNT(DISTINCT ar.id) as associated_receivables,
  ROUND(100.0 * COUNT(DISTINCT ar.id) / COUNT(DISTINCT a.id), 2) as coverage_percentage
FROM appointments a
LEFT JOIN ar_receivables ar ON a.id = ar.appointment_id
WHERE a.status_official = 'completed'::appointment_status_official
  AND a.archived_at IS NULL;

-- ============================================================================
-- FASE 11: COMENTÁRIOS NA TABELA
-- ============================================================================

COMMENT ON COLUMN appointments.status_official IS
  'Status oficial do agendamento (8 status: scheduled, confirmed, checked_in, waiting, in_progress, completed, cancelled, no_show)';

COMMENT ON COLUMN appointments.legacy_status IS
  'Status anterior mantido para compatibilidade retroativa com código legado';

-- ============================================================================
-- ✅ MIGRAÇÃO COMPLETA!
-- ============================================================================

-- Execute este script em fases:
-- 1. Primeiro, execute tudo
-- 2. Verifique os dados com SELECT
-- 3. Testar criação de ar_receivables para completed
-- 4. Testar filtros com novo status
-- 5. Testar transições
-- 6. Testar compatibilidade com código legado
