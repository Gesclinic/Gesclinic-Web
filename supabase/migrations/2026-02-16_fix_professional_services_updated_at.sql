-- Migration to ensure updated_at column exists and add trigger for professional_services
-- This fixes the PostgREST PGRST204 error

-- 1. Ensure the updated_at column exists
ALTER TABLE public.professional_services
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Create trigger function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_professional_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_update_professional_services_updated_at ON public.professional_services;

-- 4. Create trigger to call the function
CREATE TRIGGER trigger_update_professional_services_updated_at
BEFORE UPDATE ON public.professional_services
FOR EACH ROW
EXECUTE FUNCTION public.update_professional_services_updated_at();

-- 5. Grant necessary permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_professional_services_updated_at() TO authenticated;
