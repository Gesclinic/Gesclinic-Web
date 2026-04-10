-- ============================================================================
-- 🔧 FIX: RLS Policies para Feriados Nacionais
-- ============================================================================
-- INSTRUÇÕES:
-- 1. Vá para Supabase → SQL Editor
-- 2. Cole este código
-- 3. Clique "Run"
-- 4. Volte à app e recarregue
-- ============================================================================

-- ⚠️  DROPA POLICIES ANTIGAS
DROP POLICY IF EXISTS "holidays_insert" ON public.holidays;
DROP POLICY IF EXISTS "holidays_update" ON public.holidays;
DROP POLICY IF EXISTS "holidays_delete" ON public.holidays;

-- ✅ CRIA POLICIES NOVAS (com suporte para clinic_id IS NULL)

-- Holidays - INSERT (admin/gestor para clínica, OU sistema para feriados nacionais)
CREATE POLICY "holidays_insert" ON public.holidays
  FOR INSERT WITH CHECK (
    clinic_id IS NULL  -- ✅ Sistema pode inserir feriados nacionais
    OR EXISTS (
      SELECT 1 FROM public.clinic_users cu
      WHERE cu.clinic_id = holidays.clinic_id
        AND cu.user_id = auth.uid()
        AND cu.user_role IN ('admin', 'gestor')
    )
  );

-- Holidays - UPDATE (admin/gestor para clínica, OU sistema para feriados nacionais)
CREATE POLICY "holidays_update" ON public.holidays
  FOR UPDATE WITH CHECK (
    clinic_id IS NULL  -- ✅ Sistema pode atualizar feriados nacionais
    OR EXISTS (
      SELECT 1 FROM public.clinic_users cu
      WHERE cu.clinic_id = holidays.clinic_id
        AND cu.user_id = auth.uid()
        AND cu.user_role IN ('admin', 'gestor')
    )
  );

-- Holidays - DELETE (admin/gestor para clínica, OU sistema para feriados nacionais)
CREATE POLICY "holidays_delete" ON public.holidays
  FOR DELETE USING (
    clinic_id IS NULL  -- ✅ Sistema pode deletar feriados nacionais
    OR EXISTS (
      SELECT 1 FROM public.clinic_users cu
      WHERE cu.clinic_id = holidays.clinic_id
        AND cu.user_id = auth.uid()
        AND cu.user_role IN ('admin', 'gestor')
    )
  );

-- ✅ VERIFICAR - Deve retornar 3 policies
SELECT * FROM pg_policies WHERE tablename = 'holidays' AND policyname LIKE 'holidays_%';

