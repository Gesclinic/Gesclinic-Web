-- ============================================================================
-- MIGRATION: 20260612_phase17_ar_invoices_rls_security.sql
-- PURPOSE: Fase 17 Seguranca - RLS tenant-aware para ar_invoices
-- ============================================================================

ALTER TABLE public.ar_invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY ar_invoices_users_select ON public.ar_invoices
    FOR SELECT USING (
      clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
      OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ar_invoices_users_insert ON public.ar_invoices
    FOR INSERT WITH CHECK (
      clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
      OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ar_invoices_users_update ON public.ar_invoices
    FOR UPDATE USING (
      clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
      OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
    )
    WITH CHECK (
      clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
      OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ar_invoices_admin_delete ON public.ar_invoices
    FOR DELETE USING (
      clinic_id IN (
        SELECT clinic_id
        FROM public.user_clinic_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'administrador', 'owner', 'super_admin')
      )
      OR (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'administrador', 'owner', 'super_admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
