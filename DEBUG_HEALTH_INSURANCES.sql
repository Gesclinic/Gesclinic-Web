-- Verificar constraints na tabela health_insurances
SELECT constraint_name, constraint_type, table_name
FROM information_schema.table_constraints
WHERE table_name = 'health_insurances'
ORDER BY constraint_type;

-- Verificar a definição do CHECK constraint específico
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%health_insurances%';

-- Verificar as colunas da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'health_insurances'
ORDER BY ordinal_position;
