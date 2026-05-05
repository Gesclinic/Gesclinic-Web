-- Adicionar coluna para armazenar múltiplos pagamentos como JSON
-- Estrutura: [{ id, payment_method, value, card_brand, card_last4, pix_key, cheque_info, created_at }]

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payment_splits jsonb DEFAULT NULL;

-- Criar índice GIN para buscas eficientes em JSON
CREATE INDEX IF NOT EXISTS idx_appointments_payment_splits
ON public.appointments USING GIN (payment_splits);

-- Verificar coluna criada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointments' 
  AND column_name = 'payment_splits'
ORDER BY column_name;
