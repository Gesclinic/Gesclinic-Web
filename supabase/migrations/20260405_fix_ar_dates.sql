-- ============================================================================
-- CORREÇÃO: Atualizar data_vencimento para 5 dias a partir de hoje
-- ============================================================================

-- 1️⃣ Ver registros antes da correção
SELECT 
  id,
  payer_name,
  valor_bruto,
  data_emissao,
  data_vencimento,
  created_at
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 2️⃣ Atualizar data_emissao como hoje e data_vencimento como +5 dias
-- ============================================================================
UPDATE ar_receivables
SET
  data_emissao = CURRENT_DATE,
  data_vencimento = CURRENT_DATE + INTERVAL '5 days',
  updated_at = NOW()
WHERE valor_bruto > 0
ORDER BY created_at DESC
LIMIT 2;

-- ============================================================================
-- 3️⃣ Ver resultado após correção
-- ============================================================================
SELECT 
  id,
  payer_name,
  valor_bruto,
  data_emissao,
  data_vencimento,
  status
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 10;
