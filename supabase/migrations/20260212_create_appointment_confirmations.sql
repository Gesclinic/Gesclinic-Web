-- Tabela de confirmações de agendamento via WhatsApp
CREATE TABLE IF NOT EXISTS public.appointment_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    confirmation_token VARCHAR(255) UNIQUE NOT NULL,
    message_sent_at TIMESTAMP WITH TIME ZONE,
    confirmed BOOLEAN DEFAULT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_appointment_confirmations_appointment_id ON public.appointment_confirmations(appointment_id);
CREATE INDEX idx_appointment_confirmations_clinic_id ON public.appointment_confirmations(clinic_id);
CREATE INDEX idx_appointment_confirmations_token ON public.appointment_confirmations(confirmation_token);
CREATE INDEX idx_appointment_confirmations_confirmed ON public.appointment_confirmations(confirmed);
