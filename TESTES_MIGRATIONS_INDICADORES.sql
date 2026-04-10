-- ============================================
-- TESTES COMPLETOS - MIGRATIONS INDICADORES
-- ============================================

-- 1. Verificar se as tabelas foram criadas
SELECT '1. TABELAS CRIADAS' as teste;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('rooms', 'appointment_audit_logs', 'appointments')
ORDER BY table_name;

-- 2. Verificar se as colunas foram adicionadas à appointments
SELECT '2. COLUNAS ADICIONADAS' as teste;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
  AND column_name IN ('room_id', 'value', 'scheduled_time', 'end_time')
ORDER BY column_name;

-- 3. Verificar se as views foram criadas
SELECT '3. VIEWS CRIADAS' as teste;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE 'v_agenda%'
ORDER BY table_name;

-- 4. Testar a view de indicadores diários
SELECT '4. INDICADORES DIÁRIOS' as teste;
SELECT * FROM v_agenda_indicators_daily LIMIT 5;

-- 5. Testar a view de indicadores financeiros
SELECT '5. INDICADORES FINANCEIROS' as teste;
SELECT * FROM v_agenda_financial_indicators LIMIT 5;

-- 6. Verificar se há dados na tabela de audit logs
SELECT '6. AUDIT LOGS COUNT' as teste;
SELECT COUNT(*) as total_logs FROM appointment_audit_logs;

-- 7. Verificar estrutura da tabela rooms
SELECT '7. ESTRUTURA ROOMS' as teste;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'rooms'
ORDER BY ordinal_position;

-- 8. Verificar índices criados
SELECT '8. ÍNDICES' as teste;
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('rooms', 'appointments', 'appointment_audit_logs')
ORDER BY tablename, indexname;
