-- ============================================================
-- ✅ EXECUTE ESTE SQL NO SUPABASE DASHBOARD
-- ============================================================
-- 
-- Passo a passo:
-- 1. Ir para: https://app.supabase.com
-- 2. Selecionar projeto: Gesclinic
-- 3. Menu esquerdo: SQL Editor
-- 4. Clicar: New Query
-- 5. Copiar TUDO abaixo
-- 6. Clicar: RUN (botão azul)
-- 7. Pronto! ✅
--
-- ============================================================

-- PASSO 1: Ver quais clínicas existem
SELECT 
  id, 
  name,
  created_at
FROM public.clinics
ORDER BY created_at DESC
LIMIT 10;

-- PASSO 2: Ver usuários que NÃO têm clínica
SELECT 
  id, 
  email, 
  clinic_id,
  role,
  created_at
FROM public.users
WHERE clinic_id IS NULL
ORDER BY created_at DESC;

-- PASSO 3: Ver usuários que JÁ têm clínica
SELECT 
  id, 
  email, 
  clinic_id,
  role,
  created_at
FROM public.users
WHERE clinic_id IS NOT NULL
ORDER BY created_at DESC;

-- ============================================================
-- ⚠️  SOMENTE SE USUÁRIOS SEM CLÍNICA FOREM ENCONTRADOS:
-- ============================================================

-- PASSO 4: ATUALIZAR - Associar TODOS os usuários sem clínica 
-- à PRIMEIRA clínica que existe
UPDATE public.users
SET clinic_id = (SELECT id FROM public.clinics LIMIT 1),
    updated_at = CURRENT_TIMESTAMP
WHERE clinic_id IS NULL;

-- PASSO 5: CONFIRMAR - Verificar que foi atualizado
SELECT 
  id, 
  email, 
  clinic_id,
  role,
  updated_at
FROM public.users
ORDER BY updated_at DESC;

-- ============================================================
-- ✅ FIM - Tudo pronto! Recarregue a página e tente novamente
-- ============================================================
