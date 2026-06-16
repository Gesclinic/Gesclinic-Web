-- Verificação Pós-Migration: Equiparação ISSQN→ISS
-- Confirma que todos os campos foram criados com sucesso
-- Data: 2026-05-21

-- ============================================================
-- 1. VERIFICAR COLUNA: services.has_issqn_equiparation
-- ============================================================
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'services'
  AND column_name = 'has_issqn_equiparation';

-- Resultado esperado:
-- has_issqn_equiparation | boolean | false | NO

-- ============================================================
-- 2. VERIFICAR COLUNA: health_insurances.has_issqn_equiparation
-- ============================================================
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'health_insurances'
  AND column_name = 'has_issqn_equiparation';

-- Resultado esperado:
-- has_issqn_equiparation | boolean | false | NO

-- ============================================================
-- 3. VERIFICAR COLUNA: service_prices.service_issqn_equiparation
-- ============================================================
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_prices'
  AND column_name = 'service_issqn_equiparation';

-- Resultado esperado:
-- service_issqn_equiparation | boolean | NULL | YES

-- ============================================================
-- 4. VERIFICAR ÍNDICES
-- ============================================================
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('services', 'health_insurances')
  AND indexname LIKE '%issqn%';

-- Resultado esperado:
-- idx_services_issqn_equiparation
-- idx_health_insurances_issqn_equiparation

-- ============================================================
-- 5. VERIFICAR FUNÇÃO
-- ============================================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_service_tax_treatment'
  AND routine_schema = 'public';

-- Resultado esperado:
-- get_service_tax_treatment | FUNCTION | ...

-- ============================================================
-- 6. TESTAR FUNÇÃO (com UUIDs fictícios)
-- ============================================================
SELECT * FROM public.get_service_tax_treatment(
  '00000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000002'::UUID,
  '00000000-0000-0000-0000-000000000003'::UUID
);

-- Resultado esperado:
-- Retornará uma linha com tax_type = 'ISSQN' (padrão)

-- ============================================================
-- RESUMO DA VERIFICAÇÃO
-- ============================================================
-- Se todos os resultados acima aparecerem:
-- ✅ Migration foi executada com SUCESSO!
-- ✅ 3 colunas BOOLEAN criadas
-- ✅ 2 índices criados
-- ✅ 1 função PL/pgSQL criada
-- ✅ Pronto para APIs e UI!
