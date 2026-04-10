-- Buscar código da clínica Gesclinic Demo
SELECT id, name, clinic_code, fantasy_name, email, status
FROM clinics
WHERE name = 'Gesclinic Demo' OR name ILIKE '%gesclinic%demo%';
