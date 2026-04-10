-- 🔍 DEBUG SQL - Verificar dados de convenios e profissionais
-- Execute este script no Supabase SQL Editor para diagnosticar

-- ============================================
-- 1. Ver quantos profissionais existem
-- ============================================
SELECT COUNT(*) as total_profissionais FROM professionals;

-- ============================================
-- 2. Ver quantos payers existem
-- ============================================
SELECT COUNT(*) as total_payers FROM payers;

-- ============================================
-- 3. Ver TODOS os profissionais e seus IDs
-- ============================================
SELECT id, name, full_name, email, active 
FROM professionals 
LIMIT 20;

-- ============================================
-- 4. Ver TODOS os payers
-- ============================================
SELECT id, name, clinic_id, active 
FROM payers 
LIMIT 20;

-- ============================================
-- 5. Ver quantas relações professional_payers existem
-- ============================================
SELECT COUNT(*) as total_professional_payers 
FROM professional_payers;

-- ============================================
-- 6. Ver TODAS as relações professional_payers
-- ============================================
SELECT 
  pp.id,
  pp.professional_id,
  pp.payer_id,
  p.name as professional_name,
  pr.name as payer_name
FROM professional_payers pp
LEFT JOIN professionals p ON pp.professional_id = p.id
LEFT JOIN payers pr ON pp.payer_id = pr.id
LIMIT 20;

-- ============================================
-- 7. Se não houver professional_payers, inserir EXEMPLOS
-- ============================================
-- Descomente o bloco abaixo se quiser inserir dados de exemplo:
/*
INSERT INTO professional_payers (professional_id, payer_id, clinic_id)
SELECT 
  p.id as professional_id,
  py.id as payer_id,
  p.clinic_id
FROM professionals p
CROSS JOIN payers py
WHERE p.clinic_id = py.clinic_id
  AND p.active = true
  AND py.active = true
LIMIT 10
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- 8. Visualizar dados depois da inserção
-- ============================================
SELECT 
  pp.professional_id,
  pp.payer_id,
  p.name as professional_name,
  pr.name as payer_name
FROM professional_payers pp
LEFT JOIN professionals p ON pp.professional_id = p.id
LEFT JOIN payers pr ON pp.payer_id = pr.id
LIMIT 20;
