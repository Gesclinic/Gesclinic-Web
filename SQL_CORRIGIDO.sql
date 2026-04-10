-- ============================================
-- 🔧 CORRIGIR CLINIC_ID INVÁLIDO
-- ============================================

-- Passo 1: Ver qual é a clínica CORRETA
SELECT id, name, LENGTH(id::text) as id_length FROM clinics LIMIT 5;

-- Passo 2: Ver dados do usuário
SELECT id, email, clinic_id FROM users WHERE email = 'fernando.cooper@gesclinic.com.br';

-- Passo 3: ATUALIZAR COM O CLINIC_ID VÁLIDO (copie um ID válido do Passo 1)
-- ⚠️ IMPORTANTE: Substituir 'SEU_CLINIC_ID_VÁLIDO_AQUI' pelo UUID de uma clínica real
UPDATE users 
SET clinic_id = 'dceea87c-f211-432-b25e-a31f5ddd8b07'::uuid
WHERE email = 'fernando.cooper@gesclinic.com.br';

-- Passo 4: VERIFICAR SE FOI SALVO
SELECT id, email, clinic_id FROM users WHERE email = 'fernando.cooper@gesclinic.com.br';
