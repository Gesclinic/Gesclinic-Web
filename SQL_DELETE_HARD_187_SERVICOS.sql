-- ============================================================
-- DELETE HARD - REMOVER DEFINITIVAMENTE OS 187 SERVIÇOS
-- Execute no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Remover os agendamentos que usam esses serviços
DELETE FROM appointments 
WHERE service_id IN (
  SELECT id FROM services 
  WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
  AND tuss_code IS NOT NULL
  AND tuss_code != ''
);

-- PASSO 2: Remover os logs de auditoria dos agendamentos
DELETE FROM appointment_audit_logs 
WHERE appointment_id NOT IN (SELECT id FROM appointments);

-- PASSO 3: DELETE DEFINITIVO dos 187 serviços
DELETE FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
AND tuss_code IS NOT NULL
AND tuss_code != '';

-- PASSO 4: Verificar resultado final
SELECT 
  'Serviços Restantes' as info,
  COUNT(*) as total
FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1);

-- PASSO 5: Listar os que sobraram (antigos)
SELECT 
  id,
  name,
  tuss_code,
  code,
  active
FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
LIMIT 30;
