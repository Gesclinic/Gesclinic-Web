-- Atualizar desconto antigo com o nome do solicitante
-- Este script corrige descontos que foram salvos ANTES do nome ser preenchido

UPDATE appointments
SET discount_requested_by_name = 'Fernando Cooper Medeiros'
WHERE id = '9cb934b7-2c81-44dd-9e6e-8c54af278815'
  AND discount_requested_by_name IS NULL
  AND discount_requested_by = '6b85ef79-89e8-43ca-ba91-c00ce56c35a7';

-- Verificar se foi atualizado
SELECT id, discount_requested_by_name, discount_requested_at, discount_reason 
FROM appointments
WHERE id = '9cb934b7-2c81-44dd-9e6e-8c54af278815';
