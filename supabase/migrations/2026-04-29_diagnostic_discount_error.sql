-- 2026-04-29: Diagnosticar permissões de usuário e desconto
-- Executar no SQL Editor do Supabase

-- 1. Ver qual é o usuário autenticado agora
SELECT 
  auth.uid() as user_id,
  auth.email() as user_email;

-- 2. Ver o perfil do usuário atual
SELECT 
  id,
  email,
  name,
  clinic_id,
  role
FROM public.users 
WHERE id = auth.uid();

-- 3. Ver todas as policies na tabela appointments
SELECT 
  policyname,
  action,
  QUAL,
  WITH_CHECK as with_check_clause
FROM pg_policies 
WHERE tablename = 'appointments'
ORDER BY policyname;

-- 4. Verificar se há triggers na tabela appointments
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;

-- 5. Tentar fazer um UPDATE simples em um agendamento para ver o erro real
-- (Trocar 'APPOINTMENT_ID_AQUI' pelo ID de um agendamento existente)
UPDATE public.appointments
SET discount = 100.00,
    discount_requested_at = NOW()
WHERE id = 'APPOINTMENT_ID_AQUI'
RETURNING id, discount, discount_requested_at;
