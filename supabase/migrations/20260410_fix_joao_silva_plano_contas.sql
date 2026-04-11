-- Fix João Silva appointment - add missing plano_contas_id
-- Appointment ID: f66bebad-25aa-450a-8376-c33025dcfdc2
-- Set to same plano_contas_id as Marcia: fc0654bd-66fb-498e-9ede-cccd3922d70a (Consultas)

UPDATE appointments
SET plano_contas_id = 'fc0654bd-66fb-498e-9ede-cccd3922d70a'
WHERE id = 'f66bebad-25aa-450a-8376-c33025dcfdc2'
AND clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

-- Verify the update
SELECT 
  id, 
  scheduled_date, 
  scheduled_time,
  patients(name),
  plano_contas_id,
  payment_method
FROM appointments
WHERE id = 'f66bebad-25aa-450a-8376-c33025dcfdc2';
