-- ============================================================================
-- DIAGNÓSTICO: Checar estrutura e dados reais da tabela ar_receivables
-- ============================================================================

-- 1️⃣ Ver campos da tabela
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ar_receivables'
ORDER BY ordinal_position;

-- ============================================================================
-- 2️⃣ Ver TODOS os registros (últimos 5)
-- ============================================================================
SELECT *
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 3️⃣ Resumo dos valores
-- ============================================================================
SELECT 
  COUNT(*) as total_registros,
  COUNT(DISTINCT valor_bruto) as valores_unicos,
  MIN(valor_bruto) as valor_minimo,
  MAX(valor_bruto) as valor_maximo,
  AVG(valor_bruto) as valor_medio,
  COUNT(CASE WHEN valor_bruto = 0 THEN 1 END) as com_valor_zero,
  COUNT(CASE WHEN payer_name IS NULL OR payer_name = '' OR payer_name = '-' THEN 1 END) as pagador_vazio
FROM ar_receivables;
