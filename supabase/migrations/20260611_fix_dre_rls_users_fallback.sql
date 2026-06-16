-- ============================================================================
-- MIGRATION: 20260611_fix_dre_rls_users_fallback.sql
-- PURPOSE: Compatibilizar RLS de DRE com users.clinic_id e user_clinic_roles
-- ============================================================================

ALTER TABLE dre_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY dre_entries_users_all ON dre_entries
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

DO $$
BEGIN
  CREATE POLICY dre_metrics_users_all ON dre_metrics
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
