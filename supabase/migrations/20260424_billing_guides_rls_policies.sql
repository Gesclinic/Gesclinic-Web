-- ============================================================================
-- 🔐 POLÍTICAS RLS (Row Level Security) PARA BILLING_GUIDES
-- ============================================================================
-- 
-- Objetivo: Remover dependência de filtros frontend, deixar RLS como ÚNICO
--           controle de acesso multi-tenant
--
-- Data: 2026-04-24
-- Status: Production Ready
--
-- ============================================================================

-- ============================================================================
-- ⚙️ PRÉ-REQUISITO: Função auxiliar get_current_clinic()
-- ============================================================================
-- Esta função DEVE existir no banco antes de aplicar as políticas
-- Referência: Verificar se a função já foi criada via:
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_clinic');

-- Se ainda não existe, descomente e execute:
/*
CREATE OR REPLACE FUNCTION get_current_clinic() RETURNS UUID AS $$
  SELECT clinic_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE;
*/

-- ============================================================================
-- 🔓 REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================================================
DROP POLICY IF EXISTS "billing_guides_select" ON billing_guides;
DROP POLICY IF EXISTS "billing_guides_insert" ON billing_guides;
DROP POLICY IF EXISTS "billing_guides_update" ON billing_guides;
DROP POLICY IF EXISTS "billing_guides_delete" ON billing_guides;

-- ============================================================================
-- 📋 POLICY 1: SELECT (Leitura)
-- ============================================================================
-- Usuário só vê guias da sua clínica
CREATE POLICY "billing_guides_select"
ON billing_guides
FOR SELECT
USING (clinic_id = get_current_clinic());

-- ============================================================================
-- ➕ POLICY 2: INSERT (Criação)
-- ============================================================================
-- Usuário só cria guias na sua clínica
CREATE POLICY "billing_guides_insert"
ON billing_guides
FOR INSERT
WITH CHECK (clinic_id = get_current_clinic());

-- ============================================================================
-- ✏️ POLICY 3: UPDATE (Edição)
-- ============================================================================
-- Usuário só edita guias da sua clínica
-- IMPORTANTE: Impede mudança de clinic_id para outra clínica
CREATE POLICY "billing_guides_update"
ON billing_guides
FOR UPDATE
USING (clinic_id = get_current_clinic())
WITH CHECK (clinic_id = get_current_clinic());

-- ============================================================================
-- 🗑️ POLICY 4: DELETE (Deleção)
-- ============================================================================
-- Usuário só deleta guias da sua clínica
CREATE POLICY "billing_guides_delete"
ON billing_guides
FOR DELETE
USING (clinic_id = get_current_clinic());

-- ============================================================================
-- ✅ VERIFICAÇÃO: RLS Habilitado
-- ============================================================================
-- Garante que RLS está ativado na tabela
ALTER TABLE billing_guides ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 📊 VALIDAÇÃO PÓS-APLICAÇÃO
-- ============================================================================
-- Execute para verificar se as políticas foram criadas:
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
-- 🎯 RESULTADO ESPERADO
-- ============================================================================
-- 4 políticas criadas:
--   1. billing_guides_select   (SELECT)
--   2. billing_guides_insert   (INSERT)
--   3. billing_guides_update   (UPDATE)
--   4. billing_guides_delete   (DELETE)
--
-- Todas verificam: clinic_id = get_current_clinic()
--
-- ============================================================================
-- 📌 NOTAS IMPORTANTES
-- ============================================================================
--
-- 1. ANTES de aplicar: Verifique que get_current_clinic() existe
--
-- 2. A função get_current_clinic() DEVE retornar NULL se:
--    - Usuário não autenticado
--    - Usuário não vinculado a clínica
--    Isso causará RLS NEGAR acesso (padrão seguro)
--
-- 3. Frontend NÃO precisa enviar clinic_id em queries
--    Exemplo:
--      SELECT * FROM billing_guides  (✅ RLS filtra por clinic_id)
--      NÃO: SELECT * FROM billing_guides WHERE clinic_id = '...'
--
-- 4. Múltiplas clínicas com mesmo banco:
--    - Cada usuário só vê dados da sua clínica
--    - Impossível acessar dados de outra clínica pelo bug
--    - Escalável para N clínicas
--
-- 5. Performance:
--    - RLS adiciona pequeno overhead (~1-2ms por query)
--    - Mitigado por índice em (clinic_id, id)
--    - Suportado nativamente por Supabase
--
-- ============================================================================
-- 🔐 SEGURANÇA
-- ============================================================================
--
-- Antes (Frontend kontrola):
--   - Usuário malicioso: ALTER LOCAL clinic_id = 'xxx'
--   - Resultado: Acesso a dados de outra clínica ⚠️
--
-- Depois (RLS no banco):
--   - Usuário malicioso: ALTER LOCAL clinic_id = 'xxx'
--   - Banco ignora clinic_id local
--   - RLS valida: clinic_id = get_current_clinic() ← do BD
--   - Resultado: Acesso NEGADO ✅
--
-- ============================================================================
