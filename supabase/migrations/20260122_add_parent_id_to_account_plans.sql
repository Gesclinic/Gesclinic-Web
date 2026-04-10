-- ============================================================
-- FIX ACCOUNT_PLANS - Adicionar coluna parent_id
-- ============================================================

ALTER TABLE IF EXISTS public.account_plans
  ADD COLUMN IF NOT EXISTS parent_id uuid;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_account_plans_parent_id ON public.account_plans (parent_id);

SELECT 'account_plans.parent_id added successfully!' AS status;
