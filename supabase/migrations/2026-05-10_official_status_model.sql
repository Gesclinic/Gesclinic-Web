/**
 * MIGRATION: Official Status Model Implementation
 * ==============================================
 * 
 * Migração segura para o novo sistema de status oficial
 * 
 * Pontos importantes:
 * - Adiciona coluna com novo status
 * - Mapeia status antigos para novos
 * - Mantém dados legados intactos
 * - Reversível se necessário
 */

-- ============================================================================
-- 1. VERIFICAÇÃO PRÉ-MIGRAÇÃO
-- ============================================================================

-- Verificar estrutura atual
-- SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'appointments';

-- ============================================================================
-- 2. CRIAR TIPO ENUM PARA STATUS OFICIAL
-- ============================================================================

-- Criar tipo enum para status oficial (se usando PostgreSQL)
CREATE TYPE appointment_official_status AS ENUM (
  'scheduled',
  'confirmed',
  'checked_in',
  'waiting',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

-- ============================================================================
-- 3. ADICIONAR COLUNA NOVA (backup da antiga)
-- ============================================================================

-- Adicionar coluna temporária para backupdo status antigo
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS booking_status_legacy VARCHAR(255);

-- Backup status antigos
UPDATE appointments 
SET booking_status_legacy = booking_status 
WHERE booking_status_legacy IS NULL;

-- ============================================================================
-- 4. CRIAR FUNÇÃO DE CONVERSÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION convert_to_official_status(legacy_status VARCHAR)
RETURNS appointment_official_status AS $$
DECLARE
  normalized_status VARCHAR;
BEGIN
  normalized_status := LOWER(TRIM(COALESCE(legacy_status, '')));
  
  -- Mapear status antigos para novos
  RETURN CASE normalized_status
    -- Scheduled family
    WHEN 'scheduled' THEN 'scheduled'::appointment_official_status
    WHEN 'agendado' THEN 'scheduled'::appointment_official_status
    
    -- Confirmed family
    WHEN 'confirmed' THEN 'confirmed'::appointment_official_status
    WHEN 'confirmed_phone' THEN 'confirmed'::appointment_official_status
    WHEN 'confirmed_whatsapp' THEN 'confirmed'::appointment_official_status
    WHEN 'confirmado' THEN 'confirmed'::appointment_official_status
    WHEN 'at_reception' THEN 'checked_in'::appointment_official_status
    WHEN 'na_recepcao' THEN 'checked_in'::appointment_official_status
    WHEN 'at_checkout' THEN 'checked_in'::appointment_official_status
    WHEN 'squeezein' THEN 'waiting'::appointment_official_status
    
    -- Waiting family
    WHEN 'awaiting_professional' THEN 'waiting'::appointment_official_status
    WHEN 'aguardando_profissional' THEN 'waiting'::appointment_official_status
    WHEN 'awaiting_insurance' THEN 'waiting'::appointment_official_status
    WHEN 'aguardando_convenio' THEN 'waiting'::appointment_official_status
    
    -- In progress family
    WHEN 'in_service' THEN 'in_progress'::appointment_official_status
    WHEN 'em_atendimento' THEN 'in_progress'::appointment_official_status
    WHEN 'in_progress' THEN 'in_progress'::appointment_official_status
    
    -- Completed family
    WHEN 'attended' THEN 'completed'::appointment_official_status
    WHEN 'atendido' THEN 'completed'::appointment_official_status
    WHEN 'completed' THEN 'completed'::appointment_official_status
    WHEN 'completo' THEN 'completed'::appointment_official_status
    
    -- Cancelled family
    WHEN 'cancelled' THEN 'cancelled'::appointment_official_status
    WHEN 'cancelado' THEN 'cancelled'::appointment_official_status
    WHEN 'blocked' THEN 'cancelled'::appointment_official_status
    WHEN 'bloqueado' THEN 'cancelled'::appointment_official_status
    
    -- No show family
    WHEN 'no_show' THEN 'no_show'::appointment_official_status
    WHEN 'faltou' THEN 'no_show'::appointment_official_status
    
    -- Default
    ELSE 'scheduled'::appointment_official_status
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 5. ADICIONAR COLUNA NOVA E POPULAR
-- ============================================================================

-- Adicionar coluna nova para status oficial
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS official_status appointment_official_status DEFAULT 'scheduled';

-- Popular nova coluna usando função de conversão
UPDATE appointments
SET official_status = convert_to_official_status(booking_status_legacy)
WHERE official_status = 'scheduled' AND booking_status_legacy IS NOT NULL;

-- ============================================================================
-- 6. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice no novo status para queries rápidas
CREATE INDEX IF NOT EXISTS idx_appointments_official_status 
ON appointments(official_status);

-- Índice combinado para filtros comuns
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_status 
ON appointments(clinic_id, official_status);

-- Índice para filtros por data e status
CREATE INDEX IF NOT EXISTS idx_appointments_date_status 
ON appointments(scheduled_date, official_status);

-- ============================================================================
-- 7. CRIAR TRIGGER PARA SINCRONIZAÇÃO (Opcional)
-- ============================================================================

-- Trigger que sincroniza booking_status com official_status
CREATE OR REPLACE FUNCTION sync_official_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se official_status foi atualizado, atualiza booking_status também
  IF NEW.official_status IS DISTINCT FROM OLD.official_status THEN
    NEW.booking_status = NEW.official_status::TEXT;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (se ainda não existir)
DROP TRIGGER IF EXISTS trigger_sync_official_status ON appointments;
CREATE TRIGGER trigger_sync_official_status
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION sync_official_status();

-- ============================================================================
-- 8. VALIDAÇÃO PÓS-MIGRAÇÃO
-- ============================================================================

-- Verificar contagem de registros
-- SELECT official_status, COUNT(*) FROM appointments GROUP BY official_status;

-- Verificar dados legados foram mantidos
-- SELECT DISTINCT booking_status_legacy, official_status 
-- FROM appointments WHERE booking_status_legacy IS NOT NULL LIMIT 10;

-- ============================================================================
-- 9. ROLLBACK (Se necessário)
-- ============================================================================

/*
-- Para reverter migração:

-- 1. Remover trigger
DROP TRIGGER IF EXISTS trigger_sync_official_status ON appointments;

-- 2. Remover função de sincronização
DROP FUNCTION IF EXISTS sync_official_status();

-- 3. Remover índices
DROP INDEX IF EXISTS idx_appointments_official_status;
DROP INDEX IF EXISTS idx_appointments_clinic_status;
DROP INDEX IF EXISTS idx_appointments_date_status;

-- 4. Restaurar dados antigos
UPDATE appointments 
SET booking_status = booking_status_legacy 
WHERE booking_status_legacy IS NOT NULL;

-- 5. Remover coluna nova
ALTER TABLE appointments DROP COLUMN IF EXISTS official_status;

-- 6. Remover tipo enum
DROP TYPE IF EXISTS appointment_official_status;

-- 7. Remover função de conversão
DROP FUNCTION IF EXISTS convert_to_official_status(VARCHAR);

-- 8. Manter a coluna legacy como backup
-- ALTER TABLE appointments DROP COLUMN booking_status_legacy; -- Opcional

*/

-- ============================================================================
-- 10. DOCUMENTAÇÃO
-- ============================================================================

/*
MIGRAÇÃO: Official Status Model
================================

Objetivo:
- Implementar novo sistema de status oficial com 8 estados bem definidos
- Manter compatibilidade com status antigos
- Permitir fluxo operacional claro: scheduled → confirmed → checked_in → ...

Mapeamento de Status Antigos:
- 'scheduled' → 'scheduled'
- 'confirmado', 'confirmed_phone', 'confirmed_whatsapp' → 'confirmed'
- 'at_reception', 'at_checkout' → 'checked_in'
- 'awaiting_professional', 'squeezein' → 'waiting'
- 'in_service' → 'in_progress'
- 'attended' → 'completed'
- 'cancelled', 'blocked' → 'cancelled'
- 'no_show', 'faltou' → 'no_show'

Índices Criados:
- idx_appointments_official_status
- idx_appointments_clinic_status
- idx_appointments_date_status

Triggers:
- sync_official_status: Mantém booking_status sincronizado

Backup:
- booking_status_legacy: Contém status antigos para referência

IMPORTANTE:
- Migração é reversível usando script de ROLLBACK
- Dados históricos são mantidos
- Sem perda de dados
- Performance melhorada com índices
*/
