-- ═══════════════════════════════════════════════════════════════════════════════
-- TEMPORARY FIX: Drop Problematic Audit Triggers
-- ═══════════════════════════════════════════════════════════════════════════════
-- This temporarily disables triggers that are causing the "action" column error
-- The auditApi.js JavaScript code will handle audit logging instead
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Drop triggers from migration 20260423
DROP TRIGGER IF EXISTS audit_appointments_insert ON appointments;
DROP TRIGGER IF EXISTS audit_appointments_update ON appointments;
DROP TRIGGER IF EXISTS audit_appointments_delete ON appointments;

-- Drop old function
DROP FUNCTION IF EXISTS audit_appointment_changes();

COMMIT;
