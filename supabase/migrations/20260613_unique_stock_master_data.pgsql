CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_categories_unique_name_per_clinic
ON public.stock_categories (clinic_id, lower(trim(name)))
WHERE coalesce(active, true) = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_unique_name_per_clinic
ON public.stock_items (clinic_id, lower(trim(name)))
WHERE coalesce(active, true) = true
  AND coalesce(is_active, true) = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_unique_sku_per_clinic
ON public.stock_items (clinic_id, lower(trim(sku)))
WHERE nullif(trim(sku), '') IS NOT NULL
  AND coalesce(active, true) = true
  AND coalesce(is_active, true) = true;