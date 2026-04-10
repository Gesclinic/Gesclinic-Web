-- ============================================================
-- VER QUAIS CÓDIGOS ESTÃO REALMENTE NA TABELA
-- ============================================================

-- Ver amostra dos códigos que existem
SELECT 
  id,
  codigo_cbhpm,
  descricao_completa,
  codigo_tuss,
  ativo,
  clinic_id
FROM cbhpm_procedures
LIMIT 20;

-- Contar quantos por clínica e status
SELECT 
  clinic_id,
  ativo,
  COUNT(*) as total
FROM cbhpm_procedures
GROUP BY clinic_id, ativo
ORDER BY clinic_id, ativo;

-- Ver formatos de código
SELECT DISTINCT 
  LENGTH(codigo_cbhpm) as comprimento,
  LEFT(codigo_cbhpm, 5) as prefixo,
  COUNT(*) as total
FROM cbhpm_procedures
GROUP BY LENGTH(codigo_cbhpm), LEFT(codigo_cbhpm, 5)
ORDER BY total DESC;
