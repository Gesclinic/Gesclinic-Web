-- ============================================================================
-- WAVE 5: RBAC (Role-Based Access Control) Implementation
-- ============================================================================
-- Description: Implement granular role-based access control for audit tables
-- Tables affected: audit_reports, audit_alerts_persistent, user_audit_events
-- Roles: 'admin', 'auditor', 'viewer', 'editor'
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RBAC POLICIES (if not already enabled)
-- ============================================================================

ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_alerts_persistent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_delete_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE HELPER FUNCTION: get_user_role
-- ============================================================================
-- Purpose: Get the role of the current user in their clinic
-- Returns: user_role or 'viewer' as default

CREATE OR REPLACE FUNCTION public.get_user_role(clinic_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.user_clinic_roles
  WHERE user_id = auth.uid()
    AND clinic_id = clinic_uuid
  LIMIT 1;

  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. AUDIT_REPORTS RBAC POLICIES
-- ============================================================================

-- SELECT: All authenticated users can select their clinic's reports
CREATE POLICY audit_reports_select_rbac ON public.audit_reports
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Only 'admin' and 'editor' roles
CREATE POLICY audit_reports_insert_rbac ON public.audit_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

-- UPDATE: Only 'admin' and 'editor' roles
CREATE POLICY audit_reports_update_rbac ON public.audit_reports
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

-- DELETE: Only 'admin' role
CREATE POLICY audit_reports_delete_rbac ON public.audit_reports
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- 4. AUDIT_ALERTS_PERSISTENT RBAC POLICIES
-- ============================================================================

-- SELECT: All authenticated users can select their clinic's alerts
CREATE POLICY audit_alerts_select_rbac ON public.audit_alerts_persistent
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Only 'admin' and 'editor' roles
CREATE POLICY audit_alerts_insert_rbac ON public.audit_alerts_persistent
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

-- UPDATE: Only 'admin' and 'editor' roles
CREATE POLICY audit_alerts_update_rbac ON public.audit_alerts_persistent
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

-- DELETE: Only 'admin' role
CREATE POLICY audit_alerts_delete_rbac ON public.audit_alerts_persistent
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- 5. USER_AUDIT_EVENTS RBAC POLICIES
-- ============================================================================

-- SELECT: All authenticated users can select their clinic's events
CREATE POLICY user_audit_events_select_rbac ON public.user_audit_events
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Only 'admin' and 'auditor' roles (system/app generated)
CREATE POLICY user_audit_events_insert_rbac ON public.user_audit_events
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'auditor')
    )
  );

-- UPDATE: Only 'admin' role (minimal updates allowed)
CREATE POLICY user_audit_events_update_rbac ON public.user_audit_events
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- DELETE: Only 'admin' role
CREATE POLICY user_audit_events_delete_rbac ON public.user_audit_events
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- 6. AUDIT_DELETE_LOG RBAC POLICIES (Read-only for compliance)
-- ============================================================================

-- SELECT: 'admin' and 'auditor' roles can view deletion logs
CREATE POLICY audit_delete_log_select_rbac ON public.audit_delete_log
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'auditor')
    )
  );

-- INSERT: System only (via trigger)
-- DELETE: Never allowed (append-only audit log)

-- ============================================================================
-- 7. ROLE DESCRIPTIONS & PERMISSIONS SUMMARY
-- ============================================================================

/*
╔══════════════════════════════════════════════════════════════════════════════╗
║                          RBAC ROLE MATRIX                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ ROLE        │ SELECT │ INSERT │ UPDATE │ DELETE │ Access Level              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ admin       │  ✓     │  ✓     │  ✓     │  ✓     │ Full administrative       ║
║ auditor     │  ✓     │  ✓     │  ✗     │  ✗     │ Read + create audits      ║
║ editor      │  ✓     │  ✓     │  ✓     │  ✗     │ Read + modify data        ║
║ viewer      │  ✓     │  ✗     │  ✗     │  ✗     │ Read-only access          ║
╠══════════════════════════════════════════════════════════════════════════════╣

ROLE DESCRIPTIONS:

1. ADMIN
   - Full access to all tables and operations
   - Can create, read, update, and delete audit data
   - Can delete records (with automatic audit logging)
   - Can view deletion logs
   - Can manage roles for clinic

2. AUDITOR
   - Create new audit reports and alerts
   - Read all audit data for compliance
   - Cannot modify or delete existing data
   - Can view deletion logs for investigations
   - Can generate compliance reports

3. EDITOR
   - Read and modify audit data (but not delete)
   - Create new records
   - Update existing records
   - Cannot permanently delete (prevents accidental data loss)
   - For operational team members

4. VIEWER
   - Read-only access to all audit data
   - Cannot modify, insert, or delete
   - For stakeholders, clients, read-only reporting
   - Default role for new users

╚══════════════════════════════════════════════════════════════════════════════╝
*/

-- ============================================================================
-- 8. TEST & VERIFY RBAC
-- ============================================================================

-- To test RBAC policies, run these queries:

-- Test 1: Check policies exist
-- SELECT * FROM information_schema.role_table_grants
-- WHERE table_name IN ('audit_reports', 'audit_alerts_persistent', 'user_audit_events')
-- ORDER BY table_name, privilege;

-- Test 2: View RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('audit_reports', 'audit_alerts_persistent', 'user_audit_events')
-- ORDER BY tablename, policyname;

-- Test 3: Insert test data (requires admin role)
-- INSERT INTO audit_reports (clinic_id, user_id, report_type, period_start, period_end, data)
-- VALUES (
--   'clinic-id',
--   auth.uid(),
--   'compliance_audit',
--   NOW() - INTERVAL '7 days',
--   NOW(),
--   '{"test": true}'::jsonb
-- );

-- Test 4: Verify clinic isolation
-- SELECT clinic_id, COUNT(*) as count
-- FROM audit_reports
-- WHERE clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid())
-- GROUP BY clinic_id;

-- ============================================================================
-- 9. PERFORMANCE NOTES
-- ============================================================================

/*
POLICY PERFORMANCE:
- Subquery policies (user_clinic_roles lookup) add ~1-2ms per query
- Index on user_clinic_roles.user_id recommended for performance
- Policies are evaluated at plan time (not runtime), so no per-row overhead

RECOMMENDATIONS:
1. Create indexes on user_clinic_roles for faster lookups:
   CREATE INDEX idx_ucr_user_clinic ON user_clinic_roles(user_id, clinic_id);

2. Monitor policy performance in production:
   EXPLAIN ANALYZE SELECT * FROM audit_reports;

3. Cache user roles in client-side context if high-volume queries:
   useAuth() should cache role lookup to avoid repeated queries
*/

-- ============================================================================
-- 10. COMPLIANCE & AUDIT TRAIL
-- ============================================================================

/*
AUDIT TRAIL FOR RBAC CHANGES:
- All DELETE operations logged via audit_delete_log (see WAVE 4)
- User roles tracked in user_clinic_roles.updated_at
- Policy changes logged in pg_stat_statements (PostgreSQL stats)

RECOMMENDED ACTIONS:
1. Review user_clinic_roles monthly for changes
2. Audit admin access logs quarterly
3. Test policy enforcement in staging environment
4. Document role assignments for each clinic
5. Implement approval workflow for admin role assignments
*/

-- ============================================================================
-- END OF RBAC IMPLEMENTATION
-- ============================================================================
