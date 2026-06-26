-- 2026-06-23_restore_unit_costs_from_notes.sql
-- Restore unit_cost values from notes field for accounts_payable entries
-- Extract the "Custo unitario R$ XX.XX" pattern from notes and update unit_cost

UPDATE stock_movements SET unit_cost = 10.98 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 10.98%';
UPDATE stock_movements SET unit_cost = 13.04 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 13.04%';
UPDATE stock_movements SET unit_cost = 13.75 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 13.75%';
UPDATE stock_movements SET unit_cost = 14.99 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 14.99%';
UPDATE stock_movements SET unit_cost = 16.00 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 16.00%';
UPDATE stock_movements SET unit_cost = 20.00 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 20.00%';
UPDATE stock_movements SET unit_cost = 21.00 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 21.00%';
UPDATE stock_movements SET unit_cost = 21.90 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 21.90%';
UPDATE stock_movements SET unit_cost = 30.00 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 30.00%';
UPDATE stock_movements SET unit_cost = 31.50 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 31.50%';
UPDATE stock_movements SET unit_cost = 34.90 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 34.90%';
UPDATE stock_movements SET unit_cost = 35.00 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 35.00%';
UPDATE stock_movements SET unit_cost = 36.90 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 36.90%';
UPDATE stock_movements SET unit_cost = 38.00 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 38.00%';
UPDATE stock_movements SET unit_cost = 50.00 WHERE unit_cost IS NULL AND notes LIKE '%Custo unitario R$ 50.00%';
