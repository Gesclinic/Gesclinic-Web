-- 2026-04-29: Adicionar coluna discount_requested_at para rastreamento de envio de solicitação de desconto
-- Esta coluna registra quando uma solicitação de desconto foi enviada para aprovação

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS discount_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Comentário descritivo da coluna
COMMENT ON COLUMN public.appointments.discount_requested_at IS 'Data e hora em que a solicitação de desconto foi enviada para aprovação. Null se não foi enviada.';

-- Index para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_appointments_discount_requested_at 
ON public.appointments(discount_requested_at) 
WHERE discount_requested_at IS NOT NULL;

-- Log de sucesso
SELECT 'Migration completed: Added discount_requested_at column to appointments table' as status;
