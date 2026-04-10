-- ============================================================================
-- ADD PAYMENT METHOD AND RELATED FIELDS TO APPOINTMENTS TABLE
-- Data: 2026-04-09
-- ============================================================================

-- Verificar e adicionar coluna payment_method
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Adicionar coluna convenio_id se não existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS convenio_id UUID REFERENCES public.health_insurances(id) ON DELETE SET NULL;

-- Adicionar coluna plano_contas_id se não existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS plano_contas_id UUID REFERENCES public.account_plans(id) ON DELETE SET NULL;

-- Adicionar coluna billing_notes se não existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS billing_notes TEXT;

-- Criar índices para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON public.appointments(payment_method);
CREATE INDEX IF NOT EXISTS idx_appointments_convenio_id ON public.appointments(convenio_id);
CREATE INDEX IF NOT EXISTS idx_appointments_plano_contas_id ON public.appointments(plano_contas_id);

-- Adicionar constraint para payment_method ser um dos valores válidos
ALTER TABLE public.appointments
ADD CONSTRAINT check_payment_method 
CHECK (payment_method IS NULL OR payment_method IN ('DINHEIRO', 'CARTAO', 'PIX', 'CHEQUE', 'BOLETO', 'DOC', 'TED', 'DEPOSITO'));

-- Log da execução
SELECT 'Migration 20260409: Colunas adicionadas ao appointments (payment_method, convenio_id, plano_contas_id, billing_notes)' as status;
