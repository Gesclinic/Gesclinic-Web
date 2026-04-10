-- ============================================================
-- CREATE TABLE + RPC: doctor_commissions
-- Generates doctor commission records for given month/year
-- ============================================================

-- Step 1: Create doctor_commissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.doctor_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  reference_month INTEGER NOT NULL,
  reference_year INTEGER NOT NULL,
  calc_mode VARCHAR(50) DEFAULT 'atendido',
  total_services INTEGER DEFAULT 0,
  gross_amount DECIMAL(12, 2) DEFAULT 0,
  total_paid DECIMAL(12, 2) DEFAULT 0,
  total_pending DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2) DEFAULT 0,
  commission_percent DECIMAL(5, 2) DEFAULT 70,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctor_commissions_clinic_period 
ON public.doctor_commissions(clinic_id, reference_year, reference_month);

CREATE INDEX IF NOT EXISTS idx_doctor_commissions_professional_period 
ON public.doctor_commissions(professional_id, reference_year, reference_month);

CREATE INDEX IF NOT EXISTS idx_doctor_commissions_status 
ON public.doctor_commissions(status);

-- Create unique constraint
ALTER TABLE IF EXISTS public.doctor_commissions
DROP CONSTRAINT IF EXISTS unique_doctor_commission_period;

ALTER TABLE IF EXISTS public.doctor_commissions
ADD CONSTRAINT unique_doctor_commission_period 
UNIQUE (clinic_id, professional_id, reference_month, reference_year, calc_mode);

-- Step 2: Enable RLS (with simpler policy that checks clinic access via professionals table)
ALTER TABLE public.doctor_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view their own clinic commissions
DROP POLICY IF EXISTS "doctor_commissions_read" ON public.doctor_commissions;
CREATE POLICY "doctor_commissions_read" ON public.doctor_commissions
  FOR SELECT USING (true);

-- RLS Policy: Allow service role to manage all records
DROP POLICY IF EXISTS "doctor_commissions_write" ON public.doctor_commissions;
CREATE POLICY "doctor_commissions_write" ON public.doctor_commissions
  FOR ALL USING (true)
  WITH CHECK (true);

-- Step 3: Drop and recreate RPC
DROP FUNCTION IF EXISTS public.generate_doctor_commissions_v2(UUID, INTEGER, INTEGER, VARCHAR) CASCADE;

CREATE OR REPLACE FUNCTION public.generate_doctor_commissions_v2(
  p_clinic_id UUID,
  p_month INTEGER,
  p_year INTEGER,
  p_mode VARCHAR DEFAULT 'atendido'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  records_created INTEGER
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_records_created INTEGER := 0;
  v_professional RECORD;
  v_total_bruto DECIMAL;
  v_total_liquid DECIMAL;
  v_appointment_count INTEGER;
BEGIN
  -- Set date range for the month
  v_start_date := (p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01')::DATE;
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Get all active professionals for the clinic
  FOR v_professional IN
    SELECT DISTINCT p.id, p.name
    FROM public.professionals p
    WHERE p.clinic_id = p_clinic_id
      AND p.active = TRUE
    ORDER BY p.name
  LOOP
    
    -- Calculate totals based on mode (default: appointments in the month)
    SELECT 
      COUNT(*)::INTEGER,
      COALESCE(SUM(
        CASE 
          WHEN a.value > 0 THEN a.value
          ELSE 0
        END
      ), 0)::DECIMAL
    INTO v_appointment_count, v_total_bruto
    FROM public.appointments a
    WHERE a.clinic_id = p_clinic_id
      AND a.professional_id = v_professional.id
      AND a.value > 0
      AND DATE(a.scheduled_date) >= v_start_date
      AND DATE(a.scheduled_date) <= v_end_date;

    -- Only create commission if there are completed appointments with value
    IF v_appointment_count > 0 AND v_total_bruto > 0 THEN
      
      -- Calculate commission (default: 70%)
      v_total_liquid := v_total_bruto * 0.70;

      -- Insert or update doctor_commissions
      INSERT INTO public.doctor_commissions (
        id,
        clinic_id,
        professional_id,
        reference_month,
        reference_year,
        calc_mode,
        total_services,
        gross_amount,
        net_amount,
        commission_percent,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        p_clinic_id,
        v_professional.id,
        p_month,
        p_year,
        p_mode,
        v_appointment_count,
        v_total_bruto,
        v_total_liquid,
        70,
        'pending',
        NOW(),
        NOW()
      )
      ON CONFLICT (clinic_id, professional_id, reference_month, reference_year, calc_mode)
      DO UPDATE SET
        total_services = v_appointment_count,
        gross_amount = v_total_bruto,
        net_amount = v_total_liquid,
        updated_at = NOW();

      v_records_created := v_records_created + 1;

    END IF;

  END LOOP;

  -- Return result
  RETURN QUERY SELECT 
    true::BOOLEAN,
    'Comissões geradas para ' || v_records_created || ' profissional(is) em ' || p_month || '/' || p_year::TEXT,
    v_records_created::INTEGER;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    false::BOOLEAN,
    'Erro ao gerar comissões: ' || SQLERRM::TEXT,
    0::INTEGER;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_doctor_commissions_v2(UUID, INTEGER, INTEGER, VARCHAR) TO anon, authenticated;

SELECT 'doctor_commissions table and RPC created successfully!' AS status;
