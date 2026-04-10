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
