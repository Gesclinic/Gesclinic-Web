-- ============================================================
-- VERIFICAR ESTRUTURA - Colunas da tabela appointments
-- Data: Abril 10, 2026
-- ============================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
ORDER BY ordinal_position;
