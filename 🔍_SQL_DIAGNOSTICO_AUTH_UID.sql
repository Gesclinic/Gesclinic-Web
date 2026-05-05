-- ============================================================
-- 🔍 DIAGNÓSTICO: Verificar auth.uid() vs public.users
-- ============================================================
-- Execute este SQL para entender o que está acontecendo
-- ============================================================

-- PASSO 1: Ver qual é o auth.uid() ATUAL
SELECT auth.uid() as auth_user_id, 'Seu user_id autenticado' as descricao;

-- PASSO 2: Ver todos os usuários na tabela users
SELECT 
  id,
  email,
  clinic_id,
  role,
  created_at,
  CASE WHEN id = auth.uid() THEN '✅ É VOCÊ!' ELSE '' END as match_info
FROM public.users
ORDER BY created_at DESC;

-- PASSO 3: Procurar especificamente seu user_id
SELECT 
  id,
  email,
  clinic_id,
  role,
  created_at
FROM public.users
WHERE id = auth.uid();

-- PASSO 4: Ver todas as clínicas
SELECT 
  id,
  name,
  created_at
FROM public.clinics;

-- PASSO 5: Verificar se o trigger está ativo
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;

-- PASSO 6: Ver função do trigger
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'set_appointments_clinic_id'
ORDER BY routine_name;

-- ============================================================
-- SE VOCÊ COPIAR E COLAR OS RESULTADOS, PODEREI DIAGNOSTICAR!
-- ============================================================
