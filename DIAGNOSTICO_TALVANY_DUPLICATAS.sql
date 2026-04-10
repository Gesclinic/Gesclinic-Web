-- ⚠️ DIAGNÓSTICO: Verificar se Talvany tem registros duplicados
-- Execute isso no Supabase SQL Editor

-- Substituir 'talvany@email.com' pelo email correto de Talvany
-- Substituir '<clinic_id>' pelo ID da clínica

-- 1. Encontrar todos os profissionais com email de Talvany
SELECT id, name, email, clinic_id, created_at 
FROM professionals 
WHERE email = 'talvany@email.com' 
ORDER BY created_at DESC;

-- 2. Se houver múltiplos, contar quantos appointments (agendamentos) cada um tem
-- Substituir os IDs obtidos acima
SELECT 
  p.id,
  p.name,
  p.email,
  COUNT(a.id) as appointment_count
FROM professionals p
LEFT JOIN appointments a ON a.professional_id = p.id
WHERE p.email = 'talvany@email.com'
GROUP BY p.id, p.name, p.email
ORDER BY appointment_count DESC;

-- 3. Se precisar mesclar (DELETE o registro com menos agendamentos depois de confirmar)
-- ⚠️ SÓ EXECUTE APÓS CONFIRMAR O ID CORRETO!
-- DELETE FROM professionals WHERE id = '<id_to_delete>' AND email = 'talvany@email.com';
