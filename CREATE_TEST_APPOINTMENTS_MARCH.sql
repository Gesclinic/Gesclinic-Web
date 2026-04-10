-- Create 3 test appointments for March 2026
-- Professional: 4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1
-- Patient: 5bc17590-b801-4a44-8f8f-1ac51559458f (same patient as existing appointment)
-- Clinic: dcee437c-fd14-463c-b25e-a318f5da60b7

-- Service ID: Get from services table
-- Room ID: Get from rooms table  
-- Payer ID: Get from payers table (from logs: fd81f83a-3294-4df0-a112-43b31817db65 or 7f86e1d2-cf0b-450f-abb2-35af77a56f5b)

INSERT INTO appointments (
  id,
  clinic_id,
  professional_id,
  patient_id,
  service_id,
  room_id,
  payer_id,
  scheduled_date,
  scheduled_time,
  status,
  value,
  duration,
  created_at,
  updated_at,
  notes
) VALUES
-- Appointment 1: March 3, 10:00 AM
(
  gen_random_uuid(),
  'dcee437c-fd14-463c-b25e-a318f5da60b7',
  '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1',
  '5bc17590-b801-4a44-8f8f-1ac51559458f',
  (SELECT id FROM services WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7' LIMIT 1),
  (SELECT id FROM rooms WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7' LIMIT 1),
  '7f86e1d2-cf0b-450f-abb2-35af77a56f5b',
  '2026-03-03',
  '10:00:00',
  'liberado_para_atendimento',
  150.00,
  30,
  NOW(),
  NOW(),
  'Test appointment #1 - March 3'
),
-- Appointment 2: March 5, 14:00 (2:00 PM)
(
  gen_random_uuid(),
  'dcee437c-fd14-463c-b25e-a318f5da60b7',
  '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1',
  '5bc17590-b801-4a44-8f8f-1ac51559458f',
  (SELECT id FROM services WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7' LIMIT 1),
  (SELECT id FROM rooms WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7' LIMIT 1),
  'fd81f83a-3294-4df0-a112-43b31817db65',
  '2026-03-05',
  '14:00:00',
  'liberado_para_atendimento',
  150.00,
  30,
  NOW(),
  NOW(),
  'Test appointment #2 - March 5'
),
-- Appointment 3: March 10, 11:30 AM
(
  gen_random_uuid(),
  'dcee437c-fd14-463c-b25e-a318f5da60b7',
  '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1',
  '5bc17590-b801-4a44-8f8f-1ac51559458f',
  (SELECT id FROM services WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7' LIMIT 1),
  (SELECT id FROM rooms WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7' LIMIT 1),
  '7f86e1d2-cf0b-450f-abb2-35af77a56f5b',
  '2026-03-10',
  '11:30:00',
  'liberado_para_atendimento',
  200.00,
  45,
  NOW(),
  NOW(),
  'Test appointment #3 - March 10'
);

-- Verify the new appointments were created
SELECT 
  id,
  scheduled_date,
  scheduled_time,
  status,
  notes
FROM appointments
WHERE professional_id = '4e8d3f88-c7c0-4d29-bcb6-f21b35219bf1'
AND clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7'
AND scheduled_date >= '2026-03-01'
ORDER BY scheduled_date, scheduled_time;
