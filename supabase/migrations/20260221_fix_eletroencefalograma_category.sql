-- ========================================================
-- Migration: Corrigir categoria do Eletroencefalograma
-- Date: 2026-02-21
-- ========================================================

-- Atualizar categoria para 'exam' (exame)
UPDATE services
SET service_category = 'exam'
WHERE name ILIKE '%Eletroencefalograma%';

-- Verificar resultado
SELECT id, name, service_category
FROM services
WHERE name ILIKE '%Eletroencefalograma%'
ORDER BY name;
