-- 🔍 VERIFICAÇÃO RÁPIDA DO BANCO
-- Copie e execute no SQL Editor do Supabase

-- 1. Verificar se coluna existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments' 
  AND column_name IN ('card_number', 'id', 'clinic_id')
ORDER BY ordinal_position;

-- 2. Verificar RLS status
SELECT 
  schemaname,
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE tablename = 'appointments';

-- 3. Listar todas as políticas RLS
SELECT 
  policyname,
  tablename,
  action,
  qual
FROM pg_policies 
WHERE tablename = 'appointments'
ORDER BY action;

-- 4. Tentar atualizar um registro de teste
-- Troque SEU_ID_AQUI por um ID real de appointment
UPDATE appointments 
SET card_number = 'TESTE_CARTEIRINHA'
WHERE id = 'SEU_ID_AQUI'
RETURNING id, card_number, updated_at;

-- 5. Se falhar, testar sem WHERE pra ver se RLS está bloqueando
UPDATE appointments 
SET card_number = 'TESTE_CARTEIRINHA'
WHERE 1=0
RETURNING id, card_number;
