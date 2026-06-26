-- 2026-06-23_fix_stock_unit_cost_from_notes.sql
-- Clean up incorrectly captured unit_cost values in stock_movements
-- These were captured as total values instead of unit prices

-- Delete all stock entries from accounts_payable that have unrealistic unit costs
-- (i.e., unit_cost > R$ 5000 with qty 1-100 - likely total value mistakenly stored as unit)
DELETE FROM stock_movements
WHERE clinic_id IS NOT NULL
  AND reference_type = 'accounts_payable'
  AND unit_cost > 5000
  AND quantity BETWEEN 1 AND 100
  AND notes NOT LIKE '%Custo unitario R$ %';

-- For entries created from payables, update unit_cost to NULL if it looks wrong
-- This forces recalculation on next view
UPDATE stock_movements
SET unit_cost = NULL
WHERE clinic_id IS NOT NULL
  AND reference_type = 'accounts_payable'
  AND unit_cost IS NOT NULL
  AND unit_cost > 1000
  AND quantity < 20;


