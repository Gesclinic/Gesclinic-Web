CREATE TABLE IF NOT EXISTS public.stock_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.stock_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_items
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.stock_subcategories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_subcategories_clinic
ON public.stock_subcategories (clinic_id);

CREATE INDEX IF NOT EXISTS idx_stock_subcategories_category
ON public.stock_subcategories (category_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_subcategories_unique_name_per_category
ON public.stock_subcategories (clinic_id, category_id, lower(trim(name)))
WHERE coalesce(active, true) = true;

CREATE INDEX IF NOT EXISTS idx_stock_items_subcategory
ON public.stock_items (subcategory_id);

ALTER TABLE public.stock_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_subcategories_select" ON public.stock_subcategories;
CREATE POLICY "stock_subcategories_select"
  ON public.stock_subcategories FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "stock_subcategories_insert" ON public.stock_subcategories;
CREATE POLICY "stock_subcategories_insert"
  ON public.stock_subcategories FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "stock_subcategories_update" ON public.stock_subcategories;
CREATE POLICY "stock_subcategories_update"
  ON public.stock_subcategories FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "stock_subcategories_delete" ON public.stock_subcategories;
CREATE POLICY "stock_subcategories_delete"
  ON public.stock_subcategories FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.users WHERE id = auth.uid()
    )
  );