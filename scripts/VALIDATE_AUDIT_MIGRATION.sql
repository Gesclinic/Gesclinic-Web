-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO PÓS-MIGRATION - AUDIT LOGGING FIX
-- ═══════════════════════════════════════════════════════════════════════════════
-- Execute APÓS aplicar 2026-05-07_fix_audit_trigger_action_column.sql
-- Verifica se tudo foi aplicado corretamente
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 1: VERIFICAR SE TRIGGERS FORAM CRIADOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar se os NOVOS triggers existem
SELECT 
  trigger_name,
  event_object_table,
  event_manipulation,
  'NEW TRIGGER' as type
FROM information_schema.triggers
WHERE trigger_name IN ('audit_appointments_insert', 'audit_appointments_update', 'audit_appointments_delete')
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 2: VERIFICAR SE FUNCTION NOVA FOI CRIADA
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  routine_name,
  routine_type,
  'FUNCTION CREATED' as status
FROM information_schema.routines
WHERE routine_name = 'audit_appointment_changes_fixed'
  AND routine_schema = 'public';

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 3: VERIFICAR SE FUNÇÃO ANTIGA FOI REMOVIDA
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'audit_appointment_changes' AND routine_schema = 'public')
    THEN 'ERROR: Old function still exists'
    ELSE 'OK: Old function was dropped'
  END as old_function_status;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 4: VERIFICAR SE APPOINTMENT_AUDIT_LOG EXISTE E TEM SCHEMA CORRETO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar colunas esperadas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'appointment_audit_log'
  AND table_schema = 'public'
  AND column_name IN ('operation', 'changed_at', 'changed_by', 'before_snapshot', 'after_snapshot', 'changed_fields')
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 5: CONTAR REGISTROS PRÉ E PÓS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  count(*) as total_audit_records,
  min(changed_at) as oldest_record,
  max(changed_at) as newest_record
FROM public.appointment_audit_log;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 6: VERIFICAR SE TRIGGER ESTÁ FUNCIONANDO (TEST INSERT)
-- ═══════════════════════════════════════════════════════════════════════════════

-- VER os 5 últimos registros no audit log
SELECT 
  id,
  appointment_id,
  operation,
  changed_at,
  source
FROM public.appointment_audit_log
ORDER BY changed_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 7: VERIFICAR RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'appointment_audit_log'
  AND schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 8: VERIFICAR ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'appointment_audit_log'
  AND schemaname = 'public'
ORDER BY indexname;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 9: RESUMO FINAL DE STATUS
-- ═══════════════════════════════════════════════════════════════════════════════

WITH checks AS (
  SELECT 'Trigger Insert Exists' as check_name,
         CASE WHEN EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_appointments_insert' AND trigger_schema = 'public') THEN 'PASS' ELSE 'FAIL' END as status
  UNION ALL
  SELECT 'Trigger Update Exists', CASE WHEN EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_appointments_update' AND trigger_schema = 'public') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'Trigger Delete Exists', CASE WHEN EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audit_appointments_delete' AND trigger_schema = 'public') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'New Function Created', CASE WHEN EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'audit_appointment_changes_fixed' AND routine_schema = 'public') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'Old Function Dropped', CASE WHEN NOT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'audit_appointment_changes' AND routine_schema = 'public') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'operation Column Exists', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'appointment_audit_log' AND column_name = 'operation' AND table_schema = 'public') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL
  SELECT 'changed_at Column Exists', CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'appointment_audit_log' AND column_name = 'changed_at' AND table_schema = 'public') THEN 'PASS' ELSE 'FAIL' END
)
SELECT 
  check_name,
  status,
  CASE WHEN status = 'PASS' THEN '✅' ELSE '❌' END as symbol
FROM checks
ORDER BY status DESC, check_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO 10: TESTE DE FUNCIONAMENTO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar se há registros de INSERT na tabela de audit APÓS a migration
SELECT 
  'Audit Log Status' as check,
  CASE 
    WHEN count(*) > 0 THEN 'Triggers are working'
    ELSE 'No entries yet'
  END as status,
  count(*) as total_entries
FROM public.appointment_audit_log
WHERE operation = 'CREATE'
  AND changed_at > (now() - interval '1 hour');
