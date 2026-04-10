-- ============================================================
-- DISABLE RLS TEMPORARILY FOR TESTING/DEVELOPMENT
-- ============================================================
-- This script disables Row Level Security on all tables
-- to allow testing without authentication
-- 
-- WARNING: Only use this in DEVELOPMENT!
-- For production, use proper RLS policies

ALTER TABLE clinics DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE professionals DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE ap_bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE ap_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE ar_receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE payers DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, row_security_enabled 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'clinics', 'users', 'appointments', 'patients', 'professionals', 
  'services', 'rooms', 'payers', 'stock', 'stock_items', 
  'ap_bills', 'chart_of_accounts', 'cost_centers',
  'professional_services', 'roles', 'permissions'
)
ORDER BY tablename;
