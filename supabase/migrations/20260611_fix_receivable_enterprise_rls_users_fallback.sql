-- ============================================================================
-- MIGRATION: 20260611_fix_receivable_enterprise_rls_users_fallback.sql
-- PURPOSE: Compatibilizar RLS de pagamentos/glosas com users.clinic_id e user_clinic_roles
-- ============================================================================

DO $$
BEGIN
  CREATE POLICY receivable_payments_users_select ON receivable_payments
    FOR SELECT USING (
      clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
      OR clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY receivable_payments_users_insert ON receivable_payments
    FOR INSERT WITH CHECK (
      clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
      OR clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY receivable_glosas_users_all ON receivable_glosas
    FOR ALL USING (
      clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
      OR clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
    )
    WITH CHECK (
      clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
      OR clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
