-- ============================================================
-- GARANTIA DE UNICIDADE CNPJ/CPF EM FORNECEDORES DE ESTOQUE
-- ============================================================
-- Impede dois fornecedores da mesma clinica com o mesmo CNPJ/CPF normalizado.

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_suppliers_unique_document_per_clinic
ON public.stock_suppliers (
  clinic_id,
  regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g')
)
WHERE nullif(regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g'), '') IS NOT NULL;