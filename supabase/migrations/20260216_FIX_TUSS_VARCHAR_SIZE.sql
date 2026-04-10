-- ============================================================
-- FIX: Aumentar tamanho do campo codigo_tuss (VARCHAR 10 → 20)
-- ============================================================

-- Aumentar em cbhpm_procedures
ALTER TABLE cbhpm_procedures 
ALTER COLUMN codigo_tuss TYPE VARCHAR(20);

-- Aumentar em services (se existir)
ALTER TABLE services 
ALTER COLUMN tuss_code TYPE VARCHAR(20);

-- Verificar os tipos após alteração
SELECT  
  table_name, 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_name IN ('cbhpm_procedures', 'services')
  AND column_name LIKE '%tuss%';
