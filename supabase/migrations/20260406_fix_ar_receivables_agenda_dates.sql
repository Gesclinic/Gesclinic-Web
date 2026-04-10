-- ============================================================================
-- FIX: Garantir que ar_receivables tem data_emissao preenchida para origem='Agenda'
-- ============================================================================
-- Problema: Alguns registros tinham data_emissao NULL ou não estavam sendo retornados
-- Solução: Popular data_emissao a partir de appointment_date se origem='Agenda'

BEGIN;

-- 1️⃣ Para registros com origem='Agenda' e appointment_id, preencher data_emissao do appointment
UPDATE ar_receivables ar
SET data_emissao = apt.scheduled_date
WHERE 
  ar.origem = 'Agenda'
  AND ar.appointment_id IS NOT NULL
  AND (ar.data_emissao IS NULL OR ar.data_emissao = '')
  AND EXISTS (
    SELECT 1 FROM appointments apt 
    WHERE apt.id = ar.appointment_id 
    AND apt.scheduled_date IS NOT NULL
  );

-- 2️⃣ Para registros com origem='Agenda' e sem appointment_id, usar data_vencimento
UPDATE ar_receivables
SET data_emissao = data_vencimento
WHERE 
  origem = 'Agenda'
  AND appointment_id IS NULL
  AND (data_emissao IS NULL OR data_emissao = '')
  AND data_vencimento IS NOT NULL;

-- 3️⃣ Popular payer_name se for NULL ou vazio
UPDATE ar_receivables ar
SET payer_name = COALESCE(p.name, 'Paciente')
WHERE 
  paciente_id IS NOT NULL
  AND (payer_name IS NULL OR payer_name = '' OR payer_name = '-')
  AND EXISTS (SELECT 1 FROM patients p WHERE p.id = ar.paciente_id);

-- 4️⃣ Log do resultado
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM ar_receivables
  WHERE origem = 'Agenda' AND data_emissao IS NOT NULL;
  
  RAISE NOTICE 'Total de registros Agenda com data_emissao preenchida: %', v_count;
END $$;

COMMIT;
