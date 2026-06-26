-- Add unit_cost column to stock movements used by automatic AP XML stock entries.
ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(14,2);

-- Optional backfill from legacy notes like:
-- "... | Custo unitario R$ 195.00"
WITH parsed AS (
  SELECT
    id,
    REPLACE(REPLACE((REGEXP_MATCHES(notes, 'Custo\s+unitario\s+R\$\s*([0-9\.,]+)', 'i'))[1], '.', ''), ',', '.')::NUMERIC(14,2) AS inferred_unit_cost
  FROM public.stock_movements
  WHERE unit_cost IS NULL
    AND notes IS NOT NULL
    AND notes ~* 'Custo\s+unitario\s+R\$\s*[0-9\.,]+'
)
UPDATE public.stock_movements sm
SET unit_cost = parsed.inferred_unit_cost
FROM parsed
WHERE sm.id = parsed.id
  AND sm.unit_cost IS NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_clinic_unit_cost
  ON public.stock_movements (clinic_id, unit_cost)
  WHERE unit_cost IS NOT NULL;
