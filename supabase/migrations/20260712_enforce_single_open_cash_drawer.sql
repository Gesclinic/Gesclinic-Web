-- Enforce that each operator has at most one open cash drawer per clinic.
-- Closed drawers are not affected.

CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_drawers_one_open_per_operator
ON public.cash_drawers (clinic_id, operator_id)
WHERE status = 'open';