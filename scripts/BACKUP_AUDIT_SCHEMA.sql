-- ═══════════════════════════════════════════════════════════════════════════════
-- BACKUP COMPLETO - AUDIT LOGGING SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
-- Objetivo: Criar backup SQL das estruturas de audit ANTES de aplicar migration
-- Use isto para rollback rápido se algo der errado
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 1: BACKUP DO SCHEMA DAS TABELAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Colunas de appointment_audit_log
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'appointment_audit_log'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Colunas de appointment_audit_logs (plural)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'appointment_audit_logs'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 2: BACKUP DE DADOS ATUAIS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Contar registros ANTES do backup
WITH audit_counts AS (
  SELECT 'appointment_audit_log' as table_name, count(*) as records FROM public.appointment_audit_log
  UNION ALL
  SELECT 'appointment_audit_logs' as table_name, count(*) as records FROM public.appointment_audit_logs
)
SELECT table_name, records, to_char(now(), 'YYYY-MM-DD HH24:MI:SS') as backup_timestamp
FROM audit_counts;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 3: BACKUP DE TRIGGERS (DDL)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver definição de cada trigger (para poder recriar se necessário)
SELECT 
  trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM (
  SELECT 
    oid,
    trigger_name
  FROM pg_trigger
  WHERE tgrelid = 'public.appointments'::regclass
    OR tgname LIKE '%audit%'
) t;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 4: BACKUP DE FUNCTIONS (DDL)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver definição das functions de audit
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE (routine_name = 'audit_appointment_changes' 
    OR routine_name = 'audit_appointment_changes_fixed')
  AND routine_schema = 'public'
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 5: BACKUP DE ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver DDL de índices
SELECT 
  indexdef
FROM pg_indexes
WHERE tablename LIKE 'appointment_audit%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 6: BACKUP DE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver policies nas tabelas de audit
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename LIKE 'appointment_audit%'
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 7: VERIFICAR INTEGRIDADE PRÉ-BACKUP
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar constraints
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name LIKE 'appointment_audit%'
  AND table_schema = 'public'
ORDER BY table_name, constraint_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 8: STATUS PRÉ-EXECUÇÃO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Último resumo ANTES de fazer backup
SELECT 
  'BACKUP PRÉ-EXECUÇÃO' as checkpoint,
  to_char(now(), 'YYYY-MM-DD HH24:MI:SS') as timestamp,
  'READY' as status,
  'Verify all sections above before proceeding with migration' as note;
