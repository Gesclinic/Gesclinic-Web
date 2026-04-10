-- Add appointment_id FK to billing_guides
-- Enables automatic guide creation and proper linking to appointments
-- Executed: 2026-04-09

-- Add the appointment_id column if it doesn't exist
ALTER TABLE IF EXISTS public.billing_guides 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_billing_guides_appointment_id 
ON public.billing_guides(appointment_id);

-- Create index for clinic + appointment lookups
CREATE INDEX IF NOT EXISTS idx_billing_guides_clinic_appointment 
ON public.billing_guides(clinic_id, appointment_id);

-- Enforce cascade delete at appointment level
-- When appointment is deleted, all billing_guides are auto-deleted
ALTER TABLE public.billing_guides
DROP CONSTRAINT IF EXISTS fk_guides_appointments_cascade;

ALTER TABLE public.billing_guides
ADD CONSTRAINT fk_guides_appointments_cascade
FOREIGN KEY (appointment_id) 
REFERENCES public.appointments(id) 
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_guides TO authenticated, service_role;

SELECT 'appointment_id FK added to billing_guides successfully!' AS status;
