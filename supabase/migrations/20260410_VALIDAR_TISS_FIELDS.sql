-- ============================================================
-- Validação: Verificar se campos TISS foram criados com sucesso
-- ============================================================

-- 1. Verificar se coluna existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name IN (
  'diagnosis_code',
  'subscriber_number',
  'dependent_number',
  'dependent_name',
  'dependent_birthdate', 
  'dependent_gender',
  'quantity',
  'authorization_expiry',
  'notes'
)
ORDER BY column_name;

-- 2. Listar todos os índices criados para TISS
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'appointments'
AND indexname LIKE '%tiss%' OR indexname LIKE '%guide%' OR indexname LIKE '%subscriber%';

-- 3. Contar quantas colunas foram adicionadas
SELECT COUNT(*) as colunas_adicionadas
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name IN (
  'diagnosis_code',
  'subscriber_number',
  'dependent_number',
  'dependent_name',
  'dependent_birthdate',
  'dependent_gender',
  'quantity',
  'authorization_expiry',
  'notes'
);

-- 4. Mostrar estrutura completa da tabela appointments TISS
\d+ appointments
