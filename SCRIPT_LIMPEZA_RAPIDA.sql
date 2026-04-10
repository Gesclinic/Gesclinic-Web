-- ====================================================================
-- LIMPEZA RÁPIDA: Remove Profissionais Fictícios
-- ====================================================================
-- Copie e execute CADA seção abaixo no Supabase SQL Editor
-- Vá para: https://app.supabase.com > SQL Editor
--
-- PROFISSIONAIS A REMOVER:
-- - Dr. João Silva
-- - Dra. Maria Santos
-- - Dr. Pedro Costa
-- - Dra. Ana Lima
-- ====================================================================

-- PASSO 1: VERIFICAR IDs (Execute primeiro!)
-- Copie os IDs encontrados para usar na exclusão
SELECT id, name, email
FROM professionals 
WHERE name IN (
  'Dr. João Silva',
  'Dra. Maria Santos',
  'Dr. Pedro Costa',
  'Dra. Ana Lima'
);

-- ====================================================================
-- PASSO 2: REMOVER DADOS (Execute após confirmar IDs)
-- ====================================================================

-- 2.1: Remover ajustes de repasse
DELETE FROM repasse_ajuste 
WHERE repasse_id IN (
  SELECT id FROM repasse_medico 
  WHERE professional_id IN (
    SELECT id FROM professionals 
    WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
  )
);

-- 2.2: Remover repasses (repassos médicos)
DELETE FROM repasse_medico 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

-- 2.3: Remover configurações de repasse
DELETE FROM repasse_config 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

-- 2.4: Remover serviços dos profissionais
DELETE FROM professional_services 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

-- 2.5: Remover pagadores do profissional
DELETE FROM professional_payers 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

-- 2.6: Remover agendas do profissional
DELETE FROM professional_schedules 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

-- 2.7: Remover agendamentos criados por esses profissionais
DELETE FROM appointments 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

-- 2.8: **FINAL** - Remover os profissionais
DELETE FROM professionals 
WHERE name IN (
  'Dr. João Silva',
  'Dra. Maria Santos',
  'Dr. Pedro Costa',
  'Dra. Ana Lima'
);

-- ====================================================================
-- PASSO 3: VERIFICAR SE FORAM REMOVIDOS
-- ====================================================================

SELECT COUNT(*) as profissionais_restantes
FROM professionals 
WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima');
-- Resultado esperado: 0

-- ====================================================================
-- FIM DE LIMPEZA
-- ====================================================================
