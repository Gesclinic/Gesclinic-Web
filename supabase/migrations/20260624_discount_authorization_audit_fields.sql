-- 2026-06-24: Auditoria completa do fluxo de autorizacao de descontos
-- Registra nomes legiveis de solicitante/decisor e preserva o valor rejeitado.

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS discount_authorized_by_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS discount_rejected_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_rejected_by_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS discount_rejected_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS discount_rejected_amount DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_appointments_discount_authorized_by_name
ON public.appointments(discount_authorized_by_name);

CREATE INDEX IF NOT EXISTS idx_appointments_discount_rejected_by
ON public.appointments(discount_rejected_by)
WHERE discount_rejected_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_discount_rejected_at
ON public.appointments(discount_rejected_at)
WHERE discount_rejected_at IS NOT NULL;

COMMENT ON COLUMN public.appointments.discount_authorized_by_name IS 'Nome ou email do usuario que autorizou o desconto.';
COMMENT ON COLUMN public.appointments.discount_rejected_by_name IS 'Nome ou email do usuario que rejeitou o desconto.';
COMMENT ON COLUMN public.appointments.discount_rejected_amount IS 'Valor do desconto solicitado no momento da rejeicao, preservado para auditoria.';
