-- ===============================================
-- FIX CARNAVAL 2026 - Remover bloqueio obrigatório
-- ===============================================

-- Step 1: Delete Carnaval entries (if they exist)
DELETE FROM holidays 
WHERE date IN ('2026-02-13', '2026-02-14', '2026-02-17')
  AND scope = 'NACIONAL';

-- Step 2: Insert Carnaval as OPTIONAL holidays (is_mandatory = false, is_blocked = false)
INSERT INTO holidays (date, name, scope, is_blocked, is_mandatory, clinic_id, state, city, created_at)
VALUES 
  ('2026-02-13', 'Carnaval', 'NACIONAL', false, false, NULL, NULL, NULL, NOW()),
  ('2026-02-14', 'Sexta-feira de Carnaval', 'NACIONAL', false, false, NULL, NULL, NULL, NOW()),
  ('2026-02-17', 'Terça-feira de Carnaval', 'NACIONAL', false, false, NULL, NULL, NULL, NOW());

-- Verification
SELECT date, name, is_blocked, is_mandatory FROM holidays 
WHERE date IN ('2026-02-13', '2026-02-14', '2026-02-17')
ORDER BY date;
