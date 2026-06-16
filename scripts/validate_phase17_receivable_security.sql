SELECT
  c.relrowsecurity AS ar_invoices_rls_enabled,
  SUM(CASE WHEN p.polname IN (
    'ar_invoices_users_select',
    'ar_invoices_users_insert',
    'ar_invoices_users_update',
    'ar_invoices_admin_delete'
  ) THEN 1 ELSE 0 END) AS expected_policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname = 'ar_invoices'
GROUP BY c.relrowsecurity;
