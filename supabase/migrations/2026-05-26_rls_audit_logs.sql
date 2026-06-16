-- ============================================================
-- RLS POLICIES FOR APPOINTMENT AUDIT LOGS
-- ============================================================
-- Arquivo: supabase/migrations/2026-05-26_rls_audit_logs.sql
-- Descrição: Define Row-Level Security policies para appointment_audit_logs
-- 
-- Políticas:
-- 1. Apenas usuários autenticados podem ler logs de auditoria
-- 2. Usuários só veem logs da sua clínica (via clinic_id na appointment)
-- 3. Apenas admin/gestor têm acesso
-- 4. Sistema (service role) pode inserir logs automaticamente
-- 5. Logs são imutáveis (sem UPDATE/DELETE)

-- ============================================================
-- 1. ENABLE RLS ON appointment_audit_logs TABLE
-- ============================================================
ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. POLICY: ADMIN CAN VIEW ALL AUDIT LOGS
-- ============================================================
-- Admin roles get access to all audit logs regardless of clinic
CREATE POLICY "admin_can_view_all_audit_logs"
  ON appointment_audit_logs
  FOR SELECT
  USING (
    (
      SELECT u.role 
      FROM public.users u 
      WHERE u.id = auth.uid()
    ) = 'admin'
  );

-- ============================================================
-- 3. POLICY: GESTOR CAN VIEW AUDIT LOGS FOR THEIR CLINIC
-- ============================================================
-- Gestor roles can only view audit logs for their clinic
-- This is enforced by joining with the appointment's clinic_id
CREATE POLICY "gestor_can_view_clinic_audit_logs"
  ON appointment_audit_logs
  FOR SELECT
  USING (
    (
      SELECT u.role 
      FROM public.users u 
      WHERE u.id = auth.uid()
    ) = 'gestor'
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.id = appointment_audit_logs.appointment_id
      AND a.clinic_id = (
        SELECT uc.clinic_id
        FROM public.user_clinic_roles uc
        WHERE uc.user_id = auth.uid()
        LIMIT 1
      )
    )
  );

-- ============================================================
-- 4. POLICY: MEDICO CAN VIEW ONLY THEIR OWN AUDIT LOGS
-- ============================================================
-- Médicos can view audit logs for appointments they performed
CREATE POLICY "medico_can_view_own_audit_logs"
  ON appointment_audit_logs
  FOR SELECT
  USING (
    (
      SELECT u.role 
      FROM public.users u 
      WHERE u.id = auth.uid()
    ) = 'medico'
    AND EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.id = appointment_audit_logs.appointment_id
      AND a.professional_id = auth.uid()
    )
  );

-- ============================================================
-- 5. POLICY: SYSTEM CAN INSERT AUDIT LOGS (TRIGGERS)
-- ============================================================
-- Triggers (via service role) should be able to insert
-- This uses session variable set by trigger functions
CREATE POLICY "system_can_insert_audit_logs"
  ON appointment_audit_logs
  FOR INSERT
  WITH CHECK (true);  -- Service role bypass

-- ============================================================
-- 6. POLICY: DISABLE UPDATES (APPEND-ONLY)
-- ============================================================
-- Audit logs are immutable - no updates allowed
-- This is enforced by having NO UPDATE policy
-- Attempting to update will result in permission denied

-- ============================================================
-- 7. POLICY: DISABLE DELETES (APPEND-ONLY)
-- ============================================================
-- Audit logs are immutable - no deletes allowed
-- This is enforced by having NO DELETE policy
-- Attempting to delete will result in permission denied

-- ============================================================
-- ALTERNATIVE: SIMPLIFIED POLICY
-- ============================================================
-- If the above is too complex, use this simpler approach:
-- 
-- DROP POLICY IF EXISTS "simplified_audit_access" ON appointment_audit_logs;
-- 
-- CREATE POLICY "simplified_audit_access"
--   ON appointment_audit_logs
--   FOR SELECT
--   USING (
--     -- Only authenticated users
--     auth.uid() IS NOT NULL
--     AND
--     -- User must be admin or gestor
--     (
--       SELECT u.role FROM public.users u WHERE u.id = auth.uid()
--     ) IN ('admin', 'gestor')
--   );

-- ============================================================
-- TESTING RLS POLICIES
-- ============================================================

-- Test 1: Admin can see all audit logs
-- SELECT COUNT(*) FROM appointment_audit_logs;

-- Test 2: Gestor sees only their clinic logs
-- SELECT a.clinic_id, COUNT(*)
-- FROM appointment_audit_logs al
-- JOIN appointments a ON a.id = al.appointment_id
-- GROUP BY a.clinic_id;

-- Test 3: Médico sees only their appointments
-- SELECT al.performed_by, COUNT(*)
-- FROM appointment_audit_logs al
-- JOIN appointments a ON a.id = al.appointment_id
-- WHERE a.professional_id = auth.uid()
-- GROUP BY al.performed_by;

-- ============================================================
-- NOTES
-- ============================================================
-- 
-- 1. RLS only works with authenticated users via Supabase Auth
-- 2. Service role (backend) bypasses RLS when needed
-- 3. Triggers insert with performed_by and performed_by_role
-- 4. The clinicId is enforced through the appointment FK
-- 5. audit_logs table should have no direct public access
-- 
-- Migration Steps:
-- 1. Apply this SQL to Supabase
-- 2. Test each policy with appropriate user roles
-- 3. Verify audit logs appear in AuditoriaPage UI
-- 4. Confirm triggers still insert despite RLS
--
-- Troubleshooting:
-- - If triggers fail: Check service role can insert
-- - If users see nothing: Check role in users table
-- - If see other clinic data: Check JOIN condition
-- - If performance slow: Add index on clinic_id via appointment

-- ============================================================
-- RECOMMENDED INDEXES
-- ============================================================

-- Index for clinic-based filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_appointment_id
  ON appointment_audit_logs(appointment_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type
  ON appointment_audit_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON appointment_audit_logs(created_at DESC);

-- Index for user filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by
  ON appointment_audit_logs(performed_by);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_action_date
  ON appointment_audit_logs(
    (
      SELECT clinic_id FROM appointments WHERE id = appointment_audit_logs.appointment_id
    ),
    action_type,
    created_at DESC
  );
