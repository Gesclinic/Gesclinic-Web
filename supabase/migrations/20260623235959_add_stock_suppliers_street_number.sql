-- Add street and number columns to stock_suppliers
-- Separates address into street and number fields for better data organization

BEGIN;

ALTER TABLE public.stock_suppliers
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT;

-- Add comments for documentation  
COMMENT ON COLUMN public.stock_suppliers.street IS 'Rua/Logradouro do fornecedor (extraído do endereço ou XML)';
COMMENT ON COLUMN public.stock_suppliers.number IS 'Número do logradouro';
COMMENT ON COLUMN public.stock_suppliers.address IS 'Endereço completo - Mantido para compatibilidade legada';

COMMIT;
