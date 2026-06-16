-- ============================================================================
-- DEBUG: Verificar usuário e RLS policies
-- ============================================================================

-- 1. Verificar se o usuário está registrado na tabela users
SELECT 
  u.id as user_id,
  u.username,
  u.clinic_id as user_clinic_id,
  c.id as clinic_id,
  c.name as clinic_name,
  (SELECT COUNT(*) FROM alert_configs WHERE clinic_id = c.id) as config_count
FROM users u
FULL OUTER JOIN clinics c ON u.clinic_id = c.id
WHERE u.username = 'fernando medeiros' OR c.name ILIKE '%Neuroclinica%';

-- 2. Se o usuário não estiver registrado ou clinic_id for NULL, executar este UPDATE:
-- Primeiro, pegue o ID do user atual (auth.uid())
-- Depois execute isto para atualizar o usuário:

UPDATE users 
SET clinic_id = (
  SELECT id FROM clinics 
  WHERE name ILIKE '%Neuroclinica%' OR name ILIKE '%Cascavel%'
  LIMIT 1
)
WHERE username = 'fernando medeiros' AND clinic_id IS NULL;

-- 3. Verificar se as configurações de alerta existem
SELECT 
  id,
  clinic_id,
  alert_type,
  severity_level,
  is_enabled,
  check_frequency,
  created_at
FROM alert_configs
WHERE clinic_id IN (
  SELECT clinic_id FROM users WHERE username = 'fernando medeiros'
)
ORDER BY alert_type;

-- 4. Se ainda não houver dados, inserir novamente:
INSERT INTO alert_configs (
  clinic_id, 
  alert_type, 
  is_enabled, 
  severity_level, 
  check_frequency, 
  notify_channels, 
  email_recipients, 
  threshold_value
)
SELECT 
  u.clinic_id,
  defaults.alert_type,
  TRUE,
  defaults.severity,
  'DAILY'::VARCHAR,
  '{"email": true, "sms": false, "push": true, "dashboard": true}'::jsonb,
  ARRAY['admin@clinica.com'],
  defaults.threshold_val
FROM users u
CROSS JOIN (VALUES
  ('DELINQUENCY'::VARCHAR, 'HIGH'::VARCHAR, 5::NUMERIC),
  ('REPAYMENT_LATE'::VARCHAR, 'CRITICAL'::VARCHAR, 48::NUMERIC),
  ('LOW_CASHFLOW'::VARCHAR, 'HIGH'::VARCHAR, 10::NUMERIC),
  ('COLLECTION_LOW'::VARCHAR, 'MEDIUM'::VARCHAR, 25::NUMERIC)
) AS defaults(alert_type, severity, threshold_val)
WHERE u.username = 'fernando medeiros'
ON CONFLICT (clinic_id, alert_type) DO NOTHING;
