-- ============================================================================
-- SCRIPT: Descobrir Estrutura de RLS
-- ============================================================================
-- 
-- Execute este script para descobrir como está configurado
-- o relacionamento entre usuários e clínicas
--

-- ============================================================================
-- 1. LISTAR TODAS AS TABELAS
-- ============================================================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- 2. PROCURAR TABELAS COM "CLINIC" OU "USER" NO NOME
-- ============================================================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND (table_name ILIKE '%clinic%' OR table_name ILIKE '%user%')
ORDER BY table_name;

-- ============================================================================
-- 3. VER ESTRUTURA DA TABELA "appointments"
-- ============================================================================

\d appointments

-- ============================================================================
-- 4. PROCURAR USUÁRIOS E CLÍNICAS
-- ============================================================================

-- Qual é a relação usuário <-> clínica?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name ILIKE '%user%' OR table_name ILIKE '%clinic%')
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- 5. VERIFICAR SE EXISTEM ESSAS TABELAS
-- ============================================================================

SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_clinic_roles');
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'users');
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'clinics');
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'clinic_users');
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_clinics');

-- ============================================================================
-- 6. VERIFICAR POLÍTICAS RLS EXISTENTES
-- ============================================================================

SELECT * FROM pg_policies;

-- ============================================================================
-- O QUE PROCURAMOS:
-- ============================================================================
--
-- Como funciona a autenticação/RLS no seu banco:
-- 1. Qual tabela relaciona usuários com clínicas?
-- 2. Como validar que um usuário tem acesso a uma clínica?
-- 3. Qual é o nome exato da tabela/view?
--
-- ============================================================================
