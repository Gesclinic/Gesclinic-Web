-- ═══════════════════════════════════════════════════════════════════════════════
-- CRITICAL FIX: Remove all old audit system triggers
-- This removes the blocker preventing INSERT/DELETE operations
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Drop triggers that reference non-existent table
DROP TRIGGER IF EXISTS audit_appointments_insert ON appointments CASCADE;
DROP TRIGGER IF EXISTS audit_appointments_update ON appointments CASCADE;
DROP TRIGGER IF EXISTS audit_appointments_delete ON appointments CASCADE;

-- 2. Drop the function they were using
DROP FUNCTION IF EXISTS audit_appointment_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_appointment_changes_fixed() CASCADE;

-- 3. Verify no triggers remain on appointments table
-- SELECT COUNT(*) as trigger_count FROM information_schema.triggers WHERE event_object_table = 'appointments';

-- 4. Now system should use new appointment_audit_logs (PLURAL) table with new triggers
-- If errors still occur, check for any remaining references to "appointment_audit_log" (SINGULAR)

-- 5. Test INSERT to confirm it works
-- INSERT INTO appointments (clinic_id, patient_id, professional_id, service_id, payer_id, scheduled_date, scheduled_time, end_time, status) 
-- VALUES ('...', '...', '...', '...', '...', NOW()::DATE, '10:00', '11:00', 'scheduled');
