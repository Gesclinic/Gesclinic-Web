-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT SCHEMA INSPECTION - PRÉ-BACKUP
-- ═══════════════════════════════════════════════════════════════════════════════
-- Objetivo: Mapear TODOS os objetos relacionados ao audit ANTES de aplicar migration
-- Execute no Supabase SQL Editor e salve os resultados
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 1: TABELAS RELACIONADAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar AMBAS as tabelas de audit (se existem)
SELECT 
  table_name,
  table_schema,
  table_type,
  to_char(pg_total_relation_size(to_regclass(table_schema||'.'||table_name)), '999,999,999') as size_bytes
FROM information_schema.tables
WHERE table_name LIKE 'appointment_audit%'
  AND table_schema = 'public'
ORDER BY table_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 2: COLUNAS DAS TABELAS AUDIT
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver colunas da appointment_audit_log (singular)
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

-- Ver colunas da appointment_audit_logs (plural) - se existir
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
-- SEÇÃO 3: TRIGGERS NA TABELA APPOINTMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_orientation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 4: FUNCTIONS RELACIONADAS AO AUDIT
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  routine_name,
  routine_type,
  routine_schema,
  data_type as return_type,
  routine_definition
FROM information_schema.routines
WHERE (routine_name LIKE '%audit%' OR routine_name LIKE '%appointment%changes%')
  AND routine_schema = 'public'
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 5: ÍNDICES NAS TABELAS AUDIT
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename LIKE 'appointment_audit%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 6: CONSTRAINTS NAS TABELAS AUDIT
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  constraint_name,
  table_name,
  constraint_type,
  column_name
FROM information_schema.key_column_usage
WHERE table_name LIKE 'appointment_audit%'
  AND table_schema = 'public'
ORDER BY table_name, constraint_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 7: CONTAR REGISTROS NAS TABELAS AUDIT
-- ═══════════════════════════════════════════════════════════════════════════════

-- Contar registros em appointment_audit_log
SELECT 
  'appointment_audit_log' as table_name,
  count(*) as record_count
FROM public.appointment_audit_log
UNION ALL
-- Contar registros em appointment_audit_logs (se existir)
SELECT 
  'appointment_audit_logs' as table_name,
  count(*) as record_count
FROM public.appointment_audit_logs;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 8: DETECTAR TRIGGERS ÓRFÃS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver ALL triggers (não apenas em appointments)
SELECT 
  t.trigger_name,
  t.event_object_table as table_name,
  t.event_manipulation as operation,
  t.action_timing as timing,
  pg_get_triggerdef(trigger_oid) as full_definition
FROM (
  SELECT 
    oid as trigger_oid,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND (event_object_table = 'appointments' 
      OR trigger_name LIKE '%audit%')
) t
ORDER BY t.event_object_table, t.trigger_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 9: PROCURANDO PELO NOME DA FUNCTION ANTIGA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver se a função audit_appointment_changes() ainda existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_name = 'audit_appointment_changes'
    AND routine_schema = 'public'
) as audit_appointment_changes_exists;

-- Ver se a função audit_appointment_changes_fixed() já existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_name = 'audit_appointment_changes_fixed'
    AND routine_schema = 'public'
) as audit_appointment_changes_fixed_exists;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 10: LINHA DE MIGRAÇÃO NAS TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver qual table está sendo usada na RLS ou na aplicação
SELECT 
  'Checking for references to appointment_audit tables' as status,
  table_name,
  constraint_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name IN ('appointment_audit_log', 'appointment_audit_logs')
  AND table_schema = 'public';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 11: ROW LEVEL SECURITY STATUS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  t.tablename,
  (t.relrowsecurity)::boolean as rls_enabled,
  (t.relforcerowsecurity)::boolean as rls_forced,
  p.policyname,
  p.permissive,
  p.cmd
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename
WHERE t.tablename LIKE 'appointment_audit%'
  AND t.schemaname = 'public'
ORDER BY t.tablename, p.policyname;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 12: VERIFICAR DEPENDÊNCIAS NO BANCO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Ver tudo que depende das functions de audit
SELECT 
  'Dependency Check' as type,
  deptype,
  count(*) as count
FROM pg_catalog.pg_depend
WHERE refobjid IN (
  SELECT oid FROM pg_catalog.pg_proc 
  WHERE proname LIKE '%audit%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
)
GROUP BY deptype;
