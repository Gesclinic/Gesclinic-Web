-- ============================================
-- DEBUG: TESTAR RPCs DE INDICADORES
-- ============================================

-- 1. Verificar se as funções existem
SELECT '1. FUNÇÕES EXISTENTES' as teste;
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name LIKE 'get_%indicators'
ORDER BY routine_name;

-- 2. Listar todas as views
SELECT '2. VIEWS CRIADAS' as teste;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE 'v_agenda%'
ORDER BY table_name;

-- 3. Contar agendamentos para hoje
SELECT '3. AGENDAMENTOS HOJE' as teste;
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT clinic_id) as clinics,
  MIN(scheduled_date) as primeira_data,
  MAX(scheduled_date) as ultima_data
FROM appointments
WHERE scheduled_date = CURRENT_DATE;

-- 4. Testar a view de indicadores diários
SELECT '4. VIEW v_agenda_indicators_daily' as teste;
SELECT * FROM v_agenda_indicators_daily LIMIT 5;

-- 5. Testar a RPC com UUID de exemplo (substitua com seu clinic_id real)
SELECT '5. TESTAR RPC get_agenda_indicators' as teste;
-- Primeiro, pega o primeiro clinic_id disponível
WITH clinic_info AS (
  SELECT id FROM clinics LIMIT 1
)
SELECT *
FROM get_agenda_indicators(
  (SELECT id FROM clinic_info),
  CURRENT_DATE,
  NULL
);

-- 6. Verificar se há dados em appointments para a clínica
SELECT '6. APPOINTMENTS POR CLÍNICA' as teste;
SELECT 
  clinic_id,
  COUNT(*) as total,
  COUNT(DISTINCT scheduled_date) as datas_diferentes
FROM appointments
GROUP BY clinic_id
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 7. Se houver agendamentos, mostrar alguns
SELECT '7. AMOSTRA DE AGENDAMENTOS' as teste;
SELECT 
  id,
  clinic_id,
  scheduled_date,
  scheduled_time,
  status
FROM appointments
LIMIT 10;
