-- 2026-04-29: Corrigir permissões de UPDATE para desconto na tabela appointments
-- Problema: Admin/gerente não conseguem atualizar campo de desconto
-- Solução: Criar/atualizar política RLS para permitir UPDATE de desconto por admin/gerente

-- 1. Verificar políticas existentes
SELECT 
  policyname, 
  action, 
  qual
FROM pg_policies 
WHERE tablename = 'appointments' 
ORDER BY policyname;

-- 2. Remover política antiga de UPDATE se existir (muito restritiva)
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;

-- 3. Criar política nova que permite:
-- - Selecionar: Todos autenticados
-- - Atualizar: Todos autenticados (admin/gerente podem atualizar desconto)
CREATE POLICY "appointments_update"
  ON public.appointments FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4. Verificar se a política foi criada
SELECT 
  policyname, 
  action,
  USING_CLAUSE,
  WITH_CHECK_CLAUSE
FROM pg_policies 
WHERE tablename = 'appointments' 
AND policyname = 'appointments_update';

-- Mensagem de confirmação
SELECT 'Migration: Fix discount update permissions - Completed' as status;
