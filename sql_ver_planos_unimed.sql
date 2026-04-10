-- Ver os 6 planos do Unimed Cascavel
SELECT id, name, code FROM plans 
WHERE payer_id = 'f6817f3a-324e-4efc-a112-43b1181cb833'
ORDER BY name;
