-- ============================================================================
-- SEED RÁPIDO DE FERIADOS 2026
-- ============================================================================
-- 📌 INSTRUÇÕES:
-- 1. Vá ao Supabase → SQL Editor
-- 2. Cole este script inteiro
-- 3. Clique em "Run"
-- 4. Volte à agenda e recarregue a página (F5)
-- ============================================================================

-- ⚠️ IMPORTANTE: Substitua 'seu-clinic-id' pelo ID da sua clínica!
-- Para descobrir seu clinic-id:
-- SELECT id FROM clinics LIMIT 1;

-- TABELAS JÁ DEVEM EXISTIR (da migration 20260206_holidays_system.sql)
-- Se não existirem, execute aquela migration PRIMEIRO

-- LIMPAR feriados antigos (OPCIONAL - descomente se quiser limpar)
-- DELETE FROM holidays WHERE clinic_id = 'seu-clinic-id';

-- POPULAR FERIADOS 2026
INSERT INTO public.holidays (date, name, scope, is_blocked, clinic_id)
VALUES
  ('2026-01-01', 'Confraternização Universal', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-02-13', 'Carnaval', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-02-14', 'Sexta-feira de Carnaval', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-02-17', 'Terça-feira de Carnaval', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-04-03', 'Sexta-feira Santa', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-04-21', 'Tiradentes', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-05-01', 'Dia do Trabalho', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-09-07', 'Independência do Brasil', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-11-02', 'Finados', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-11-20', 'Consciência Negra', 'NACIONAL', true, 'seu-clinic-id'),
  ('2026-12-25', 'Natal', 'NACIONAL', true, 'seu-clinic-id')
ON CONFLICT (date, scope, coalesce(state,''), coalesce(city,'')) DO NOTHING;

-- VERIFICAR SE FORAM INSERIDOS
SELECT COUNT(*) as total_feriados, 
       MIN(date) as primeiro, 
       MAX(date) as ultimo
FROM holidays
WHERE clinic_id = 'seu-clinic-id';
