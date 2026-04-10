-- ============================================================
-- INSERT INITIAL CLINIC AND USER
-- ============================================================
-- Insert demo clinic and user for fernando.cooper@gesclinic.com.br

-- 1. Insert Clinic
INSERT INTO clinics (id, name, email, phone, address, city, state, zip_code, cnpj)
VALUES (
  gen_random_uuid(),
  'Gesclinic Demo',
  'contato@gesclinic.com.br',
  '11 3000-0000',
  'Rua Exemplo, 123',
  'São Paulo',
  'SP',
  '01310-100',
  '00.000.000/0000-00'
)
ON CONFLICT (cnpj) DO NOTHING;

-- 2. Get clinic ID for next insert
WITH clinic_data AS (
  SELECT id FROM clinics WHERE name = 'Gesclinic Demo' LIMIT 1
)

-- 3. Insert User
INSERT INTO users (id, clinic_id, email, name, role)
SELECT 
  gen_random_uuid(),
  clinic_data.id,
  'fernando.cooper@gesclinic.com.br',
  'Fernando Cooper',
  'admin'
FROM clinic_data
ON CONFLICT DO NOTHING;

-- Confirmation
SELECT 'Clínica e usuário inseridos com sucesso!' as status;
