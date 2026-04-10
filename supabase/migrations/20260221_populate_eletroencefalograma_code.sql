-- ========================================================
-- Migration: Popular código CBHPM para Eletroencefalograma
-- Date: 2026-02-21
-- ========================================================

-- Atualizar serviço 'Eletroencefalograma especial' com código CBHPM
UPDATE services
SET code = '40103200'
WHERE name ILIKE '%Eletroencefalograma%'
AND code IS NULL;

-- Verificar resultado
SELECT id, name, code, description
FROM services
WHERE name ILIKE '%Eletroencefalograma%'
ORDER BY name;
