-- Script para diagnosticar e corrigir profissionais sem clinic_id
-- Execute isso no Supabase SQL Editor

-- 1. Verificar quantos profissionais existem sem clinic_id
SELECT COUNT(*) as "Profissionais sem clinic_id" 
FROM professionals 
WHERE clinic_id IS NULL;

-- 2. Listar todos os profissionais sem clinic_id
SELECT id, name, email, created_at 
FROM professionals 
WHERE clinic_id IS NULL
ORDER BY created_at DESC;

-- ⚠️ CUIDADO: Executar APENAS se tiver certeza
-- 3. Se sua clínica Demo tem um ID específico, você pode atualizar:
-- UPDATE professionals 
-- SET clinic_id = 'CLINIC_ID_AQUI' 
-- WHERE clinic_id IS NULL;

-- 4. Ou, para encontrar a clínica Demo e atualizar todos os profissionais para ela:
-- UPDATE professionals 
-- SET clinic_id = (SELECT id FROM clinics WHERE name LIKE '%Demo%' LIMIT 1)
-- WHERE clinic_id IS NULL;
