-- ============================================
-- 🔧 SCRIPT PARA ASSOCIAR USUÁRIO À CLÍNICA
-- ============================================
-- Execute este script diretamente no Supabase SQL Editor

-- Passo 1: Ver qual é a clínica
SELECT id, name FROM clinics LIMIT 1;

-- Passo 2: Ver dados do usuário
SELECT id, email, clinic_id FROM users WHERE email = 'fernando.cooper@gesclinic.com.br';

-- Passo 3: ATUALIZAR O USUÁRIO COM CLINIC_ID
-- Copie o clinic_id do Passo 1 e substitua em 'SEU_CLINIC_ID_AQUI'
UPDATE users 
SET clinic_id = (SELECT id FROM clinics LIMIT 1)
WHERE email = 'fernando.cooper@gesclinic.com.br';

-- Passo 4: VERIFICAR SE FOI SALVO
SELECT id, email, clinic_id FROM users WHERE email = 'fernando.cooper@gesclinic.com.br';

-- Se clinic_id continuar NULL ou vazio, há um problema com RLS
-- Nesse caso, execute como admin (Desabilite RLS temporariamente se necessário)
