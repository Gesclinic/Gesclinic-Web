-- ============================================================
-- FIX: Desabilitar temporariamente RLS para testar CBHPM
-- ============================================================

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('cbhpm_procedures', 'cbhpm_service_mapping');

-- Desabilitar RLS para debug
ALTER TABLE cbhpm_procedures DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbhpm_service_mapping DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('cbhpm_procedures', 'cbhpm_service_mapping');

-- ============================================================
-- Verificar quantos procedimentos existem para cada clínica
-- ============================================================
SELECT clinic_id, COUNT(*) as total FROM cbhpm_procedures 
GROUP BY clinic_id;

-- ============================================================
-- Após testar, REABILITAR RLS com este comando:
-- ============================================================
-- ALTER TABLE cbhpm_procedures ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cbhpm_service_mapping ENABLE ROW LEVEL SECURITY;
