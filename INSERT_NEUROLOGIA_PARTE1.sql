-- ============================================================
-- PARTE 1: INSERIR CONSULTAS NEUROLÓGICAS (8 registros)
-- ============================================================

WITH clinic_data AS (
  SELECT id FROM clinics LIMIT 1
)
INSERT INTO cbhpm_procedures (
  clinic_id, codigo_cbhpm, descricao_completa, descricao_curta, 
  grupo_procedimento, subgrupo_procedimento, codigo_tuss,
  valor_minimo, valor_maximo, valor_base,
  permite_faturamento, exige_autorizacao, tipo_guia, unidade_medida,
  categoria, subcategoria, ativo
) 
SELECT clinic_data.id, * FROM clinic_data,
(VALUES 
  ('6.01.01.01-2', 'Consulta - Neurologista Clínico', 'Consult. Neuro Clín', 'Consultas', 'Neurologia Clínica', '0601010112', 150.00, 250.00, 180.00, true, false, 'consulta', 'unidade', 'Neurologia', 'Neurologia', true),
  ('6.01.02.01-2', 'Consulta - Neurocirurgião', 'Consult. Neurocirurgião', 'Consultas', 'Neurocirurgia', '0601020112', 180.00, 300.00, 220.00, true, false, 'consulta', 'unidade', 'Neurologia', 'Neurologia', true),
  ('6.01.03.01-2', 'Consulta - Neurologista Pediátrico', 'Consult. Neuro Ped', 'Consultas', 'Neurologia Pediátrica', '0601030112', 140.00, 230.00, 170.00, true, false, 'consulta', 'unidade', 'Neurologia', 'Neurologia', true),
  ('6.01.04.01-2', 'Consulta - Especialista em Distúrbios do Movimento', 'Consult. Dist. Movimento', 'Consultas', 'Neurologia Especializada', '0601040112', 160.00, 270.00, 200.00, true, false, 'consulta', 'unidade', 'Neurologia', 'Neurologia', true),
  ('6.01.05.01-2', 'Consulta - Especialista em Cefaleia', 'Consult. Cefaleia', 'Consultas', 'Neurologia Especializada', '0601050112', 150.00, 250.00, 180.00, true, false, 'consulta', 'unidade', 'Neurologia', 'Neurologia', true),
  ('6.01.06.01-2', 'Consulta - Especialista em Epilepsia', 'Consult. Epilepsia', 'Consultas', 'Neurologia Especializada', '0601060112', 160.00, 270.00, 200.00, true, false, 'consulta', 'unidade', 'Neurologia', 'Neurologia', true),
  ('6.01.07.01-2', 'Consulta - Especialista em Sono', 'Consult. Sono', 'Consultas', 'Medicina do Sono', '0601070112', 140.00, 240.00, 180.00, true, false, 'consulta', 'unidade', 'Neurologia', 'Neurologia', true),
  ('6.01.08.01-2', 'Consulta de Retorno/Seguimento Neurológico', 'Consult. Retorno Neuro', 'Consultas', 'Neurologia Clínica', '0601080112', 120.00, 200.00, 150.00, true, false, 'consulta', 'unidade', 'Neurologia', 'Neurologia', true)
) AS t(codigo_cbhpm, descricao_completa, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, billable, auth, tipo, unidade, cat, subcat, ativo);

SELECT COUNT(*) as consultas_inseridas FROM cbhpm_procedures WHERE codigo_cbhpm LIKE '6.01%' AND ativo = true;
