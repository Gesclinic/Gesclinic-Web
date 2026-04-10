-- ============================================================
-- RECUPERAR 187 SERVIÇOS - REMOVER ANTIGOS E REINSRIR NOVOS
-- Execute no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Remover serviços antigos sem TUSS code (soft delete)
UPDATE services 
SET active = false 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
AND (tuss_code IS NULL OR tuss_code = '');

-- PASSO 2: Remover serviços sem TUSS definitivamente (opcional - comentado)
-- DELETE FROM services 
-- WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
-- AND (tuss_code IS NULL OR tuss_code = '');

-- PASSO 3: Inserir os 187 novos serviços
WITH clinic_data AS (
  SELECT id FROM clinics LIMIT 1
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
  clinic_data.id,
  descricao_completa,
  descricao_curta,
  CASE 
    WHEN categoria = 'Consultas' THEN 30
    WHEN categoria = 'SADT' THEN 45
    WHEN categoria = 'Procedimentos' THEN 60
    WHEN categoria = 'Internações' THEN 120
    WHEN categoria = 'Outros' THEN 30
    ELSE 30
  END,
  true,
  codigo_cbhpm,
  codigo_tuss,
  valor_base,
  CASE 
    WHEN categoria = 'Consultas' THEN 'per_consultation'
    WHEN categoria = 'Procedimentos' THEN 'per_consultation'
    WHEN categoria = 'Internações' THEN 'per_session'
    WHEN categoria = 'SADT' THEN 'per_consultation'
    ELSE 'per_consultation'
  END,
  TRUE,
  FALSE,
  CASE 
    WHEN categoria = 'Consultas' THEN 'consultation'
    WHEN categoria = 'SADT' THEN 'exam'
    WHEN categoria = 'Procedimentos' THEN 'procedure'
    WHEN categoria = 'Internações' THEN 'other'
    ELSE 'other'
  END,
  TRUE,
  tipo_guia,
  'service',
  'unidade',
  valor_base
FROM clinic_data, 
(
  SELECT 
    cbhpm.codigo_cbhpm,
    cbhpm.descricao_completa,
    cbhpm.descricao_curta,
    cbhpm.codigo_tuss,
    cbhpm.valor_base,
    cbhpm.tipo_guia,
    cbhpm.categoria
  FROM cbhpm_procedures cbhpm
  WHERE cbhpm.clinic_id = clinic_data.id
  AND cbhpm.ativo = true
  GROUP BY cbhpm.codigo_cbhpm, cbhpm.descricao_completa, cbhpm.descricao_curta, cbhpm.codigo_tuss, cbhpm.valor_base, cbhpm.tipo_guia, cbhpm.categoria
) cbhpm_data
ON CONFLICT DO NOTHING;

-- PASSO 4: Verificar resultado
SELECT 
  'Serviços Totais' as info,
  COUNT(*) as total,
  COUNT(CASE WHEN active = true THEN 1 END) as ativos,
  COUNT(CASE WHEN active = false THEN 1 END) as inativos
FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1);

-- PASSO 5: Listar alguns exemplos dos novos
SELECT 
  name,
  tuss_code,
  base_value,
  service_category,
  default_duration_minutes,
  active
FROM services 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
AND active = true
AND tuss_code IS NOT NULL
ORDER BY service_category, name
LIMIT 20;
