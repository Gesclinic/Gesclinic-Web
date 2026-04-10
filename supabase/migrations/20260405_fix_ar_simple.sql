-- ============================================================================
-- CORREÇÃO SIMPLES: Atualizar AR com valor 0 para valor do serviço
-- ============================================================================

-- 1️⃣ Visualizar os registros que precisam corrigir
SELECT 
  ar.id,
  ar.payer_name,
  ar.valor_bruto,
  apt.value as appointment_value,
  svc.price as service_price,
  p.name as patient_name
FROM ar_receivables ar
LEFT JOIN appointments apt ON ar.appointment_id = apt.id
LEFT JOIN services svc ON apt.service_id = svc.id
LEFT JOIN patients p ON ar.paciente_id = p.id
WHERE ar.valor_bruto = 0
ORDER BY ar.created_at DESC;

-- ============================================================================
-- 2️⃣ CORRIGIR VALOR: usar preço do serviço ou valor do appointment
-- ============================================================================
UPDATE ar_receivables
SET 
  valor_bruto = COALESCE(
    (SELECT apt.value FROM appointments apt WHERE apt.id = ar_receivables.appointment_id AND apt.value > 0 LIMIT 1),
    (SELECT svc.price FROM appointments apt 
     JOIN services svc ON apt.service_id = svc.id 
     WHERE apt.id = ar_receivables.appointment_id AND svc.price > 0 LIMIT 1),
    0
  ),
  updated_at = NOW()
WHERE ar_receivables.valor_bruto = 0;

-- ============================================================================
-- 3️⃣ CORRIGIR PAGADOR: usar nome do paciente
-- ============================================================================
UPDATE ar_receivables
SET
  payer_name = COALESCE(
    (SELECT p.name FROM patients p WHERE p.id = ar_receivables.paciente_id LIMIT 1),
    'Paciente Particular'
  ),
  updated_at = NOW()
WHERE ar_receivables.payer_name IS NULL OR ar_receivables.payer_name = '-' OR ar_receivables.payer_name = '';

-- ============================================================================
-- 4️⃣ VALIDAR: mostrar registros após correção
-- ============================================================================
SELECT 
  id,
  payer_name,
  valor_bruto,
  data_vencimento,
  status,
  updated_at
FROM ar_receivables
ORDER BY created_at DESC
LIMIT 10;
