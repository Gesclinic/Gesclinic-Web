-- ============================================================================
-- MIGRATION: 20260626_fix_xml_import_rls_and_payable_guide_number.sql
-- PURPOSE: Allow XML imports to use the same authenticated clinic resolution
--          paths as the app session, without opening cross-clinic access.
-- ============================================================================

DO $$
BEGIN
  CREATE POLICY ar_invoices_xml_import_select ON public.ar_invoices
    FOR SELECT USING (
      auth.uid() IS NOT NULL
      AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.users WHERE lower(email) = lower(auth.email()))
        OR clinic_id IN (
          SELECT ucr.clinic_id
          FROM public.user_clinic_roles ucr
          JOIN public.users u ON u.id = ucr.user_id
          WHERE lower(u.email) = lower(auth.email())
        )
        OR clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ar_invoices_xml_import_insert ON public.ar_invoices
    FOR INSERT WITH CHECK (
      auth.uid() IS NOT NULL
      AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.users WHERE lower(email) = lower(auth.email()))
        OR clinic_id IN (
          SELECT ucr.clinic_id
          FROM public.user_clinic_roles ucr
          JOIN public.users u ON u.id = ucr.user_id
          WHERE lower(u.email) = lower(auth.email())
        )
        OR clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ar_invoices_xml_import_update ON public.ar_invoices
    FOR UPDATE USING (
      auth.uid() IS NOT NULL
      AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.users WHERE lower(email) = lower(auth.email()))
        OR clinic_id IN (
          SELECT ucr.clinic_id
          FROM public.user_clinic_roles ucr
          JOIN public.users u ON u.id = ucr.user_id
          WHERE lower(u.email) = lower(auth.email())
        )
        OR clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
      )
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.users WHERE lower(email) = lower(auth.email()))
        OR clinic_id IN (
          SELECT ucr.clinic_id
          FROM public.user_clinic_roles ucr
          JOIN public.users u ON u.id = ucr.user_id
          WHERE lower(u.email) = lower(auth.email())
        )
        OR clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.ap_bills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY ap_bills_xml_import_select ON public.ap_bills
    FOR SELECT USING (
      auth.uid() IS NOT NULL
      AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.users WHERE lower(email) = lower(auth.email()))
        OR clinic_id IN (
          SELECT ucr.clinic_id
          FROM public.user_clinic_roles ucr
          JOIN public.users u ON u.id = ucr.user_id
          WHERE lower(u.email) = lower(auth.email())
        )
        OR clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ap_bills_xml_import_insert ON public.ap_bills
    FOR INSERT WITH CHECK (
      auth.uid() IS NOT NULL
      AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.users WHERE lower(email) = lower(auth.email()))
        OR clinic_id IN (
          SELECT ucr.clinic_id
          FROM public.user_clinic_roles ucr
          JOIN public.users u ON u.id = ucr.user_id
          WHERE lower(u.email) = lower(auth.email())
        )
        OR clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ap_bills_xml_import_update ON public.ap_bills
    FOR UPDATE USING (
      auth.uid() IS NOT NULL
      AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.users WHERE lower(email) = lower(auth.email()))
        OR clinic_id IN (
          SELECT ucr.clinic_id
          FROM public.user_clinic_roles ucr
          JOIN public.users u ON u.id = ucr.user_id
          WHERE lower(u.email) = lower(auth.email())
        )
        OR clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
      )
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND (
        clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid())
        OR clinic_id IN (SELECT clinic_id FROM public.users WHERE lower(email) = lower(auth.email()))
        OR clinic_id IN (
          SELECT ucr.clinic_id
          FROM public.user_clinic_roles ucr
          JOIN public.users u ON u.id = ucr.user_id
          WHERE lower(u.email) = lower(auth.email())
        )
        OR clinic_id::text = nullif(auth.jwt() ->> 'clinic_id', '')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;