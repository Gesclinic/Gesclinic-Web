-- ============================================================================
-- DIAGNÓSTICO: Verificar se appointment_id está preenchido
-- ============================================================================

-- 1️⃣ Ver registros com appointment_id
SELECT 
  id,
  appointment_id,
  payer_name,
  valor_bruto,
  descricao,
  origem
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 2️⃣ Verificar se o appointment_id existe na tabela appointments
-- ============================================================================
SELECT 
  ar.id as ar_id,
  ar.appointment_id,
  ar.payer_name,
  apt.id as apt_id,
  apt.patient_id,
  apt.appointment_date,
  apt.status
FROM ar_receivables ar
LEFT JOIN appointments apt ON ar.appointment_id = apt.id
ORDER BY ar.created_at DESC
LIMIT 5;
