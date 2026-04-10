-- ============================================================
-- COPIE E EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- Cria todos os Serviços a partir dos CBHPMs inseridos
-- ============================================================

WITH clinic_data AS (
  SELECT id FROM clinics LIMIT 1
),
cbhpm_data AS (
  SELECT DISTINCT
    clinic_id,
    descricao_completa as name,
    descricao_curta as description,
    codigo_tuss as tuss_code,
    codigo_cbhpm as code,
    valor_base as base_value,
    tipo_guia as guide_type,
    categoria as service_category,
    CASE 
      WHEN categoria = 'Consultas' THEN 30
      WHEN categoria = 'SADT' THEN 45
      WHEN categoria = 'Procedimentos' THEN 60
      WHEN categoria = 'Internações' THEN 120
      WHEN categoria = 'Outros' THEN 30
      ELSE 30
    END as default_duration_minutes,
    ativo as active,
    CASE 
      WHEN categoria = 'Consultas' THEN 'per_consultation'
      WHEN categoria = 'Procedimentos' THEN 'per_consultation'
      WHEN categoria = 'Internações' THEN 'per_session'
      WHEN categoria = 'SADT' THEN 'per_consultation'
      ELSE 'per_consultation'
    END as type_billing
  FROM cbhpm_procedures
  WHERE ativo = true
)
INSERT INTO services (
  clinic_id,
  name,
  description,
  default_duration_minutes,
  active,
  code,
  tuss_code,
  base_value,
  type_billing,
  allow_scheduling_fit,
  requires_authorization,
  service_category,
  is_billable,
  guide_type,
  type_service,
  unit_measure,
  cost_value
)
SELECT
  cb.clinic_id,
  cb.name,
  cb.description,
  cb.default_duration_minutes,
  cb.active,
  cb.code,
  cb.tuss_code,
  cb.base_value,
  cb.type_billing,
  TRUE as allow_scheduling_fit,
  FALSE as requires_authorization,
  CASE 
    WHEN cb.service_category = 'Consultas' THEN 'consultation'
    WHEN cb.service_category = 'SADT' THEN 'exam'
    WHEN cb.service_category = 'Procedimentos' THEN 'procedure'
    WHEN cb.service_category = 'Internações' THEN 'other'
    ELSE 'other'
  END as service_category,
  TRUE as is_billable,
  cb.guide_type,
  'service' as type_service,
  'unidade' as unit_measure,
  cb.base_value as cost_value
FROM cbhpm_data cb
WHERE NOT EXISTS (
  SELECT 1 FROM services s
  WHERE s.clinic_id = cb.clinic_id
  AND s.tuss_code = cb.tuss_code
  AND s.tuss_code IS NOT NULL
)
OR NOT EXISTS (
  SELECT 1 FROM services s
  WHERE s.clinic_id = cb.clinic_id
  AND s.code = cb.code
  AND s.code IS NOT NULL
)
ON CONFLICT DO NOTHING;

-- Verificar resultado final
SELECT 
  COUNT(*) as total_servicos,
  COUNT(DISTINCT service_category) as categorias_servicos,
  STRING_AGG(DISTINCT service_category, ', ' ORDER BY service_category) as categorias_list
FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
AND active = true;
