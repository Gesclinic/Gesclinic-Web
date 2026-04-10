-- ============================================================
-- DIAGNOSTIC - Verificar estrutura das tabelas
-- ============================================================

-- Ver colunas de invoices
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver colunas de ap_bills
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ap_bills' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver colunas de ar_receivables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ar_receivables' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver colunas de account_plans
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'account_plans' AND table_schema = 'public'
ORDER BY ordinal_position;
