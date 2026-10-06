-- Read-only inspection. Run with an authorized database administrator before
-- applying any candidate policy. Save the output in a restricted location.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname IN ('public', 'storage')
ORDER BY 1, 2;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY 1, 2, 3;

SELECT grantee, table_schema, table_name, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY grantee, column_name, privilege_type;

SELECT grantee, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'health_insurances'
ORDER BY grantee, column_name, privilege_type;

SELECT to_regclass('public.user_companies') AS membership_table,
       to_regclass('public.companies') AS companies_table;

-- Objects that can bypass ordinary table policies or expose clinical files.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       p.prosecdef AS security_definer, p.proconfig AS runtime_config,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY 1, 2;

SELECT schemaname, viewname, definition
FROM pg_views WHERE schemaname = 'public'
ORDER BY viewname;

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets ORDER BY id;

SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

SELECT stripe_invoice_id, count(*) AS duplicate_payments
FROM public.payment_history WHERE stripe_invoice_id IS NOT NULL
GROUP BY stripe_invoice_id HAVING count(*) > 1;
