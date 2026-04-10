-- ============================================================
-- PARTE 4: OUTROS EXAMES E PROCEDIMENTOS TERAPÊUTICOS (17 registros)
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
  minimo, maximo, base, true, false, tipo, 'unidade',
  'Neurologia', 'Neurologia', true
FROM clinic_data,
(VALUES
  ('7.09.01.01-2', 'Tomografia por Emissão de Fótons Únicos (SPECT)', 'SPECT Cerebral', 'SADT', 'Imagem', '0302060100', 400.00, 800.00, 600.00, 'sadt'),
  ('7.10.01.01-2', 'Positron Emission Tomography (PET) - Encéfalo', 'PET Encéfalo', 'SADT', 'Imagem', '0302070100', 500.00, 1000.00, 750.00, 'sadt'),
  ('7.11.01.01-2', 'Punção Lombar Diagnóstica', 'Punção Lombar Diag', 'Outros', 'Laboratório', '0406030100', 200.00, 400.00, 300.00, 'outro'),
  ('7.11.02.01-2', 'Punção Suboccipital', 'Punção Suboccipital', 'Outros', 'Laboratório', '0406040100', 250.00, 500.00, 350.00, 'outro'),
  ('7.12.01.01-2', 'Biópsia de Nervo Periférico', 'Biópsia Nervo', 'Outros', 'Laboratorio Esp', '0406050100', 300.00, 600.00, 450.00, 'outro'),
  ('7.13.01.01-2', 'Biópsia Muscular', 'Biópsia Muscular', 'Outros', 'Laboratorio Esp', '0406060100', 300.00, 600.00, 450.00, 'outro'),
  ('7.14.01.01-2', 'Teste de Nistagmo Posicional', 'Teste Nistagmo', 'Outros', 'Especializado', '0303060100', 80.00, 150.00, 120.00, 'outro'),
  ('7.15.01.01-2', 'Teste de Romberg e Marcha', 'Teste Romberg', 'Outros', 'Especializado', '0303070100', 50.00, 100.00, 80.00, 'outro'),
  ('7.16.01.01-2', 'Teste de Função Vestibular', 'Teste Vestibular', 'Outros', 'Especializado', '0303080100', 150.00, 250.00, 200.00, 'outro'),
  ('8.01.01.01-2', 'Infiltração de Nervo Periférico', 'Infiltração Nervo', 'Procedimento', 'Neurologia Intervencionista', '0407010100', 150.00, 300.00, 200.00, 'procedimento'),
  ('8.01.02.01-2', 'Bloqueio Nervoso Periférico', 'Bloqueio Nervo', 'Procedimento', 'Neurologia Intervencionista', '0407020100', 200.00, 400.00, 300.00, 'procedimento'),
  ('8.02.01.01-2', 'Injeção Epidural Cervical', 'Injeção Epidural Cerv', 'Procedimento', 'Neurologia Intervencionista', '0407030100', 200.00, 400.00, 300.00, 'procedimento'),
  ('8.02.02.01-2', 'Injeção Epidural Torácica', 'Injeção Epidural Tor', 'Procedimento', 'Neurologia Intervencionista', '0407030200', 200.00, 400.00, 300.00, 'procedimento'),
  ('8.02.03.01-2', 'Injeção Epidural Lombossacra', 'Injeção Epidural Lomb', 'Procedimento', 'Neurologia Intervencionista', '0407030300', 200.00, 400.00, 300.00, 'procedimento'),
  ('8.03.01.01-2', 'Injeção de Toxina Botulínica - Aplicação Simples', 'Toxina Botulínica 1', 'Procedimento', 'Neurologia Especializada', '0407040100', 150.00, 400.00, 250.00, 'procedimento'),
  ('8.03.02.01-2', 'Injeção de Toxina Botulínica - Aplicações Múltiplas', 'Toxina Botulínica Mult', 'Procedimento', 'Neurologia Especializada', '0407040200', 250.00, 600.00, 400.00, 'procedimento'),
  ('8.04.01.01-2', 'Estimulação Transcraniana com Corrente Contínua (tDCS)', 'tDCS', 'Procedimento', 'Neuromodulação', '0407050100', 100.00, 250.00, 180.00, 'procedimento')
) AS t(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, tipo);

SELECT COUNT(*) as outros_inseridos FROM cbhpm_procedures WHERE codigo_cbhpm LIKE '7.%' OR codigo_cbhpm LIKE '8.%' AND ativo = true;
