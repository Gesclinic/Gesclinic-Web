-- ============================================================
-- VALIDAÇÃO - Verificar se tabelas TISS foram criadas corretamente
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

-- 4. Verificar índices criados
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
-- FIM DAS VALIDAÇÕES
-- ============================================================
