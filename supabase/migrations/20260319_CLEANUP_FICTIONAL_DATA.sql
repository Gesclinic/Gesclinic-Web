-- ====================================================================
-- CLEANUP: Removing Fictional/Test Data
-- Date: 2026-03-19
-- 
-- This migration removes all fictional professionals and associated data:
-- - Dr. João Silva
-- - Dra. Maria Santos  
-- - Dr. Pedro Costa
-- - Dra. Ana Lima
--
-- And their associated records:
-- - repasse_medico
-- - repasse_ajuste
-- - repasse_config (linked to these professionals)
-- - professional_services
-- - professional_payers
-- - professional_schedules
-- ====================================================================

-- Step 1: Store IDs of fictional professionals before deletion
WITH fictional_professionals AS (
  SELECT id, name 
  FROM professionals 
  WHERE name IN (
    'Dr. João Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
)

-- Step 2: Delete associated repasse records
DELETE FROM repasse_ajuste 
WHERE repasse_id IN (
  SELECT rm.id 
  FROM repasse_medico rm
  INNER JOIN fictional_professionals fp ON rm.professional_id = fp.id
);

-- Step 3: Delete repasse_medico records
DELETE FROM repasse_medico 
WHERE professional_id IN (
  SELECT id 
  FROM professionals 
  WHERE name IN (
    'Dr. João Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 4: Delete repasse_config records
DELETE FROM repasse_config 
WHERE professional_id IN (
  SELECT id 
  FROM professionals 
  WHERE name IN (
    'Dr. João Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 5: Delete professional_services records
DELETE FROM professional_services 
WHERE professional_id IN (
  SELECT id 
  FROM professionals 
  WHERE name IN (
    'Dr. João Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 6: Delete professional_payers records
DELETE FROM professional_payers 
WHERE professional_id IN (
  SELECT id 
  FROM professionals 
  WHERE name IN (
    'Dr. João Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 7: Delete professional_schedules records
DELETE FROM professional_schedules 
WHERE professional_id IN (
  SELECT id 
  FROM professionals 
  WHERE name IN (
    'Dr. João Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 8: Delete appointments made by these professionals
DELETE FROM appointments 
WHERE professional_id IN (
  SELECT id 
  FROM professionals 
  WHERE name IN (
    'Dr. João Silva',
    'Dra. Maria Santos',
    'Dr. Pedro Costa',
    'Dra. Ana Lima'
  )
);

-- Step 9: Delete the professionals themselves
DELETE FROM professionals 
WHERE name IN (
  'Dr. João Silva',
  'Dra. Maria Santos',
  'Dr. Pedro Costa',
  'Dra. Ana Lima'
);

-- Step 10: Delete associated user accounts (if any)
DELETE FROM auth.users 
WHERE email ILIKE ANY(ARRAY[
  '%joao.silva%',
  '%maria.santos%',
  '%pedro.costa%',
  '%ana.lima%'
]) 
AND email NOT LIKE '%@clinic-real%';

-- ====================================================================
-- Summary of cleanup:
-- All fictional professionals and their associated data have been removed:
-- - Professionals: 4 records
-- - Repasse Medico: depends on clinic configuration
-- - Associated services, schedules, and appointments: cleaned up
-- ====================================================================
