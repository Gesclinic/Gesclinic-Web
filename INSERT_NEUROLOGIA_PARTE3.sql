-- ============================================================
-- PARTE 3: EXAMES DE IMAGEM (10 registros)
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
SELECT clinic_data.id,
  codigo, descricao, descricao_curta, grupo, subgrupo, tuss,
  minimo, maximo, base, true, false, 'sadt', 'unidade',
  'Neurologia', 'Neurologia', true
FROM clinic_data,
(VALUES
  ('7.06.01.01-2', 'Ressonância Magnética (RM) - Encéfalo', 'RM Encéfalo', 'SADT', 'Imagem', '0302040100', 350.00, 700.00, 500.00),
  ('7.06.02.01-2', 'Ressonância Magnética (RM) - Medula Espinhal', 'RM Medula', 'SADT', 'Imagem', '0302040200', 350.00, 700.00, 500.00),
  ('7.06.03.01-2', 'Ressonância Magnética (RM) - Coluna Cervical', 'RM Col. Cervical', 'SADT', 'Imagem', '0302040300', 300.00, 600.00, 450.00),
  ('7.06.04.01-2', 'Ressonância Magnética (RM) - Coluna Lombar', 'RM Col. Lombar', 'SADT', 'Imagem', '0302040400', 300.00, 600.00, 450.00),
  ('7.06.05.01-2', 'Ressonância Magnética (RM) - Crânio com Contraste', 'RM Crânio c/ Contraste', 'SADT', 'Imagem', '0302040500', 400.00, 800.00, 600.00),
  ('7.07.01.01-2', 'Tomografia Computadorizada (TC) - Encéfalo', 'TC Encéfalo', 'SADT', 'Imagem', '0302030100', 200.00, 400.00, 300.00),
  ('7.07.02.01-2', 'Tomografia Computadorizada (TC) - Coluna Cervical', 'TC Col. Cervical', 'SADT', 'Imagem', '0302030110', 200.00, 400.00, 300.00),
  ('7.07.03.01-2', 'Tomografia Computadorizada (TC) - Coluna Lombar', 'TC Col. Lombar', 'SADT', 'Imagem', '0302030120', 200.00, 400.00, 300.00),
  ('7.08.01.01-2', 'Angiografia por Ressonância (ARM) - Intracraniana', 'ARM Intracraniana', 'SADT', 'Imagem', '0302050100', 400.00, 800.00, 600.00),
  ('7.08.02.01-2', 'Angiografia por Tomografia (CTA) - Intracraniana', 'CTA Intracraniana', 'SADT', 'Imagem', '0302050200', 350.00, 700.00, 500.00)
) AS t(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base);

SELECT COUNT(*) as imagem_inserida FROM cbhpm_procedures WHERE codigo_cbhpm LIKE '7.0[678]%' AND ativo = true;
