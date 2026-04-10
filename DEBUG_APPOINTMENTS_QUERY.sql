-- Check what appointments exist for the current professional
-- Replace the UUIDs with actual values from your console logs

-- Professional ID: 4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1
-- Clinic ID: dcee437c-fd14-463c-b25e-a318f5da60b7
-- Current date: 2026-03-03

-- 1️⃣ Check appointments for this professional (ANY date)
SELECT 
  id,
  scheduled_date,
  scheduled_time,
  professional_id,
  patient_id,
  status,
  created_at
FROM appointments
WHERE professional_id = '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1'
AND clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
ORDER BY scheduled_date DESC, scheduled_time DESC
LIMIT 20;

-- 2️⃣ Check if professional exists
SELECT id, name, email, clinic_id, active
FROM professionals
WHERE id = '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1';

-- 3️⃣ Count total appointments in the clinic
SELECT COUNT(*) as total_appointments
FROM appointments
WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

-- 4️⃣ Check appointments scheduled for March 2026
SELECT 
  id,
  scheduled_date,
  professional_id,
  patient_id
FROM appointments
WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
AND scheduled_date >= '2026-03-01'
AND scheduled_date <= '2026-03-31'
ORDER BY scheduled_date, scheduled_time;
