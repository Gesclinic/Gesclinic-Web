-- =============================================================================
-- CLEANUP - REMOVE DUPLICATE OBJECTS
-- =============================================================================

-- Drop indexes (se existirem duplicadas)
DROP INDEX IF EXISTS idx_ar_receivables_clinic CASCADE;
DROP INDEX IF EXISTS idx_ar_receivables_status CASCADE;
DROP INDEX IF EXISTS idx_ar_payments_clinic CASCADE;
DROP INDEX IF EXISTS idx_ar_payments_receivable CASCADE;
DROP INDEX IF EXISTS idx_ar_payments_date CASCADE;
DROP INDEX IF EXISTS idx_financial_automation_queue_clinic_id CASCADE;
DROP INDEX IF EXISTS idx_financial_automation_queue_status CASCADE;
DROP INDEX IF EXISTS idx_dre_metrics_clinic_id CASCADE;

-- Disable RLS temporarily
ALTER TABLE IF EXISTS user_clinic_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ar_payer_type DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ar_receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ar_payments DISABLE ROW LEVEL SECURITY;

-- Truncate tables (não delete, só limpa dados) 
TRUNCATE TABLE IF EXISTS user_clinic_roles CASCADE;
TRUNCATE TABLE IF EXISTS ar_payer_type CASCADE;
TRUNCATE TABLE IF EXISTS ar_receivables CASCADE;
TRUNCATE TABLE IF EXISTS ar_payments CASCADE;

-- Re-enable RLS
ALTER TABLE IF EXISTS user_clinic_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ar_payer_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ar_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ar_payments ENABLE ROW LEVEL SECURITY;

COMMIT;
