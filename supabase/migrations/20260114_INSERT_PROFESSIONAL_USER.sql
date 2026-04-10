-- ============================================================
-- INSERT PROFISSIONAL USER FOR TESTING MODO PROFISSIONAL
-- ============================================================
-- This inserts a test professional user to test Modo Profissional feature
-- Date: 2026-01-14

-- Get clinic ID
WITH clinic_data AS (
  SELECT id FROM clinics WHERE name = 'Gesclinic Demo' LIMIT 1
)

-- Insert Professional User
INSERT INTO users (id, clinic_id, email, name, role)
SELECT 
  gen_random_uuid(),
  clinic_data.id,
  'profissional@gesclinic.com.br',
  'Dr. João Silva (Profissional)',
  'profissional'
FROM clinic_data
ON CONFLICT (email) DO UPDATE SET role = 'profissional'
RETURNING id, email, name, role;

-- Create corresponding professional record
INSERT INTO professionals (clinic_id, name, email, active)
SELECT 
  clinic_data.id,
  'Dr. João Silva',
  'profissional@gesclinic.com.br',
  true
FROM clinic_data
WHERE NOT EXISTS (
  SELECT 1 FROM professionals 
  WHERE email = 'profissional@gesclinic.com.br'
)
RETURNING id, name, email;

-- Confirmation
SELECT 'Professional user created successfully!' as status;
