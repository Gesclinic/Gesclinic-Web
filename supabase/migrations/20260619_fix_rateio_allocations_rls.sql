-- Fix RLS for automatic cost center allocation (rateio)
-- Goal: allow authenticated users from the same clinic to manage
-- financial_cost_center_allocations and financial_cost_center_allocation_items.

BEGIN;

-- Reuse project-wide helper; keep it idempotent.
CREATE OR REPLACE FUNCTION public.current_user_has_clinic_access(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_clinic_roles ucr
      WHERE ucr.user_id = auth.uid()
        AND ucr.clinic_id = p_clinic_id
    ),
    false
  )
  OR COALESCE(
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.clinic_id = p_clinic_id
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_has_clinic_access(uuid) TO authenticated, service_role;

ALTER TABLE IF EXISTS public.financial_cost_center_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_cost_center_allocation_items ENABLE ROW LEVEL SECURITY;

-- Parent table policies
DROP POLICY IF EXISTS financial_cc_allocations_select ON public.financial_cost_center_allocations;
DROP POLICY IF EXISTS financial_cc_allocations_insert ON public.financial_cost_center_allocations;
DROP POLICY IF EXISTS financial_cc_allocations_update ON public.financial_cost_center_allocations;
DROP POLICY IF EXISTS financial_cc_allocations_delete ON public.financial_cost_center_allocations;

CREATE POLICY financial_cc_allocations_select
ON public.financial_cost_center_allocations
FOR SELECT TO authenticated
USING (public.current_user_has_clinic_access(clinic_id));

CREATE POLICY financial_cc_allocations_insert
ON public.financial_cost_center_allocations
FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_clinic_access(clinic_id));

CREATE POLICY financial_cc_allocations_update
ON public.financial_cost_center_allocations
FOR UPDATE TO authenticated
USING (public.current_user_has_clinic_access(clinic_id))
WITH CHECK (public.current_user_has_clinic_access(clinic_id));

CREATE POLICY financial_cc_allocations_delete
ON public.financial_cost_center_allocations
FOR DELETE TO authenticated
USING (public.current_user_has_clinic_access(clinic_id));

-- Child table policies (access inherited from parent allocation.clinic_id)
DROP POLICY IF EXISTS financial_cc_allocation_items_select ON public.financial_cost_center_allocation_items;
DROP POLICY IF EXISTS financial_cc_allocation_items_insert ON public.financial_cost_center_allocation_items;
DROP POLICY IF EXISTS financial_cc_allocation_items_update ON public.financial_cost_center_allocation_items;
DROP POLICY IF EXISTS financial_cc_allocation_items_delete ON public.financial_cost_center_allocation_items;

CREATE POLICY financial_cc_allocation_items_select
ON public.financial_cost_center_allocation_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.financial_cost_center_allocations a
    WHERE a.id = financial_cost_center_allocation_items.allocation_id
      AND public.current_user_has_clinic_access(a.clinic_id)
  )
);

CREATE POLICY financial_cc_allocation_items_insert
ON public.financial_cost_center_allocation_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.financial_cost_center_allocations a
    WHERE a.id = financial_cost_center_allocation_items.allocation_id
      AND public.current_user_has_clinic_access(a.clinic_id)
  )
);

CREATE POLICY financial_cc_allocation_items_update
ON public.financial_cost_center_allocation_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.financial_cost_center_allocations a
    WHERE a.id = financial_cost_center_allocation_items.allocation_id
      AND public.current_user_has_clinic_access(a.clinic_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.financial_cost_center_allocations a
    WHERE a.id = financial_cost_center_allocation_items.allocation_id
      AND public.current_user_has_clinic_access(a.clinic_id)
  )
);

CREATE POLICY financial_cc_allocation_items_delete
ON public.financial_cost_center_allocation_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.financial_cost_center_allocations a
    WHERE a.id = financial_cost_center_allocation_items.allocation_id
      AND public.current_user_has_clinic_access(a.clinic_id)
  )
);

COMMIT;
