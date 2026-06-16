-- 2026-06-07 - Add UNIQUE constraint to prevent duplicate appointment services
-- Purpose: Prevent duplicate service entries for the same appointment
-- This constraint ensures that each appointment can only have one entry per service

ALTER TABLE public.appointment_services 
ADD CONSTRAINT unique_appointment_service 
UNIQUE (appointment_id, service_id);

-- Comment explaining the constraint
COMMENT ON CONSTRAINT unique_appointment_service ON public.appointment_services IS 
'Prevents duplicate entries for the same service within the same appointment. Combined index on (appointment_id, service_id) ensures uniqueness.';
