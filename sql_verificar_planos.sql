-- ============================================
-- VERIFICAR PLANOS CADASTRADOS
-- ============================================

-- 1. Ver TODOS os planos
SELECT 'TODOS OS PLANOS' as info;
SELECT id, payer_id, name, code, clinic_id FROM plans LIMIT 50;

-- 2. Contar planos por convênio
SELECT 'PLANOS POR CONVÊNIO' as info;
SELECT p.payer_id, pyr.name as convenio_name, COUNT(*) as total_planos
FROM plans p
JOIN payers pyr ON p.payer_id = pyr.id
GROUP BY p.payer_id, pyr.name
ORDER BY total_planos DESC;

-- 3. Ver ID do convênio "Unimed Cascavel - PR"
SELECT 'ID DO CONVÊNIO UNIMED CASCAVEL' as info;
SELECT id, name, code FROM payers WHERE name ILIKE '%unimed%cascavel%' LIMIT 10;

-- 4. Se encontrou, ver planos desse convênio
-- (substitua 'xxxxx' pelo ID do convênio encontrado acima)
-- SELECT id, name, code FROM plans WHERE payer_id = 'xxxxx';

-- 5. Verificar se a tabela plans existe e quantas linhas tem
SELECT 'STATUS DA TABELA PLANS' as info;
SELECT COUNT(*) as total_de_planos FROM plans;
