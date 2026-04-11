-- ============================================================
-- TESTE - Preparar dados para fluxo TISS com agendamento existente
-- Data: Abril 10, 2026
-- ============================================================

-- 1. Listar agendamentos da Unimed com dados completos
SELECT 
  a.id as appointment_id,
  a.scheduled_date,
  a.status as appointment_status,
  p.name as patient_name,
  p.cpf,
  pr.name as professional_name,
  pr.cbo_code,
  s.name as service_name,
  s.tuss_code,
  op.name as payer_name,
  op.registration_ans,
  bg.id as billing_guide_id,
  bg.guide_number as guide_number_tiss,
  bg.status as guide_status
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN professionals pr ON a.professional_id = pr.id
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN health_insurances op ON a.payer_id = op.id
LEFT JOIN billing_guides bg ON a.id = bg.appointment_id
WHERE op.name ILIKE '%unimed%'
  OR a.payer_id IN (SELECT id FROM health_insurances WHERE name ILIKE '%unimed%')
ORDER BY a.scheduled_date DESC
LIMIT 10;

-- ============================================================

-- 2. Verificar dados de Unimed no sistema
SELECT 
  id,
  name,
  registration_ans,
  tiss_pattern,
  guide_format,
  tiss_endpoint,
  submission_method,
  active
FROM health_insurances
WHERE name ILIKE '%unimed%'
LIMIT 5;

-- ============================================================

-- 3. Se houver agendamento, verificar se tem billing_guide
SELECT DISTINCT
  a.id as appointment_id,
  COALESCE(bg.id, 'SEM GUIA') as billing_guide_status,
  a.status as appointment_status,
  CASE 
    WHEN bg.id IS NULL THEN 'PRECISA CRIAR GUIA'
    WHEN bg.status = 'draft' THEN 'PRONTO PARA ENVIO TISS'
    WHEN bg.status IN ('submitted', 'processing', 'accepted') THEN 'JÁ SUBMETIDO'
    ELSE bg.status
  END as next_action
FROM appointments a
LEFT JOIN billing_guides bg ON a.id = bg.appointment_id
LEFT JOIN health_insurances op ON a.payer_id = op.id
WHERE op.name ILIKE '%unimed%'
  AND a.status = 'attended'  -- Só agendamentos completos
LIMIT 5;

-- ============================================================
-- FIM DO TESTE
-- ============================================================
