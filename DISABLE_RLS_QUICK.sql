-- ============================================================
-- DISABLE RLS TEMPORARILY FOR TESTING - QUICK VERSION
-- ============================================================
-- Execute isso no Supabase SQL Editor para desabilitar RLS
-- e permitir inserção de dados de teste
--
-- Dados: 2026-04-05
-- Objetivo: Criar dados de teste para março 2026

-- Tabelas que precisam de RLS desabilitado
ALTER TABLE medical_production DISABLE ROW LEVEL SECURITY;
ALTER TABLE medical_repasse DISABLE ROW LEVEL SECURITY;
ALTER TABLE medical_repasse_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts DISABLE ROW LEVEL SECURITY;

-- Pronto!
-- Agora você pode executar: node insert_test_data_smart.js
-- Ele vai conseguir inserir os dados de teste para março 2026

-- Se quiser depois REABILITAR RLS (RECOMENDADO):
-- ALTER TABLE medical_production ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medical_repasse ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medical_repasse_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;

-- Para verificar se RLS está desabilitado, execute:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'medical_production', 
  'medical_repasse', 
  'medical_repasse_config',
  'financial_transactions',
  'financial_accounts'
)
ORDER BY tablename;
