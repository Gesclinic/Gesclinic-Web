-- ============================================================
-- DELETAR TODOS OS 187 SERVIÇOS CRIADOS
-- Execute no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Soft delete (marcar como inativo)
UPDATE services 
SET active = false 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
AND tuss_code IS NOT NULL
AND tuss_code != '';

-- PASSO 2: Hard delete (remover completamente) - DESCOMENTE SE QUISER DELETAR DEFINITIVAMENTE
-- DELETE FROM services 
-- WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
-- AND tuss_code IS NOT NULL
-- AND tuss_code != '';

-- PASSO 3: Verificar quantos foram deletados
SELECT 
  'Serviços Totais' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN active = true THEN 1 END) as ativos,
  COUNT(CASE WHEN active = false THEN 1 END) as inativos,
  COUNT(CASE WHEN tuss_code IS NULL OR tuss_code = '' THEN 1 END) as sem_tuss
FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1);

-- PASSO 4: Listar serviços que sobraram (antigos sem TUSS)
SELECT 
  name,
  tuss_code,
  service_category,
  active
FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
LIMIT 10;
