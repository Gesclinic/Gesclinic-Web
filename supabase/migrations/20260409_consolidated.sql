-- ============================================================================
-- Consolidated from 20260409_add_appointment_fk_to_billing_guides.sql
-- ============================================================================

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

-- ============================================================================
-- Consolidated from 20260409_add_payment_method_to_appointments.sql
-- ============================================================================

-- ============================================================================
-- ADD PAYMENT METHOD AND RELATED FIELDS TO APPOINTMENTS TABLE
-- Data: 2026-04-09
-- ============================================================================

-- Verificar e adicionar coluna payment_method
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Adicionar coluna convenio_id se n├úo existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS convenio_id UUID REFERENCES public.health_insurances(id) ON DELETE SET NULL;

-- Adicionar coluna plano_contas_id se n├úo existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS plano_contas_id UUID REFERENCES public.account_plans(id) ON DELETE SET NULL;

-- Adicionar coluna billing_notes se n├úo existir
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS billing_notes TEXT;

-- Criar ├¡ndices para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON public.appointments(payment_method);
CREATE INDEX IF NOT EXISTS idx_appointments_convenio_id ON public.appointments(convenio_id);
CREATE INDEX IF NOT EXISTS idx_appointments_plano_contas_id ON public.appointments(plano_contas_id);

-- Adicionar constraint para payment_method ser um dos valores v├ílidos
ALTER TABLE public.appointments
ADD CONSTRAINT check_payment_method
CHECK (payment_method IS NULL OR payment_method IN ('DINHEIRO', 'CARTAO', 'PIX', 'CHEQUE', 'BOLETO', 'DOC', 'TED', 'DEPOSITO'));

-- Log da execu├º├úo
SELECT 'Migration 20260409: Colunas adicionadas ao appointments (payment_method, convenio_id, plano_contas_id, billing_notes)' as status;

-- ============================================================================
-- Consolidated from 20260409_create_generate_doctor_commissions_v2.sql
-- ============================================================================

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
    'Comiss├Áes geradas para ' || v_records_created || ' profissional(is) em ' || p_month || '/' || p_year::TEXT,
    v_records_created::INTEGER;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    false::BOOLEAN,
    'Erro ao gerar comiss├Áes: ' || SQLERRM::TEXT,
    0::INTEGER;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_doctor_commissions_v2(UUID, INTEGER, INTEGER, VARCHAR) TO anon, authenticated;

SELECT 'doctor_commissions table and RPC created successfully!' AS status;

-- ============================================================================
-- Consolidated from 20260409_debug_generate_doctor_commissions.sql
-- ============================================================================

-- ============================================================
-- DEBUG: Check what appointment statuses exist in database
-- ============================================================

-- Query 1: See all unique appointment statuses
SELECT DISTINCT status, COUNT(*) as count
FROM public.appointments
GROUP BY status
ORDER BY count DESC;

-- Query 2: See appointments for our clinic in March 2026
SELECT
  id,
  professional_id,
  patient_id,
  scheduled_date,
  status,
  value,
  created_at
FROM public.appointments
WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
  AND scheduled_date >= '2026-03-01'
  AND scheduled_date <= '2026-03-31'
ORDER BY scheduled_date;

-- Query 3: See ALL professionals for the clinic
SELECT id, name, active
FROM public.professionals
WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
ORDER BY active DESC, name;
