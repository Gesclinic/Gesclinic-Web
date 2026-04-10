-- LIMPEZA COMPLETA: Deletar TODOS os serviços da clínica
-- Este script remove todas as dependências antes de deletar os serviços

-- Passo 1: Obter o clinic_id
-- (Usar a clínica padrão - LIMIT 1)

-- Passo 2: Deletar todos os agendamentos da clínica
DELETE FROM appointments 
WHERE service_id IN (
  SELECT id FROM services 
  WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
);

-- Passo 3: Deletar logs de auditoria órfãos
DELETE FROM appointment_audit_logs 
WHERE appointment_id NOT IN (SELECT id FROM appointments);

-- Passo 4: Deletar TODOS os serviços dessa clínica
DELETE FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1);

-- Verificação final
-- SELECT COUNT(*) FROM services WHERE clinic_id = (SELECT id FROM clinics LIMIT 1);
-- Resultado esperado: 0
