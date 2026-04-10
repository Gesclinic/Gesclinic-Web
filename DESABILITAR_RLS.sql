-- ============================================================
-- DESABILITAR RLS - Resolver problema de recursão infinita
-- ============================================================
-- Execute este script no Supabase SQL Editor para resolver os erros

-- Desabilitar RLS em todas as tabelas problemáticas
ALTER TABLE clinics DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE professionals DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ap_bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE ar_receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_financial_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- ✅ RLS desabilitado com sucesso!
-- A aplicação agora deve funcionar normalmente
SELECT '✅ RLS desabilitado em todas as tabelas!' as status;
