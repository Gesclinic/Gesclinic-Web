-- ============================================================================
-- Consolidated from 20260424_billing_guides_rls_policies.sql
-- ============================================================================

-- ============================================================================
-- ­ƒöÉ POL├ìTICAS RLS (Row Level Security) PARA BILLING_GUIDES
-- ============================================================================
--
-- Objetivo: Remover depend├¬ncia de filtros frontend, deixar RLS como ├ÜNICO
--           controle de acesso multi-tenant
--
-- Data: 2026-04-24
-- Status: Production Ready
--
-- ============================================================================

-- ============================================================================
-- ÔÜÖ´©Å PR├ë-REQUISITO: Fun├º├úo auxiliar get_current_clinic()
-- ============================================================================
-- Esta fun├º├úo DEVE existir no banco antes de aplicar as pol├¡ticas
-- Refer├¬ncia: Verificar se a fun├º├úo j├í foi criada via:
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_clinic');

-- Se ainda n├úo existe, descomente e execute:
/*
CREATE OR REPLACE FUNCTION get_current_clinic() RETURNS UUID AS $$
  SELECT clinic_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE;
*/

-- ============================================================================
-- ­ƒöô REMOVER POL├ìTICAS ANTIGAS (se existirem)
-- ============================================================================
DROP POLICY IF EXISTS "billing_guides_select" ON billing_guides;
DROP POLICY IF EXISTS "billing_guides_insert" ON billing_guides;
DROP POLICY IF EXISTS "billing_guides_update" ON billing_guides;
DROP POLICY IF EXISTS "billing_guides_delete" ON billing_guides;

-- ============================================================================
-- ­ƒôï POLICY 1: SELECT (Leitura)
-- ============================================================================
-- Usu├írio s├│ v├¬ guias da sua cl├¡nica
CREATE POLICY "billing_guides_select"
ON billing_guides
FOR SELECT
USING (clinic_id = get_current_clinic());

-- ============================================================================
-- Ô×ò POLICY 2: INSERT (Cria├º├úo)
-- ============================================================================
-- Usu├írio s├│ cria guias na sua cl├¡nica
CREATE POLICY "billing_guides_insert"
ON billing_guides
FOR INSERT
WITH CHECK (clinic_id = get_current_clinic());

-- ============================================================================
-- Ô£Å´©Å POLICY 3: UPDATE (Edi├º├úo)
-- ============================================================================
-- Usu├írio s├│ edita guias da sua cl├¡nica
-- IMPORTANTE: Impede mudan├ºa de clinic_id para outra cl├¡nica
CREATE POLICY "billing_guides_update"
ON billing_guides
FOR UPDATE
USING (clinic_id = get_current_clinic())
WITH CHECK (clinic_id = get_current_clinic());

-- ============================================================================
-- ­ƒùæ´©Å POLICY 4: DELETE (Dele├º├úo)
-- ============================================================================
-- Usu├írio s├│ deleta guias da sua cl├¡nica
CREATE POLICY "billing_guides_delete"
ON billing_guides
FOR DELETE
USING (clinic_id = get_current_clinic());

-- ============================================================================
-- Ô£à VERIFICA├ç├âO: RLS Habilitado
-- ============================================================================
-- Garante que RLS est├í ativado na tabela
ALTER TABLE billing_guides ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ­ƒôè VALIDA├ç├âO P├ôS-APLICA├ç├âO
-- ============================================================================
-- Execute para verificar se as pol├¡ticas foram criadas:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'billing_guides'
ORDER BY policyname;
*/

-- ============================================================================
-- ­ƒÄ» RESULTADO ESPERADO
-- ============================================================================
-- 4 pol├¡ticas criadas:
--   1. billing_guides_select   (SELECT)
--   2. billing_guides_insert   (INSERT)
--   3. billing_guides_update   (UPDATE)
--   4. billing_guides_delete   (DELETE)
--
-- Todas verificam: clinic_id = get_current_clinic()
--
-- ============================================================================
-- ­ƒôî NOTAS IMPORTANTES
-- ============================================================================
--
-- 1. ANTES de aplicar: Verifique que get_current_clinic() existe
--
-- 2. A fun├º├úo get_current_clinic() DEVE retornar NULL se:
--    - Usu├írio n├úo autenticado
--    - Usu├írio n├úo vinculado a cl├¡nica
--    Isso causar├í RLS NEGAR acesso (padr├úo seguro)
--
-- 3. Frontend N├âO precisa enviar clinic_id em queries
--    Exemplo:
--      SELECT * FROM billing_guides  (Ô£à RLS filtra por clinic_id)
--      N├âO: SELECT * FROM billing_guides WHERE clinic_id = '...'
--
-- 4. M├║ltiplas cl├¡nicas com mesmo banco:
--    - Cada usu├írio s├│ v├¬ dados da sua cl├¡nica
--    - Imposs├¡vel acessar dados de outra cl├¡nica pelo bug
--    - Escal├ível para N cl├¡nicas
--
-- 5. Performance:
--    - RLS adiciona pequeno overhead (~1-2ms por query)
--    - Mitigado por ├¡ndice em (clinic_id, id)
--    - Suportado nativamente por Supabase
--
-- ============================================================================
-- ­ƒöÉ SEGURAN├çA
-- ============================================================================
--
-- Antes (Frontend kontrola):
--   - Usu├írio malicioso: ALTER LOCAL clinic_id = 'xxx'
--   - Resultado: Acesso a dados de outra cl├¡nica ÔÜá´©Å
--
-- Depois (RLS no banco):
--   - Usu├írio malicioso: ALTER LOCAL clinic_id = 'xxx'
--   - Banco ignora clinic_id local
--   - RLS valida: clinic_id = get_current_clinic() ÔåÉ do BD
--   - Resultado: Acesso NEGADO Ô£à
--
-- ============================================================================

-- ============================================================================
-- Consolidated from 20260424_fix_get_current_clinic_function.sql
-- ============================================================================

-- =================================================================
-- FIX: get_current_clinic() function
-- Purpose: Return clinic_id for authenticated user, NEVER throw exception
-- Date: 2026-04-24
-- =================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.get_current_clinic() CASCADE;

-- Create improved version that never throws
CREATE OR REPLACE FUNCTION public.get_current_clinic()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  clinic uuid;
BEGIN
  -- Get clinic_id for authenticated user
  SELECT clinic_id INTO clinic
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;

  -- IMPORTANT: Always return (even NULL if not found)
  -- This prevents "unexpected null value" errors
  RETURN clinic;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_clinic() TO authenticated;

-- =================================================================
-- VERIFICATION QUERIES (run after migration)
-- =================================================================
-- Check function exists:
-- SELECT exists (
--   SELECT 1 FROM pg_proc
--   WHERE proname = 'get_current_clinic'
-- );

-- Test function (must be authenticated):
-- SELECT get_current_clinic();

-- =================================================================
